import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KanbanColumn } from "./KanbanColumn";
import { CandidateCard } from "./CandidateCard";
import { useActiveStages } from "@/hooks/useStages";
import { useCandidates, useChangeStage } from "@/hooks/useCandidates";
import { useToast } from "@/stores/toast-store";
import type { CandidateWithJoins } from "@/lib/types";

export function KanbanBoard() {
  const stagesQuery = useActiveStages();
  const candidatesQuery = useCandidates();
  const changeStage = useChangeStage();
  const toast = useToast();

  const [activeCandidate, setActiveCandidate] = useState<CandidateWithJoins | null>(null);

  // Pending move — opens note prompt
  const [pendingMove, setPendingMove] = useState<{
    candidate: CandidateWithJoins;
    toStageId: number;
    toStageName: string;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px drag before activating — lets click still work for navigation
      activationConstraint: { distance: 5 },
    })
  );

  /**
   * Custom collision detection. The default `closestCorners` strategy can
   * latch onto a neighbouring column when the window is large (fullscreen),
   * because it ranks droppables by distance to corners rather than by
   * whether the pointer is actually inside them. `pointerWithin` is exact —
   * it returns the droppable the pointer is literally inside — so it's
   * correct at any zoom level. We fall back to `rectIntersection` for the
   * brief moments the pointer is between columns (over the gap), so the
   * drop never feels "dead".
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }, []);

  // Bucket candidates by stage
  const candidatesByStage = useMemo(() => {
    const map = new Map<number, CandidateWithJoins[]>();
    for (const c of candidatesQuery.data ?? []) {
      const list = map.get(c.current_stage_id) ?? [];
      list.push(c);
      map.set(c.current_stage_id, list);
    }
    return map;
  }, [candidatesQuery.data]);

  function handleDragStart(event: DragStartEvent) {
    const candidate = event.active.data.current?.candidate as
      | CandidateWithJoins
      | undefined;
    if (candidate) setActiveCandidate(candidate);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCandidate(null);
    const { active, over } = event;
    if (!over) return;

    const candidate = active.data.current?.candidate as
      | CandidateWithJoins
      | undefined;
    if (!candidate) return;

    // Over could be a column (data.stageId) or a card (sortable context).
    // For card: we need to find what column it's in.
    let toStageId: number | undefined;
    if (typeof over.data.current?.stageId === "number") {
      toStageId = over.data.current.stageId;
    } else {
      // Hovering over another card: look up that card's stage
      const otherId = over.id;
      const other = (candidatesQuery.data ?? []).find((c) => c.id === otherId);
      toStageId = other?.current_stage_id;
    }

    if (toStageId == null || toStageId === candidate.current_stage_id) return;

    const toStage = stagesQuery.data?.find((s) => s.id === toStageId);
    setPendingMove({
      candidate,
      toStageId,
      toStageName: toStage?.name ?? "",
    });
    setNoteDraft("");
  }

  async function confirmMove(withNote: boolean) {
    if (!pendingMove) return;
    try {
      await changeStage.mutateAsync({
        candidateId: pendingMove.candidate.id,
        fromStageId: pendingMove.candidate.current_stage_id,
        toStageId: pendingMove.toStageId,
        note: withNote ? noteDraft.trim() || undefined : undefined,
      });
      toast.success(
        `Moved ${pendingMove.candidate.first_name} ${pendingMove.candidate.last_name}`,
        `→ ${pendingMove.toStageName}`
      );
    } catch (e) {
      toast.error(
        "Couldn't move candidate",
        e instanceof Error ? e.message : String(e)
      );
    }
    setPendingMove(null);
    setNoteDraft("");
  }

  const stages = stagesQuery.data ?? [];
  const isLoading = stagesQuery.isLoading || candidatesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No active stages. Add some in Settings to see the board.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCandidate(null)}
      >
        <div className="flex h-full gap-3 overflow-x-auto p-6">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              candidates={candidatesByStage.get(stage.id) ?? []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCandidate ? (
            <div className="w-[264px]">
              <CandidateCard candidate={activeCandidate} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Optional note prompt on stage change */}
      <Dialog
        open={!!pendingMove}
        onOpenChange={(o) => !o && setPendingMove(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move to {pendingMove?.toStageName}?
            </DialogTitle>
            <DialogDescription>
              Optionally add a note about why. This will be saved in the candidate's
              stage history.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Optional — e.g. 'Passed phone screen, scheduling panel interview'"
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => confirmMove(false)}>
              Skip note
            </Button>
            <Button onClick={() => confirmMove(true)}>
              Move &amp; save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
