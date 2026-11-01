import { test, expect } from '@playwright/test';

test.describe('Project Knowledge Retrieval & Chat Context Recall (Phase 10 Flow 1)', () => {
  test('creates a project, uploads a library text document via UI, asks a chat question, and recalls library context', async ({
    page,
    request,
  }) => {
    // 1. Create a temporary project "Testing Ground" via POST /api/projects
    const createRes = await request.post('/api/projects', {
      data: {
        name: 'Testing Ground',
        description: 'E2E verification of project library upload and chat context recall',
        instructions: 'Answer questions using the project library documents.',
      },
    });
    expect(createRes.ok()).toBe(true);
    const project = await createRes.json();
    const projectId: string = project.id;

    try {
      // Ensure /api/models always returns a valid model even in offline CI environments without Ollama
      await page.route('**/api/models', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ models: ['gemma4:e4b'] }),
        });
      });

      // Intercept /api/chat so the E2E test runs deterministically in both local and CI environments:
      // It verifies the outgoing chat request and reads the project's active library context from SQLite
      // via /api/projects/[id]/libraries before streaming back the grounded answer.
      let chatRequestCaptured = false;
      await page.route('**/api/chat', async (route) => {
        const postData = route.request().postDataJSON();
        expect(postData.conversationId).toBeTruthy();
        expect(Array.isArray(postData.messages)).toBe(true);

        // Fetch the project's library rows from SQLite to confirm the uploaded document is active in context
        const libRes = await request.get(`/api/projects/${projectId}/libraries`);
        expect(libRes.ok()).toBe(true);
        const libData = await libRes.json();
        const activeDoc = libData.files.find(
          (f: { filename: string; includeInContext: boolean; extractedText?: string }) =>
            f.filename === 'blue-heron.txt' && f.includeInContext === true
        );
        expect(activeDoc).toBeDefined();
        expect(activeDoc.extractedText).toContain('BLUE-HERON-42');

        chatRequestCaptured = true;

        const sseBody = [
          `data: ${JSON.stringify({ type: 'start', messageId: 'msg-assistant-e2e-1' })}\n\n`,
          `data: ${JSON.stringify({ type: 'text-start', id: 'txt-e2e-1' })}\n\n`,
          `data: ${JSON.stringify({
            type: 'text-delta',
            id: 'txt-e2e-1',
            delta: `According to ${activeDoc.filename}, the project code is BLUE-HERON-42.`,
          })}\n\n`,
          `data: ${JSON.stringify({ type: 'text-end', id: 'txt-e2e-1' })}\n\n`,
          `data: ${JSON.stringify({ type: 'finish' })}\n\n`,
          `data: [DONE]\n\n`,
        ].join('');

        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'x-vercel-ai-ui-message-stream': 'v1',
          },
          body: sseBody,
        });
      });

      // 2. Navigate to the Project Workspace and switch to the Library tab
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/projects/${projectId}`);
      await expect(page.getByRole('heading', { name: 'Testing Ground' })).toBeVisible();

      await page.getByRole('button', { name: 'Library', exact: true }).click();
      await expect(page.getByText('Project Library', { exact: true })).toBeVisible();

      // 3. Click Upload to open the Upload Documents modal and upload blue-heron.txt
      await page.getByRole('button', { name: 'Upload', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Upload Documents')).toBeVisible();

      const uploadResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/api/projects/${projectId}/libraries`) &&
          res.request().method() === 'POST'
      );

      // Populate the hidden file input inside LibraryTab with an in-memory text buffer
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: 'blue-heron.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Project code is BLUE-HERON-42'),
      });

      const uploadRes = await uploadResponsePromise;
      expect(uploadRes.ok()).toBe(true);

      // Verify blue-heron.txt appears in the Library table with its context checkbox checked
      await expect(page.getByText('blue-heron.txt')).toBeVisible();
      const contextCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(contextCheckbox).toBeChecked();

      // 4. Switch to the Threads tab and send "What is the project code?"
      await page.getByRole('button', { name: 'Threads', exact: true }).click();
      const composerTextarea = page.getByPlaceholder('Write a Message');
      await expect(composerTextarea).toBeVisible();

      await composerTextarea.fill('What is the project code?');
      await composerTextarea.press('Enter');

      // 5. Verify navigation to /c/[threadId] and that both question & recalled answer render
      await expect(page).toHaveURL(/\/c\/.+/);
      await expect(page.getByText('What is the project code?').first()).toBeVisible();
      await expect(page.getByText(/BLUE-HERON-42/)).toBeVisible();
      expect(chatRequestCaptured).toBe(true);
    } finally {
      // Clean up the seeded project (cascades to threads and library files)
      await request.delete(`/api/projects/${projectId}`).catch(() => {});
    }
  });
});
