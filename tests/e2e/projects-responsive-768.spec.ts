import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR =
  '/Users/arogundade/.gemini/antigravity/brain/a196bc60-be6b-4027-8ee7-44dde6c5ff74';

const SEED_PROJECTS = [
  {
    name: 'Nigerian Manufac',
    description:
      'Persistent workspace where files, instructions, and chats share one lasting memory.',
  },
  {
    name: 'Q3 Marketing',
    description:
      'Campaign planning, asset approvals, and launch tracking for the next quarter.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
  {
    name: 'Nigerian Manufac',
    description:
      'Persistent workspace where files, instructions, and chats share one lasting memory.',
  },
  {
    name: 'Q3 Marketing',
    description:
      'Campaign planning, asset approvals, and launch tracking for the next quarter.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
  {
    name: 'Nigerian Manufac',
    description:
      'Persistent workspace where files, instructions, and chats share one lasting memory.',
  },
  {
    name: 'Q3 Marketing',
    description:
      'Campaign planning, asset approvals, and launch tracking for the next quarter.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
  {
    name: 'Retail Ops',
    description:
      'Store inventory sync, staff schedules, and customer feedback loop.',
  },
];

test.describe('Projects Dashboard Responsive Breakpoint (768x1107)', () => {
  test('renders 768px Closed state with 4 cards/row, opens SideNav on hover with 3 cards/row, and closes on pointer leave', async ({
    page,
    request,
  }) => {
    const createdIds: string[] = [];

    try {
      // Seed projects in reverse so they appear in order by updatedAt DESC
      for (const item of [...SEED_PROJECTS].reverse()) {
        const res = await request.post('/api/projects', {
          data: {
            name: item.name,
            description: item.description,
            instructions: '',
          },
        });
        expect(res.ok()).toBe(true);
        const data = await res.json();
        createdIds.push(data.id);
      }

      await page.setViewportSize({ width: 768, height: 1107 });
      await page.goto('/projects', { waitUntil: 'networkidle' });

      // Hide Next.js DevTools badge for clean visual comparison against Figma
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; }',
      });

      // 1. Verify SideNav starts CLOSED at 768px and SidebarTrigger is visible
      const aside = page.locator('aside');
      await expect(aside).toBeHidden();

      const triggerBtn = page.getByRole('button', { name: 'Show Sidebar' });
      await expect(triggerBtn).toBeVisible();

      // Verify Projects title, 3-Binder SVG icon, and + New Project button are visible
      const heading = page.getByRole('heading', { name: 'Projects', exact: true });
      await expect(heading).toBeVisible();
      const newProjectBtn = page.getByRole('button', { name: /New Project/i });
      await expect(newProjectBtn).toBeVisible();

      // Verify 4 cards per row in Closed state (cards 0, 1, 2, 3 on Row 1; card 4 on Row 2)
      const main = page.locator('main');
      const cards = main.locator('h3');
      const box0 = await cards.nth(0). locator('..').locator('..').locator('..').boundingBox();
      const box1 = await cards.nth(1).locator('..').locator('..').locator('..').boundingBox();
      const box2 = await cards.nth(2).locator('..').locator('..').locator('..').boundingBox();
      const box3 = await cards.nth(3).locator('..').locator('..').locator('..').boundingBox();
      const box4 = await cards.nth(4).locator('..').locator('..').locator('..').boundingBox();

      expect(box0).not.toBeNull();
      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();
      expect(box3).not.toBeNull();
      expect(box4).not.toBeNull();

      // Cards 0..3 must be on the same horizontal row
      expect(Math.abs(box0!.y - box1!.y)).toBeLessThan(2);
      expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(2);
      expect(Math.abs(box2!.y - box3!.y)).toBeLessThan(2);

      // Horizontal gap between Card 0 and Card 1 must be 20px
      expect(Math.round(box1!.x - (box0!.x + box0!.width))).toBe(20);

      // Card 4 must wrap onto Row 2 with a 40px vertical gap
      expect(Math.round(box4!.y - (box0!.y + box0!.height))).toBe(40);

      // Capture Closed state screenshot for visual comparison against Figma 870:2640
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_projects_768_closed.png'),
      });

      // 2. Hover over SidebarTrigger -> SideNav opens at 196px width
      await triggerBtn.hover();
      await expect(aside).toBeVisible();

      const asideBox = await aside.boundingBox();
      expect(asideBox).not.toBeNull();
      expect(Math.round(asideBox!.width)).toBe(196);

      // 3. Move pointer inside SideNav and verify it stays open past debounce
      await aside.hover({ position: { x: 100, y: 800 } });
      await page.waitForTimeout(250);
      await expect(aside).toBeVisible();

      // Verify cards reflow to 3 cards per row in Open state (cards 0, 1, 2 on Row 1; card 3 on Row 2)
      const openBox0 = await cards.nth(0).locator('..').locator('..').locator('..').boundingBox();
      const openBox1 = await cards.nth(1).locator('..').locator('..').locator('..').boundingBox();
      const openBox2 = await cards.nth(2).locator('..').locator('..').locator('..').boundingBox();
      const openBox3 = await cards.nth(3).locator('..').locator('..').locator('..').boundingBox();

      expect(openBox0).not.toBeNull();
      expect(openBox1).not.toBeNull();
      expect(openBox2).not.toBeNull();
      expect(openBox3).not.toBeNull();

      // Cards 0..2 must be on Row 1
      expect(Math.abs(openBox0!.y - openBox1!.y)).toBeLessThan(2);
      expect(Math.abs(openBox1!.y - openBox2!.y)).toBeLessThan(2);

      // Horizontal gap between Card 0 and Card 1 must be 20px
      expect(Math.round(openBox1!.x - (openBox0!.x + openBox0!.width))).toBe(20);

      // Card 3 must wrap onto Row 2 with a 40px vertical gap
      expect(Math.round(openBox3!.y - (openBox0!.y + openBox0!.height))).toBe(40);

      // Capture Open state screenshot for visual comparison against Figma 859:2514
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_projects_768_open.png'),
      });

      // 4. Move pointer outside SideNav -> SideNav closes automatically
      await page.mouse.move(600, 500);
      await expect(aside).toBeHidden({ timeout: 2000 });
    } finally {
      // Clean up seeded projects
      for (const id of createdIds) {
        await request.delete(`/api/projects/${id}`).catch(() => {});
      }
    }
  });
});
