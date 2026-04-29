import JSZip from "jszip";
import {
  BaseDirectory,
  readFile,
  writeFile,
  exists,
  mkdir,
  readDir,
  remove,
  rename,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { closeDatabase } from "@/lib/db";

/** The DB filename matches what the Tauri SQL plugin creates. */
const DB_FILE = "hiring_tracker.db";
/** Sidecar files that exist when WAL mode is on. */
const DB_SIDECARS = ["hiring_tracker.db-shm", "hiring_tracker.db-wal"];
/** Folder name for attachments under app data. */
const ATTACHMENTS_DIR = "attachments";
/** Marker we put in the zip so restore can sanity-check it. */
const MANIFEST_FILE = "manifest.json";

interface Manifest {
  app: "hiring-tracker";
  version: 1;
  created_at: string;
  db_file: string;
  has_attachments: boolean;
}

export interface BackupResult {
  path: string;
  sizeBytes: number;
  fileCount: number;
}

export interface RestoreResult {
  restoredDb: boolean;
  restoredAttachmentCount: number;
  preservedBackupName: string;
}

// ============================================================
// BACKUP
// ============================================================

/**
 * Create a backup zip. Prompts the user for a destination path via native dialog.
 * Returns null if the user cancels.
 */
export async function createBackup(): Promise<BackupResult | null> {
  const now = new Date();
  const stamp =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");
  const defaultName = `roster-backup-${stamp}.zip`;

  const destPath = await saveDialog({
    defaultPath: defaultName,
    title: "Save backup",
    filters: [{ name: "Zip archive", extensions: ["zip"] }],
  });
  if (!destPath) return null;

  const zip = new JSZip();
  let fileCount = 0;

  // 1. DB file — must exist
  const dbBytes = await readFile(DB_FILE, { baseDir: BaseDirectory.AppData });
  zip.file(DB_FILE, dbBytes);
  fileCount++;

  // 2. Sidecar files — optional
  for (const sidecar of DB_SIDECARS) {
    if (await exists(sidecar, { baseDir: BaseDirectory.AppData })) {
      const bytes = await readFile(sidecar, { baseDir: BaseDirectory.AppData });
      zip.file(sidecar, bytes);
      fileCount++;
    }
  }

  // 3. Attachments recursively
  const attachmentsExist = await exists(ATTACHMENTS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (attachmentsExist) {
    fileCount += await addDirToZip(zip, ATTACHMENTS_DIR);
  }

  // 4. Manifest
  const manifest: Manifest = {
    app: "hiring-tracker",
    version: 1,
    created_at: now.toISOString(),
    db_file: DB_FILE,
    has_attachments: attachmentsExist,
  };
  zip.file(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  // 5. Generate & write to the destination
  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // The saveDialog returns an absolute path OUTSIDE AppData — we write directly
  // using the absolute path (no baseDir). The fs scope in capabilities permits
  // common user folders.
  await writeFile(destPath, zipBytes);

  return {
    path: destPath,
    sizeBytes: zipBytes.length,
    fileCount,
  };
}

/**
 * Walk a directory (relative to AppData) and add every file to the zip,
 * preserving the relative path structure.
 */
async function addDirToZip(zip: JSZip, relDir: string): Promise<number> {
  let count = 0;
  const entries = await readDir(relDir, { baseDir: BaseDirectory.AppData });
  for (const entry of entries) {
    const entryRelPath = `${relDir}/${entry.name}`;
    if (entry.isDirectory) {
      count += await addDirToZip(zip, entryRelPath);
    } else if (entry.isFile) {
      const bytes = await readFile(entryRelPath, {
        baseDir: BaseDirectory.AppData,
      });
      zip.file(entryRelPath, bytes);
      count++;
    }
  }
  return count;
}

// ============================================================
// RESTORE
// ============================================================

/**
 * Restore from a backup zip. Prompts for the source file, preserves
 * existing data under a timestamped backup name, then unpacks.
 * Returns null if the user cancels.
 *
 * IMPORTANT: this function closes the SQLite connection before touching the
 * DB file (Windows holds an exclusive lock on open SQLite files, preventing
 * rename). After this returns, the app is in a degraded state — NO further
 * database reads or writes will work until the app is restarted. The caller
 * must force-quit the app after a successful restore.
 */
export async function restoreBackup(): Promise<RestoreResult | null> {
  const source = await openDialog({
    title: "Choose backup to restore",
    multiple: false,
    filters: [{ name: "Zip archive", extensions: ["zip"] }],
  });
  if (!source) return null;
  const sourcePath = typeof source === "string" ? source : (source as { path: string }).path;

  // Read + unzip FIRST, before we touch the live DB. This way if the zip is
  // malformed, we bail out without having closed or moved anything.
  const zipBytes = await readFile(sourcePath);
  const zip = await JSZip.loadAsync(zipBytes);

  // Validate manifest — rejects random zips
  const manifestFile = zip.file(MANIFEST_FILE);
  if (!manifestFile) {
    throw new Error(
      "This doesn't look like a Roster backup (no manifest found)."
    );
  }
  const manifestText = await manifestFile.async("text");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("Backup manifest is corrupt.");
  }
  if (manifest.app !== "hiring-tracker") {
    throw new Error("This backup is for a different app.");
  }

  const dbInZip = zip.file(manifest.db_file);
  if (!dbInZip) {
    throw new Error(
      `Backup is missing the database file (expected "${manifest.db_file}").`
    );
  }

  // Zip is valid — now close the live DB connection so the file is no longer
  // locked, and proceed with the rename + unpack. From this point on, the
  // app cannot read/write the DB until restart.
  await closeDatabase();

  // Preserve existing data — rename DB + attachments dir so rollback is possible
  const preserveStamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const preservedBackupName = `pre-restore-${preserveStamp}`;

  // Preserve current DB (and sidecars)
  if (await exists(DB_FILE, { baseDir: BaseDirectory.AppData })) {
    await rename(DB_FILE, `${DB_FILE}.${preservedBackupName}`, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    });
  }
  for (const sidecar of DB_SIDECARS) {
    if (await exists(sidecar, { baseDir: BaseDirectory.AppData })) {
      await rename(sidecar, `${sidecar}.${preservedBackupName}`, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      });
    }
  }

  // Preserve attachments folder
  if (await exists(ATTACHMENTS_DIR, { baseDir: BaseDirectory.AppData })) {
    await rename(
      ATTACHMENTS_DIR,
      `${ATTACHMENTS_DIR}.${preservedBackupName}`,
      {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      }
    );
  }

  // Unpack DB
  const dbBytes = await dbInZip.async("uint8array");
  await writeFile(DB_FILE, dbBytes, { baseDir: BaseDirectory.AppData });

  // Unpack sidecars (usually not present because WAL was checkpointed on last close,
  // but restore them if they were in the backup)
  for (const sidecar of DB_SIDECARS) {
    const f = zip.file(sidecar);
    if (f) {
      const bytes = await f.async("uint8array");
      await writeFile(sidecar, bytes, { baseDir: BaseDirectory.AppData });
    }
  }

  // Unpack attachments (walk every file in the zip that starts with attachments/)
  let restoredAttachmentCount = 0;
  const attachmentEntries: JSZip.JSZipObject[] = [];
  zip.forEach((relPath, entry) => {
    if (relPath.startsWith(`${ATTACHMENTS_DIR}/`) && !entry.dir) {
      attachmentEntries.push(entry);
    }
  });
  for (const entry of attachmentEntries) {
    // Ensure parent dir exists
    const parent = entry.name.substring(0, entry.name.lastIndexOf("/"));
    if (parent) {
      await mkdir(parent, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });
    }
    const bytes = await entry.async("uint8array");
    await writeFile(entry.name, bytes, { baseDir: BaseDirectory.AppData });
    restoredAttachmentCount++;
  }

  return {
    restoredDb: true,
    restoredAttachmentCount,
    preservedBackupName,
  };
}

/**
 * After a successful restore, the user can invoke this to clean up
 * the preserved `.pre-restore-*` files. We don't do this automatically —
 * preserving them is the whole safety net.
 */
export async function discardPreservedData(preservedName: string): Promise<void> {
  // Remove renamed DB files
  const candidates = [
    `${DB_FILE}.${preservedName}`,
    ...DB_SIDECARS.map((s) => `${s}.${preservedName}`),
  ];
  for (const p of candidates) {
    if (await exists(p, { baseDir: BaseDirectory.AppData })) {
      await remove(p, { baseDir: BaseDirectory.AppData });
    }
  }
  // Remove renamed attachments folder
  const preservedDir = `${ATTACHMENTS_DIR}.${preservedName}`;
  if (await exists(preservedDir, { baseDir: BaseDirectory.AppData })) {
    await remove(preservedDir, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }
}

/** For display: where the db / attachments live on disk. */
export async function getDataDirectory(): Promise<string> {
  return appDataDir();
}

export async function getDbFilePath(): Promise<string> {
  const base = await appDataDir();
  return join(base, DB_FILE);
}
