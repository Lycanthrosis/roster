import { useMemo, useState } from "react";
import {
  Plus,
  Check,
  Clock,
  MoreHorizontal,
  AlertTriangle,
  Calendar,
  Trash2,
  Ban,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCandidateRequirements,
  useAddCandidateRequirement,
  useUpdateCandidateRequirement,
  useDeleteCandidateRequirement,
} from "@/hooks/useCandidateRequirements";
import { useRequirementTypes, useCreateRequirementType } from "@/hooks/useRequirementTypes";
import { useToast } from "@/stores/toast-store";
import { cn, formatDate } from "@/lib/utils";
import type {
  CandidateRequirementWithType,
  RequirementStatus,
  RequirementCategory,
} from "@/lib/types";

const STATUS_ORDER: RequirementStatus[] = [
  "not_complete",
  "in_progress",
  "complete",
  "substituted",
  "waived",
];

const STATUS_LABELS: Record<RequirementStatus, string> = {
  not_complete: "Not complete",
  in_progress: "In progress",
  complete: "Complete",
  substituted: "Substituted",
  waived: "Waived",
};

const STATUS_STYLES: Record<RequirementStatus, string> = {
  not_complete:
    "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  in_progress:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15",
  complete:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15",
  substituted:
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/15",
  waived:
    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/15",
};

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "Compliance",
  credentialing: "Credentialing",
  occupational_health: "Occupational Health",
  document: "Documents",
  other: "Other",
};

const CATEGORY_ORDER: RequirementCategory[] = [
  "compliance",
  "credentialing",
  "occupational_health",
  "document",
  "other",
];

interface RequirementChecklistProps {
  candidateId: number;
}

export function RequirementChecklist({ candidateId }: RequirementChecklistProps) {
  const reqsQuery = useCandidateRequirements(candidateId);
  const typesQuery = useRequirementTypes();
  const addReq = useAddCandidateRequirement();
  const toast = useToast();

  const reqs = reqsQuery.data ?? [];
  const types = typesQuery.data ?? [];

  // Group by category for display. Within a group, SQL has already sorted by status then name.
  const grouped = useMemo(() => {
    const map = new Map<RequirementCategory, CandidateRequirementWithType[]>();
    for (const r of reqs) {
      const cat = (r.type_category ?? "other") as RequirementCategory;
      const list = map.get(cat) ?? [];
      list.push(r);
      map.set(cat, list);
    }
    return map;
  }, [reqs]);

  // Summary counts
  const total = reqs.length;
  const complete = reqs.filter(
    (r) => r.status === "complete" || r.status === "substituted" || r.status === "waived"
  ).length;
  const open = total - complete;

  // Requirement types not yet attached (for the add picker)
  const attachedTypeIds = new Set(reqs.map((r) => r.requirement_type_id));
  const availableTypes = types.filter((t) => !attachedTypeIds.has(t.id));

  const [addOpen, setAddOpen] = useState(false);
  const [addFilter, setAddFilter] = useState("");

  // Inline-create state for new requirement types
  const createType = useCreateRequirementType();
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCategory, setNewTypeCategory] =
    useState<RequirementCategory>("compliance");

  function startInlineCreate() {
    setNewTypeName(addFilter); // pre-fill with whatever they were searching
    setCreatingType(true);
  }

  function cancelInlineCreate() {
    setCreatingType(false);
    setNewTypeName("");
    setNewTypeCategory("compliance");
  }

  async function commitInlineCreate() {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      cancelInlineCreate();
      return;
    }
    try {
      const newId = await createType.mutateAsync({
        name: trimmed,
        category: newTypeCategory,
      });
      // Auto-attach the new type to this candidate
      await addReq.mutateAsync({
        candidateId,
        requirementTypeId: newId,
      });
      toast.success(`Added "${trimmed}"`);
      cancelInlineCreate();
      setAddFilter("");
      setAddOpen(false);
    } catch (e) {
      toast.error("Couldn't add", e instanceof Error ? e.message : String(e));
    }
  }

  const filteredAvailable = availableTypes.filter((t) =>
    t.name.toLowerCase().includes(addFilter.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Requirements</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total === 0 ? (
              "No requirements attached"
            ) : (
              <>
                <span className="tabular-nums">{complete}</span> of{" "}
                <span className="tabular-nums">{total}</span> done
                {open > 0 ? (
                  <>
                    {" · "}
                    <span className="tabular-nums">{open}</span> open
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            {creatingType ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </label>
                  <Input
                    autoFocus
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g. TB skin test"
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitInlineCreate();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelInlineCreate();
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={newTypeCategory}
                    onChange={(e) =>
                      setNewTypeCategory(e.target.value as RequirementCategory)
                    }
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  >
                    {CATEGORY_ORDER.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-1 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={cancelInlineCreate}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7"
                    onClick={commitInlineCreate}
                    disabled={!newTypeName.trim() || createType.isPending}
                  >
                    Create &amp; attach
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search requirements…"
                  value={addFilter}
                  onChange={(e) => setAddFilter(e.target.value)}
                  className="mb-2 h-8"
                  autoFocus
                />
                <div className="max-h-64 overflow-y-auto">
                  {filteredAvailable.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {availableTypes.length === 0
                        ? "All requirements attached"
                        : "No matches"}
                    </div>
                  ) : (
                    filteredAvailable.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={async () => {
                          await addReq.mutateAsync({
                            candidateId,
                            requirementTypeId: t.id,
                          });
                          setAddFilter("");
                          setAddOpen(false);
                        }}
                        className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <span className="font-medium">{t.name}</span>
                        {t.category ? (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {CATEGORY_LABELS[t.category] ?? t.category}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-1 border-t border-border pt-1">
                  <button
                    type="button"
                    onClick={startInlineCreate}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add new requirement type…
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Body */}
      <div className="-mx-2 mt-3 flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">
              No requirements yet. Click + to add, or set up a template in Settings
              to auto-attach on future candidates.
            </p>
          </div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const group = grouped.get(cat);
            if (!group || group.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="space-y-0.5">
                  {group.map((req) => (
                    <RequirementRow key={req.id} req={req} candidateId={candidateId} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// Individual requirement row
// ============================================================

function RequirementRow({
  req,
  candidateId,
}: {
  req: CandidateRequirementWithType;
  candidateId: number;
}) {
  const update = useUpdateCandidateRequirement();
  const remove = useDeleteCandidateRequirement();
  const [editOpen, setEditOpen] = useState(false);

  const expirationStatus = getExpirationStatus(req.expires_at);

  // Quick-advance: clicking the status chip cycles to the next sensible status.
  // not_complete -> in_progress -> complete -> (click again opens menu to move backward)
  function cycleStatus() {
    const current = req.status;
    let next: RequirementStatus;
    if (current === "not_complete") next = "in_progress";
    else if (current === "in_progress") next = "complete";
    else return; // leave alone — use popover menu for backward moves
    update.mutate({
      id: req.id,
      candidateId,
      status: next,
      expires_at: req.expires_at,
      notes: req.notes,
      stage_id: req.stage_id,
    });
  }

  return (
    <div
      className={cn(
        "group mx-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-accent/30",
        req.status === "complete" && "opacity-75"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cycleStatus}
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
            STATUS_STYLES[req.status]
          )}
          title={`Click to advance · Current: ${STATUS_LABELS[req.status]}`}
        >
          <StatusIcon status={req.status} />
          {STATUS_LABELS[req.status]}
        </button>

        <span
          className={cn(
            "flex-1 truncate text-sm",
            req.status === "complete" && "line-through decoration-muted-foreground/50"
          )}
        >
          {req.type_name}
        </span>

        {expirationStatus === "expired" ? (
          <span
            className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-destructive"
            title={`Expired ${formatDate(req.expires_at)}`}
          >
            <AlertTriangle className="h-3 w-3" />
            Expired
          </span>
        ) : expirationStatus === "soon" ? (
          <span
            className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400"
            title={`Expires ${formatDate(req.expires_at)}`}
          >
            <AlertTriangle className="h-3 w-3" />
            Soon
          </span>
        ) : null}

        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <RequirementEditor
              req={req}
              candidateId={candidateId}
              onClose={() => setEditOpen(false)}
              onDelete={() => {
                remove.mutate({ id: req.id, candidateId });
                setEditOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Meta row — only shown if something interesting */}
      {(req.completed_at || req.expires_at || req.notes) ? (
        <div className="mt-1 flex flex-wrap items-center gap-3 pl-0.5 text-[11px] text-muted-foreground">
          {req.completed_at ? (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              {formatDate(req.completed_at)}
            </span>
          ) : null}
          {req.expires_at ? (
            <span
              className={cn(
                "flex items-center gap-1",
                expirationStatus === "expired" && "text-destructive",
                expirationStatus === "soon" && "text-amber-600 dark:text-amber-400"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(req.expires_at)}
            </span>
          ) : null}
          {req.notes ? (
            <span className="truncate italic">“{req.notes}”</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// Inline editor (popover)
// ============================================================

function RequirementEditor({
  req,
  candidateId,
  onClose,
  onDelete,
}: {
  req: CandidateRequirementWithType;
  candidateId: number;
  onClose: () => void;
  onDelete: () => void;
}) {
  const update = useUpdateCandidateRequirement();
  const [status, setStatus] = useState<RequirementStatus>(req.status);
  const [completedAt, setCompletedAt] = useState(req.completed_at ?? "");
  const [expiresAt, setExpiresAt] = useState(req.expires_at ?? "");
  const [notes, setNotes] = useState(req.notes ?? "");

  async function save() {
    await update.mutateAsync({
      id: req.id,
      candidateId,
      status,
      completed_at: completedAt || null,
      expires_at: expiresAt || null,
      notes: notes || null,
      stage_id: req.stage_id,
    });
    onClose();
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold">{req.type_name}</div>
        {req.type_description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {req.type_description}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as RequirementStatus)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <StatusIcon status={s} />
                  {STATUS_LABELS[s]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Completed</Label>
          <Input
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            className="h-8"
          />
        </div>
        {req.type_requires_expiration ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Expires</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-8"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm"
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </Button>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} className="h-7">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function StatusIcon({ status }: { status: RequirementStatus }) {
  switch (status) {
    case "complete":
      return <Check className="h-2.5 w-2.5" />;
    case "in_progress":
      return <Clock className="h-2.5 w-2.5" />;
    case "waived":
      return <Ban className="h-2.5 w-2.5" />;
    case "substituted":
      return <ArrowLeftRight className="h-2.5 w-2.5" />;
    default:
      return <span className="h-2.5 w-2.5 rounded-full border border-current" />;
  }
}

/** Returns "expired" | "soon" | "ok" | null depending on expires_at. */
function getExpirationStatus(
  expiresAt: string | null
): "expired" | "soon" | "ok" | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "ok";
}
