import { useState } from "react";
import { Pencil, Plus, Trash2, UserSquare2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useRecruiters,
  useCreateRecruiter,
  useUpdateRecruiter,
  useDeleteRecruiter,
  getRecruiterUsage,
} from "@/hooks/useRecruiters";
import { formatPhone } from "@/lib/format";
import { useToast } from "@/stores/toast-store";
import type { Recruiter } from "@/lib/types";

export function RecruiterManager() {
  const recruitersQuery = useRecruiters();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <UserSquare2 className="h-4 w-4" />
          Recruiters ({recruitersQuery.data?.length ?? 0})
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" /> Add recruiter
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {(recruitersQuery.data ?? []).length === 0 && !adding ? (
          <div className="px-3 py-3 text-center text-xs italic text-muted-foreground">
            No recruiters yet.
          </div>
        ) : null}

        <div className="divide-y divide-border/60">
          {recruitersQuery.data?.map((r) => (
            <RecruiterRow
              key={r.id}
              recruiter={r}
              isEditing={editingId === r.id}
              onStartEdit={() => setEditingId(r.id)}
              onStopEdit={() => setEditingId(null)}
            />
          ))}
        </div>

        {adding ? (
          <div className="border-t border-border">
            <NewRecruiterRow onDone={() => setAdding(false)} />
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Deleting a recruiter detaches them from any candidates (the candidate
        keeps existing without a recruiter).
      </p>
    </section>
  );
}

function RecruiterRow({
  recruiter,
  isEditing,
  onStartEdit,
  onStopEdit,
}: {
  recruiter: Recruiter;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const update = useUpdateRecruiter();
  const remove = useDeleteRecruiter();
  const toast = useToast();

  const [name, setName] = useState(recruiter.name);
  const [phone, setPhone] = useState(recruiter.phone ?? "");
  const [email, setEmail] = useState(recruiter.email ?? "");

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onStopEdit();
      return;
    }
    try {
      await update.mutateAsync({
        id: recruiter.id,
        name: trimmed,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      toast.success(`Saved "${trimmed}"`);
      onStopEdit();
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  function cancel() {
    setName(recruiter.name);
    setPhone(recruiter.phone ?? "");
    setEmail(recruiter.email ?? "");
    onStopEdit();
  }

  async function confirmDelete() {
    const usage = await getRecruiterUsage(recruiter.id);
    const message =
      usage === 0
        ? `Delete "${recruiter.name}"?`
        : `"${recruiter.name}" is used by ${usage} candidate${
            usage === 1 ? "" : "s"
          }. They'll keep existing without a recruiter. Continue?`;
    if (!confirm(message)) return;
    try {
      await remove.mutateAsync(recruiter.id);
      toast.success(`Deleted "${recruiter.name}"`);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : String(e));
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-7"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="h-7"
              maxLength={12}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-7"
            />
          </div>
        </div>
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7" onClick={cancel}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button size="sm" className="h-7" onClick={commit}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{recruiter.name}</div>
        {recruiter.phone || recruiter.email ? (
          <div className="text-[10px] text-muted-foreground">
            {[recruiter.phone, recruiter.email].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={onStartEdit}
        aria-label={`Edit ${recruiter.name}`}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        onClick={confirmDelete}
        aria-label={`Delete ${recruiter.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function NewRecruiterRow({ onDone }: { onDone: () => void }) {
  const create = useCreateRecruiter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onDone();
      return;
    }
    try {
      await create.mutateAsync({
        name: trimmed,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      toast.success(`Added "${trimmed}"`);
    } catch (e) {
      toast.error("Couldn't add", e instanceof Error ? e.message : String(e));
    }
    onDone();
  }

  return (
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Name
          </Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="h-7"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Phone
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="555-123-4567"
            className="h-7"
            maxLength={12}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Email
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="h-7"
          />
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" className="h-7" onClick={onDone}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" className="h-7" onClick={commit}>
          <Check className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
