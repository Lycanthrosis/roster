import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_OFFER_REVIEW_FOR_CANDIDATE,
  SQL_OFFER_REVIEW_SET_OFFER_LETTER,
  SQL_OFFER_REVIEW_SET_JOB_DESCRIPTION,
  SQL_OFFER_REVIEW_SET_COMPENSATION,
  SQL_ATTACHMENT_DELETE,
} from "@/lib/queries";
import type { OfferLetterReview } from "@/lib/types";

/**
 * Read the offer letter review row for a candidate. Returns null when no
 * row exists yet (the candidate hasn't been reviewed).
 */
export function useOfferLetterReview(candidateId: number | null | undefined) {
  return useQuery({
    queryKey: ["offer-letter-review", candidateId],
    queryFn: async () => {
      if (candidateId == null) return null;
      const rows = await query<OfferLetterReview>(
        SQL_OFFER_REVIEW_FOR_CANDIDATE,
        [candidateId]
      );
      return rows[0] ?? null;
    },
    enabled: candidateId != null,
  });
}

interface SetCompensationInput {
  candidateId: number;
  compensationMatches: 0 | 1 | null;
  mismatchNote: string | null;
}

export function useSetCompensationReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetCompensationInput): Promise<void> => {
      await execute(SQL_OFFER_REVIEW_SET_COMPENSATION, [
        input.candidateId,
        input.compensationMatches,
        input.mismatchNote,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["offer-letter-review", vars.candidateId] });
    },
  });
}

interface SetFileSlotInput {
  candidateId: number;
  attachmentId: number | null;
  /** When replacing/clearing, optionally remove the old attachment row + file. */
  previousAttachmentId?: number | null;
}

export function useSetOfferLetterFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetFileSlotInput): Promise<void> => {
      await execute(SQL_OFFER_REVIEW_SET_OFFER_LETTER, [
        input.candidateId,
        input.attachmentId,
      ]);
      if (input.previousAttachmentId != null) {
        await execute(SQL_ATTACHMENT_DELETE, [input.previousAttachmentId]);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["offer-letter-review", vars.candidateId] });
      qc.invalidateQueries({ queryKey: ["attachments-for-candidate", vars.candidateId] });
    },
  });
}

export function useSetJobDescriptionFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetFileSlotInput): Promise<void> => {
      await execute(SQL_OFFER_REVIEW_SET_JOB_DESCRIPTION, [
        input.candidateId,
        input.attachmentId,
      ]);
      if (input.previousAttachmentId != null) {
        await execute(SQL_ATTACHMENT_DELETE, [input.previousAttachmentId]);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["offer-letter-review", vars.candidateId] });
      qc.invalidateQueries({ queryKey: ["attachments-for-candidate", vars.candidateId] });
    },
  });
}
