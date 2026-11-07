import { db } from '@/lib/db/client';
import { attachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const attachmentIdSchema = z.string().trim().min(1).max(128);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawParams = await params;
  const parsedId = attachmentIdSchema.safeParse(rawParams.id);
  if (!parsedId.success) {
    return new Response('Invalid attachment ID', { status: 400 });
  }
  const id = parsedId.data;

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

  // 1. Preferred Option A: Stream directly from local disk with strict path containment
  if (att.filePath) {
    const uploadsRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'data', 'uploads');
    const absPath = path.isAbsolute(att.filePath)
      ? path.resolve(att.filePath)
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), att.filePath);

    if (!absPath.startsWith(uploadsRoot + path.sep)) {
      return new Response('Forbidden: Attachment path outside uploads directory', { status: 403 });
    }

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
