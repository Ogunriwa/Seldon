import { db } from '@/lib/db/client';
import { attachments, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { extractText } from '@/lib/extract';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

const ALLOWED_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/pdf',
];

// Image types handled separately — stored as base64 for vision models, not
// text-extracted.
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
  return '.' + (filename.split('.').pop()?.toLowerCase() ?? '');
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const conversationId = formData.get('conversationId');

  if (!conversationId || typeof conversationId !== 'string') {
    return Response.json(
      { error: 'conversationId is required' },
      { status: 400 },
    );
  }

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
    error: string | null;
  }> = [];

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
        error: `Unsupported file type: ${mediaType}. Upload text, code, PDF, image, CSV, or JSON files.`,
      });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (isImage(mediaType, filename)) {
        // Images: store base64, no text extraction. Sent to vision models as
        // image parts at chat time.
        results.push({
          id,
          filename,
          mediaType,
          sizeBytes,
          extractedText: null,
          data: buffer.toString('base64'),
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
      error: r.error,
      createdAt: new Date(),
    });
  }

  return Response.json({ attachments: results });
}
