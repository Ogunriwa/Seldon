import { describe, it, expect } from 'vitest';
import { packDocuments, trimHistory, messageTokens } from '@/lib/chat/context/budget';
import { CHARS_PER_TOKEN, IMAGE_TOKEN_ESTIMATE } from '@/lib/chat/limits';
import type { ContextDoc } from '@/lib/chat/context/library';
import type { UIMessage } from 'ai';

describe('packDocuments (Two-Pass Context Budgeting)', () => {
  it('enforces Pass 1 fair-share cap (40%) and tops up with Pass 2 in priority order', () => {
    // 1000-token budget => Pass 1 perFileCap = 400 tokens
    const docs: ContextDoc[] = [
      { name: 'doc1.txt', source: 'library', text: 'A'.repeat(700 * CHARS_PER_TOKEN) }, // ~700 tokens
      { name: 'doc2.txt', source: 'attachment', text: 'B'.repeat(200 * CHARS_PER_TOKEN) }, // ~200 tokens
    ];

    const result = packDocuments(docs, 1000);

    expect(result.skipped).toEqual([]);
    expect(result.packed).toHaveLength(2);
    // doc1 gets 400 in Pass 1 + leftover ~300 in Pass 2 => full 700 tokens (2800 chars)
    expect(result.packed[0].name).toBe('doc1.txt');
    expect(result.packed[0].text.length).toBe(700 * CHARS_PER_TOKEN);
    expect(result.packed[0].truncatedFrom).toBeUndefined();

    // doc2 gets its full 200 tokens in Pass 1
    expect(result.packed[1].name).toBe('doc2.txt');
    expect(result.packed[1].text.length).toBe(200 * CHARS_PER_TOKEN);
  });

  it('skips oversized documents when remaining budget is too small instead of breaking the loop', () => {
    // Budget 250 => perFileCap = 100 tokens.
    // Doc 1 takes 100 tokens + ~33 overhead (~133 used, ~117 remaining).
    // Doc 2 wants 100 tokens + ~33 overhead (~133 needed > 117 remaining) => skipped in Pass 1!
    // Doc 3 is a tiny 20-token file (~53 needed <= 117 remaining) => MUST still be packed!
    const docs: ContextDoc[] = [
      { name: 'medium.txt', source: 'library', text: 'M'.repeat(100 * CHARS_PER_TOKEN) },
      { name: 'huge.txt', source: 'library', text: 'H'.repeat(500 * CHARS_PER_TOKEN) },
      { name: 'tiny.txt', source: 'attachment', text: 'T'.repeat(20 * CHARS_PER_TOKEN) },
    ];

    const result = packDocuments(docs, 250);
    const packedNames = result.packed.map((d) => d.name);

    expect(packedNames).toContain('medium.txt');
    expect(packedNames).toContain('tiny.txt');
  });

  it('never starves tiny files smaller than MIN_DOC_TOKENS (50 tokens)', () => {
    const tinySecret: ContextDoc = {
      name: 'secret.txt',
      source: 'library',
      text: 'API_KEY=local-dev-secret-12345', // ~8 tokens (< 50 MIN_DOC_TOKENS)
    };

    const result = packDocuments([tinySecret], 500);
    expect(result.skipped).toEqual([]);
    expect(result.packed).toHaveLength(1);
    expect(result.packed[0].text).toBe(tinySecret.text);
  });

  it('never produces negative token grants when remaining budget is smaller than XML tag overhead', () => {
    // Tiny budget (15 tokens) is smaller than XML wrapper overhead (~33 tokens)
    const doc: ContextDoc = {
      name: 'notes.md',
      source: 'library',
      text: 'Hello world',
    };

    const result = packDocuments([doc], 15);
    expect(result.packed).toEqual([]);
    expect(result.skipped).toEqual(['notes.md']);
    expect(result.usedTokens).toBe(0);
  });
});

describe('trimHistory (Conversation History Windowing)', () => {
  const makeMsg = (id: string, role: 'user' | 'assistant', chars: number): UIMessage => ({
    id,
    role,
    parts: [{ type: 'text', text: 'x'.repeat(chars) }],
  });

  it('always preserves the newest user message even if it exceeds the budget alone', () => {
    const messages: UIMessage[] = [
      makeMsg('u1', 'user', 400),
      makeMsg('a1', 'assistant', 400),
      makeMsg('u2', 'user', 2000), // 500+ tokens
    ];

    const { kept, dropped } = trimHistory(messages, 100);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('u2');
    expect(dropped).toBe(2);
  });

  it('drops user/assistant pairs together so the kept window never starts on an orphaned assistant message', () => {
    // Each message costs (100 chars / 4) + 4 overhead = 29 tokens.
    // Budget for 2 messages = 58 tokens (fits a1 + u2, which would start on assistant 'a1').
    // trimHistory must advance `start` so 'a1' is dropped along with 'u1'.
    const messages: UIMessage[] = [
      makeMsg('u1', 'user', 100),
      makeMsg('a1', 'assistant', 100),
      makeMsg('u2', 'user', 100),
    ];

    const { kept, dropped } = trimHistory(messages, 60);
    expect(kept[0].role).toBe('user');
    expect(kept.map((m) => m.id)).toEqual(['u2']);
    expect(dropped).toBe(2);
  });

  it('accounts for IMAGE_TOKEN_ESTIMATE (768 tokens) on file parts', () => {
    const msgWithImage: UIMessage = {
      id: 'u-img',
      role: 'user',
      parts: [
        { type: 'text', text: 'What is in this diagram?' },
        { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,AAAA' },
      ],
    };

    const tokens = messageTokens(msgWithImage);
    expect(tokens).toBeGreaterThanOrEqual(IMAGE_TOKEN_ESTIMATE + 4);
  });
});
