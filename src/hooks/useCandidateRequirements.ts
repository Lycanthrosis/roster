import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_CANDIDATE_REQUIREMENTS_LIST,
  SQL_CANDIDATE_REQUIREMENT_INSERT,
  SQL_CANDIDATE_REQUIREMENT_UPDATE,
  SQL_CANDIDATE_REQUIREMENT_DELETE,
} from "@/lib/queries";
import type {
  CandidateRequirementWithType,
  RequirementStatus,
} from "@/lib/types";

function invalidate(qc: ReturnType<typeof useQueryClient>, candidateId: number) {
  qc.invalidateQueries({ queryKey: ["candidate-requirements", candidateId] });
  // Open-reqs count appears in the candidate list
  qc.invalidateQueries({ queryKey: ["candidates"] });
  qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
}

export function useCandidateRequirements(candidateId: number | null | undefined) {
  return useQuery({
    queryKey: ["candidate-requirements", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<CandidateRequirementWithType>(
        SQL_CANDIDATE_REQUIREMENTS_LIST,
        [candidateId]
      );
    },
    enabled: candidateId != null,
  });
}

export function useAddCandidateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      candidateId: number;
      requirementTypeId: number;
      stageId?: number | null;
    }): Promise<number> => {
      const res = await execute(SQL_CANDIDATE_REQUIREMENT_INSERT, [
        args.candidateId,
        args.requirementTypeId,
        args.stageId ?? null,
        "not_complete",
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to add requirement");
      return res.lastInsertId;
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}

interface UpdateRequirementInput {
  id: number;
  candidateId: number;
  status: RequirementStatus;
  completed_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  stage_id?: number | null;
}

/**
 * Update a per-candidate requirement. If transitioning TO 'complete' and no
 * completed_at is given, we stamp today. If transitioning AWAY from 'complete'
 * and completed_at isn't being explicitly set, we clear it.
 */
export function useUpdateCandidateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRequirementInput): Promise<void> => {
      let completedAt = input.completed_at ?? null;
      if (input.status === "complete" && completedAt == null) {
        completedAt = new Date().toISOString().slice(0, 10);
      }
      if (input.status !== "complete" && completedAt !== undefined) {
        // If user explicitly passed something (even for non-complete), respect it.
        // But if they passed undefined, fall through to null.
      }

      await execute(SQL_CANDIDATE_REQUIREMENT_UPDATE, [
        input.status,
        completedAt,
        input.expires_at ?? null,
        input.notes ?? null,
        input.stage_id ?? null,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}

export function useDeleteCandidateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; candidateId: number }): Promise<void> => {
      await execute(SQL_CANDIDATE_REQUIREMENT_DELETE, [args.id]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}
