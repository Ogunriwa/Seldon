/**
 * API Route: /api/projects/[id]/libraries
 * Methods: GET, POST
 * 
 * Called by:
 *   - LibrariesTab (GET to list libraries, POST to upload/add files)
 *   - StartProjectModal (POST to upload attached files after project creation)
 * 
 * This route lists project library items and handles the ingestion of new resources,
 * differentiating between raw file uploads and direct payload submissions (like links).
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { libraries } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';
import { extractText } from '@/lib/extract';

// ── GET: List Library Items ─────────────────────────────────────────────────
/* 
 * Fetches all library files/links/artifacts for the specified project. 
 * Can optionally filter by the 'type' query parameter.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const url = new URL(req.url);
  const typeFilter = url.searchParams.get('type');

  const rows = await db
    .select()
    .from(libraries)
    .where(eq(libraries.projectId, projectId))
    .orderBy(desc(libraries.createdAt));

  const filtered = typeFilter
    ? rows.filter((r) => r.type === typeFilter)
    : rows;

  return Response.json({ files: filtered });
}

// ── POST: Add to Library ────────────────────────────────────────────────────
/* 
 * Entry point for adding resources to a project's library.
 * Branches into multipart form handling (for actual file uploads) and 
 * JSON payload handling (for text references, artifacts, or web links).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const contentType = req.headers.get('content-type') || '';

  const now = new Date();

  // ── Handling Multipart Form (File Uploads) ──
  // Check if multipart form upload or JSON (e.g. web link or text reference)
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as 'reference' | 'artifact' | 'weblink') || 'reference';
    const addedBy = (formData.get('addedBy') as string) || 'User';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Guard: reject files larger than 10 MB before reading into memory
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedContent: string | null = null;

    try {
      const res = await extractText(buffer, file.name, file.type);
      extractedContent = res.text;
    } catch (e) {
      console.error('File extraction error:', e);
    }

    const fileId = generateId();
    await db.insert(libraries).values({
      id: fileId,
      projectId,
      filename: file.name,
      mediaType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      extractedText: extractedContent,
      type,
      includeInContext: true,
      addedBy,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({
      id: fileId,
      filename: file.name,
      mediaType: file.type,
      sizeBytes: file.size,
      type,
      includeInContext: true,
      addedBy,
      createdAt: now,
    });
  }

  // ── Handling JSON Payload (Manual Text/Web Links) ──
  // JSON payload (e.g. web link or manual entry)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const schema = z.object({
    filename: z.string().min(1),
    url: z.string().optional(),
    mediaType: z.string().optional(),
    type: z.enum(['reference', 'artifact', 'weblink']).optional(),
    content: z.string().optional(),
    addedBy: z.string().optional(),
    includeInContext: z.boolean().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const fileId = generateId();
  await db.insert(libraries).values({
    id: fileId,
    projectId,
    filename: parsed.data.filename,
    url: parsed.data.url || null,
    mediaType: parsed.data.mediaType || (parsed.data.url ? 'text/uri-list' : 'text/plain'),
    sizeBytes: parsed.data.content ? Buffer.byteLength(parsed.data.content) : 0,
    extractedText: parsed.data.content || null,
    type: parsed.data.type || (parsed.data.url ? 'weblink' : 'reference'),
    includeInContext: parsed.data.includeInContext ?? true,
    addedBy: parsed.data.addedBy || 'User',
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({
    id: fileId,
    ...parsed.data,
    createdAt: now,
  });
}
