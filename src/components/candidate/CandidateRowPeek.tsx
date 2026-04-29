import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentNotes, useRemainingRequirements } from "@/hooks/usePeekData";
import { cn, formatRelative, formatDate } from "@/lib/utils";
import type {
  Note,
  CandidateRequirementWithType,
  RequirementStatus,
} from "@/lib/types";

const STATUS_LABELS: Record<RequirementStatus, string> = {
  not_complete: "Not complete",
  in_progress: "In progress",
  complete: "Complete",
  substituted: "Substituted",
  waived: "Waived",
};

const STATUS_DOT: Record<RequirementStatus, string> = {
  not_complete: "bg-muted-foreground/40",
  in_progress: "bg-amber-500",
  complete: "bg-emerald-500",
  substituted: "bg-sky-500",
  waived: "bg-slate-400",
};

interface CandidateRowPeekProps {
  candidateId: number;
  totalNotes?: number;
  totalRequirements?: number;
}

export function CandidateRowPeek({
  candidateId,
}: CandidateRowPeekProps) {
  const navigate = useNavigate();
  const notes = useRecentNotes(candidateId);
  const reqs = useRemainingRequirements(candidateId);

  const isLoading = notes.isLoading || reqs.isLoading;

  return (
    <div className="bg-muted/20 px-6 py-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Recent notes */}
        <Section
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          title="Recent notes"
          count={notes.data?.length}
        >
          {isLoading ? (
            <LoadingRow />
          ) : notes.data && notes.data.length > 0 ? (
            <ul className="space-y-1.5">
              {notes.data.map((n) => (
                <NotePreview key={n.id} note={n} />
              ))}
            </ul>
          ) : (
            <EmptyLine>No notes yet</EmptyLine>
          )}
        </Section>

        {/* Remaining requirements */}
        <Section
          icon={<FileText className="h-3.5 w-3.5" />}
          title="Remaining requirements"
        >
          {isLoading ? (
            <LoadingRow />
          ) : reqs.data && reqs.data.length > 0 ? (
            <ul className="space-y-1">
              {reqs.data.map((r) => (
                <RequirementPreview key={r.id} req={r} />
              ))}
            </ul>
          ) : (
            <EmptyLine>Nothing remaining</EmptyLine>
          )}
        </Section>
      </div>

      <div className="mt-3 flex justify-end border-t border-border pt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/candidates/${candidateId}`);
          }}
        >
          Open full candidate page
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{title}</span>
        {count != null && count > 3 ? (
          <span className="text-muted-foreground/60">
            · showing 3 of {count}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Loading…
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 px-2 py-1.5 text-xs italic text-muted-foreground">
      {children}
    </div>
  );
}

function NotePreview({ note }: { note: Note }) {
  const preview = stripHtmlToText(note.content).slice(0, 180);

  return (
    <li className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {note.pinned ? (
          <span className="rounded-sm bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Pinned
          </span>
        ) : null}
        <span>{formatRelative(note.created_at)}</span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs text-foreground">
        {preview}
        {preview.length === 180 ? "…" : null}
      </p>
    </li>
  );
}

function RequirementPreview({ req }: { req: CandidateRequirementWithType }) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          STATUS_DOT[req.status]
        )}
      />
      <span className="min-w-0 flex-1 truncate text-xs">{req.type_name}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {STATUS_LABELS[req.status]}
        {req.completed_at ? ` · ${formatDate(req.completed_at)}` : null}
      </span>
    </li>
  );
}

/** Convert HTML note content to a short plaintext preview. */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/(h[1-6]|li|div)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
