import { db } from '@/lib/db/client';
import { attachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const att = await db
    .select({
      mediaType: attachments.mediaType,
      data: attachments.data,
      filePath: attachments.filePath,
    })
    .from(attachments)
    .where(eq(attachments.id, id))
    .get();

  if (!att) {
    return new Response('Attachment not found', { status: 404 });
  }

  // 1. Preferred Option A: Stream directly from local disk
  if (att.filePath) {
    const absPath = path.isAbsolute(att.filePath)
      ? att.filePath
      : path.join(process.cwd(), att.filePath);

    try {
      const buffer = await fs.promises.readFile(absPath);
      return new Response(buffer, {
        headers: {
          'Content-Type': att.mediaType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new Response('File not found on disk', { status: 404 });
    }
  }

  // 2. Fallback for historical rows stored as base64 in data column
  if (att.data) {
    const buffer = Buffer.from(att.data, 'base64');
    return new Response(buffer, {
      headers: {
        'Content-Type': att.mediaType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new Response('No image data found', { status: 404 });
}
