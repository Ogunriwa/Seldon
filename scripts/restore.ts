import Database from 'better-sqlite3';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBackup } from './backup';

export interface RestoreOptions {
  snapshotId: string;
  dbPath?: string;
  uploadsDir?: string;
  backupsDir?: string;
  skipPortCheck?: boolean;
  port?: number;
}

export function isPortListening(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Safely restores a backup snapshot into `data/app.db` and `data/uploads/`:
 * 1. Refuses to run if a Seldon server is currently listening on port 3000.
 * 2. Verifies the target snapshot exists and passes `PRAGMA integrity_check`.
 * 3. Creates a `pre-restore-<timestamp>` safety backup of the current state first.
 * 4. Restores `app.db` (clearing stale WAL/SHM files) and `uploads/`.
 */
export async function runRestore(options: RestoreOptions) {
  const dbPath =
    options.dbPath ||
    process.env.SELDON_DB_PATH ||
    path.join(process.cwd(), 'data', 'app.db');
  const dataDir = path.dirname(dbPath);
  const uploadsDir = options.uploadsDir || path.join(dataDir, 'uploads');
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const port = options.port ?? 3000;

  if (!options.skipPortCheck) {
    const active = await isPortListening(port);
    if (active) {
      throw new Error(
        `Refusing to restore while a server is listening on 127.0.0.1:${port}. Stop Seldon first.`,
      );
    }
  }

  const snapshotDir = path.join(backupsDir, options.snapshotId);
  const snapshotDbPath = path.join(snapshotDir, 'app.db');
  const snapshotUploadsDir = path.join(snapshotDir, 'uploads');

  if (!existsSync(snapshotDbPath)) {
    throw new Error(`Snapshot database not found at: ${snapshotDbPath}`);
  }

  // Verify the snapshot's integrity before touching the live database
  const checkDb = new Database(snapshotDbPath, { readonly: true });
  try {
    const check = String(checkDb.pragma('integrity_check', { simple: true }));
    if (check !== 'ok') {
      throw new Error(`Snapshot ${options.snapshotId} failed integrity_check: ${check}`);
    }
  } finally {
    checkDb.close();
  }

  // Take a pre-restore safety snapshot if a current database exists
  let preRestoreSnapshotId: string | null = null;
  if (existsSync(dbPath)) {
    const preBackup = await runBackup({
      dbPath,
      uploadsDir,
      backupsDir,
      prefix: 'pre-restore-',
    });
    preRestoreSnapshotId = preBackup.snapshotId;
  }

  // Remove existing SQLite WAL/SHM files and replace app.db cleanly
  mkdirSync(dataDir, { recursive: true });
  rmSync(`${dbPath}-wal`, { force: true });
  rmSync(`${dbPath}-shm`, { force: true });
  cpSync(snapshotDbPath, dbPath);

  // Restore uploads directory
  rmSync(uploadsDir, { recursive: true, force: true });
  if (existsSync(snapshotUploadsDir)) {
    cpSync(snapshotUploadsDir, uploadsDir, { recursive: true });
  } else {
    mkdirSync(uploadsDir, { recursive: true });
  }

  return {
    restoredSnapshotId: options.snapshotId,
    preRestoreSnapshotId,
    dbPath,
  };
}

// CLI Entrypoint
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const snapshotId = process.argv[2];
  if (!snapshotId) {
    console.error('Usage: pnpm db:restore <snapshot-folder-name>');
    process.exit(1);
  }

  runRestore({ snapshotId })
    .then((res) => {
      console.log(
        `[seldon:restore] Restored snapshot ${res.restoredSnapshotId} (pre-restore safety backup: ${res.preRestoreSnapshotId ?? 'none'})`,
      );
    })
    .catch((err) => {
      console.error('[seldon:restore] Restore failed:', err);
      process.exit(1);
    });
}
