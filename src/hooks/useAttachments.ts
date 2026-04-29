import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_ATTACHMENTS_FOR_CANDIDATE,
  SQL_ATTACHMENTS_FOR_REQUIREMENT,
  SQL_ATTACHMENT_BY_ID,
  SQL_ATTACHMENT_INSERT,
  SQL_ATTACHMENT_DELETE,
} from "@/lib/queries";
import {
  storeAttachment,
  removeAttachmentFile,
  guessMimeType,
} from "@/lib/storage";
import type { Attachment } from "@/lib/types";

function invalidate(
  qc: ReturnType<typeof useQueryClient>,
  candidateId: number,
  requirementId: number | null
) {
  qc.invalidateQueries({ queryKey: ["attachments-candidate", candidateId] });
  if (requirementId != null) {
    qc.invalidateQueries({ queryKey: ["attachments-requirement", requirementId] });
  }
  // Requirement list includes attachment count
  qc.invalidateQueries({ queryKey: ["candidate-requirements", candidateId] });
}

// ============================================================
// Reads
// ============================================================

export function useAttachmentsForRequirement(requirementId: number | null | undefined) {
  return useQuery({
    queryKey: ["attachments-requirement", requirementId],
    queryFn: async () => {
      if (requirementId == null) return [];
      return query<Attachment>(SQL_ATTACHMENTS_FOR_REQUIREMENT, [requirementId]);
    },
    enabled: requirementId != null,
  });
}

export function useAttachmentsForCandidate(candidateId: number | null | undefined) {
  return useQuery({
    queryKey: ["attachments-candidate", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<Attachment>(SQL_ATTACHMENTS_FOR_CANDIDATE, [candidateId]);
    },
    enabled: candidateId != null,
  });
}

// ============================================================
// Mutations
// ============================================================

interface AddAttachmentInput {
  candidateId: number;
  requirementId: number | null;
  filename: string;
  bytes: Uint8Array;
}

export function useAddAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddAttachmentInput): Promise<number> => {
      const { storedPath } = await storeAttachment(
        input.candidateId,
        input.filename,
        input.bytes
      );
      const mime = guessMimeType(input.filename);
      const res = await execute(SQL_ATTACHMENT_INSERT, [
        input.candidateId,
        input.requirementId,
        input.filename,
        storedPath,
        mime,
        input.bytes.length,
      ]);
      if (res.lastInsertId == null) {
        // Attempt to clean up orphaned file
        await removeAttachmentFile(storedPath);
        throw new Error("Failed to record attachment in database");
      }
      return res.lastInsertId;
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId, vars.requirementId),
  });
}

interface DeleteAttachmentInput {
  id: number;
  candidateId: number;
  requirementId: number | null;
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteAttachmentInput): Promise<void> => {
      // Look up the stored path so we can delete the file too.
      const rows = await query<Attachment>(SQL_ATTACHMENT_BY_ID, [input.id]);
      const attachment = rows[0];
      if (attachment) {
        await removeAttachmentFile(attachment.stored_path);
      }
      await execute(SQL_ATTACHMENT_DELETE, [input.id]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId, vars.requirementId),
  });
}
