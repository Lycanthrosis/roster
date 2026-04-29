import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_STAGES_LIST,
  SQL_STAGES_ACTIVE,
  SQL_STAGE_INSERT,
  SQL_STAGE_UPDATE,
  SQL_STAGE_UPDATE_ORDER,
  SQL_STAGE_DELETE,
  SQL_STAGE_CANDIDATE_COUNT,
  SQL_STAGE_REASSIGN_CANDIDATES,
  SQL_STAGE_REASSIGN_TRANSITIONS_FROM,
  SQL_STAGE_REASSIGN_TRANSITIONS_TO,
  SQL_STAGE_CLEAR_REQUIREMENT_TYPE_DEFAULTS,
  SQL_STAGE_CLEAR_TEMPLATE_ITEM_STAGES,
  SQL_STAGE_CLEAR_CANDIDATE_REQUIREMENT_STAGES,
} from "@/lib/queries";
import type { Stage, StageInput } from "@/lib/types";

// ============================================================
// Reads
// ============================================================

export function useStages() {
  return useQuery({
    queryKey: ["stages"],
    queryFn: () => query<Stage>(SQL_STAGES_LIST),
  });
}

export function useActiveStages() {
  return useQuery({
    queryKey: ["stages", "active"],
    queryFn: () => query<Stage>(SQL_STAGES_ACTIVE),
  });
}

// ============================================================
// Mutations
// ============================================================

function invalidateStageCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["stages"] });
  qc.invalidateQueries({ queryKey: ["stages", "active"] });
  qc.invalidateQueries({ queryKey: ["pipeline-counts"] });
  qc.invalidateQueries({ queryKey: ["candidates"] });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StageInput): Promise<number> => {
      const res = await execute(SQL_STAGE_INSERT, [
        input.name.trim(),
        input.display_order,
        input.color,
        input.is_terminal ? 1 : 0,
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to create stage");
      return res.lastInsertId;
    },
    onSuccess: () => invalidateStageCaches(qc),
  });
}

interface UpdateStageInput {
  id: number;
  name: string;
  color: string;
  is_terminal: boolean;
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateStageInput): Promise<void> => {
      await execute(SQL_STAGE_UPDATE, [
        input.name.trim(),
        input.color,
        input.is_terminal ? 1 : 0,
        input.id,
      ]);
    },
    onSuccess: () => invalidateStageCaches(qc),
  });
}

/** Reorder stages. Pass an array of ids in the desired order. */
export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: number[]): Promise<void> => {
      // SQLite via Tauri plugin doesn't expose transactions to the frontend,
      // but a sequence of UPDATEs is fine — worst case a mid-failure leaves
      // partial ordering that the next save fixes. Use large step so we have
      // room to insert later without clashes.
      for (let i = 0; i < orderedIds.length; i++) {
        await execute(SQL_STAGE_UPDATE_ORDER, [(i + 1) * 10, orderedIds[i]]);
      }
    },
    onSuccess: () => invalidateStageCaches(qc),
  });
}

/** Get the count of candidates currently in a stage. Returns 0 if none. */
export async function getStageCandidateCount(stageId: number): Promise<number> {
  const rows = await query<{ cnt: number }>(SQL_STAGE_CANDIDATE_COUNT, [stageId]);
  return rows[0]?.cnt ?? 0;
}

/**
 * Count rows in stage_transitions referencing this stage (as either from or to).
 * Transitions have NOT NULL to_stage_id, so any reference requires a replacement.
 */
export async function getStageTransitionCount(stageId: number): Promise<number> {
  const rows = await query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM stage_transitions
     WHERE from_stage_id = $1 OR to_stage_id = $1`,
    [stageId]
  );
  return rows[0]?.cnt ?? 0;
}

interface DeleteStageInput {
  id: number;
  /** Stage to move any affected candidates to. Required if stage is in use. */
  replacementStageId?: number;
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteStageInput): Promise<void> => {
      const candidateCount = await getStageCandidateCount(input.id);
      const transitionCount = await getStageTransitionCount(input.id);

      if (candidateCount > 0 && input.replacementStageId == null) {
        throw new Error(
          `Cannot delete: ${candidateCount} candidate(s) are in this stage. Choose a replacement stage first.`
        );
      }
      if (transitionCount > 0 && input.replacementStageId == null) {
        throw new Error(
          `Cannot delete: this stage appears in ${transitionCount} historical transition(s). Choose a replacement stage to re-point history to.`
        );
      }

      if (candidateCount > 0 && input.replacementStageId != null) {
        await execute(SQL_STAGE_REASSIGN_CANDIDATES, [
          input.replacementStageId,
          input.id,
        ]);
      }

      if (transitionCount > 0 && input.replacementStageId != null) {
        await execute(SQL_STAGE_REASSIGN_TRANSITIONS_FROM, [
          input.replacementStageId,
          input.id,
        ]);
        await execute(SQL_STAGE_REASSIGN_TRANSITIONS_TO, [
          input.replacementStageId,
          input.id,
        ]);
      }

      // Clear nullable FK references — these all just lose a "hint" about stage.
      // Safe to run regardless of replacement choice.
      await execute(SQL_STAGE_CLEAR_REQUIREMENT_TYPE_DEFAULTS, [input.id]);
      await execute(SQL_STAGE_CLEAR_TEMPLATE_ITEM_STAGES, [input.id]);
      await execute(SQL_STAGE_CLEAR_CANDIDATE_REQUIREMENT_STAGES, [input.id]);

      await execute(SQL_STAGE_DELETE, [input.id]);
    },
    onSuccess: () => invalidateStageCaches(qc),
  });
}
