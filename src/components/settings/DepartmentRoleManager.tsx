import { useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  Building2,
  Briefcase,
  Check,
  X,
} from "lucide-react";
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
import {
  useDepartments,
  useCreateDepartment,
  useRenameDepartment,
  useDeleteDepartment,
  getDepartmentUsage,
} from "@/hooks/useDepartments";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  getRoleUsage,
} from "@/hooks/useRoles";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import type { Department, Role } from "@/lib/types";

const NONE = "__none__";

export function DepartmentRoleManager() {
  const departmentsQuery = useDepartments();
  const rolesQuery = useRoles();

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | null>(null);

  const filteredRoles = useMemo(() => {
    const all = rolesQuery.data ?? [];
    if (filterDepartmentId == null) return all;
    return all.filter((r) => r.department_id === filterDepartmentId);
  }, [rolesQuery.data, filterDepartmentId]);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Departments &amp; roles
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DepartmentsColumn
          departments={departmentsQuery.data ?? []}
          selectedId={filterDepartmentId}
          onSelect={setFilterDepartmentId}
        />
        <RolesColumn
          roles={filteredRoles}
          departments={departmentsQuery.data ?? []}
          filterDepartmentId={filterDepartmentId}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Deleting a department detaches candidates and roles from it (they keep
        existing). Deleting a role detaches candidates. Templates scoped to a
        deleted department or role are removed.
      </p>
    </div>
  );
}

// ============================================================
// Departments column
// ============================================================

function DepartmentsColumn({
  departments,
  selectedId,
  onSelect,
}: {
  departments: Department[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          Departments ({departments.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      <div className="space-y-0.5 rounded-lg border border-border bg-card p-1.5">
        {/* "All" chip */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60",
            selectedId == null && "bg-accent/80 font-medium"
          )}
        >
          <span className="flex-1 text-left">All departments</span>
        </button>

        {departments.map((d) => (
          <DepartmentRow
            key={d.id}
            dept={d}
            isEditing={editingId === d.id}
            isSelected={selectedId === d.id}
            onClick={() => onSelect(d.id)}
            onStartEdit={() => setEditingId(d.id)}
            onStopEdit={() => setEditingId(null)}
          />
        ))}

        {adding ? (
          <NewDepartmentRow onDone={() => setAdding(false)} />
        ) : null}
      </div>
    </section>
  );
}

function DepartmentRow({
  dept,
  isEditing,
  isSelected,
  onClick,
  onStartEdit,
  onStopEdit,
}: {
  dept: Department;
  isEditing: boolean;
  isSelected: boolean;
  onClick: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const rename = useRenameDepartment();
  const remove = useDeleteDepartment();
  const toast = useToast();
  const [draft, setDraft] = useState(dept.name);

  async function commitRename() {
    const next = draft.trim();
    if (next && next !== dept.name) {
      try {
        await rename.mutateAsync({ id: dept.id, name: next });
        toast.success(`Renamed to "${next}"`);
      } catch (e) {
        toast.error("Rename failed", e instanceof Error ? e.message : String(e));
      }
    }
    onStopEdit();
  }

  async function confirmDelete() {
    const usage = await getDepartmentUsage(dept.id);
    const parts: string[] = [];
    if (usage.candidate_count > 0)
      parts.push(`${usage.candidate_count} candidate${usage.candidate_count === 1 ? "" : "s"}`);
    if (usage.role_count > 0)
      parts.push(`${usage.role_count} role${usage.role_count === 1 ? "" : "s"}`);
    if (usage.template_count > 0)
      parts.push(`${usage.template_count} template${usage.template_count === 1 ? "" : "s"}`);

    const message =
      parts.length === 0
        ? `Delete "${dept.name}"?`
        : `"${dept.name}" is used by ${parts.join(", ")}. Templates will be deleted; candidates and roles will just lose their department. Continue?`;

    if (!confirm(message)) return;
    try {
      await remove.mutateAsync(dept.id);
      toast.success(`Deleted "${dept.name}"`);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : String(e));
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md px-2 py-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(dept.name);
              onStopEdit();
            }
          }}
          className="h-7"
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commitRename}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            setDraft(dept.name);
            onStopEdit();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60",
        isSelected && "bg-accent/80 font-medium"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 text-left"
      >
        {dept.name}
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(dept.name);
          onStartEdit();
        }}
        aria-label={`Rename ${dept.name}`}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          confirmDelete();
        }}
        aria-label={`Delete ${dept.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function NewDepartmentRow({ onDone }: { onDone: () => void }) {
  const create = useCreateDepartment();
  const toast = useToast();
  const [name, setName] = useState("");

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onDone();
      return;
    }
    try {
      await create.mutateAsync(trimmed);
      toast.success(`Added "${trimmed}"`);
    } catch (e) {
      toast.error("Couldn't add", e instanceof Error ? e.message : String(e));
    }
    onDone();
  }

  return (
    <div className="flex items-center gap-1 rounded-md px-2 py-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Department name"
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onDone();
        }}
        className="h-7"
        autoFocus
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commit}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDone}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============================================================
// Roles column
// ============================================================

function RolesColumn({
  roles,
  departments,
  filterDepartmentId,
}: {
  roles: Role[];
  departments: Department[];
  filterDepartmentId: number | null;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          Roles ({roles.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      <div className="space-y-0.5 rounded-lg border border-border bg-card p-1.5">
        {roles.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs italic text-muted-foreground">
            {filterDepartmentId == null
              ? "No roles yet"
              : "No roles in this department"}
          </div>
        ) : (
          roles.map((r) => (
            <RoleRow
              key={r.id}
              role={r}
              departments={departments}
              onEdit={() => setEditing(r)}
            />
          ))
        )}
      </div>

      {adding ? (
        <RoleDialog
          open
          defaultDepartmentId={filterDepartmentId}
          onOpenChange={(o) => !o && setAdding(false)}
        />
      ) : null}
      {editing ? (
        <RoleDialog
          open
          existing={editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function RoleRow({
  role,
  departments,
  onEdit,
}: {
  role: Role;
  departments: Department[];
  onEdit: () => void;
}) {
  const remove = useDeleteRole();
  const toast = useToast();
  const dept = departments.find((d) => d.id === role.department_id);

  async function confirmDelete() {
    const usage = await getRoleUsage(role.id);
    const parts: string[] = [];
    if (usage.candidate_count > 0)
      parts.push(`${usage.candidate_count} candidate${usage.candidate_count === 1 ? "" : "s"}`);
    if (usage.template_count > 0)
      parts.push(`${usage.template_count} template${usage.template_count === 1 ? "" : "s"}`);

    const message =
      parts.length === 0
        ? `Delete "${role.title}"?`
        : `"${role.title}" is used by ${parts.join(", ")}. Templates will be deleted; candidates will lose their role. Continue?`;

    if (!confirm(message)) return;
    try {
      await remove.mutateAsync(role.id);
      toast.success(`Deleted "${role.title}"`);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60">
      <div className="min-w-0 flex-1">
        <div className="truncate">{role.title}</div>
        {dept ? (
          <div className="truncate text-[10px] text-muted-foreground">
            {dept.name}
          </div>
        ) : (
          <div className="truncate text-[10px] italic text-muted-foreground/60">
            No department
          </div>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={onEdit}
        aria-label={`Edit ${role.title}`}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        onClick={confirmDelete}
        aria-label={`Delete ${role.title}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function RoleDialog({
  open,
  onOpenChange,
  existing,
  defaultDepartmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Role;
  defaultDepartmentId?: number | null;
}) {
  const isEdit = !!existing;
  const create = useCreateRole();
  const update = useUpdateRole();
  const departmentsQuery = useDepartments();
  const toast = useToast();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [departmentId, setDepartmentId] = useState<number | null>(
    existing?.department_id ?? defaultDepartmentId ?? null
  );

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      if (isEdit) {
        await update.mutateAsync({
          id: existing!.id,
          title: trimmed,
          department_id: departmentId,
        });
        toast.success(`Updated "${trimmed}"`);
      } else {
        await create.mutateAsync({ title: trimmed, department_id: departmentId });
        toast.success(`Added "${trimmed}"`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit role" : "New role"}</DialogTitle>
          <DialogDescription>
            Roles appear in the candidate form and as template scopes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Charge Nurse"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={departmentId == null ? NONE : String(departmentId)}
              onValueChange={(v) => setDepartmentId(v === NONE ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {departmentsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
