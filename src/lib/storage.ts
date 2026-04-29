import {
  BaseDirectory,
  mkdir,
  writeFile,
  remove,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

/** Name of the subfolder under app data dir where files are stored. */
const ATTACHMENTS_DIR = "attachments";

/**
 * Store a file under attachments/{candidate_id}/{unique}-{safe_name}.
 * Returns the storage path RELATIVE to the app data dir (what we store in the DB).
 */
export async function storeAttachment(
  candidateId: number,
  filename: string,
  bytes: Uint8Array
): Promise<{ storedPath: string; absolutePath: string }> {
  const safeName = sanitizeFilename(filename);
  const unique = generateId();
  const relativeDir = `${ATTACHMENTS_DIR}/${candidateId}`;
  const relativePath = `${relativeDir}/${unique}-${safeName}`;

  // Ensure subfolder exists
  await mkdir(relativeDir, {
    baseDir: BaseDirectory.AppData,
    recursive: true,
  });

  // Write the file
  await writeFile(relativePath, bytes, { baseDir: BaseDirectory.AppData });

  // Compute absolute path for opening later
  const base = await appDataDir();
  const absolutePath = await join(base, relativePath);

  return { storedPath: relativePath, absolutePath };
}

/** Delete a stored file. No-op if it's already gone. */
export async function removeAttachmentFile(storedPath: string): Promise<void> {
  try {
    const present = await exists(storedPath, { baseDir: BaseDirectory.AppData });
    if (present) {
      await remove(storedPath, { baseDir: BaseDirectory.AppData });
    }
  } catch (e) {
    // Log but don't throw — DB deletion should still proceed even if file is locked/missing.
    console.warn("Failed to remove attachment file:", e);
  }
}

/** Resolve a relative stored path to an absolute OS path. */
export async function resolveAttachmentPath(storedPath: string): Promise<string> {
  const base = await appDataDir();
  return join(base, storedPath);
}

/** Open a file with the OS default app. */
export async function openAttachment(storedPath: string): Promise<void> {
  const abs = await resolveAttachmentPath(storedPath);
  await openPath(abs);
}

/** Show the file in Explorer / Finder / Files. */
export async function revealAttachment(storedPath: string): Promise<void> {
  const abs = await resolveAttachmentPath(storedPath);
  await revealItemInDir(abs);
}

// ============================================================
// Helpers
// ============================================================

/** Strip or replace characters unsafe on Windows/macOS/Linux filesystems. */
function sanitizeFilename(name: string): string {
  const stripped = name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  // Cap length — long filenames break on older filesystems
  if (stripped.length > 120) {
    const dot = stripped.lastIndexOf(".");
    if (dot > 0 && dot > stripped.length - 10) {
      const ext = stripped.slice(dot);
      return stripped.slice(0, 120 - ext.length) + ext;
    }
    return stripped.slice(0, 120);
  }
  return stripped || "file";
}

/** Short unique ID for filename prefix. Not cryptographic — collision-resistant enough. */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}${rand}`;
}

/** Format bytes as a human-readable size. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Guess MIME type from filename extension. Best-effort; browsers and OS can do better at open time. */
export function guessMimeType(filename: string): string | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (!ext) return null;
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    zip: "application/zip",
  };
  return map[ext] ?? null;
}
