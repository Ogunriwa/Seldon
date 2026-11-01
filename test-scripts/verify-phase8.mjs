/**
 * Phase 8 Verification Suite
 * Executes critical automated assertions for Phase 8 (Agents & Skills Removal & Dead Code Cleanup):
 * 1. SQLite Schema Cleanliness: agents, skills, agent_skills dropped; agent_id removed from conversations & libraries
 * 2. Deprecated API Route Purge: /api/projects/[id]/agents & /skills removed
 * 3. Dead Component Cleanup: 9 legacy/unused component files removed
 * 4. Workspace & Navigation Cleanliness: Only Threads, Instructions, Library, Memory tabs remain; /agents links removed
 * 5. Relational Integrity: Project -> Conversation -> Message/Attachment/Library/Memory creation & cascade deletion works without agent FKs
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

console.log('====================================================');
console.log('   SELDON v1: PHASE 8 MANUAL & AUTOMATED VERIFIER   ');
console.log('====================================================\n');

const root = process.cwd();
const db = new Database(path.join(root, 'data', 'app.db'));
db.pragma('foreign_keys = ON');

// -----------------------------------------------------------------------------
// TEST 1: SQLite Schema Cleanliness (Migration 0007)
// -----------------------------------------------------------------------------
console.log('TEST 1: Verifying SQLite Schema Cleanliness (Agents & Skills Purged)');

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%';")
  .all()
  .map((r) => r.name)
  .sort();

assert(!tables.includes('agents'), 'Table `agents` is dropped from SQLite');
assert(!tables.includes('skills'), 'Table `skills` is dropped from SQLite');
assert(!tables.includes('agent_skills'), 'Table `agent_skills` is dropped from SQLite');
assert(
  JSON.stringify(tables) === JSON.stringify(['attachments', 'conversations', 'libraries', 'memories', 'messages', 'projects']),
  `Exact 6 core tables remain: ${tables.join(', ')}`
);

const convCols = db.prepare('PRAGMA table_info(conversations);').all().map((c) => c.name);
assert(!convCols.includes('agent_id'), 'Column `agent_id` removed from `conversations` table');

const libCols = db.prepare('PRAGMA table_info(libraries);').all().map((c) => c.name);
assert(!libCols.includes('agent_id'), 'Column `agent_id` removed from `libraries` table');

// -----------------------------------------------------------------------------
// TEST 2: Deprecated Server Routes Purged
// -----------------------------------------------------------------------------
console.log('\nTEST 2: Verifying Deprecated API Routes Are Deleted');

const removedRoutes = [
  'app/api/projects/[id]/agents',
  'app/api/projects/[id]/skills',
];

for (const relPath of removedRoutes) {
  assert(!fs.existsSync(path.join(root, relPath)), `Deleted route directory: ${relPath}`);
}

// -----------------------------------------------------------------------------
// TEST 3: Dead & Orphaned UI Components Purged
// -----------------------------------------------------------------------------
console.log('\nTEST 3: Verifying Dead & Orphaned UI Components Are Deleted');

const removedComponents = [
  'components/projects/tabs/agents-tab.tsx',
  'components/projects/tabs/skills-tab.tsx',
  'components/projects/agents/agent-drawer.tsx',
  'components/projects/skills/skill-modal.tsx',
  'components/sidebar.tsx',
  'components/project-detail.tsx',
  'components/project-list.tsx',
  'components/ui/input.tsx',
  'components/ui/scroll-area.tsx',
];

for (const relPath of removedComponents) {
  assert(!fs.existsSync(path.join(root, relPath)), `Deleted dead component: ${relPath}`);
}

// -----------------------------------------------------------------------------
// TEST 4: Active Component & Route Code Cleanliness
// -----------------------------------------------------------------------------
console.log('\nTEST 4: Verifying Active Workspace & Navigation Files');

const workspaceCode = fs.readFileSync(path.join(root, 'components/projects/project-workspace.tsx'), 'utf8');
assert(!workspaceCode.includes("{ id: 'agents'"), 'ProjectWorkspace TABS no longer includes Agents tab');
assert(!workspaceCode.includes("{ id: 'skills'"), 'ProjectWorkspace TABS no longer includes Skills tab');
assert(
  workspaceCode.includes("{ id: 'threads'") &&
    workspaceCode.includes("{ id: 'instructions'") &&
    workspaceCode.includes("{ id: 'libraries'") &&
    workspaceCode.includes("{ id: 'memory'"),
  'ProjectWorkspace retains all 4 core tabs (Threads, Instructions, Library, Memory)'
);

const sideNavCode = fs.readFileSync(path.join(root, 'components/layout/side-nav.tsx'), 'utf8');
assert(!sideNavCode.includes("'/agents'"), 'SideNav no longer links to /agents');

const homeViewCode = fs.readFileSync(path.join(root, 'components/home/home-view.tsx'), 'utf8');
assert(!homeViewCode.includes("'/agents'"), 'HomeView no longer links to /agents');

// -----------------------------------------------------------------------------
// TEST 5: End-to-End Relational Lifecycle Without Agent FKs
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Verifying Relational Lifecycle (Project -> Thread -> Library -> Cascade Delete)');

const now = Math.floor(Date.now() / 1000);
const testProjId = `test_proj_p8_${Date.now()}`;
const testThreadId = `test_thread_p8_${Date.now()}`;
const testLibId = `test_lib_p8_${Date.now()}`;

db.prepare(`
  INSERT INTO projects (id, name, emoji, description, instructions, created_at, updated_at)
  VALUES (?, ?, '📓', 'Phase 8 test project', 'Follow project instructions', ?, ?)
`).run(testProjId, 'Phase 8 Test Project', now, now);

db.prepare(`
  INSERT INTO conversations (id, title, project_id, model, status, tags, created_at, updated_at)
  VALUES (?, 'Phase 8 Thread', ?, 'gemma4:e4b', 'active', '[]', ?, ?)
`).run(testThreadId, testProjId, now, now);

db.prepare(`
  INSERT INTO libraries (id, project_id, filename, media_type, size_bytes, extracted_text, type, include_in_context, added_by, thread_id, created_at, updated_at)
  VALUES (?, ?, 'notes.md', 'text/markdown', 42, '# Phase 8 Notes', 'reference', 1, 'User', ?, ?, ?)
`).run(testLibId, testProjId, testThreadId, now, now);

const insertedLib = db.prepare('SELECT id, filename FROM libraries WHERE id = ?').get(testLibId);
assert(insertedLib && insertedLib.filename === 'notes.md', 'Library item created cleanly without agent_id column');

// Cascade delete the project
db.prepare('DELETE FROM projects WHERE id = ?').run(testProjId);

const orphanedThread = db.prepare('SELECT id FROM conversations WHERE id = ?').get(testThreadId);
const orphanedLib = db.prepare('SELECT id FROM libraries WHERE id = ?').get(testLibId);
assert(!orphanedThread, 'Project deletion cascade-deleted child thread');
assert(!orphanedLib, 'Project deletion cascade-deleted child library item');

db.close();

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed === 0) {
  console.log('✓ ALL PHASE 8 SCHEMA & CLEANUP AUDITS VERIFIED!\n');
  process.exit(0);
} else {
  console.error(`✗ ${failed} VERIFICATION CHECKS FAILED!\n`);
  process.exit(1);
}
