import { describe, it, expect } from 'vitest';
import { deriveInitialTitle, cleanGeneratedTitle } from '@/lib/chat/title';

describe('Title Derivation & LLM Title Sanitization (title.ts)', () => {
  it('strips terminal prompt prefixes and markdown formatting in deriveInitialTitle', () => {
    const raw = 'arogundade@MacBook-Pro Seldon % pnpm test:unit --watch';
    expect(deriveInitialTitle(raw)).toBe('pnpm test:unit --watch');

    expect(deriveInitialTitle('### "How does Sandwich Prompting work?"')).toBe(
      'How does Sandwich Prompting work?'
    );
  });

  it('truncates long prompts cleanly at a word boundary <= 50 chars', () => {
    const longPrompt =
      'Explain the exact difference between Pass 1 fair-share allocation and Pass 2 greedy top-up in Seldon';
    const title = deriveInitialTitle(longPrompt);

    expect(title.length).toBeLessThanOrEqual(50);
    expect(title).toBe('Explain the exact difference between Pass 1');
  });

  it('maps file-upload placeholders to "File analysis" and empty inputs to fallback', () => {
    expect(deriveInitialTitle('(file upload)')).toBe('File analysis');
    expect(deriveInitialTitle('   \n  ', 'New thread')).toBe('New thread');
  });

  it('strips <think> blocks, prefixes, and quotes in cleanGeneratedTitle', () => {
    const llmOutput = `<think>The user is asking about SQLite WAL mode.</think>\nTitle: "SQLite WAL Concurrency Setup."`;
    expect(cleanGeneratedTitle(llmOutput)).toBe('SQLite WAL Concurrency Setup');
  });
});
