import { db } from '@/lib/db/client';
import { attachments } from '@/lib/db/schema';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import type { UIMessage } from 'ai';
import path from 'path';
import fs from 'fs';

export async function injectVisionImages(messages: UIMessage[], conversationId: string, pendingAttachmentIds?: string[]) {
  const imageRows = await db
    .select({
      id: attachments.id,
      messageId: attachments.messageId,
      mediaType: attachments.mediaType,
      data: attachments.data,
      filePath: attachments.filePath,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.conversationId, conversationId),
        or(isNotNull(attachments.filePath), isNotNull(attachments.data)),
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

  return Promise.all(
    messages.map(async (m, i) => {
      const imgs = [...(byMessageId.get(m.id) ?? [])];
      if (i === lastUserIndex) imgs.push(...pendingImages);
      if (imgs.length === 0) return m;

      const imageParts = (
        await Promise.all(
          imgs.map(async (img) => {
            let base64 = img.data;
            if (!base64 && img.filePath) {
              try {
                const absPath = path.isAbsolute(img.filePath)
                  ? img.filePath
                  : path.join(process.cwd(), img.filePath);
                const buf = await fs.promises.readFile(absPath);
                base64 = buf.toString('base64');
              } catch (e) {
                console.error(`Failed to read image at ${img.filePath}:`, e);
              }
            }
            if (!base64) return null;
            return {
              type: 'file' as const,
              mediaType: img.mediaType,
              url: `data:${img.mediaType};base64,${base64}`,
            };
          }),
        )
      ).filter(Boolean) as Array<{ type: 'file'; mediaType: string; url: string }>;

      return { ...m, parts: [...m.parts, ...imageParts] };
    }),
  );
}
