/**
 * Phase 9 Verification Suite (Side Nav Quick Chats Accordion)
 * 1. Static SideNav checks: Recents/Tagged removed, Agents/Playground coming-soon kept,
 *    Chats is an accordion (chevrons, aria-expanded), fetches quickChatsOnly, navigates to /c/[id]
 * 2. Refresh wiring: home-view & quick-chats-list dispatch 'conversations-changed'
 * 3. Live API contract (requires `pnpm dev` on :3000): quickChatsOnly returns only
 *    projectId IS NULL rows, newest-updated first; project threads are excluded
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) { console.log(`  ✓ PASS: ${message}`); passed++; }
  else { console.error(`  ✗ FAIL: ${message}`); failed++; }
}

console.log('====================================================');
console.log('   SELDON v1: PHASE 9 MANUAL & AUTOMATED VERIFIER   ');
console.log('====================================================\n');

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ── TEST 1: SideNav static structure ─────────────────────────────────────
console.log('TEST 1: Verifying SideNav structure');
const nav = read('components/layout/side-nav.tsx');
assert(!/label="Recents"/.test(nav), 'Recents nav item removed');
assert(!/label="Tagged"/.test(nav), 'Tagged nav item removed');
assert(!nav.includes("'/recents'") && !nav.includes("'/tagged'"), 'No links to /recents or /tagged');
assert(/label="Agents"/.test(nav) && nav.includes("setComingSoonFeature('Agents')"), 'Agents item kept and opens coming-soon modal');
assert(/label="Playground"/.test(nav) && nav.includes("setComingSoonFeature('Playground')"), 'Playground item kept and opens coming-soon modal');
assert(nav.includes('ChevronRight') && nav.includes('ChevronDown'), 'Chats accordion uses ChevronRight / ChevronDown');
assert(nav.includes('setIsChatsOpen((open) => !open)'), 'Clicking Chats toggles the accordion (no navigation)');
assert(nav.includes('aria-expanded={ariaExpanded}'), 'Accordion trigger exposes aria-expanded');
assert(nav.includes('/api/conversations?quickChatsOnly=true'), 'Fetches standalone quick chats only');
assert(nav.includes('AbortController'), 'Fetch is abortable (no stale responses)');
assert(nav.includes('navigateTo(href, chat.title)') && nav.includes('`/c/${chat.id}`'), 'Chat item opens tab + navigates to /c/[id]');
assert(nav.includes("'conversations-changed'") && nav.includes("'conversation-created'"), 'Listens for refresh events');

// Rules of Hooks: every hook must be declared before the `if (!isOpen) return null;`
const earlyReturn = nav.indexOf('if (!isOpen) return null;');
const lastHook = Math.max(nav.lastIndexOf('useEffect('), nav.lastIndexOf('useState'));
assert(earlyReturn > 0 && lastHook < earlyReturn, 'All hooks declared before the early return');

// ── TEST 2: Refresh event dispatchers ────────────────────────────────────
console.log('\nTEST 2: Verifying refresh event dispatchers');
assert(read('components/home/home-view.tsx').includes("new CustomEvent('conversations-changed')"), 'HomeView dispatches after creating a quick chat');
assert(read('components/chat/quick-chats-list.tsx').includes("new CustomEvent('conversations-changed')"), 'QuickChatsList dispatches after delete');

// ── TEST 3: Live API contract ────────────────────────────────────────────
console.log('\nTEST 3: Verifying GET /api/conversations?quickChatsOnly=true (live)');
const db = new Database(path.join(root, 'data', 'app.db'));
db.pragma('foreign_keys = ON');
const now = Math.floor(Date.now() / 1000);
const ids = { project: 'p9_project', thread: 'p9_thread', older: 'p9_quick_old', newer: 'p9_quick_new' };

try {
  db.prepare("INSERT INTO projects (id, name, emoji, description, instructions, created_at, updated_at) VALUES (?, 'P9 Project', '📓', '', '', ?, ?)").run(ids.project, now, now);
  db.prepare("INSERT INTO conversations (id, title, project_id, model, created_at, updated_at) VALUES (?, 'P9 Thread', ?, 'test', ?, ?)").run(ids.thread, ids.project, now, now + 100);
  db.prepare("INSERT INTO conversations (id, title, project_id, model, created_at, updated_at) VALUES (?, 'P9 Older Quick', NULL, 'test', ?, ?)").run(ids.older, now, now + 200);
  db.prepare("INSERT INTO conversations (id, title, project_id, model, created_at, updated_at) VALUES (?, 'P9 Newer Quick', NULL, 'test', ?, ?)").run(ids.newer, now, now + 300);

  const res = await fetch('http://localhost:3000/api/conversations?quickChatsOnly=true');
  assert(res.ok, `Endpoint responds 200 (got ${res.status})`);
  const { conversations } = await res.json();
  const got = conversations.map((c) => c.id);

  assert(conversations.every((c) => c.projectId === null), 'Every returned row has projectId === null');
  assert(!got.includes(ids.thread), 'Project thread is excluded');
  assert(got.includes(ids.older) && got.includes(ids.newer), 'Both seeded quick chats are returned');
  assert(got.indexOf(ids.newer) < got.indexOf(ids.older), 'Ordered by updatedAt DESC (newest first)');
} catch (err) {
  assert(false, `Live API check errored — is \`pnpm dev\` running? (${err.message})`);
} finally {
  db.prepare('DELETE FROM conversations WHERE id IN (?, ?, ?)').run(ids.thread, ids.older, ids.newer);
  db.prepare('DELETE FROM projects WHERE id = ?').run(ids.project);
  db.close();
}

console.log('\n====================================================');
console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
if (failed > 0) process.exit(1);
console.log('✓ ALL PHASE 9 ACCORDION CHECKS VERIFIED!\n');
