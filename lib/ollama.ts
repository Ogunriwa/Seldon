export const OLLAMA_BASE =
  process.env.OLLAMA_BASE_URL ||
  process.env.OLLAMA_HOST ||
  'http://127.0.0.1:11434';

export type ModelCapabilities = {
  vision: boolean;
  thinking: boolean;
};

/**
 * Detects what a model can do via Ollama's /api/show endpoint.
 *
 * Newer models expose a `capabilities` array (e.g. ['completion','vision',
 * 'thinking']). Older ones (deepseek-r1, deepseek-coder-v2) omit it entirely,
 * so we fall back to template heuristics for thinking and assume no vision.
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
    if (!res.ok) return { vision: false, thinking: false };

    const data = await res.json();
    const caps = Array.isArray(data.capabilities)
      ? (data.capabilities as string[])
      : null;

    if (caps && caps.length > 0) {
      return {
        vision: caps.includes('vision'),
        thinking: caps.includes('thinking'),
      };
    }

    // Fallback for models without a capabilities array.
    const template: string = data.template || '';
    const modelfile: string = data.modelfile || '';
    const thinking =
      template.toLowerCase().includes('think') ||
      /^RENDERER\s/m.test(modelfile);
    return { vision: false, thinking };
  } catch {
    return { vision: false, thinking: false };
  }
}
