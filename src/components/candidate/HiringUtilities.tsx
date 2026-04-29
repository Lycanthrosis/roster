import { useState } from "react";
import { Wrench } from "lucide-react";
import { LoECalculator } from "./LoECalculator";
import { useCreateNote } from "@/hooks/useNotes";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

interface HiringUtilitiesProps {
  candidateId: number;
}

const TABS = [
  { id: "loe", label: "Length of Employment" },
  // Add future utility tabs here. Each renders inside this same panel.
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HiringUtilities({ candidateId }: HiringUtilitiesProps) {
  const [active, setActive] = useState<TabId>("loe");
  const createNote = useCreateNote();
  const toast = useToast();

  async function addAsNote(html: string) {
    try {
      await createNote.mutateAsync({
        candidateId,
        content: html,
        pinned: false,
      });
      toast.success("Saved as a note");
    } catch (e) {
      toast.error(
        "Couldn't save note",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hiring utilities
        </h2>
      </div>

      {/* Tab strip */}
      {TABS.length > 1 ? (
        <div className="flex gap-1 border-b border-border bg-card/30 px-3 py-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                active === t.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {active === "loe" ? (
          <LoECalculator
            onAddAsNote={addAsNote}
            addingNote={createNote.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}
