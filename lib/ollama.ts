// ── Ollama Base Configuration ────────────────────────────────────────
// Default endpoint for Ollama API calls. Driven by environment variables.
export const OLLAMA_BASE =
  process.env.OLLAMA_BASE_URL ||
  process.env.OLLAMA_HOST ||
  'http://127.0.0.1:11434';

export type ModelCapabilities = {
  vision: boolean;
  thinking: boolean;
  contextLength: number | null;
};

/*
 * ── Model Capabilities Detection ───────────────────────────────────
 * Detects what a model can do via Ollama's /api/show endpoint.
 */
export async function getModelCapabilities(
  model: string,
): Promise<ModelCapabilities> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });
    if (!res.ok) return { vision: false, thinking: false, contextLength: null };

    const data = await res.json();
    const info: Record<string, unknown> = data.model_info ?? {};
    const arch = info['general.architecture'];
    const rawCtx =
      (typeof arch === 'string' ? info[`${arch}.context_length`] : undefined) ??
      Object.entries(info).find(([k]) => k.endsWith('.context_length'))?.[1];
    const contextLength = typeof rawCtx === 'number' ? rawCtx : null;

    const caps = Array.isArray(data.capabilities)
      ? (data.capabilities as string[])
      : null;

    if (caps && caps.length > 0) {
      return {
        vision: caps.includes('vision'),
        thinking: caps.includes('thinking'),
        contextLength,
      };
    }

    // Fallback for models without a capabilities array.
    const template: string = data.template || '';
    const modelfile: string = data.modelfile || '';
    const thinking =
      template.toLowerCase().includes('think') ||
      /^RENDERER\s/m.test(modelfile);
    return { vision: false, thinking, contextLength };
  } catch {
    return { vision: false, thinking: false, contextLength: null };
  }
}

import { APP_MAX_CTX, FALLBACK_CTX } from './chat/limits';

/** num_ctx = the smaller of the model's maximum and the app ceiling. Stable per model. */
export function resolveNumCtx(contextLength: number | null): number {
  return Math.min(contextLength ?? FALLBACK_CTX, APP_MAX_CTX);
}
