/**
 * API Route: /api/upload
 * Methods: POST (multipart/form-data)
 *
 * Called by:
 *   - components/chat.tsx    (POST — upload files attached to a chat message)
 *
 * Handles file uploads for chat conversations. Accepts up to 5 files (10MB each).
 * Processing pipeline per file:
 *   1. Validate size (≤10MB) and MIME type (text, code, PDF, JSON, images)
 *   2. For images: store as base64 in `data` column for vision model forwarding
 *   3. For documents: extract text via lib/extract.ts into `extractedText` column
 *   4. Persist to `attachments` table with messageId=null (linked later by /api/chat)
 *
 * Partial success is allowed — individual file errors don't block other uploads.
 */
import { db } from '@/lib/db/client';
import { attachments, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';
import { extractText } from '@/lib/extract';

import path from 'path';
import fs from 'fs';

// ── Upload Limits & File Type Configuration ──────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

const uploadFieldsSchema = z.object({
  conversationId: z.string().trim().min(1, 'conversationId is required').max(128),
});

const ALLOWED_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/pdf',
];

// Image types handled separately — stored as raw files on disk in data/uploads/
// for vision models, not text-extracted.
const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function isImage(mediaType: string, filename: string): boolean {
  if (IMAGE_MIME_TYPES.has(mediaType)) return true;
  return IMAGE_EXTENSIONS.has(getExtension(filename));
}

// Extensions treated as text regardless of MIME type (browsers often send
// application/octet-stream for code files)
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.log',
  '.py', '.ts', '.js', '.jsx', '.tsx', '.mjs', '.cjs',
  '.rs', '.go', '.java', '.c', '.cpp', '.h', '.hpp',
  '.rb', '.sh', '.bash', '.zsh', '.fish',
  '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.scss',
  '.sql', '.graphql', '.gql', '.prisma',
  '.env', '.ini', '.cfg', '.conf',
  '.swift', '.kt', '.kts', '.scala', '.r', '.R',
  '.lua', '.pl', '.pm', '.php', '.ex', '.exs',
  '.zig', '.nim', '.v', '.d', '.dart',
  '.dockerfile', '.makefile',
]);

function isAllowedFile(mediaType: string, filename: string): boolean {
  if (ALLOWED_MIME_PREFIXES.some((p) => mediaType.startsWith(p))) return true;
  if (isImage(mediaType, filename)) return true;
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function getExtension(filename: string): string {
  const base = path.basename(filename);
  const dotIdx = base.lastIndexOf('.');
  return dotIdx !== -1 ? base.slice(dotIdx).toLowerCase() : '';
}

const MIME_TO_IMAGE_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function getSafeImageExtension(mediaType: string, filename: string): string {
  const rawExt = getExtension(filename);
  if (IMAGE_EXTENSIONS.has(rawExt)) return rawExt;
  return MIME_TO_IMAGE_EXT[mediaType] ?? '.png';
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: 'Invalid form data' },
      { status: 400 },
    );
  }
  const rawConversationId = formData.get('conversationId');
  const parsedFields = uploadFieldsSchema.safeParse({
    conversationId: typeof rawConversationId === 'string' ? rawConversationId : '',
  });

  if (!parsedFields.success) {
    return Response.json(
      { error: 'conversationId is required' },
      { status: 400 },
    );
  }
  const { conversationId } = parsedFields.data;

  // Verify conversation exists
  const convo = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get();

  if (!convo) {
    return Response.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  // Collect files from formData
  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'files' && value instanceof File) {
      files.push(value);
    }
  }

  if (files.length === 0) {
    return Response.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `Maximum ${MAX_FILES} files per upload` },
      { status: 400 },
    );
  }

  // Process each file independently — partial success is OK
  const results: Array<{
    id: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    extractedText: string | null;
    data: string | null;
    filePath: string | null;
    error: string | null;
  }> = [];

  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  for (const file of files) {
    const id = generateId();
    const filename = file.name || 'unnamed';
    const mediaType = file.type || 'application/octet-stream';
    const sizeBytes = file.size;

    // Size check
    if (sizeBytes > MAX_FILE_SIZE) {
      results.push({
        id,
        filename,
        mediaType,
        sizeBytes,
        extractedText: null,
        data: null,
        filePath: null,
        error: `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
      });
      continue;
    }

    // Type check
    if (!isAllowedFile(mediaType, filename)) {
      results.push({
        id,
        filename,
        mediaType,
        sizeBytes,
        extractedText: null,
        data: null,
        filePath: null,
        error: `Unsupported file type: ${mediaType}. Upload text, code, PDF, image, CSV, or JSON files.`,
      });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (isImage(mediaType, filename)) {
        // Option A: Write file to data/uploads/${id}${ext} with sanitized extension
        const ext = getSafeImageExtension(mediaType, filename);
        const diskPath = path.resolve(uploadsDir, `${id}${ext}`);
        if (!diskPath.startsWith(path.resolve(uploadsDir) + path.sep)) {
          throw new Error('Invalid upload destination path');
        }
        const relPath = path.join('data', 'uploads', `${id}${ext}`);
        await fs.promises.writeFile(diskPath, buffer);

        results.push({
          id,
          filename,
          mediaType,
          sizeBytes,
          extractedText: null,
          data: null,
          filePath: relPath,
          error: null,
        });
      } else {
        const { text, error } = await extractText(buffer, filename, mediaType);
        results.push({
          id,
          filename,
          mediaType,
          sizeBytes,
          extractedText: text,
          data: null,
          filePath: null,
          error,
        });
      }
    } catch (e) {
      results.push({
        id,
        filename,
        mediaType,
        sizeBytes,
        extractedText: null,
        data: null,
        filePath: null,
        error: 'An unexpected error occurred while processing this file.',
      });
    }
  }

  // Persist all results (including failures — we want to show errors in UI).
  // messageId is null until the message is sent and linked in /api/chat.
  for (const r of results) {
    await db.insert(attachments).values({
      id: r.id,
      messageId: null,
      conversationId,
      filename: r.filename,
      mediaType: r.mediaType,
      sizeBytes: r.sizeBytes,
      extractedText: r.extractedText,
      data: r.data,
      filePath: r.filePath,
      error: r.error,
      createdAt: new Date(),
    });
  }

  return Response.json({ attachments: results });
}
