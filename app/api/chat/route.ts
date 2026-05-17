import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';

export const maxDuration = 60;

const ollama = createOllama({ baseURL: 'http://localhost:11434/api' });

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model: string } =
    await req.json();

  const result = streamText({
    model: ollama(model),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
