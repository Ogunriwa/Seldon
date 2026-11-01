/**
 * API Route: /api/conversations/[id]/title
 * Methods: POST
 *
 * Generates a concise 3–6 word title for a conversation after its first exchange
 * using the local Ollama model (Hybrid Title Strategy — Option C).
 * Never overwrites a title that the user has manually renamed.
 */
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { conversations, messages } from '@/lib/db/schema';
import { OLLAMA_BASE } from '@/lib/ollama';
import { cleanGeneratedTitle, deriveInitialTitle } from '@/lib/chat/title';

const ollama = createOllama({ baseURL: `${OLLAMA_BASE}/api` });

const bodySchema = z.object({
  userText: z.string().optional(),
  assistantText: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      rawBody = JSON.parse(text);
    }
  } catch {
    return Response.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();

  if (!conversation) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Load messages from DB if not provided in request body
  const dbMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(sql`rowid`));

  const firstUser =
    parsed.data.userText?.trim() ||
    dbMessages.find((m) => m.role === 'user')?.content?.trim() ||
    '';
  const firstAssistant =
    parsed.data.assistantText?.trim() ||
    dbMessages.find((m) => m.role === 'assistant')?.content?.trim() ||
    '';

  if (!firstUser) {
    return Response.json({ ok: false, title: conversation.title });
  }

  // Determine whether the conversation still has an auto-derived initial title.
  // If the user has already manually renamed the chat, do not overwrite their custom title.
  const expectedHeuristicChat = deriveInitialTitle(firstUser, 'New chat');
  const expectedHeuristicThread = deriveInitialTitle(firstUser, 'New Thread');
  const legacySlice = firstUser.replace(/^[#?/\s]+/, '').trim().slice(0, 40);
  const autoTitles = new Set([
    expectedHeuristicChat,
    expectedHeuristicThread,
    legacySlice,
    'New chat',
    'New Thread',
    'File analysis',
    '(file upload)',
  ]);

  if (!autoTitles.has(conversation.title)) {
    return Response.json({ ok: true, title: conversation.title, skipped: true });
  }

  const modelToUse = parsed.data.model || conversation.model;

  try {
    const userSnippet = firstUser.slice(0, 500);
    const assistantSnippet = firstAssistant.slice(0, 500);

    const { text } = await generateText({
      model: ollama(modelToUse),
      system:
        'You generate concise conversation titles. Reply with ONLY a 3 to 6 word title that captures the core topic. Do not use quotes, markdown, or trailing punctuation.',
      prompt: `User: ${userSnippet}\nAssistant: ${assistantSnippet}\n\nConcise 3 to 6 word title:`,
      providerOptions: {
        ollama: {
          think: false,
          options: {
            num_ctx: 2048,
            num_predict: 30,
            temperature: 0.3,
          },
        },
      },
    });

    const generated = cleanGeneratedTitle(text);
    if (!generated) {
      return Response.json({ ok: false, title: conversation.title });
    }

    // Re-verify the user did not manually rename the conversation while the LLM was running
    const latest = await db
      .select({ title: conversations.title })
      .from(conversations)
      .where(eq(conversations.id, id))
      .get();

    if (!latest || !autoTitles.has(latest.title)) {
      return Response.json({ ok: true, title: latest?.title ?? conversation.title, skipped: true });
    }

    await db
      .update(conversations)
      .set({ title: generated })
      .where(eq(conversations.id, id));

    return Response.json({ ok: true, title: generated });
  } catch (err) {
    console.warn('[chat:title] Background title generation skipped:', err);
    return Response.json({ ok: false, title: conversation.title });
  }
}
