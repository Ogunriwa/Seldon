/**
 * API Route: /api/capabilities
 * Methods: GET
 *
 * Called by:
 *   - components/chat.tsx    (GET — detect if selected model supports vision/thinking)
 *
 * Returns { vision: boolean, thinking: boolean } for a given model name.
 * Used by the chat component to decide whether to show the file attachment
 * button (vision) and to enable extended reasoning display (thinking).
 * Delegates to lib/ollama.ts → getModelCapabilities() which queries Ollama's
 * /api/show endpoint and inspects model metadata.
 */
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
