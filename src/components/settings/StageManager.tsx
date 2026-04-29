import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStages,
  useCreateStage,
  useUpdateStage,
  useReorderStages,
  useDeleteStage,
  getStageCandidateCount,
  getStageTransitionCount,
} from "@/hooks/useStages";
import type { Stage } from "@/lib/types";

const STAGE_COLORS = [
  "#64748b", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e",
];

export function StageManager() {
  const stagesQuery = useStages();
  const reorder = useReorderStages();

  const [editing, setEditing] = useState<Stage | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stages = stagesQuery.data ?? [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(stages, oldIndex, newIndex);
    reorder.mutate(next.map((s) => s.id));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Stages ({stages.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add stage
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-1.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {stages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  onEdit={() => setEditing(stage)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Drag to reorder. Stages marked terminal appear separately on the dashboard and
        don't show up in the kanban board.
      </p>

      {creating ? (
        <StageFormDialog
          open={creating}
          onOpenChange={setCreating}
          nextOrder={(stages[stages.length - 1]?.display_order ?? 0) + 10}
        />
      ) : null}
      {editing ? (
        <StageFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          existing={editing}
        />
      ) : null}
    </div>
  );
}

// ============================================================
// Sortable row
// ============================================================

function SortableStageRow({ stage, onEdit }: { stage: Stage; onEdit: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: stage.color }}
      />
      <span className="flex-1 text-sm">{stage.name}</span>
      {stage.is_terminal ? (
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          Terminal
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={onEdit}
        aria-label={`Edit ${stage.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============================================================
// Create / edit dialog
// ============================================================

interface StageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Stage;
  nextOrder?: number;
}

function StageFormDialog({
  open,
  onOpenChange,
  existing,
  nextOrder,
}: StageFormDialogProps) {
  const isEdit = !!existing;
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const stagesQuery = useStages();

  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? STAGE_COLORS[10]);
  const [isTerminal, setIsTerminal] = useState(!!existing?.is_terminal);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0;

  async function handleSave() {
    if (!canSubmit) return;
    if (isEdit) {
      await updateStage.mutateAsync({
        id: existing!.id,
        name,
        color,
        is_terminal: isTerminal,
      });
    } else {
      await createStage.mutateAsync({
        name,
        color,
        is_terminal: isTerminal,
        display_order: nextOrder ?? 10,
      });
    }
    onOpenChange(false);
  }

  async function openDeleteConfirm() {
    if (!existing) return;
    const [count, txns] = await Promise.all([
      getStageCandidateCount(existing.id),
      getStageTransitionCount(existing.id),
    ]);
    setAffectedCount(count);
    setHistoryCount(txns);
    setReplacementId(null);
    setDeleteError(null);
    setDeleteConfirm(true);
  }

  async function handleDelete() {
    if (!existing) return;
    try {
      await deleteStage.mutateAsync({
        id: existing.id,
        replacementStageId: replacementId ?? undefined,
      });
      setDeleteConfirm(false);
      onOpenChange(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    }
  }

  const otherStages = (stagesQuery.data ?? []).filter((s) => s.id !== existing?.id);

  return (
    <>
      <Dialog open={open && !deleteConfirm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit stage" : "New stage"}</DialogTitle>
            <DialogDescription>
              Stages define where a candidate sits in your hiring pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage-name">Name</Label>
              <Input
                id="stage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Peer Interview"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-7 w-7 rounded-md border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#000" : "transparent",
                    }}
                    aria-label={`Select ${c}`}
                  >
                    {color === c ? (
                      <Check className="h-4 w-4 text-white mx-auto" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="stage-terminal" className="cursor-pointer">
                  Terminal stage
                </Label>
                <p className="text-xs text-muted-foreground">
                  E.g. Hired, Rejected. Hidden from the kanban board.
                </p>
              </div>
              <Toggle
                id="stage-terminal"
                checked={isTerminal}
                onCheckedChange={setIsTerminal}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openDeleteConfirm}
                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSubmit}>
                {isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete stage?</DialogTitle>
            <DialogDescription>
              {(() => {
                const c = affectedCount ?? 0;
                const h = historyCount ?? 0;
                if (c === 0 && h === 0) {
                  return `"${existing?.name}" is unused. This action cannot be undone.`;
                }
                const parts: string[] = [];
                if (c > 0) parts.push(`${c} active candidate${c === 1 ? "" : "s"}`);
                if (h > 0) parts.push(`${h} historical transition${h === 1 ? "" : "s"}`);
                return `"${existing?.name}" has ${parts.join(" and ")}. Choose a stage to re-point them to.`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {((affectedCount ?? 0) > 0 || (historyCount ?? 0) > 0) ? (
            <div className="space-y-1.5">
              <Label>Replacement stage</Label>
              <Select
                value={replacementId == null ? "" : String(replacementId)}
                onValueChange={(v) => setReplacementId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {otherStages.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                ((affectedCount ?? 0) > 0 || (historyCount ?? 0) > 0) &&
                replacementId == null
              }
            >
              <Trash2 className="h-4 w-4" /> Delete stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
