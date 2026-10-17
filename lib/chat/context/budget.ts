import type { UIMessage } from 'ai';
import { CHARS_PER_TOKEN, PER_FILE_SHARE, MIN_DOC_TOKENS, estimateTokens, IMAGE_TOKEN_ESTIMATE } from '../limits';
import { ContextDoc } from './library';
import { renderDocument } from './assemble';

export type PackedDoc = ContextDoc & { truncatedFrom?: number };

/**
 * Fits documents into `budget` tokens. Order = priority (library first, then attachments).
 * Pass 1: each file gets at most PER_FILE_SHARE of the budget; files that don't fit are
 *         SKIPPED (continue), not a reason to stop (fixes the old `break`).
 * Pass 2: leftover budget tops up truncated or skipped files, in priority order.
 * Headers count against the budget (fixes the old header bug).
 */
export function packDocuments(docs: ContextDoc[], budget: number) {
  const perFileCap = Math.floor(budget * PER_FILE_SHARE);
  const sizes = docs.map((d) => estimateTokens(d.text));
  const overheads = docs.map((d) => estimateTokens(renderDocument({ ...d, text: '' })) + 20); // tags + truncation note
  const grants = docs.map(() => 0);
  let remaining = budget;

  // Pass 1: capped, greedy, skip-if-it-doesn't-fit
  docs.forEach((_, i) => {
    const want = Math.min(sizes[i], perFileCap);
    // Only enforce a minimum chunk size if we are truncating the file
    const isValidChunk = want === sizes[i] || want >= MIN_DOC_TOKENS;
    if (want > 0 && isValidChunk && want + overheads[i] <= remaining) {
      grants[i] = want;
      remaining -= want + overheads[i];
    }
  });

  // Pass 2: top-up with whatever is left
  for (let i = 0; i < docs.length && remaining > 0; i++) {
    const missing = sizes[i] - grants[i];
    if (missing <= 0) continue;
    const overhead = grants[i] === 0 ? overheads[i] : 0; // a file not yet included still needs its tags
    const availableForContent = Math.max(0, remaining - overhead);
    const extra = Math.min(missing, availableForContent);
    
    // Only enforce minimum extra chunk if we are leaving some behind (truncating further)
    const isTakingRest = extra === missing;
    const isValidExtra = isTakingRest || extra >= MIN_DOC_TOKENS;

    if (extra > 0 && isValidExtra) {
      grants[i] += extra;
      remaining -= extra + overhead;
    }
  }

  const packed: PackedDoc[] = [];
  const skipped: string[] = [];
  docs.forEach((d, i) => {
    if (grants[i] === 0) return skipped.push(d.name);
    const maxChars = grants[i] * CHARS_PER_TOKEN;
    packed.push(d.text.length > maxChars
      ? { ...d, text: d.text.slice(0, maxChars), truncatedFrom: d.text.length }
      : d);
  });

  return { packed, skipped, usedTokens: budget - remaining };
}

export const messageTokens = (m: UIMessage) =>
  m.parts.reduce((n, p) => {
    if (p.type === 'text' || p.type === 'reasoning') return n + estimateTokens(p.text);
    if (p.type === 'file') return n + IMAGE_TOKEN_ESTIMATE;
    return n;
  }, 4); // +4 ≈ per-message template overhead (role markers)

/**
 * Keeps the newest messages that fit in `budget`.
 * - The latest message (the user's current question) is ALWAYS kept.
 * - Walks backwards and stops at the first message that doesn't fit.
 * - Never starts on an assistant turn, so user/assistant pairs drop together.
 */
export function trimHistory(messages: UIMessage[], budget: number) {
  if (messages.length === 0) return { kept: messages, dropped: 0 };
  let start = messages.length - 1;
  let used = messageTokens(messages[start]);

  for (let i = start - 1; i >= 0; i--) {
    const cost = messageTokens(messages[i]);
    if (used + cost > budget) break;
    used += cost;
    start = i;
  }
  while (start < messages.length - 1 && messages[start].role !== 'user') start++;

  return { kept: messages.slice(start), dropped: start };
}
