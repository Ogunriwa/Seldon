/*
 * ── Context Limits ──────────────────────────────────────────────
 * Single source of truth for token estimation and budget shares.
 * Imported by BOTH server code (chat route, memory routes) and client
 * code (memories-tab). Must not import anything server-only.
 */
export const CHARS_PER_TOKEN = 4;          // rough heuristic; telemetry checks it
export const APP_MAX_CTX = 16_384;         // app-wide ceiling for num_ctx
export const FALLBACK_CTX = 8_192;         // used when Ollama doesn't report a context length

export const MEMORY_SHARE = 0.25;          // memories: at most 25% of num_ctx
export const DOC_SHARE = 0.5;              // documents: at most 50% of num_ctx
export const PER_FILE_SHARE = 0.4;         // one file: at most 40% of the document budget (pass 1)
export const OUTPUT_RESERVE = 2_048;       // room for the reply
export const THINKING_RESERVE = 4_096;     // extra room for thinking models
export const IMAGE_TOKEN_ESTIMATE = 768;   // rough cost of one image for vision models
export const MIN_DOC_TOKENS = 50;          // ≈200 chars; matches the old "remaining > 200" rule

export const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

/** Pinned-memory limit for a given window. Default = the limit enforced when pinning. */
export const pinnedMemoryLimit = (numCtx: number = APP_MAX_CTX) =>
  Math.floor(numCtx * MEMORY_SHARE);

/** Total tokens for a set of pinned memories (sums chars first, same as the UI). */
export const estimatePinnedTokens = (contents: string[]) =>
  Math.ceil(contents.reduce((n, c) => n + c.length, 0) / CHARS_PER_TOKEN);
