import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { Stage, CandidateWithJoins } from "@/lib/types";
import { CandidateCard } from "./CandidateCard";

interface KanbanColumnProps {
  stage: Stage;
  candidates: CandidateWithJoins[];
}

export function KanbanColumn({ stage, candidates }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { stageId: stage.id },
  });

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="truncate text-xs font-semibold uppercase tracking-wider">
            {stage.name}
          </span>
          <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {candidates.length}
          </span>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg border-2 border-dashed border-transparent bg-card/30 p-2 transition-all",
          isOver && "border-primary bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        <SortableContext
          items={candidates.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
            {candidates.length === 0 ? (
              <div
                className={cn(
                  "flex h-20 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground transition-colors",
                  isOver && "border-primary/60 bg-primary/5 text-primary"
                )}
              >
                Drop here
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
