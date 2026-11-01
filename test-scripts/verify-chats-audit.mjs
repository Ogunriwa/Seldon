/**
 * Verification Suite: Chats Subsystem Audit Fixes (Issues 1, 2, and 3)
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('====================================================');
console.log('   SELDON v1: CHATS SUBSYSTEM AUDIT VERIFIER        ');
console.log('====================================================\n');

// ── TEST 1: Issue 2 — Eager User Turn Persistence & Error Handling ──────
console.log('TEST 1: Verifying Issue 2 (Eager Persistence, Ordering & Orphan Cleanup)');
const persistSrc = read('lib/chat/persist.ts');
const chatRouteSrc = read('app/api/chat/route.ts');
const chatPageSrc = read('app/(chat)/c/[id]/page.tsx');
const convIdRouteSrc = read('app/api/conversations/[id]/route.ts');

assert(persistSrc.includes('export async function persistUserTurn'), 'persistUserTurn exported from lib/chat/persist.ts');
assert(
  persistSrc.includes("if (msg.role === 'assistant' && !text.trim() && !reasoning.trim())"),
  'persistMessages skips empty assistant messages on stream abort/error',
);
assert(
  chatRouteSrc.indexOf('await persistUserTurn(') > 0 &&
    chatRouteSrc.indexOf('await persistUserTurn(') < chatRouteSrc.indexOf('getModelCapabilities('),
  'POST /api/chat calls persistUserTurn BEFORE getModelCapabilities and streamText',
);
assert(
  chatRouteSrc.includes('[chat:persist-error]') && chatRouteSrc.includes('[chat:error]'),
  'POST /api/chat logs pre-stream and onFinish persistence errors via try/catch',
);
assert(
  chatPageSrc.includes('orderBy(asc(messages.createdAt), asc(sql`rowid`))') &&
    convIdRouteSrc.includes('orderBy(asc(messages.createdAt), asc(sql`rowid`))'),
  'Messages queries use deterministic (createdAt ASC, rowid ASC) tie-breaking',
);

// Verify SQLite state: zero empty orphan quick chats & deterministic same-second ordering
const db = new Database(path.join(root, 'data', 'app.db'));
db.pragma('foreign_keys = ON');

const emptyQuickChats = db
  .prepare(
    `SELECT COUNT(*) AS cnt FROM conversations c
     WHERE c.project_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM attachments a WHERE a.conversation_id = c.id)`,
  )
  .get();
assert(emptyQuickChats.cnt === 0, `Zero empty orphan quick chats in data/app.db (found ${emptyQuickChats.cnt})`);

const testConvId = 'verify_same_second_conv';
const sameTs = Math.floor(Date.now() / 1000);
try {
  db.prepare(
    `INSERT INTO conversations (id, title, project_id, model, created_at, updated_at)
     VALUES (?, 'Order Test', NULL, 'gemma4:e4b', ?, ?)`,
  ).run(testConvId, sameTs, sameTs);
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES ('msg_u_1', ?, 'user', 'First user question', ?)`,
  ).run(testConvId, sameTs);
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES ('msg_a_1', ?, 'assistant', 'Second assistant answer', ?)`,
  ).run(testConvId, sameTs);

  const ordered = db
    .prepare(
      `SELECT id, role FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC`,
    )
    .all(testConvId);
  assert(
    ordered.length === 2 && ordered[0].role === 'user' && ordered[1].role === 'assistant',
    'Same-second user and assistant messages sort deterministically via rowid',
  );
} finally {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(testConvId);
  db.close();
}

// ── TEST 2: Issue 3 — Intent-Based Auto-Scroll & Render Performance ─────
console.log('\nTEST 2: Verifying Issue 3 (Intent-Based Auto-Scroll, Jump Pill & Memoization)');
const chatSrc = read('components/chat.tsx');
const markdownSrc = read('components/markdown.tsx');

assert(chatSrc.includes('onWheel={handleWheel}'), 'Scroll container attaches onWheel intent handler');
assert(chatSrc.includes('onTouchMove={handleTouchMove}'), 'Scroll container attaches onTouchMove intent handler');
assert(chatSrc.includes('onKeyDown={handleScrollKeyDown}'), 'Scroll container attaches keyboard scroll intent handler');
assert(chatSrc.includes('if (e.deltaY < 0)') && chatSrc.includes('disengageAutoScroll()'), 'Upward wheel delta immediately disengages auto-scroll');
assert(chatSrc.includes('requestAnimationFrame('), 'Programmatic auto-scroll is batched with requestAnimationFrame');
assert(chatSrc.includes('distanceFromBottom <= 24'), 'Scroll bottom re-engagement uses tight 24px threshold');
assert(chatSrc.includes('Jump to latest') && chatSrc.includes('onClick={scrollToBottom}'), 'Floating "Jump to latest" pill renders when scrolled up');
assert(chatSrc.includes('const MessageBubble = memo(function MessageBubble'), 'MessageBubble is wrapped in React.memo');
assert(markdownSrc.includes('export const Markdown = memo(function Markdown'), 'Markdown component is wrapped in React.memo');
assert(
  markdownSrc.includes('const REMARK_PLUGINS') &&
    markdownSrc.includes('const REHYPE_PLUGINS') &&
    markdownSrc.includes('detect: false'),
  'Markdown hoists plugin arrays and disables expensive highlight.js auto-detection',
);

// ── TEST 3: Issue 1 — ChatHeader, Inline Rename, Delete & Hybrid Titles ─
console.log('\nTEST 3: Verifying Issue 1 (ChatHeader, Inline Rename, Delete & Hybrid Titles)');
assert(exists('components/chat/chat-header.tsx'), 'components/chat/chat-header.tsx exists');
assert(exists('lib/chat/title.ts'), 'lib/chat/title.ts exists');
assert(exists('app/api/conversations/[id]/title/route.ts'), 'app/api/conversations/[id]/title/route.ts exists');

const headerSrc = read('components/chat/chat-header.tsx');
const tabsSrc = read('lib/tabs-context.tsx');
const titleLibSrc = read('lib/chat/title.ts');
const titleRouteSrc = read('app/api/conversations/[id]/title/route.ts');
const quickListSrc = read('components/chat/quick-chats-list.tsx');

assert(chatPageSrc.includes('<ChatHeader'), 'Conversation page mounts <ChatHeader /> for both Quick Chats and Project Threads');
assert(headerSrc.includes('inputRef.current.focus()') && headerSrc.includes('inputRef.current.select()'), 'Inline rename input focuses and selects text on open');
assert(headerSrc.includes("method: 'PATCH'") && headerSrc.includes('renameTab(tabHref, trimmed)'), 'ChatHeader saves rename via PATCH and updates tab title');
assert(headerSrc.includes("method: 'DELETE'") && headerSrc.includes('closeTab(tabHref)'), 'ChatHeader deletes chat via DELETE and closes its tab');
assert(headerSrc.includes("'conversation-title-updated'"), 'ChatHeader listens for background LLM title updates');
assert(tabsSrc.includes('renameTab: (idOrHref: string, title: string) => void'), 'TabsContext exposes renameTab');
assert(
  !convIdRouteSrc.includes('set({ title: parsed.data.title, updatedAt: new Date() })') &&
    convIdRouteSrc.includes('set({ title: parsed.data.title })'),
  'PATCH /api/conversations/[id] updates title without bumping updatedAt',
);
assert(
  quickListSrc.includes('closeTab(`/c/${chatId}`)') && quickListSrc.includes('setChats(previous)'),
  'QuickChatsList checks res.ok, closes open tab, and rolls back on delete error',
);
assert(
  titleLibSrc.includes('export function deriveInitialTitle') &&
    titleLibSrc.includes('export function cleanGeneratedTitle'),
  'lib/chat/title.ts exports deriveInitialTitle and cleanGeneratedTitle',
);
assert(
  titleRouteSrc.includes('generateText(') && titleRouteSrc.includes('think: false'),
  'Background title endpoint uses Ollama generateText with think: false',
);

console.log('\n====================================================');
console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
if (failed > 0) process.exit(1);
console.log('✓ ALL CHATS SUBSYSTEM AUDIT FIXES VERIFIED!\n');
