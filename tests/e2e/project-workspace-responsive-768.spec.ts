import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR =
  '/Users/arogundade/.gemini/antigravity/brain/a196bc60-be6b-4027-8ee7-44dde6c5ff74';

const FIGMA_INSTRUCTIONS = `Machine Learning Learning Path
Role
You are a hands-on machine learning tutor. Every lesson follows a concept → code → tinker structure: give a short conceptual explanation, then immediately provide a working code example, then suggest parameter tweaks or experiments the learner can try. Keep theory concise. Prioritise implementation.

Learner Profile

Prefers building over watching/reading — learns by writing code and observing results.
Comfortable with Python, PyTorch, TensorFlow/Keras, scikit-learn, pandas, and matplotlib.
Wants structured lessons with clear progression, not open-ended exploration.
Likes visualisations (training curves, confusion matrices, filter maps, reconstructions).
Tinkers with hyperparameters to build intuition (e.g. changing neuron counts, epoch numbers, learning rates).`;

const SEED_THREADS = [
  {
    title: 'Neural Networks and Deep Learning',
    summary:
      'Diving deep into model backpropagation gradients. Discussing the optimization of Convolutional Neural Networks (CNNs) for image pattern recognition, and Recurrent Neural Networks (RNNs) sequence models.',
  },
  {
    title: 'Neural Networks and Deep Learning',
    summary:
      'Diving deep into model backpropagation gradients. Discussing the optimization of Convolutional Neural Networks (CNNs) for image pattern recognition, and Recurrent Neural Networks (RNNs) sequence models.',
  },
  {
    title: 'Model Quantization pipeline',
    summary: 'FP16 weights compression down to INT8 metrics.',
  },
];

const SEED_FILES = [
  { filename: 'Vendor_Contract_Draft_v2.docx', content: 'x'.repeat(2400) },
  { filename: 'Board_Presentation_Deck.pptx', content: 'x'.repeat(4800) },
  { filename: 'Q3_Revenue_Projections.xlsx', content: 'x'.repeat(3200) },
  { filename: 'Site_Inspection_Photo_04.jpg', content: 'x'.repeat(5120) },
  { filename: 'System_Architecture_Overview.md', content: 'x'.repeat(1800) },
  { filename: '2024_Financial_Audit_Report.pdf', content: 'x'.repeat(6400) },
];

const SEED_MEMORIES = [
  'Configured PostgreSQL database with connection pooling enabled to support up to 500 concurrent connections.',
  "Is building a games app where users can create and join games with multiple rounds, where each round's submissions are processed by an AI agent within the same session, and results are sent back to a backend (Vapor) after the final round.",
  'Plans to develop the AI agent for processing game rounds using the Google Agent Development Kit (ADK). The agent will handle turn-based logic, validate player inputs, and manage state transitions between rounds.',
];

test.describe('Project Workspace Responsive Breakpoint (768x1107 & Desktop Threads)', () => {
  test('renders Threads (Desktop + 768px Closed & Open), Instructions, Library, and Memories tabs matching Figma geometry', async ({
    page,
    request,
  }) => {
    // 1. Seed Project
    const createRes = await request.post('/api/projects', {
      data: {
        name: 'Machine Learning',
        description:
          'A machine learning pipeline that ingests raw datasets, trains predictive models using supervised and unsupervised techniques, and delivers real-time inference results through a scalable API.',
        instructions: FIGMA_INSTRUCTIONS,
      },
    });
    expect(createRes.ok()).toBe(true);
    const project = await createRes.json();
    const projectId: string = project.id;

    try {
      // Seed Threads
      for (const t of SEED_THREADS) {
        const threadRes = await request.post(`/api/projects/${projectId}/threads`, {
          data: {
            title: t.title,
            summary: t.summary,
          },
        });
        expect(threadRes.ok()).toBe(true);
      }

      // Seed Library files
      for (const f of SEED_FILES) {
        const fileRes = await request.post(`/api/projects/${projectId}/libraries`, {
          data: {
            filename: f.filename,
            type: 'reference',
            content: f.content,
            addedBy: 'ibrahim',
            includeInContext: true,
          },
        });
        expect(fileRes.ok()).toBe(true);
      }

      // Seed Memories
      for (const content of SEED_MEMORIES) {
        const memRes = await request.post(`/api/projects/${projectId}/memories`, {
          data: {
            content,
            isPinned: true,
            source: 'manual',
          },
        });
        expect(memRes.ok()).toBe(true);
      }

      // ────────────────────────────────────────────────────────────────
      // 0. THREADS TAB — DESKTOP BREAKPOINT (1728x1117 — Figma 860:5407)
      // ────────────────────────────────────────────────────────────────
      await page.setViewportSize({ width: 1728, height: 1117 });
      await page.goto(`/projects/${projectId}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; }',
      });

      const threadCards = page.locator('[data-name="masonry-card-1"]');
      await expect(threadCards).toHaveCount(3);
      await expect(page.getByText('2m ago').first()).toBeVisible();

      // Verify single-column vertical stack with 20px vertical gap and 16px padding on Desktop
      const dCard0 = await threadCards.nth(0).boundingBox();
      const dCard1 = await threadCards.nth(1).boundingBox();
      expect(dCard0).not.toBeNull();
      expect(dCard1).not.toBeNull();
      expect(Math.round(dCard1!.y - (dCard0!.y + dCard0!.height))).toBe(20);

      // Verify composer is 768px wide on Desktop
      const composerBoxDesktop = await page.locator('[data-node-id="687:1458"]').boundingBox();
      expect(composerBoxDesktop).not.toBeNull();
      expect(Math.round(composerBoxDesktop!.width)).toBe(768);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_threads_desktop.png'),
      });

      // ────────────────────────────────────────────────────────────────
      // A. THREADS TAB — 768x1107 (Closed 860:6203 & Open 860:6377)
      // ────────────────────────────────────────────────────────────────
      await page.setViewportSize({ width: 768, height: 1107 });
      const aside = page.locator('aside');
      await expect(aside).toBeHidden();

      const triggerBtn = page.getByRole('button', { name: 'Show Sidebar' });
      await expect(triggerBtn).toBeVisible();

      // Verify SidebarTrigger and Breadcrumb sit on the same horizontal row when Closed
      const breadcrumbRow = page.locator('[data-node-id="658:5956"]');
      const triggerBox = await triggerBtn.boundingBox();
      const breadcrumbBox = await breadcrumbRow.boundingBox();
      expect(triggerBox).not.toBeNull();
      expect(breadcrumbBox).not.toBeNull();
      expect(Math.abs(triggerBox!.y + triggerBox!.height - (breadcrumbBox!.y + breadcrumbBox!.height))).toBeLessThan(4);

      // Verify 20px vertical gap between full-width thread cards at 768px Closed
      const tCard0 = await threadCards.nth(0).boundingBox();
      const tCard1 = await threadCards.nth(1).boundingBox();
      expect(tCard0).not.toBeNull();
      expect(tCard1).not.toBeNull();
      expect(Math.round(tCard1!.y - (tCard0!.y + tCard0!.height))).toBe(20);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_threads_768_closed.png'),
      });

      // Open SideNav on hover for Threads Tab
      await triggerBtn.hover();
      await expect(aside).toBeVisible();
      await aside.hover({ position: { x: 100, y: 700 } });
      await page.waitForTimeout(200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_threads_768_open.png'),
      });

      // Move pointer out to close SideNav
      await page.mouse.move(600, 500);
      await expect(aside).toBeHidden({ timeout: 2000 });

      // ────────────────────────────────────────────────────────────────
      // B. INSTRUCTIONS TAB (Closed 859:3374 & Open 859:3507)
      // ────────────────────────────────────────────────────────────────
      await page.getByRole('button', { name: 'Instructions' }).click();
      await expect(page.getByText('Project Instructions')).toBeVisible();
      await expect(page.getByText(/You are a hands-on machine learning tutor/)).toBeVisible();

      const instructionsSubtitle = page.getByText(
        'Define how Seldon assists you across all threads in this project',
      );
      await expect(instructionsSubtitle).toBeHidden();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_instructions_768_closed.png'),
      });

      await triggerBtn.hover();
      await expect(aside).toBeVisible();
      await aside.hover({ position: { x: 100, y: 700 } });
      await page.waitForTimeout(200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_instructions_768_open.png'),
      });

      await page.mouse.move(600, 500);
      await expect(aside).toBeHidden({ timeout: 2000 });

      // ────────────────────────────────────────────────────────────────
      // C. LIBRARY TAB (Closed 860:5146 & Open 859:4863)
      // ────────────────────────────────────────────────────────────────
      await page.getByRole('button', { name: 'Library' }).click();
      await expect(page.getByText('Project Library')).toBeVisible();
      await expect(page.getByText('2024_Financial_Audit_Report.pdf')).toBeVisible();

      const librarySubtitle = page.getByText(
        'Organize, add and include files and photos to chat',
      );
      await expect(librarySubtitle).toBeHidden();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_library_768_closed.png'),
      });

      await triggerBtn.hover();
      await expect(aside).toBeVisible();
      await aside.hover({ position: { x: 100, y: 700 } });
      await page.waitForTimeout(200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_library_768_open.png'),
      });

      await page.mouse.move(600, 500);
      await expect(aside).toBeHidden({ timeout: 2000 });

      // ────────────────────────────────────────────────────────────────
      // D. MEMORIES TAB (Closed 859:3788 & Open 859:4137)
      // ────────────────────────────────────────────────────────────────
      await page.getByRole('button', { name: 'Memory' }).click();
      await expect(page.getByText('Project Memories')).toBeVisible();
      await expect(
        page.getByText(/Plans to develop the AI agent for processing game rounds/),
      ).toBeVisible();

      const memoriesSubtitle = page.getByText(
        'Pin core facts and decisions that agents should remember across all threads.',
      );
      await expect(memoriesSubtitle).toBeHidden();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_memories_768_closed.png'),
      });

      await page.getByRole('button', { name: 'Add Memory' }).click();
      const textarea = page.getByPlaceholder('Record a project fact or decision...');
      await textarea.fill(
        'Use the TensorFlow 2.x API for all model training. Prefer Keras sequential models for simple architectures...',
      );

      await triggerBtn.hover();
      await expect(aside).toBeVisible();
      await aside.hover({ position: { x: 100, y: 700 } });
      await page.waitForTimeout(200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'playwright_workspace_memories_768_open.png'),
      });

      await page.mouse.move(600, 500);
      await expect(aside).toBeHidden({ timeout: 2000 });
    } finally {
      await request.delete(`/api/projects/${projectId}`).catch(() => {});
    }
  });
});
