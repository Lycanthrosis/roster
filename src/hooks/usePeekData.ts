import { useQuery } from "@tanstack/react-query";
import { query } from "@/lib/db";
import {
  SQL_RECENT_NOTES_FOR_CANDIDATE,
  SQL_REMAINING_REQUIREMENTS_FOR_CANDIDATE,
  SQL_STAGE_HISTORY_FOR_CANDIDATE,
} from "@/lib/queries";
import type { Note, CandidateRequirementWithType } from "@/lib/types";

export function useRecentNotes(
  candidateId: number | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["recent-notes", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<Note>(SQL_RECENT_NOTES_FOR_CANDIDATE, [candidateId]);
    },
    enabled: enabled && candidateId != null,
  });
}

/**
 * Returns up to 3 requirements that are not yet complete (status in
 * 'not_complete' or 'in_progress'). Used by the row-peek view as
 * "Remaining requirements".
 */
export function useRemainingRequirements(
  candidateId: number | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["remaining-requirements", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<CandidateRequirementWithType>(
        SQL_REMAINING_REQUIREMENTS_FOR_CANDIDATE,
        [candidateId]
      );
    },
    enabled: enabled && candidateId != null,
  });
}

export interface StageHistoryRow {
  id: number;
  candidate_id: number;
  from_stage_id: number | null;
  to_stage_id: number;
  transitioned_at: string;
  note: string | null;
  from_name: string | null;
  from_color: string | null;
  to_name: string;
  to_color: string;
}

export function useStageHistory(candidateId: number | null | undefined) {
  return useQuery({
    queryKey: ["stage-history", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<StageHistoryRow>(SQL_STAGE_HISTORY_FOR_CANDIDATE, [
        candidateId,
      ]);
    },
    enabled: candidateId != null,
  });
}
