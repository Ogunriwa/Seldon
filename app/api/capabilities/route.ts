import { getModelCapabilities } from '@/lib/ollama';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const model = searchParams.get('model');

  if (!model) {
    return Response.json({ error: 'model is required' }, { status: 400 });
  }

  const capabilities = await getModelCapabilities(model);
  return Response.json(capabilities);
}
