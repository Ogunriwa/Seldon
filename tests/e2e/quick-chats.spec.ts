import { test, expect } from '@playwright/test';

test.describe('Quick Chats Lifecycle (Sidebar Accordion, ChatHeader Rename & Delete)', () => {
  test('creates a quick chat via API, renames it inline via ChatHeader, verifies sidebar sync, and deletes it cleanly', async ({
    page,
    request,
  }) => {
    // 1. Seed a standalone quick chat via POST /api/conversations
    const createRes = await request.post('/api/conversations', {
      data: {
        firstMessage: 'arogundade@MacBook ~ % E2E Quick Chat Initial',
        model: 'gemma4:e4b',
      },
    });
    expect(createRes.ok()).toBe(true);
    const created = await createRes.json();
    const convId: string = created.id;

    try {
      // 2. Navigate to the Quick Chat page at desktop viewport so sidebar is open
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/c/${convId}`, { waitUntil: 'networkidle' });

      // Verify deriveInitialTitle stripped the terminal prompt prefix
      const headerButton = page.locator('header button[aria-haspopup="menu"]');
      await expect(headerButton).toContainText('E2E Quick Chat Initial');

      // 3. Open the top-left ChevronDown menu and click Rename
      await headerButton.click();
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await menu.getByRole('menuitem', { name: 'Rename' }).click();

      // 4. Type the new title into the inline input and press Enter
      const renameInput = page.getByRole('textbox', { name: 'Rename chat title' });
      await expect(renameInput).toBeVisible();
      await renameInput.fill('E2E Renamed Quick Chat');
      await renameInput.press('Enter');

      // Verify header button immediately updates to the new title
      await expect(headerButton).toContainText('E2E Renamed Quick Chat');

      // 5. Expand the Sidebar "Chats" accordion and verify the renamed chat appears
      const chatsAccordionBtn = page.locator('aside').getByRole('button', { name: 'Chats' });
      await chatsAccordionBtn.click();
      await expect(page.locator('aside').getByText('E2E Renamed Quick Chat')).toBeVisible();

      // 6. Open the top-left ChevronDown menu and delete the chat via the confirmation modal
      await headerButton.click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      const deleteDialog = page.getByRole('dialog');
      await expect(deleteDialog.getByText('Delete chat?')).toBeVisible();
      await deleteDialog.getByRole('button', { name: 'Delete' }).click();

      // Verify navigation back to '/' and that the chat is gone from SQLite
      await expect(page).toHaveURL('http://localhost:3000/');
      const checkRes = await request.get(`/api/conversations/${convId}`);
      expect(checkRes.status()).toBe(404);
    } finally {
      // Defensive cleanup in case an assertion failed mid-test
      await request.delete(`/api/conversations/${convId}`).catch(() => {});
    }
  });
});
