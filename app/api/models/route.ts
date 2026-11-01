/**
 * API Route: /api/models
 * Methods: GET
 *
 * Called by:
 *   - components/chat.tsx                    (GET — populate model dropdown on mount)
 *   - components/home/home-view.tsx          (GET — populate Home Screen composer model picker)
 *   - components/projects/tabs/threads-tab.tsx (GET — populate project composer model picker)
 *   - components/projects/agents/agent-drawer.tsx (GET — populate agent model dropdown)
 *
 * Proxies Ollama's /api/tags endpoint to discover locally available models.
 * Returns a sorted list of model name strings. Handles Ollama being offline
 * gracefully with a 503 status and descriptive error message.
 */
import { OLLAMA_BASE } from '@/lib/ollama';

/** Import Ollama */

type OllamaTag = { name: string; model: string };

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return Response.json(
        { models: [], error: `Ollama returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { models?: OllamaTag[] };
    const models = (data.models ?? []).map((m) => m.name).sort();
    return Response.json({ models });
  } catch (error: any) {
    console.error('Failed to fetch Ollama models:', error);
    return Response.json(
      { models: [], error: error.message || 'Ollama is offline or unreachable' },
      { status: 503 },
    );
  }
}

