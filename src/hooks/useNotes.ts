import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_NOTES_LIST,
  SQL_NOTE_INSERT,
  SQL_NOTE_UPDATE,
  SQL_NOTE_TOGGLE_PIN,
  SQL_NOTE_DELETE,
} from "@/lib/queries";
import type { Note } from "@/lib/types";

function invalidate(qc: ReturnType<typeof useQueryClient>, candidateId: number) {
  qc.invalidateQueries({ queryKey: ["notes", candidateId] });
}

export function useNotes(candidateId: number | null | undefined) {
  return useQuery({
    queryKey: ["notes", candidateId],
    queryFn: async () => {
      if (candidateId == null) return [];
      return query<Note>(SQL_NOTES_LIST, [candidateId]);
    },
    enabled: candidateId != null,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      candidateId: number;
      content: string;
      pinned?: boolean;
    }): Promise<number> => {
      const res = await execute(SQL_NOTE_INSERT, [
        args.candidateId,
        args.content,
        "html",
        args.pinned ? 1 : 0,
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to create note");
      return res.lastInsertId;
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: number;
      candidateId: number;
      content: string;
    }): Promise<void> => {
      await execute(SQL_NOTE_UPDATE, [args.content, args.id]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}

export function useTogglePinNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; candidateId: number }): Promise<void> => {
      await execute(SQL_NOTE_TOGGLE_PIN, [args.id]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; candidateId: number }): Promise<void> => {
      await execute(SQL_NOTE_DELETE, [args.id]);
    },
    onSuccess: (_, vars) => invalidate(qc, vars.candidateId),
  });
}
