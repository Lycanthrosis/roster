import { useEffect, useRef, useState } from "react";
import {
  FileSignature,
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
  Check,
  X,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useOfferLetterReview,
  useSetCompensationReview,
  useSetOfferLetterFile,
  useSetJobDescriptionFile,
} from "@/hooks/useOfferLetterReview";
import { execute } from "@/lib/db";
import { SQL_ATTACHMENT_INSERT } from "@/lib/queries";
import {
  storeAttachment,
  removeAttachmentFile,
  openAttachment,
  formatBytes,
  guessMimeType,
} from "@/lib/storage";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

interface OfferLetterReviewSectionProps {
  candidateId: number;
}

export function OfferLetterReviewSection({
  candidateId,
}: OfferLetterReviewSectionProps) {
  const reviewQuery = useOfferLetterReview(candidateId);
  const review = reviewQuery.data;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Offer letter review
        </h2>
      </div>

      <CompensationReview candidateId={candidateId} review={review} />

      <FileSlot
        candidateId={candidateId}
        label="Offer letter"
        icon={<FileSignature className="h-3.5 w-3.5" />}
        filename={review?.offer_letter_filename ?? null}
        storedPath={review?.offer_letter_stored_path ?? null}
        sizeBytes={review?.offer_letter_size_bytes ?? null}
        currentAttachmentId={review?.offer_letter_attachment_id ?? null}
        slot="offer_letter"
      />

      <FileSlot
        candidateId={candidateId}
        label="Job description"
        icon={<FileText className="h-3.5 w-3.5" />}
        filename={review?.job_description_filename ?? null}
        storedPath={review?.job_description_stored_path ?? null}
        sizeBytes={review?.job_description_size_bytes ?? null}
        currentAttachmentId={review?.job_description_attachment_id ?? null}
        slot="job_description"
      />
    </div>
  );
}

// ============================================================
// Compensation tri-state + conditional note
// ============================================================

function CompensationReview({
  candidateId,
  review,
}: {
  candidateId: number;
  review: ReturnType<typeof useOfferLetterReview>["data"];
}) {
  const setCompensation = useSetCompensationReview();
  const toast = useToast();

  const value = review?.compensation_matches; // null | 0 | 1 | undefined
  const [noteDraft, setNoteDraft] = useState(
    review?.compensation_mismatch_note ?? ""
  );
  const [savingNote, setSavingNote] = useState(false);

  // Sync local note draft when DB value changes (e.g., after refetch)
  useEffect(() => {
    setNoteDraft(review?.compensation_mismatch_note ?? "");
  }, [review?.compensation_mismatch_note]);

  async function setMatches(next: 0 | 1 | null) {
    try {
      await setCompensation.mutateAsync({
        candidateId,
        compensationMatches: next,
        // When toggling away from "mismatch", clear the note
        mismatchNote: next === 0 ? noteDraft.trim() || null : null,
      });
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  async function commitNote() {
    if (value !== 0) return;
    setSavingNote(true);
    try {
      await setCompensation.mutateAsync({
        candidateId,
        compensationMatches: 0,
        mismatchNote: noteDraft.trim() || null,
      });
    } catch (e) {
      toast.error("Couldn't save note", e instanceof Error ? e.message : String(e));
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <Label className="mb-2 block text-xs">Compensation matches?</Label>
      <div className="flex items-center gap-1.5">
        <ToggleButton
          active={value === 1}
          onClick={() => setMatches(value === 1 ? null : 1)}
          icon={<Check className="h-3.5 w-3.5" />}
          label="Yes"
          tone="success"
        />
        <ToggleButton
          active={value === 0}
          onClick={() => setMatches(value === 0 ? null : 0)}
          icon={<X className="h-3.5 w-3.5" />}
          label="No"
          tone="destructive"
        />
        <ToggleButton
          active={value == null}
          onClick={() => setMatches(null)}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          label="Not yet"
          tone="muted"
        />
      </div>

      {value === 0 ? (
        <div className="mt-3 space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Reason / details
          </Label>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLTextAreaElement).blur();
              }
            }}
            placeholder="What doesn't match? (saves on blur)"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
          {savingNote ? (
            <div className="text-[10px] text-muted-foreground">Saving…</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "success" | "destructive" | "muted";
}) {
  const activeClasses =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : tone === "destructive"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-accent text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
        active
          ? activeClasses
          : "border-border text-muted-foreground hover:bg-accent/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// Single-file slot (offer letter or JD)
// ============================================================

interface FileSlotProps {
  candidateId: number;
  label: string;
  icon: React.ReactNode;
  filename: string | null;
  storedPath: string | null;
  sizeBytes: number | null;
  currentAttachmentId: number | null;
  slot: "offer_letter" | "job_description";
}

function FileSlot({
  candidateId,
  label,
  icon,
  filename,
  storedPath,
  sizeBytes,
  currentAttachmentId,
  slot,
}: FileSlotProps) {
  const setOffer = useSetOfferLetterFile();
  const setJd = useSetJobDescriptionFile();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function handleFile(file: File) {
    setBusy("upload");
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { storedPath: newStoredPath } = await storeAttachment(
        candidateId,
        file.name,
        buffer
      );
      const insertRes = await execute(SQL_ATTACHMENT_INSERT, [
        candidateId,
        null, // not tied to a candidate_requirements row
        file.name,
        newStoredPath,
        guessMimeType(file.name) ?? file.type ?? null,
        file.size,
      ]);
      const newId = insertRes.lastInsertId;
      if (newId == null) throw new Error("Couldn't record attachment");

      const previousAttachmentId = currentAttachmentId;
      const previousStoredPath = storedPath;

      // Update the slot to point at the new attachment, deleting the previous DB row
      if (slot === "offer_letter") {
        await setOffer.mutateAsync({
          candidateId,
          attachmentId: newId,
          previousAttachmentId,
        });
      } else {
        await setJd.mutateAsync({
          candidateId,
          attachmentId: newId,
          previousAttachmentId,
        });
      }

      // Best-effort: delete the previous file from disk
      if (previousStoredPath) {
        try {
          await removeAttachmentFile(previousStoredPath);
        } catch {
          // Non-fatal — if the file doesn't exist or is locked, the DB still reflects the new state
        }
      }

      toast.success(`${label} uploaded`, file.name);
    } catch (e) {
      toast.error("Upload failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (!filename) return;
    if (!confirm(`Remove the ${label.toLowerCase()} file?`)) return;
    setBusy("remove");
    try {
      const previousAttachmentId = currentAttachmentId;
      const previousStoredPath = storedPath;

      if (slot === "offer_letter") {
        await setOffer.mutateAsync({
          candidateId,
          attachmentId: null,
          previousAttachmentId,
        });
      } else {
        await setJd.mutateAsync({
          candidateId,
          attachmentId: null,
          previousAttachmentId,
        });
      }

      if (previousStoredPath) {
        try {
          await removeAttachmentFile(previousStoredPath);
        } catch {
          // ignore
        }
      }
      toast.success(`${label} removed`);
    } catch (e) {
      toast.error("Couldn't remove", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpen() {
    if (!storedPath) return;
    try {
      await openAttachment(storedPath);
    } catch (e) {
      toast.error("Couldn't open file", e instanceof Error ? e.message : String(e));
    }
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
        {icon}
        <span>{label}</span>
      </div>

      {filename ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:bg-accent/60"
            title="Click to open"
          >
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{filename}</div>
              {sizeBytes ? (
                <div className="text-[10px] text-muted-foreground">
                  {formatBytes(sizeBytes)}
                </div>
              ) : null}
            </div>
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={pickFile}
            disabled={busy !== null}
            title="Replace"
          >
            {busy === "upload" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRemove}
            disabled={busy !== null}
            title="Remove"
          >
            {busy === "remove" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background/50 px-2 py-3 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          {busy === "upload" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload {label.toLowerCase()}
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so selecting the same file again triggers change
          e.target.value = "";
        }}
      />
    </div>
  );
}
