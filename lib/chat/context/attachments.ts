import { db } from '@/lib/db/client';
import { attachments } from '@/lib/db/schema';
import { eq, and, isNotNull, inArray, or, asc } from 'drizzle-orm';
import { ContextDoc } from './library';

export async function loadAttachmentDocs(
  conversationId: string,
  pendingAttachmentIds?: string[],
): Promise<ContextDoc[]> {
  const hasPending = pendingAttachmentIds && pendingAttachmentIds.length > 0;

  const condition = and(
    eq(attachments.conversationId, conversationId),
    isNotNull(attachments.extractedText),
    hasPending
      ? or(
          isNotNull(attachments.messageId),
          inArray(attachments.id, pendingAttachmentIds),
        )
      : isNotNull(attachments.messageId),
  );

  const rows = await db
    .select({ filename: attachments.filename, extractedText: attachments.extractedText })
    .from(attachments)
    .where(condition)
    .orderBy(asc(attachments.createdAt));

  return rows.map((r) => ({ name: r.filename, source: 'attachment', text: r.extractedText! }));
}
