/**
 * API Route: /api/chat
 * Methods: POST (streaming response)
 *
 * Called by:
 *   - components/chat.tsx    (POST via Vercel AI SDK's DefaultChatTransport)
 */
import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
} from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { z } from 'zod';
import { OLLAMA_BASE, getModelCapabilities } from '@/lib/ollama';

import { buildChatContext } from '@/lib/chat/context';
import { injectVisionImages } from '@/lib/chat/vision';
import { persistMessages, persistUserTurn } from '@/lib/chat/persist';

export const maxDuration = 300; // Increased to allow long contexts to prefill

const ollama = createOllama({ baseURL: `${OLLAMA_BASE}/api` });

const chatSchema = z.object({
  messages: z.array(z.any()),
  model: z.string().min(1),
  conversationId: z.string().min(1),
  pendingAttachmentIds: z.array(z.string()).optional(),
});

type ChatRequest = {
  messages: UIMessage[];
  model: string;
  conversationId: string;
  pendingAttachmentIds?: string[];
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Malformed or empty JSON request body.' }, { status: 400 });
  }

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const {
    messages,
    model,
    conversationId,
    pendingAttachmentIds,
  } = parsed.data as ChatRequest;

  try {
    // 1. Eagerly persist the user's message and link attachments BEFORE inference starts
    // so prompts are never lost if capability sensing, vision loading, or Ollama streaming fails.
    await persistUserTurn({ messages, conversationId, pendingAttachmentIds });

    const caps = await getModelCapabilities(model);
    const withImages = caps.vision ? await injectVisionImages(messages, conversationId, pendingAttachmentIds) : messages;
    const ctx = await buildChatContext({
      conversationId,
      messages: withImages,
      caps,
      pendingAttachmentIds,
    });

    const result = streamText({
      model: ollama(model),
      system: ctx.system,
      messages: [...ctx.documentMessages, ...(await convertToModelMessages(ctx.history))],
      providerOptions: {
        ollama: { ...(caps.thinking ? { think: true } : {}), options: { num_ctx: ctx.numCtx } },
      },
      // Ground-truth telemetry: this is streamText's onFinish, which receives token usage
      onFinish: ({ totalUsage }) => {
        const actual = totalUsage.inputTokens;
        console.info('[chat:context]', JSON.stringify({ model, ...ctx.report, actualInputTokens: actual }));
        if (actual !== undefined && actual >= ctx.numCtx * 0.95) {
          console.warn(`[chat:context] input ${actual} >= 95% of num_ctx ${ctx.numCtx}: prompt was likely truncated`);
        }
      },
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: messages, // full, untrimmed, without synthetic doc messages, so persistence is unaffected
      generateMessageId: generateId,
      onFinish: async ({ messages: finalMessages }) => {
        try {
          await persistMessages({ finalMessages, conversationId, model, pendingAttachmentIds });
        } catch (err) {
          console.error('[chat:persist-error] Failed to persist assistant response:', err);
        }
      },
    });
  } catch (err) {
    console.error('[chat:error] Pre-stream pipeline failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to start chat stream.';
    return Response.json({ error: message }, { status: 500 });
  }
}
