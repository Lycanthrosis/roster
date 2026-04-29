import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  Paperclip,
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  ExternalLink,
  FolderOpen,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useAttachmentsForRequirement,
  useAddAttachment,
  useDeleteAttachment,
} from "@/hooks/useAttachments";
import { openAttachment, revealAttachment, formatBytes } from "@/lib/storage";
import { cn, formatRelative } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

interface AttachmentsPopoverProps {
  candidateId: number;
  requirementId: number;
  count: number;
}

export function AttachmentsPopover({
  candidateId,
  requirementId,
  count,
}: AttachmentsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachmentsQuery = useAttachmentsForRequirement(requirementId);
  const addAttachment = useAddAttachment();
  const deleteAttachment = useDeleteAttachment();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const attachments = attachmentsQuery.data ?? [];

  /** Add raw bytes from a filesystem path (Tauri-provided drop). */
  async function addFileFromPath(path: string) {
    const bytes = await readFile(path);
    const name = path.split(/[\\/]/).pop() ?? "file";
    await addAttachment.mutateAsync({
      candidateId,
      requirementId,
      filename: name,
      bytes,
    });
  }

  /**
   * Tauri intercepts file drops at the window level — the browser 'drop' event
   * never fires for OS-level drags. We subscribe to Tauri's drag-drop events
   * while the popover is open and check whether the drop landed over our zone.
   */
  useEffect(() => {
    if (!open) {
      setDragOver(false);
      return;
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const webview = getCurrentWebview();
      const fn = await webview.onDragDropEvent(async (event) => {
        const payload = event.payload;

        if (payload.type === "over") {
          setDragOver(isPointInZone(payload.position, dropZoneRef.current));
          return;
        }

        if (payload.type === "leave") {
          setDragOver(false);
          return;
        }

        if (payload.type === "drop") {
          setDragOver(false);
          const inZone = isPointInZone(payload.position, dropZoneRef.current);
          if (!inZone) return;

          const paths = payload.paths ?? [];
          if (paths.length === 0) return;

          setError(null);
          setBusy(true);
          try {
            for (const p of paths) {
              await addFileFromPath(p);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }
      });

      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidateId, requirementId]);

  /** Add a File from a drop or an <input type=file>. */
  async function addBrowserFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      await addAttachment.mutateAsync({
        candidateId,
        requirementId,
        filename: file.name,
        bytes: buf,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Use the Tauri native file picker — nicer than the browser one inside an app. */
  async function pickWithDialog() {
    setError(null);
    try {
      const selected = await openDialog({ multiple: true });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      setBusy(true);
      for (const p of paths) {
        const pathStr = typeof p === "string" ? p : (p as { path: string }).path;
        const bytes = await readFile(pathStr);
        const name = pathStr.split(/[\\/]/).pop() ?? "file";
        await addAttachment.mutateAsync({
          candidateId,
          requirementId,
          filename: name,
          bytes,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`Delete "${att.filename}"? The file will be removed from disk.`)) {
      return;
    }
    await deleteAttachment.mutateAsync({
      id: att.id,
      candidateId,
      requirementId,
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded px-1 text-[10px] font-medium transition-colors",
            count > 0
              ? "text-foreground hover:bg-accent"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent"
          )}
          title={count > 0 ? `${count} file${count === 1 ? "" : "s"}` : "Add file"}
          onClick={(e) => e.stopPropagation()}
        >
          <Paperclip className="h-3 w-3" />
          {count > 0 ? <span className="tabular-nums">{count}</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
      >
        <div
          className={cn(
            "border-b border-border p-3 transition-colors",
            dragOver && "bg-primary/5"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Attachments</h4>
            <span className="text-xs tabular-nums text-muted-foreground">
              {attachments.length} file{attachments.length === 1 ? "" : "s"}
            </span>
          </div>
          <div
            ref={dropZoneRef}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div className="text-xs">
              <span className="text-muted-foreground">Drop files here, or </span>
              <button
                type="button"
                onClick={pickWithDialog}
                className="font-medium text-primary hover:underline"
                disabled={busy}
              >
                browse
              </button>
            </div>
            {busy ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </div>
            ) : null}
            {/* Hidden input only used as fallback; Tauri dialog is primary */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) await addBrowserFile(f);
                e.target.value = "";
              }}
            />
          </div>
          {error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        {/* File list */}
        <div className="max-h-64 overflow-y-auto">
          {attachments.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No files attached yet.
            </div>
          ) : (
            <div className="py-1">
              {attachments.map((a) => (
                <AttachmentRow key={a.id} att={a} onDelete={() => handleDelete(a)} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Row
// ============================================================

function AttachmentRow({
  att,
  onDelete,
}: {
  att: Attachment;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleOpen() {
    setBusy(true);
    try {
      await openAttachment(att.stored_path);
    } catch (e) {
      alert(`Failed to open: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleReveal() {
    try {
      await revealAttachment(att.stored_path);
    } catch (e) {
      alert(`Failed to reveal: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40">
      <FileTypeIcon mimeType={att.mime_type} filename={att.filename} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleOpen}
          className="block w-full truncate text-left text-sm hover:underline"
          disabled={busy}
          title={att.filename}
        >
          {att.filename}
        </button>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{formatBytes(att.size_bytes)}</span>
          <span>·</span>
          <span>{formatRelative(att.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleOpen}
          disabled={busy}
          title="Open"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleReveal}
          title="Show in folder"
        >
          <FolderOpen className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function FileTypeIcon({
  mimeType,
  filename,
}: {
  mimeType: string | null;
  filename: string;
}) {
  const m = (mimeType ?? "").toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (m.startsWith("image/")) {
    return <FileImage className="h-4 w-4 shrink-0 text-blue-500" />;
  }
  if (m === "application/pdf" || ext === "pdf") {
    return <FileText className="h-4 w-4 shrink-0 text-red-500" />;
  }
  if (
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv" ||
    m.includes("spreadsheet") ||
    m === "text/csv"
  ) {
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />;
  }
  if (ext === "doc" || ext === "docx" || m.includes("word")) {
    return <FileText className="h-4 w-4 shrink-0 text-blue-600" />;
  }
  return <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

/**
 * Tauri drop coordinates are in physical pixels relative to the webview.
 * Compare against the zone's bounding rect after scaling to the device pixel ratio.
 */
function isPointInZone(
  point: { x: number; y: number },
  zone: HTMLElement | null
): boolean {
  if (!zone) return false;
  const rect = zone.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = point.x / dpr;
  const y = point.y / dpr;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
