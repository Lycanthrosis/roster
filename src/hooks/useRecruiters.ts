import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_RECRUITERS_LIST,
  SQL_RECRUITER_BY_ID,
  SQL_RECRUITER_INSERT,
  SQL_RECRUITER_UPDATE,
  SQL_RECRUITER_DELETE,
  SQL_RECRUITER_USAGE_COUNT,
} from "@/lib/queries";
import type { Recruiter } from "@/lib/types";

export function useRecruiters() {
  return useQuery({
    queryKey: ["recruiters"],
    queryFn: () => query<Recruiter>(SQL_RECRUITERS_LIST),
  });
}

export function useRecruiter(id: number | null | undefined) {
  return useQuery({
    queryKey: ["recruiter", id],
    queryFn: async () => {
      if (id == null) return null;
      const rows = await query<Recruiter>(SQL_RECRUITER_BY_ID, [id]);
      return rows[0] ?? null;
    },
    enabled: id != null,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["recruiters"] });
  qc.invalidateQueries({ queryKey: ["candidates"] });
  qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
}

interface CreateRecruiterInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export function useCreateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecruiterInput): Promise<number> => {
      const res = await execute(SQL_RECRUITER_INSERT, [
        input.name.trim(),
        input.phone?.trim() || null,
        input.email?.trim() || null,
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to create recruiter");
      return res.lastInsertId;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

interface UpdateRecruiterInput {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export function useUpdateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRecruiterInput): Promise<void> => {
      await execute(SQL_RECRUITER_UPDATE, [
        input.name.trim(),
        input.phone?.trim() || null,
        input.email?.trim() || null,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["recruiter", vars.id] });
    },
  });
}

export async function getRecruiterUsage(id: number): Promise<number> {
  const rows = await query<{ candidate_count: number }>(
    SQL_RECRUITER_USAGE_COUNT,
    [id]
  );
  return rows[0]?.candidate_count ?? 0;
}

export function useDeleteRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => execute(SQL_RECRUITER_DELETE, [id]),
    onSuccess: () => invalidateAll(qc),
  });
}
