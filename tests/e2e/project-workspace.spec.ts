import { test, expect } from '@playwright/test';

test.describe('Project Workspace Tabs & Memory Token Budget Guard', () => {
  test('navigates project tabs and disables Save with a red token counter when a memory exceeds the 4K token limit', async ({
    page,
    request,
  }) => {
    // 1. Seed a temporary test project via POST /api/projects
    const createRes = await request.post('/api/projects', {
      data: {
        name: 'E2E Verification Project',
        description: 'Automated Playwright verification workspace',
        instructions: 'Always respond concisely.',
      },
    });
    expect(createRes.ok()).toBe(true);
    const project = await createRes.json();
    const projectId: string = project.id;

    try {
      await page.goto(`/projects/${projectId}`);

      // Verify project header title renders
      await expect(page.getByRole('heading', { name: 'E2E Verification Project' })).toBeVisible();

      // 2. Navigate across Instructions, Library, and Memory tabs
      await page.getByRole('button', { name: 'Instructions' }).click();
      await expect(page.getByText('Always respond concisely.')).toBeVisible();

      await page.getByRole('button', { name: 'Library' }).click();

      await page.getByRole('button', { name: 'Memory' }).click();
      await expect(page.getByText('Project Memories')).toBeVisible();

      // 3. Click "Add Memory" and fill >16,500 chars (>4,096 tokens)
      await page.getByRole('button', { name: 'Add Memory' }).click();
      const textarea = page.getByPlaceholder('Record a project fact or decision...');
      await expect(textarea).toBeVisible();

      const oversizedContent = 'M'.repeat(17_200); // 4,300 tokens (> 4,096 limit)
      await textarea.fill(oversizedContent);

      // Verify live token counter turns red (text-red-500) and Save button is disabled
      const tokenCounter = page.getByText(/Token Count:\s*4\.3K\s*\/\s*4K/);
      await expect(tokenCounter).toBeVisible();
      await expect(tokenCounter).toHaveClass(/text-red-500/);

      const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
      await expect(saveBtn).toBeDisabled();

      // 4. Replace with a valid concise memory and verify Save becomes enabled
      await textarea.fill('User prefers SQLite WAL mode for local concurrency.');
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();

      await expect(page.getByText('User prefers SQLite WAL mode for local concurrency.')).toBeVisible();
    } finally {
      // Always clean up the seeded project from SQLite
      await request.delete(`/api/projects/${projectId}`).catch(() => {});
    }
  });

  test('renames and deletes a project via the three-dot Project options menu', async ({
    page,
    request,
  }) => {
    const createRes = await request.post('/api/projects', {
      data: {
        name: 'Original Project Name',
        description: 'Testing inline rename and delete confirmation',
      },
    });
    expect(createRes.ok()).toBe(true);
    const project = await createRes.json();
    const projectId: string = project.id;

    try {
      await page.goto(`/projects/${projectId}`);
      await expect(page.getByRole('heading', { name: 'Original Project Name' })).toBeVisible();

      // 1. Click three-dot Project options menu -> Rename
      const optionsBtn = page.getByRole('button', { name: 'Project options' });
      await optionsBtn.click();

      const renameMenuItem = page.getByRole('menuitem', { name: 'Rename' });
      await expect(renameMenuItem).toBeVisible();
      await renameMenuItem.click();

      // 2. Edit inline title input and press Enter
      const renameInput = page.getByRole('textbox', { name: 'Rename project title' });
      await expect(renameInput).toBeVisible();
      await expect(renameInput).toHaveValue('Original Project Name');

      const patchPromise = page.waitForResponse(
        (res) => res.url().includes(`/api/projects/${projectId}`) && res.request().method() === 'PATCH'
      );
      await renameInput.fill('Renamed ML Workspace');
      await renameInput.press('Enter');
      const patchRes = await patchPromise;
      expect(patchRes.ok()).toBe(true);

      // Verify heading and breadcrumb reflect the new name
      await expect(page.getByRole('heading', { name: 'Renamed ML Workspace' })).toBeVisible();

      // 3. Click three-dot Project options menu -> Delete
      await optionsBtn.click();
      const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete' });
      await expect(deleteMenuItem).toBeVisible();
      await deleteMenuItem.click();

      // 4. Verify Delete project? warning dialog and confirm deletion
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Delete project?')).toBeVisible();
      await expect(dialog.getByText(/Renamed ML Workspace/)).toBeVisible();

      const deletePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/projects/${projectId}`) && res.request().method() === 'DELETE'
      );
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
      const deleteRes = await deletePromise;
      expect(deleteRes.ok()).toBe(true);

      // Verify redirect to /projects
      await expect(page).toHaveURL(/\/projects$/);
    } finally {
      await request.delete(`/api/projects/${projectId}`).catch(() => {});
    }
  });
});
