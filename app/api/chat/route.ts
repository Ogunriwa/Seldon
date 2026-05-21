import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
} from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { db } from '@/lib/db/client';
import { messages as messagesTable, conversations, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const maxDuration = 60;

const ollama = createOllama({ baseURL: 'http://localhost:11434/api' });

const chatSchema = z.object({
  messages: z.array(z.any()),
  model: z.string().min(1),
  conversationId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const {
    messages,
    model,
    conversationId,
  }: { messages: UIMessage[]; model: string; conversationId: string } =
    parsed.data;

  let systemPrompt: string | undefined;
  const convo = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get();

  if (convo?.projectId) {
    const project = await db
      .select({ instructions: projects.instructions })
      .from(projects)
      .where(eq(projects.id, convo.projectId))
      .get();
    if (project?.instructions) systemPrompt = project.instructions;
  }

  const result = streamText({
    model: ollama(model),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    providerOptions: { ollama: {} },
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      const existingIds = new Set(
        (
          await db
            .select({ id: messagesTable.id })
            .from(messagesTable)
            .where(eq(messagesTable.conversationId, conversationId))
        ).map((r) => r.id),
      );

      for (const msg of finalMessages) {
        const id = msg.id || generateId();
        if (existingIds.has(id)) continue;
        existingIds.add(id);

        const text = msg.parts
          .map((p) => (p.type === 'text' ? p.text : ''))
          .join('');

        await db.insert(messagesTable).values({
          id,
          conversationId,
          role: msg.role,
          content: text,
          model: msg.role === 'assistant' ? model : null,
          createdAt: new Date(),
        });
      }

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    },
  });
}
