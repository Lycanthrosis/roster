import { useState } from "react";
import { Pencil, Plus, Trash2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RoleSelect } from "@/components/shared/RoleDepartmentSelect";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useTemplateItems,
  useAddTemplateItem,
  useRemoveTemplateItem,
} from "@/hooks/useTemplates";
import { useRequirementTypes } from "@/hooks/useRequirementTypes";
import { useStages } from "@/hooks/useStages";
import { useToast } from "@/stores/toast-store";
import type { RequirementTemplateWithJoins } from "@/lib/types";

const NONE_STAGE = "__none_stage__";
const PICK_TYPE = "__pick__";

export function TemplateManager() {
  const templatesQuery = useTemplates();
  const [editing, setEditing] = useState<RequirementTemplateWithJoins | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" />
            Requirement templates ({templatesQuery.data?.length ?? 0})
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When you add a candidate, the template matching their role is
            attached automatically.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3 w-3" /> New template
        </Button>
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-card p-2">
        {(templatesQuery.data ?? []).length === 0 ? (
          <div className="px-2 py-3 text-center text-xs italic text-muted-foreground">
            No templates yet
          </div>
        ) : (
          templatesQuery.data?.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/60"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {t.role_title ?? "All candidates"} · {t.item_count} requirement
                  {t.item_count === 1 ? "" : "s"}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => setEditing(t)}
                aria-label={`Edit ${t.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {creating ? (
        <TemplateDialog open onOpenChange={(o) => !o && setCreating(false)} />
      ) : null}
      {editing ? (
        <TemplateDialog
          open
          existing={editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing?: RequirementTemplateWithJoins;
}) {
  const isEdit = !!existing;
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();
  const toast = useToast();

  const [name, setName] = useState(existing?.name ?? "");
  const [roleId, setRoleId] = useState<number | null>(existing?.role_id ?? null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (isEdit) {
        await update.mutateAsync({ id: existing!.id, name: trimmed, role_id: roleId });
        toast.success(`Saved "${trimmed}"`);
      } else {
        const newId = await create.mutateAsync({ name: trimmed, role_id: roleId });
        toast.success(`Created "${trimmed}"`);
        // Don't close — let the user immediately add items to the new template
        // by switching this dialog into edit mode.
        // Easiest: close here and re-open via a follow-up. For simplicity, just close.
        void newId;
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  async function confirmDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete template "${existing!.name}"? Existing candidates already created from it are not affected.`)) {
      return;
    }
    try {
      await remove.mutateAsync(existing!.id);
      toast.success(`Deleted "${existing!.name}"`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit template: ${existing!.name}` : "New template"}
          </DialogTitle>
          <DialogDescription>
            Templates auto-attach a set of requirements to new candidates with
            a matching role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RN New Hire"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <RoleSelect value={roleId} onChange={setRoleId} />
            <p className="text-[10px] text-muted-foreground">
              Leave empty to apply this template to candidates with no role assigned.
            </p>
          </div>

          {isEdit ? (
            <TemplateItemsEditor templateId={existing!.id} />
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Save the template first, then reopen it to add requirement items.
            </p>
          )}
        </div>

        <DialogFooter className="justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={confirmDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!name.trim()}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateItemsEditor({ templateId }: { templateId: number }) {
  const itemsQuery = useTemplateItems(templateId);
  const reqTypes = useRequirementTypes();
  const stagesQuery = useStages();
  const addItem = useAddTemplateItem();
  const removeItem = useRemoveTemplateItem();
  const toast = useToast();

  const [draftTypeId, setDraftTypeId] = useState<string>(PICK_TYPE);
  const [draftStageId, setDraftStageId] = useState<string>(NONE_STAGE);

  async function handleAdd() {
    if (draftTypeId === PICK_TYPE) return;
    try {
      await addItem.mutateAsync({
        template_id: templateId,
        requirement_type_id: Number(draftTypeId),
        stage_id: draftStageId === NONE_STAGE ? null : Number(draftStageId),
      });
      setDraftTypeId(PICK_TYPE);
      setDraftStageId(NONE_STAGE);
    } catch (e) {
      toast.error("Couldn't add", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRemove(itemId: number) {
    try {
      await removeItem.mutateAsync({ id: itemId, templateId });
    } catch (e) {
      toast.error("Couldn't remove", e instanceof Error ? e.message : String(e));
    }
  }

  const existingTypeIds = new Set(itemsQuery.data?.map((i) => i.requirement_type_id));

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Requirements in this template
      </Label>

      <div className="space-y-1 rounded-md border border-border p-1.5">
        {(itemsQuery.data ?? []).length === 0 ? (
          <div className="px-2 py-1.5 text-xs italic text-muted-foreground">
            No requirements yet
          </div>
        ) : (
          itemsQuery.data?.map((it) => (
            <div
              key={it.id}
              className="group flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent/40"
            >
              <span className="flex-1 truncate">{it.type_name}</span>
              {it.stage_name ? (
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {it.stage_name}
                </span>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleRemove(it.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Add requirement
          </Label>
          <Select value={draftTypeId} onValueChange={setDraftTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a requirement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PICK_TYPE}>Pick a requirement type…</SelectItem>
              {reqTypes.data
                ?.filter((rt) => !existingTypeIds.has(rt.id))
                .map((rt) => (
                  <SelectItem key={rt.id} value={String(rt.id)}>
                    {rt.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40 space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Required by stage
          </Label>
          <Select value={draftStageId} onValueChange={setDraftStageId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_STAGE}>— Any —</SelectItem>
              {stagesQuery.data?.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={draftTypeId === PICK_TYPE}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
