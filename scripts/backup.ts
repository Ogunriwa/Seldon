import Database from 'better-sqlite3';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface BackupOptions {
  dbPath?: string;
  uploadsDir?: string;
  backupsDir?: string;
  retentionDays?: number;
  minKeep?: number;
  now?: Date;
  prefix?: string;
}

export interface BackupManifest {
  snapshotId: string;
  createdAt: string;
  sourceDbPath: string;
  integrityCheck: string;
  tables: Record<string, number>;
  uploadedFilesCount: number;
}

export interface BackupResult {
  snapshotId: string;
  snapshotDir: string;
  dbBackupPath: string;
  manifest: BackupManifest;
  prunedSnapshots: string[];
}

const CORE_TABLES = [
  'projects',
  'conversations',
  'messages',
  'memories',
  'libraries',
  'attachments',
] as const;

export function formatSnapshotTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Executes an online SQLite backup via better-sqlite3's native `.backup()` API,
 * verifies `PRAGMA integrity_check`, copies `data/uploads/`, writes `manifest.json`,
 * and enforces rolling retention (7 days, minimum 3 snapshots kept).
 */
export async function runBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const dbPath =
    options.dbPath ||
    process.env.SELDON_DB_PATH ||
    path.join(process.cwd(), 'data', 'app.db');
  const dataDir = path.dirname(dbPath);
  const uploadsDir = options.uploadsDir || path.join(dataDir, 'uploads');
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const retentionDays = options.retentionDays ?? 7;
  const minKeep = options.minKeep ?? 3;
  const now = options.now ?? new Date();
  const prefix = options.prefix ?? '';

  if (!existsSync(dbPath)) {
    throw new Error(`Source SQLite database not found at: ${dbPath}`);
  }

  mkdirSync(backupsDir, { recursive: true });

  const snapshotId = `${prefix}${formatSnapshotTimestamp(now)}`;
  const snapshotDir = path.join(backupsDir, snapshotId);
  const dbBackupPath = path.join(snapshotDir, 'app.db');
  mkdirSync(snapshotDir, { recursive: true });

  // 1. Online consistent backup via SQLite's native Backup API
  const sourceDb = new Database(dbPath, { readonly: true });
  try {
    await sourceDb.backup(dbBackupPath);
  } catch (err) {
    rmSync(snapshotDir, { recursive: true, force: true });
    throw err;
  } finally {
    sourceDb.close();
  }

  // 2. Verify PRAGMA integrity_check on the newly written backup file
  const verifyDb = new Database(dbBackupPath, { readonly: true });
  let integrityResult = 'failed';
  const tableCounts: Record<string, number> = {};

  try {
    integrityResult = String(verifyDb.pragma('integrity_check', { simple: true }));
    if (integrityResult !== 'ok') {
      throw new Error(`Backup integrity check failed: ${integrityResult}`);
    }

    const existingTables = new Set(
      (
        verifyDb
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as Array<{ name: string }>
      ).map((r) => r.name),
    );

    for (const table of CORE_TABLES) {
      if (existingTables.has(table)) {
        const row = verifyDb
          .prepare(`SELECT COUNT(*) AS count FROM "${table}"`)
          .get() as { count: number };
        tableCounts[table] = row.count;
      }
    }
  } catch (err) {
    verifyDb.close();
    rmSync(snapshotDir, { recursive: true, force: true });
    throw err;
  }
  verifyDb.close();

  // 3. Copy disk-stored image/file uploads alongside the SQLite backup
  let uploadedFilesCount = 0;
  const destUploadsDir = path.join(snapshotDir, 'uploads');
  if (existsSync(uploadsDir)) {
    cpSync(uploadsDir, destUploadsDir, { recursive: true });
    uploadedFilesCount = readdirSync(destUploadsDir).filter((name) => {
      const full = path.join(destUploadsDir, name);
      return statSync(full).isFile();
    }).length;
  } else {
    mkdirSync(destUploadsDir, { recursive: true });
  }

  // 4. Write snapshot manifest
  const manifest: BackupManifest = {
    snapshotId,
    createdAt: now.toISOString(),
    sourceDbPath: dbPath,
    integrityCheck: integrityResult,
    tables: tableCounts,
    uploadedFilesCount,
  };
  writeFileSync(
    path.join(snapshotDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  // 5. Rolling retention: prune snapshots older than retentionDays while keeping at least minKeep
  const prunedSnapshots = pruneOldBackups({
    backupsDir,
    retentionDays,
    minKeep,
    now,
  });

  return {
    snapshotId,
    snapshotDir,
    dbBackupPath,
    manifest,
    prunedSnapshots,
  };
}

export function pruneOldBackups({
  backupsDir,
  retentionDays = 7,
  minKeep = 3,
  now = new Date(),
}: {
  backupsDir: string;
  retentionDays?: number;
  minKeep?: number;
  now?: Date;
}): string[] {
  if (!existsSync(backupsDir)) return [];

  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const entries = readdirSync(backupsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => {
      const dirPath = path.join(backupsDir, dirent.name);
      const manifestPath = path.join(dirPath, 'manifest.json');
      let timestampMs = statSync(dirPath).mtimeMs;

      if (existsSync(manifestPath)) {
        try {
          const parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Partial<BackupManifest>;
          if (parsed.createdAt) {
            const parsedTime = Date.parse(parsed.createdAt);
            if (!Number.isNaN(parsedTime)) {
              timestampMs = parsedTime;
            }
          }
        } catch {
          // Fallback to directory mtimeMs
        }
      }

      return {
        name: dirent.name,
        dirPath,
        timestampMs,
      };
    })
    // Sort newest first
    .sort((a, b) => b.timestampMs - a.timestampMs);

  const pruned: string[] = [];

  entries.forEach((entry, index) => {
    // Always retain the `minKeep` most recent snapshots regardless of age
    if (index < minKeep) return;

    const ageMs = now.getTime() - entry.timestampMs;
    if (ageMs > maxAgeMs) {
      rmSync(entry.dirPath, { recursive: true, force: true });
      pruned.push(entry.name);
    }
  });

  return pruned;
}

// CLI Entrypoint
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runBackup()
    .then((res) => {
      console.log(
        `[seldon:backup] Created snapshot ${res.snapshotId} (integrity=${res.manifest.integrityCheck}, uploads=${res.manifest.uploadedFilesCount}, pruned=${res.prunedSnapshots.length})`,
      );
    })
    .catch((err) => {
      console.error('[seldon:backup] Backup failed:', err);
      process.exit(1);
    });
}
