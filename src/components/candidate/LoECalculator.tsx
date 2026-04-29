import { useState } from "react";
import { Plus, Trash2, RotateCcw, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calcLoE,
  sumLoE,
  formatLoE,
  type LoEDuration,
} from "@/lib/format";

interface LoEEntry {
  /** Local-only id; not persisted. crypto.randomUUID() is supported in
   *  modern Tauri webviews; fall back to a Math.random id otherwise. */
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface LoECalculatorProps {
  /**
   * Called when the user clicks "Add as note". Receives an HTML string ready
   * to drop into the notes feed (matches existing TipTap-rendered HTML).
   */
  onAddAsNote: (html: string) => void;
  /** Whether the add-as-note action is currently in flight. */
  addingNote?: boolean;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `loe-${Math.random().toString(36).slice(2, 10)}`;

const newEntry = (): LoEEntry => ({
  id: newId(),
  label: "",
  startDate: "",
  endDate: "",
});

export function LoECalculator({ onAddAsNote, addingNote }: LoECalculatorProps) {
  const [entries, setEntries] = useState<LoEEntry[]>(() => [newEntry()]);

  function update(id: string, patch: Partial<LoEEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }

  function remove(id: string) {
    setEntries((prev) =>
      prev.length === 1 ? [newEntry()] : prev.filter((e) => e.id !== id)
    );
  }

  function add() {
    setEntries((prev) => [...prev, newEntry()]);
  }

  function clearAll() {
    setEntries([newEntry()]);
  }

  // Compute per-entry duration + total. Entries with missing/invalid dates
  // contribute null and aren't summed.
  const computed = entries.map((e) => ({
    entry: e,
    duration: calcLoE(e.startDate, e.endDate),
  }));
  const validDurations = computed
    .map((c) => c.duration)
    .filter((d): d is LoEDuration => d != null);
  const total = validDurations.length > 0 ? sumLoE(validDurations) : null;
  const hasInvalidRange = computed.some(
    (c) =>
      c.entry.startDate &&
      c.entry.endDate &&
      c.duration === null
  );
  const overlap = detectOverlap(entries);

  function handleAddAsNote() {
    if (!total) return;
    const html = renderNoteHtml(computed, total);
    onAddAsNote(html);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Length of Employment calculator</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add each position to compute total experience. Not saved automatically —
            click "Add as note" to keep a record.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0"
          onClick={clearAll}
          title="Clear all entries"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {computed.map((c, idx) => (
          <EntryRow
            key={c.entry.id}
            index={idx}
            entry={c.entry}
            duration={c.duration}
            invalidRange={
              !!c.entry.startDate && !!c.entry.endDate && c.duration === null
            }
            canRemove={entries.length > 1 || c.entry.label !== "" || c.entry.startDate !== "" || c.entry.endDate !== ""}
            onChange={(patch) => update(c.entry.id, patch)}
            onRemove={() => remove(c.entry.id)}
          />
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-full"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add another position
      </Button>

      {/* Total */}
      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <span
            className={
              total
                ? "text-base font-semibold tabular-nums text-foreground"
                : "text-sm italic text-muted-foreground"
            }
          >
            {total ? formatLoE(total) : "Add a complete date range"}
          </span>
        </div>
        {total ? (
          <div className="mt-1 text-right text-[10px] text-muted-foreground tabular-nums">
            {total.totalDays.toLocaleString()} total days
          </div>
        ) : null}
      </div>

      {/* Warnings */}
      {hasInvalidRange ? (
        <Hint tone="destructive">
          One or more entries have an end date before the start date. Those rows
          aren't included in the total.
        </Hint>
      ) : null}
      {overlap ? (
        <Hint tone="warning">
          Two of the date ranges overlap — they're still summed straight (per
          your settings), so overlapping months are counted twice.
        </Hint>
      ) : null}

      {/* Add as note */}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleAddAsNote}
          disabled={!total || addingNote}
        >
          <FileText className="h-3.5 w-3.5" />
          {addingNote ? "Saving…" : "Add as note"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Entry row
// ============================================================

interface EntryRowProps {
  index: number;
  entry: LoEEntry;
  duration: LoEDuration | null;
  invalidRange: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<LoEEntry>) => void;
  onRemove: () => void;
}

function EntryRow({
  index,
  entry,
  duration,
  invalidRange,
  canRemove,
  onChange,
  onRemove,
}: EntryRowProps) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <Input
          value={entry.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label (e.g. RN at Mercy Hospital)"
          className="h-7 flex-1 text-xs"
        />
        {canRemove ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove this entry"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Start
          </Label>
          <Input
            type="date"
            value={entry.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            End
          </Label>
          <Input
            type="date"
            value={entry.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
        <div className="min-w-[120px] text-right">
          {invalidRange ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              End before start
            </span>
          ) : duration ? (
            <span className="text-xs font-medium tabular-nums text-foreground">
              {formatLoE(duration)}
            </span>
          ) : (
            <span className="text-[10px] italic text-muted-foreground/70">
              awaiting dates
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function Hint({
  tone,
  children,
}: {
  tone: "warning" | "destructive";
  children: React.ReactNode;
}) {
  const className =
    tone === "destructive"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return (
    <div
      className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[10px] ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Detect whether any pair of completed date ranges overlap. We only check
 * pairs where both entries have valid start/end dates; partial entries
 * are skipped so we don't trigger the warning during data entry.
 */
function detectOverlap(entries: LoEEntry[]): boolean {
  const ranges = entries
    .map((e) => {
      if (!e.startDate || !e.endDate) return null;
      const s = Date.parse(e.startDate);
      const en = Date.parse(e.endDate);
      if (Number.isNaN(s) || Number.isNaN(en) || en < s) return null;
      return { start: s, end: en };
    })
    .filter((r): r is { start: number; end: number } => r != null);

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.start <= b.end && b.start <= a.end) return true;
    }
  }
  return false;
}

/**
 * Build the HTML body for the "Add as note" action. Output mirrors the
 * markup the TipTap editor produces, so it renders consistently with
 * regular notes.
 */
function renderNoteHtml(
  computed: { entry: LoEEntry; duration: LoEDuration | null }[],
  total: LoEDuration
): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const items = computed
    .filter((c) => c.duration != null)
    .map((c) => {
      const label = c.entry.label.trim() || "Position";
      const start = c.entry.startDate;
      const end = c.entry.endDate;
      const dur = formatLoE(c.duration);
      return `<li>${escape(label)} — ${escape(start)} → ${escape(end)} (${escape(dur)})</li>`;
    })
    .join("");

  return [
    `<p><strong>Length of Employment summary</strong></p>`,
    `<ul>${items}</ul>`,
    `<p><strong>Total: ${escape(formatLoE(total))}</strong> (${total.totalDays.toLocaleString()} days)</p>`,
  ].join("");
}
