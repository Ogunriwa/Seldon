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
import { z } from 'zod';
import { getModelCapabilities } from '@/lib/ollama';

const querySchema = z.object({
  model: z.string().trim().min(1, 'model is required').max(200),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ model: searchParams.get('model') ?? '' });

  if (!parsed.success) {
    return Response.json({ error: 'model is required' }, { status: 400 });
  }

  const capabilities = await getModelCapabilities(parsed.data.model);
  return Response.json(capabilities);
}
