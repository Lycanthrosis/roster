import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruiters, useCreateRecruiter } from "@/hooks/useRecruiters";
import { formatPhone } from "@/lib/format";
import { useToast } from "@/stores/toast-store";

const NONE = "__none__";
const NEW = "__new__";

interface RecruiterSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export function RecruiterSelect({ value, onChange }: RecruiterSelectProps) {
  const recruitersQuery = useRecruiters();
  const createRecruiter = useCreateRecruiter();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setAdding(false);
  }

  async function commitNew() {
    const trimmed = name.trim();
    if (!trimmed) {
      reset();
      return;
    }
    try {
      const id = await createRecruiter.mutateAsync({
        name: trimmed,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      onChange(id);
      toast.success(`Added recruiter "${trimmed}"`);
      reset();
    } catch (e) {
      toast.error(
        "Couldn't add recruiter",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  if (adding) {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-border bg-card/40 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Escape") reset();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Phone
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="555-123-4567"
              className="h-8"
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
              className="h-8"
            />
          </div>
        </div>
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={commitNew}
            disabled={!name.trim()}
          >
            Add recruiter
          </Button>
        </div>
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
        <SelectValue placeholder="Select recruiter" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— None —</SelectItem>
        {recruitersQuery.data?.map((r) => (
          <SelectItem key={r.id} value={String(r.id)}>
            {r.name}
          </SelectItem>
        ))}
        <SelectItem value={NEW}>
          <span className="flex items-center gap-1.5 text-primary">
            <Plus className="h-3.5 w-3.5" />
            Add new recruiter…
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
