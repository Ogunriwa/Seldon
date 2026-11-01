import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR =
  '/Users/arogundade/.gemini/antigravity/brain/0d44d934-adba-4b0b-a54c-ae7ec87d75b6';

test.describe('Home View Responsive Breakpoint (768x1107)', () => {
  test('renders 768px Closed state by default, opens SideNav on hover over trigger, keeps SideNav open while interacting with items, and closes on pointer leave', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1107 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Hide the Next.js DevTools floating badge so the visual proof screenshot matches Figma cleanly
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }',
    });

    // 1. Verify SideNav starts CLOSED at 768px and SidebarTrigger is visible
    const aside = page.locator('aside');
    await expect(aside).toBeHidden();

    const triggerBtn = page.getByRole('button', { name: 'Show Sidebar' });
    await expect(triggerBtn).toBeVisible();

    // Verify 3 Quick Entry Cards are on a single horizontal row (same Y coordinate)
    const main = page.locator('main');
    const projectsCard = main.locator('span', { hasText: 'Projects' }).first();
    const playgroundCard = main.locator('span', { hasText: 'Playground' }).first();
    const agentsCard = main.locator('span', { hasText: 'Agents' }).first();
    const boxP = await projectsCard.boundingBox();
    const boxPl = await playgroundCard.boundingBox();
    const boxA = await agentsCard.boundingBox();
    expect(boxP).not.toBeNull();
    expect(boxPl).not.toBeNull();
    expect(boxA).not.toBeNull();
    expect(Math.abs(boxP!.y - boxPl!.y)).toBeLessThan(2);
    expect(Math.abs(boxPl!.y - boxA!.y)).toBeLessThan(2);

    // Capture Closed state screenshot for visual comparison against Figma 859:2109
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'playwright_home_768_closed.png'),
    });

    // 2. Hover over the SidebarTrigger icon -> SideNav must open at 196px width
    await triggerBtn.hover();
    await expect(aside).toBeVisible();

    const asideBox = await aside.boundingBox();
    expect(asideBox).not.toBeNull();
    expect(Math.round(asideBox!.width)).toBe(196);

    // 3. Move pointer onto the SideNav and click "Chats" accordion -> SideNav must STAY open
    const chatsBtn = aside.getByRole('button', { name: 'Chats' });
    await chatsBtn.hover();
    await page.waitForTimeout(250); // Exceed the 150ms leave debounce to prove it stays open
    await expect(aside).toBeVisible();

    // Verify the 3 Quick Entry Cards STILL fit on a single horizontal row with SideNav open
    const boxPOpen = await projectsCard.boundingBox();
    const boxPlOpen = await playgroundCard.boundingBox();
    const boxAOpen = await agentsCard.boundingBox();
    expect(Math.abs(boxPOpen!.y - boxPlOpen!.y)).toBeLessThan(2);
    expect(Math.abs(boxPlOpen!.y - boxAOpen!.y)).toBeLessThan(2);

    // Move mouse to a neutral spot inside the SideNav so hover state matches Figma 859:2208
    await aside.hover({ position: { x: 100, y: 800 } });

    // Capture Open state screenshot for visual comparison against Figma 859:2208
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'playwright_home_768_open.png'),
    });

    // 4. Move pointer outside the SideNav into the main content area -> SideNav closes after debounce
    await page.mouse.move(600, 500);
    await expect(aside).toBeHidden({ timeout: 2000 });
  });
});
