type OllamaTag = { name: string; model: string };

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

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

