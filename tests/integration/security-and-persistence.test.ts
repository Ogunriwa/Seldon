import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { GET as getAttachment } from '@/app/api/attachments/[id]/route';
import { db } from '@/lib/db/client';
import { projects, libraries, conversations, messages as messagesTable, attachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { persistUserTurn, persistMessages } from '@/lib/chat/persist';
import { buildChatContext } from '@/lib/chat/context';

describe('CSRF, Origin & DNS Rebinding Proxy Guard (proxy.ts)', () => {
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

  it('blocks state-changing POST requests from a mismatched Origin header or Origin: null with 403', () => {
    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.com',
        host: 'localhost:3000',
      },
    });
    expect(proxy(req).status).toBe(403);

    const nullOriginReq = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        origin: 'null',
        host: 'localhost:3000',
      },
    });
    expect(proxy(nullOriginReq).status).toBe(403);
  });

  it('blocks DNS rebinding attacks (untrusted Host header) even on read-only GET requests with 403', () => {
    const rebindGet = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'GET',
      headers: {
        host: 'evil.rebind.network:3000',
        'sec-fetch-site': 'same-origin',
      },
    });

    expect(proxy(rebindGet).status).toBe(403);
  });

  it('allows same-origin POST requests and read-only GET requests on localhost / 127.0.0.1', () => {
    const sameOriginPost = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'sec-fetch-site': 'same-origin',
      },
    });
    expect(proxy(sameOriginPost).status).toBe(200);

    const getReq = new NextRequest('http://127.0.0.1:3000/api/models', {
      method: 'GET',
      headers: {
        host: '127.0.0.1:3000',
      },
    });
    expect(proxy(getReq).status).toBe(200);
  });
});

describe('Attachment Path Containment Guard (/api/attachments/[id])', () => {
  it('blocks path traversal attempts outside data/uploads with 403', async () => {
    const convId = `test-conv-${generateId()}`;
    const attId = `test-att-${generateId()}`;
    const now = new Date();

    try {
      await db.insert(conversations).values({
        id: convId,
        title: 'Attachment Path Guard Test',
        model: 'gemma4:e4b',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(attachments).values({
        id: attId,
        conversationId: convId,
        messageId: null,
        filename: 'escape.png',
        mediaType: 'image/png',
        sizeBytes: 100,
        filePath: 'data/uploads/../../package.json',
        createdAt: now,
      });

      const res = await getAttachment(new Request(`http://localhost:3000/api/attachments/${attId}`), {
        params: Promise.resolve({ id: attId }),
      });
      expect(res.status).toBe(403);
    } finally {
      await db.delete(conversations).where(eq(conversations.id, convId));
    }
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

  it('loads uploaded project library documents into the sandwich prompt via buildChatContext', async () => {
    const projectId = `test-proj-${generateId()}`;
    const convId = `test-conv-${generateId()}`;
    const now = new Date();

    try {
      await db.insert(projects).values({
        id: projectId,
        name: 'Testing Ground',
        description: 'Integration test for library context assembly',
        instructions: 'Use library files to answer.',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(libraries).values({
        id: `test-lib-${generateId()}`,
        projectId,
        filename: 'blue-heron.txt',
        mediaType: 'text/plain',
        sizeBytes: 29,
        extractedText: 'Project code is BLUE-HERON-42',
        type: 'reference',
        includeInContext: true,
        addedBy: 'User',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(conversations).values({
        id: convId,
        title: 'Context Recall Thread',
        projectId,
        model: 'gemma4:e4b',
        createdAt: now,
        updatedAt: now,
      });

      const ctx = await buildChatContext({
        conversationId: convId,
        messages: [
          {
            id: `u-${generateId()}`,
            role: 'user',
            parts: [{ type: 'text', text: 'What is the project code?' }],
          },
        ],
        caps: { vision: false, thinking: false, contextLength: 32768 },
      });

      expect(ctx.report.docsIncluded).toBe(1);
      expect(ctx.documentMessages).toHaveLength(2);
      expect(ctx.documentMessages[0].role).toBe('user');
      expect(String(ctx.documentMessages[0].content)).toContain(
        '<document name="blue-heron.txt" source="library">\nProject code is BLUE-HERON-42\n</document>'
      );
      expect(ctx.documentMessages[1].role).toBe('assistant');
    } finally {
      await db.delete(projects).where(eq(projects.id, projectId));
    }
  });
});
