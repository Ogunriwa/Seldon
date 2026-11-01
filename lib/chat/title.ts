/**
 * Title derivation and sanitization utilities for Quick Chats and Project Threads.
 *
 * Used by:
 *   - app/api/conversations/route.ts             (instant heuristic title on creation)
 *   - app/api/projects/[id]/threads/route.ts     (instant heuristic title on thread creation)
 *   - app/api/conversations/[id]/title/route.ts  (post-processing LLM-generated 3–6 word title)
 */

const MAX_INITIAL_LEN = 50;
const MAX_GENERATED_LEN = 60;

/**
 * Derives a clean, readable initial title from the user's first prompt.
 * - Picks the first non-empty line
 * - Strips terminal prompt prefixes (e.g. `user@MacBook ~ % `), markdown markers, and stray quotes
 * - Truncates cleanly at a word boundary rather than slicing mid-word
 */
export function deriveInitialTitle(raw: string, fallback = 'New chat'): string {
  if (!raw || typeof raw !== 'string') return fallback;

  const firstLine =
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';

  if (!firstLine) return fallback;

  // Strip common terminal prompts (`user@host dir % `, `$ `, `> `), markdown headers, and leading quotes
  let cleaned = firstLine
    .replace(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\s+[^\s%$#>]*\s*[%$#>]\s*/, '')
    .replace(/^[$#>/?*\-\s"“”'`]+/, '')
    .replace(/["“”'`]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;

  if (cleaned === '(file upload)' || cleaned === '(see attached files)') {
    return 'File analysis';
  }

  // If the first sentence is concise (<= MAX_INITIAL_LEN), use just that sentence
  const sentenceMatch = cleaned.match(/^(.+?[.?!])\s+/);
  if (sentenceMatch && sentenceMatch[1].length <= MAX_INITIAL_LEN) {
    cleaned = sentenceMatch[1].replace(/[.!]$/, '');
  }

  if (cleaned.length <= MAX_INITIAL_LEN) {
    return cleaned;
  }

  // Truncate at the last word boundary at or before MAX_INITIAL_LEN
  const slice = cleaned.slice(0, MAX_INITIAL_LEN + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const wordBoundary = lastSpace >= 20 ? slice.slice(0, lastSpace) : cleaned.slice(0, MAX_INITIAL_LEN);

  return wordBoundary.replace(/[,;:.!\-\s]+$/, '').trim() || fallback;
}

/**
 * Cleans the raw output of an LLM title-generation call into a crisp 3–6 word title.
 */
export function cleanGeneratedTitle(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Remove any <think>...</think> blocks if a reasoning model emitted them
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const firstLine =
    withoutThink
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';

  if (!firstLine) return null;

  let cleaned = firstLine
    .replace(/^(title|topic|summary|subject)\s*:\s*/i, '')
    .replace(/^[#*"“”'`\-\s]+/, '')
    .replace(/[*."“”'`]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) return null;

  if (cleaned.length > MAX_GENERATED_LEN) {
    const slice = cleaned.slice(0, MAX_GENERATED_LEN + 1);
    const lastSpace = slice.lastIndexOf(' ');
    cleaned = (lastSpace >= 20 ? slice.slice(0, lastSpace) : cleaned.slice(0, MAX_GENERATED_LEN))
      .replace(/[,;:.!\-\s]+$/, '')
      .trim();
  }

  return cleaned || null;
}
