import { useState } from "react";
import { Pencil, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useRequirementTypes,
  useCreateRequirementType,
  useUpdateRequirementType,
  useDeleteRequirementType,
} from "@/hooks/useRequirementTypes";
import type { RequirementType, RequirementCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "Compliance",
  credentialing: "Credentialing",
  occupational_health: "Occupational Health",
  document: "Documents",
  other: "Other",
};
const CATEGORIES: RequirementCategory[] = [
  "compliance",
  "credentialing",
  "occupational_health",
  "document",
  "other",
];
const NONE = "__none__";

export function RequirementTypeManager() {
  const typesQuery = useRequirementTypes();
  const [editing, setEditing] = useState<RequirementType | null>(null);
  const [creating, setCreating] = useState(false);

  const types = typesQuery.data ?? [];

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: types.filter((t) => (t.category ?? "other") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Requirement catalog ({types.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add requirement
        </Button>
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.cat}>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[group.cat]}
            </h3>
            <div className="rounded-lg border border-border bg-card">
              {group.items.map((t, i) => (
                <div
                  key={t.id}
                  className={`group flex items-center gap-2 px-3 py-2 hover:bg-accent/50 ${
                    i > 0 ? "border-t border-border/60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm">{t.name}</span>
                      {t.requires_expiration ? (
                        <Clock
                          className="h-3 w-3 shrink-0 text-muted-foreground"
                          aria-label="Has expiration date"
                        />
                      ) : null}
                    </div>
                    {t.description ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {t.description}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => setEditing(t)}
                    aria-label={`Edit ${t.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {creating ? (
        <RequirementTypeDialog open onOpenChange={setCreating} />
      ) : null}
      {editing ? (
        <RequirementTypeDialog
          open
          existing={editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function RequirementTypeDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: RequirementType;
}) {
  const isEdit = !!existing;
  const create = useCreateRequirementType();
  const update = useUpdateRequirementType();
  const remove = useDeleteRequirementType();

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<RequirementCategory | null>(
    (existing?.category as RequirementCategory) ?? "compliance"
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [requiresExpiration, setRequiresExpiration] = useState(
    !!existing?.requires_expiration
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0;

  async function handleSave() {
    if (!canSubmit) return;
    if (isEdit) {
      await update.mutateAsync({
        id: existing!.id,
        name,
        category,
        description: description || null,
        default_stage_id: null, // not surfaced in UI for now
        requires_expiration: requiresExpiration,
      });
    } else {
      await create.mutateAsync({
        name,
        category,
        description: description || null,
        default_stage_id: null,
        requires_expiration: requiresExpiration,
      });
    }
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing.id);
      onOpenChange(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit requirement" : "New requirement"}</DialogTitle>
          <DialogDescription>
            Part of the master catalog. Attach it to candidates or include it in templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. State License Verification"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category ?? NONE}
              onValueChange={(v) =>
                setCategory(v === NONE ? null : (v as RequirementCategory))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label className="cursor-pointer">Has expiration</Label>
              <p className="text-xs text-muted-foreground">
                For licenses, immunizations, certifications.
              </p>
            </div>
            <Toggle
              checked={requiresExpiration}
              onCheckedChange={setRequiresExpiration}
            />
          </div>

          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
        </div>

        <DialogFooter className="flex items-center">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
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
  );
}
