import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles, useCreateRole } from "@/hooks/useRoles";

const NONE = "__none__";
const NEW = "__new__";

interface RoleSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export function RoleSelect({ value, onChange }: RoleSelectProps) {
  const rolesQuery = useRoles();
  const createRole = useCreateRole();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  async function commitNew() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    try {
      const id = await createRole.mutateAsync(trimmed);
      onChange(id);
      setAdding(false);
      setDraft("");
    } catch {
      // Most likely a duplicate title — silently keep input open
    }
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitNew();
            }
            if (e.key === "Escape") {
              setAdding(false);
              setDraft("");
            }
          }}
          placeholder="New role title"
        />
        <Button type="button" size="sm" onClick={commitNew}>
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(false);
            setDraft("");
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value == null ? NONE : String(value)}
      onValueChange={(v) => {
        if (v === NEW) {
          setAdding(true);
          return;
        }
        onChange(v === NONE ? null : Number(v));
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— None —</SelectItem>
        {rolesQuery.data?.map((r) => (
          <SelectItem key={r.id} value={String(r.id)}>
            {r.title}
          </SelectItem>
        ))}
        <SelectItem value={NEW}>
          <span className="flex items-center gap-1.5 text-primary">
            <Plus className="h-3.5 w-3.5" />
            Add new role…
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
