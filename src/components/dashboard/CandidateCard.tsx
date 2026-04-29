import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { Briefcase, CheckCircle2, Clock } from "lucide-react";
import { cn, formatDate, initials } from "@/lib/utils";
import type { CandidateWithJoins } from "@/lib/types";

interface CandidateCardProps {
  candidate: CandidateWithJoins;
  isDragOverlay?: boolean;
}

export function CandidateCard({ candidate, isDragOverlay }: CandidateCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: { candidate },
    disabled: isDragOverlay,
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const openRequirements = candidate.open_requirements_count;
  const totalRequirements = candidate.total_requirements_count;

  // Click vs drag: fire navigate only on click, not after a drag
  function handleClick(e: React.MouseEvent) {
    if (isDragging) return;
    // Don't navigate if user was dragging (dnd-kit handles this via activationConstraint
    // on the sensor, but we still guard)
    if (e.defaultPrevented) return;
    navigate(`/candidates/${candidate.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "group cursor-grab touch-none rounded-md border border-border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && !isDragOverlay && "opacity-40",
        isDragOverlay && "rotate-2 shadow-xl ring-2 ring-primary/20"
      )}
    >
      {/* Top row: avatar + name */}
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {initials(candidate.first_name, candidate.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">
            {candidate.first_name} {candidate.last_name}
          </div>
          {candidate.role_title ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{candidate.role_title}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {candidate.recruiter ? (
          <span className="truncate">{candidate.recruiter}</span>
        ) : null}
        {candidate.position_type ? (
          <span className="shrink-0 rounded-sm bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            {candidate.position_type}
          </span>
        ) : null}
      </div>

      {/* Footer: offer signed date + reqs */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(candidate.offer_letter_signed_date)}
        </span>
        {totalRequirements > 0 ? (
          <span className="flex items-center gap-1 tabular-nums">
            <CheckCircle2 className="h-3 w-3" />
            {totalRequirements - openRequirements}/{totalRequirements}
          </span>
        ) : null}
      </div>
    </div>
  );
}
