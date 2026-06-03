import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
} from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { db } from '@/lib/db/client';
import { messages as messagesTable, conversations, projects, attachments } from '@/lib/db/schema';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { OLLAMA_BASE, getModelCapabilities } from '@/lib/ollama';

export const maxDuration = 60;

const ollama = createOllama({ baseURL: `${OLLAMA_BASE}/api` });

// Conservative context limit — truncate file content beyond this
const MAX_FILE_CONTEXT_CHARS = 32_000;

const chatSchema = z.object({
  messages: z.array(z.any()),
  model: z.string().min(1),
  conversationId: z.string().min(1),
  pendingAttachmentIds: z.array(z.string()).optional(),
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
    pendingAttachmentIds,
  }: {
    messages: UIMessage[];
    model: string;
    conversationId: string;
    pendingAttachmentIds?: string[];
  } = parsed.data;

  // Build system prompt from project instructions + attached files
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

  // Fetch all attachments with extracted text for this conversation
  const allAttachments = await db
    .select({
      filename: attachments.filename,
      extractedText: attachments.extractedText,
    })
    .from(attachments)
    .where(eq(attachments.conversationId, conversationId));

  const filesWithText = allAttachments.filter((a) => a.extractedText);

  if (filesWithText.length > 0) {
    let fileContext = '[Attached files]\n';
    let totalChars = 0;

    for (const file of filesWithText) {
      const text = file.extractedText!;
      const header = `--- ${file.filename} ---\n`;

      if (totalChars + text.length > MAX_FILE_CONTEXT_CHARS) {
        const remaining = MAX_FILE_CONTEXT_CHARS - totalChars;
        if (remaining > 200) {
          fileContext += header;
          fileContext += text.slice(0, remaining);
          fileContext += `\n[File content truncated — original was ${text.length.toLocaleString()} characters, showing first ${remaining.toLocaleString()}]\n`;
        }
        break;
      }

      fileContext += header;
      fileContext += text;
      fileContext += '\n';
      totalChars += text.length;
    }

    fileContext += '[End of attached files]\n\n';

    // Prepend file context to existing system prompt
    systemPrompt = systemPrompt
      ? fileContext + systemPrompt
      : fileContext;
  }

  const { vision, thinking } = await getModelCapabilities(model);

  // For vision models, attach image attachments to their messages as image
  // parts so convertToModelMessages forwards them to the model. Historical
  // images map by their linked messageId; freshly uploaded ones (this turn,
  // not yet linked) attach to the most recent user message.
  let modelMessages = messages;
  if (vision) {
    const imageRows = await db
      .select({
        id: attachments.id,
        messageId: attachments.messageId,
        mediaType: attachments.mediaType,
        data: attachments.data,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.conversationId, conversationId),
          isNotNull(attachments.data),
        ),
      );

    const pendingIds = new Set(pendingAttachmentIds ?? []);
    const byMessageId = new Map<string, typeof imageRows>();
    const pendingImages: typeof imageRows = [];

    for (const row of imageRows) {
      if (row.messageId) {
        const list = byMessageId.get(row.messageId) ?? [];
        list.push(row);
        byMessageId.set(row.messageId, list);
      } else if (pendingIds.has(row.id)) {
        pendingImages.push(row);
      }
    }

    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');

    modelMessages = messages.map((m, i) => {
      const imgs = [...(byMessageId.get(m.id) ?? [])];
      if (i === lastUserIndex) imgs.push(...pendingImages);
      if (imgs.length === 0) return m;

      const imageParts = imgs.map((img) => ({
        type: 'file' as const,
        mediaType: img.mediaType,
        url: `data:${img.mediaType};base64,${img.data}`,
      }));
      return { ...m, parts: [...m.parts, ...imageParts] };
    });
  }

  const result = streamText({
    model: ollama(model),
    system: systemPrompt,
    messages: await convertToModelMessages(modelMessages),
    providerOptions: { ollama: thinking ? { think: true } : {} },
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

      let firstNewUserMessageId: string | undefined;

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

        // Track the first new user message for linking attachments
        if (msg.role === 'user' && !firstNewUserMessageId) {
          firstNewUserMessageId = id;
        }
      }

      // Link pending attachments to the user message
      if (
        firstNewUserMessageId &&
        pendingAttachmentIds &&
        pendingAttachmentIds.length > 0
      ) {
        await db
          .update(attachments)
          .set({ messageId: firstNewUserMessageId })
          .where(inArray(attachments.id, pendingAttachmentIds));
      }

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    },
  });
}
