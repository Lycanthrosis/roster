import { useState } from "react";
import { Pencil, Plus, Trash2, Briefcase, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useRoles,
  useCreateRole,
  useRenameRole,
  useDeleteRole,
  getRoleUsage,
} from "@/hooks/useRoles";
import { useToast } from "@/stores/toast-store";
import type { Role } from "@/lib/types";

export function RoleManager() {
  const rolesQuery = useRoles();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          Roles ({rolesQuery.data?.length ?? 0})
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" /> Add role
        </Button>
      </div>

      <div className="space-y-0.5 rounded-lg border border-border bg-card p-1.5">
        {(rolesQuery.data ?? []).length === 0 && !adding ? (
          <div className="px-2 py-3 text-center text-xs italic text-muted-foreground">
            No roles yet — click "Add role" to create one.
          </div>
        ) : null}

        {rolesQuery.data?.map((r) => (
          <RoleRow
            key={r.id}
            role={r}
            isEditing={editingId === r.id}
            onStartEdit={() => setEditingId(r.id)}
            onStopEdit={() => setEditingId(null)}
          />
        ))}

        {adding ? <NewRoleRow onDone={() => setAdding(false)} /> : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Deleting a role detaches candidates (they keep existing without a role).
        Templates scoped to the deleted role are removed.
      </p>
    </section>
  );
}

function RoleRow({
  role,
  isEditing,
  onStartEdit,
  onStopEdit,
}: {
  role: Role;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const rename = useRenameRole();
  const remove = useDeleteRole();
  const toast = useToast();
  const [draft, setDraft] = useState(role.title);

  async function commitRename() {
    const next = draft.trim();
    if (next && next !== role.title) {
      try {
        await rename.mutateAsync({ id: role.id, title: next });
        toast.success(`Renamed to "${next}"`);
      } catch (e) {
        toast.error("Rename failed", e instanceof Error ? e.message : String(e));
      }
    }
    onStopEdit();
  }

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

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md px-2 py-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(role.title);
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
            setDraft(role.title);
            onStopEdit();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60">
      <span className="flex-1 truncate">{role.title}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={() => {
          setDraft(role.title);
          onStartEdit();
        }}
        aria-label={`Rename ${role.title}`}
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

function NewRoleRow({ onDone }: { onDone: () => void }) {
  const create = useCreateRole();
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
        placeholder="Role title"
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
