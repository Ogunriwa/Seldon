import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { db } from '@/lib/db/client';
import { conversations, messages as messagesTable, attachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { persistUserTurn, persistMessages } from '@/lib/chat/persist';

describe('CSRF & Cross-Origin Proxy Guard (proxy.ts)', () => {
  it('blocks state-changing POST requests with Sec-Fetch-Site: cross-site with 403', () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
      },
    });

    const res = proxy(req);
    expect(res.status).toBe(403);
  });

  it('blocks state-changing POST requests from a mismatched Origin header with 403', () => {
    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.com',
        host: 'localhost:3000',
      },
    });

    const res = proxy(req);
    expect(res.status).toBe(403);
  });

  it('allows same-origin POST requests and read-only GET requests', () => {
    const sameOriginPost = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'sec-fetch-site': 'same-origin',
      },
    });
    expect(proxy(sameOriginPost).status).toBe(200);

    const getReq = new NextRequest('http://localhost:3000/api/models', {
      method: 'GET',
    });
    expect(proxy(getReq).status).toBe(200);
  });
});

describe('Eager User Turn & Stream Completion Persistence (persist.ts)', () => {
  const createdConvIds: string[] = [];

  afterEach(async () => {
    for (const id of createdConvIds) {
      await db.delete(conversations).where(eq(conversations.id, id));
    }
    createdConvIds.length = 0;
  });

  it('eagerly persists the user message and binds pending attachments before streaming, then skips empty assistant turns', async () => {
    const convId = `test-conv-${generateId()}`;
    createdConvIds.push(convId);
    const now = new Date();

    await db.insert(conversations).values({
      id: convId,
      title: 'Persistence Test Chat',
      model: 'gemma4:e4b',
      createdAt: now,
      updatedAt: now,
    });

    const attId = `test-att-${generateId()}`;
    await db.insert(attachments).values({
      id: attId,
      conversationId: convId,
      messageId: null,
      filename: 'notes.txt',
      mediaType: 'text/plain',
      sizeBytes: 12,
      extractedText: 'Hello Seldon',
      createdAt: now,
    });

    const userMsgId = `u-${generateId()}`;
    await persistUserTurn({
      conversationId: convId,
      pendingAttachmentIds: [attId],
      messages: [
        {
          id: userMsgId,
          role: 'user',
          parts: [{ type: 'text', text: 'Summarize notes.txt' }],
        },
      ],
    });

    // Verify user message is immediately in SQLite and attachment is bound
    const afterUserTurn = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId));
    expect(afterUserTurn).toHaveLength(1);
    expect(afterUserTurn[0].id).toBe(userMsgId);
    expect(afterUserTurn[0].content).toBe('Summarize notes.txt');

    const [linkedAtt] = await db.select().from(attachments).where(eq(attachments.id, attId));
    expect(linkedAtt.messageId).toBe(userMsgId);

    // Verify empty assistant turn (e.g. aborted stream) is NOT persisted
    await persistMessages({
      conversationId: convId,
      model: 'gemma4:e4b',
      finalMessages: [
        {
          id: userMsgId,
          role: 'user',
          parts: [{ type: 'text', text: 'Summarize notes.txt' }],
        },
        {
          id: `a-empty-${generateId()}`,
          role: 'assistant',
          parts: [{ type: 'text', text: '   ' }],
        },
      ],
    });

    const afterAbortedStream = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId));
    expect(afterAbortedStream).toHaveLength(1);

    // Verify completed assistant turn with reasoning IS persisted without duplicating the user turn
    const assistantMsgId = `a-full-${generateId()}`;
    await persistMessages({
      conversationId: convId,
      model: 'gemma4:e4b',
      finalMessages: [
        {
          id: userMsgId,
          role: 'user',
          parts: [{ type: 'text', text: 'Summarize notes.txt' }],
        },
        {
          id: assistantMsgId,
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Reading the attachment...' },
            { type: 'text', text: 'The file says Hello Seldon.' },
          ],
        },
      ],
    });

    const afterFullStream = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId));
    expect(afterFullStream).toHaveLength(2);
    const assistantRow = afterFullStream.find((m) => m.id === assistantMsgId);
    expect(assistantRow?.content).toBe('The file says Hello Seldon.');
    expect(assistantRow?.reasoning).toBe('Reading the attachment...');
    expect(assistantRow?.model).toBe('gemma4:e4b');
  });
});
