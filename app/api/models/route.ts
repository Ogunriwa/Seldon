type OllamaTag = { name: string; model: string };

export async function GET() {
  const res = await fetch('http://localhost:11434/api/tags', {
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
}
