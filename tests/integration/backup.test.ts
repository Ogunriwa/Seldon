import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';
import { runBackup } from '@/scripts/backup';
import { runRestore } from '@/scripts/restore';

describe('Rolling SQLite & Uploads Backup + Safe Restore (scripts/backup.ts & scripts/restore.ts)', () => {
  let tempRoot: string;
  let dbPath: string;
  let uploadsDir: string;
  let backupsDir: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'seldon-backup-test-'));
    dbPath = path.join(tempRoot, 'app.db');
    uploadsDir = path.join(tempRoot, 'uploads');
    backupsDir = path.join(tempRoot, 'backups');

    mkdirSync(uploadsDir, { recursive: true });

    // Initialize an isolated WAL-mode SQLite database with core tables
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL);
      CREATE TABLE messages (id TEXT PRIMARY KEY, content TEXT NOT NULL);
      INSERT INTO projects (id, name) VALUES ('p1', 'Foundation Plan');
      INSERT INTO conversations (id, title) VALUES ('c1', 'First Psychohistory Chat');
      INSERT INTO messages (id, content) VALUES ('m1', 'Hello Hari Seldon');
    `);
    db.close();

    // Seed a dummy uploaded image file
    writeFileSync(path.join(uploadsDir, 'diagram.png'), 'fake-png-binary-content', 'utf-8');
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('creates a consistent online SQLite backup, verifies integrity_check, copies uploads, and writes manifest.json', async () => {
    const result = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-24T12:00:00.000Z'),
    });

    expect(existsSync(result.dbBackupPath)).toBe(true);
    expect(result.manifest.integrityCheck).toBe('ok');
    expect(result.manifest.tables.projects).toBe(1);
    expect(result.manifest.tables.conversations).toBe(1);
    expect(result.manifest.tables.messages).toBe(1);
    expect(result.manifest.uploadedFilesCount).toBe(1);

    const backedUpUpload = path.join(result.snapshotDir, 'uploads', 'diagram.png');
    expect(existsSync(backedUpUpload)).toBe(true);
    expect(readFileSync(backedUpUpload, 'utf-8')).toBe('fake-png-binary-content');
  });

  it('prunes snapshots older than 7 days while always retaining at least the 3 most recent snapshots', async () => {
    // 1. Create 3 snapshots that are all 10, 15, and 20 days old (all > 7 days old)
    const s1 = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-04T12:00:00.000Z'), // 20 days ago
    });
    const s2 = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-09T12:00:00.000Z'), // 15 days ago
    });
    const s3 = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-14T12:00:00.000Z'), // 10 days ago
    });

    // Even though s1, s2, s3 are all >7 days old relative to Oct 24, minKeep=3 protects all 3 when we check at s3
    expect(readdirSync(backupsDir)).toHaveLength(3);

    // 2. Now create a 4th snapshot on Oct 24 (today).
    // Now the 3 newest are [Oct 24, Oct 14, Oct 09], so Oct 04 (20 days old) MUST be pruned!
    const s4 = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-24T12:00:00.000Z'),
    });

    expect(s4.prunedSnapshots).toEqual([s1.snapshotId]);
    const remaining = readdirSync(backupsDir);
    expect(remaining).toHaveLength(3);
    expect(remaining).toContain(s4.snapshotId);
    expect(remaining).toContain(s3.snapshotId);
    expect(remaining).toContain(s2.snapshotId);
    expect(remaining).not.toContain(s1.snapshotId);
  });

  it('safely restores both SQLite state and uploads while taking a pre-restore safety snapshot', async () => {
    // 1. Take an initial backup (has 1 project 'p1' and 'diagram.png')
    const initialSnap = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      now: new Date('2026-10-24T10:00:00.000Z'),
    });

    // 2. Mutate the live database and delete the uploaded file
    const db = new Database(dbPath);
    db.exec(`DELETE FROM projects WHERE id = 'p1';`);
    db.close();
    rmSync(path.join(uploadsDir, 'diagram.png'));

    // 3. Restore from initialSnap
    const restoreRes = await runRestore({
      snapshotId: initialSnap.snapshotId,
      dbPath,
      uploadsDir,
      backupsDir,
      skipPortCheck: true,
    });

    expect(restoreRes.preRestoreSnapshotId).toMatch(/^pre-restore-/);

    // Verify 'p1' and 'diagram.png' are restored
    const restoredDb = new Database(dbPath, { readonly: true });
    const row = restoredDb.prepare('SELECT name FROM projects WHERE id = ?').get('p1') as {
      name: string;
    };
    restoredDb.close();

    expect(row.name).toBe('Foundation Plan');
    expect(existsSync(path.join(uploadsDir, 'diagram.png'))).toBe(true);
  });
});
