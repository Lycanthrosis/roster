import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import { SQL_ROLES_LIST } from "@/lib/queries";
import type { Role } from "@/lib/types";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => query<Role>(SQL_ROLES_LIST),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["roles"] });
  qc.invalidateQueries({ queryKey: ["candidates"] });
  qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
  qc.invalidateQueries({ queryKey: ["templates"] });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string): Promise<number> => {
      const res = await execute(
        "INSERT INTO roles (title) VALUES ($1)",
        [title.trim()]
      );
      if (res.lastInsertId == null) throw new Error("Failed to create role");
      return res.lastInsertId;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRenameRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; title: string }): Promise<void> => {
      await execute("UPDATE roles SET title = $1 WHERE id = $2", [
        args.title.trim(),
        args.id,
      ]);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export async function getRoleUsage(id: number) {
  const rows = await query<{ candidate_count: number; template_count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM candidates WHERE role_id = $1) AS candidate_count,
      (SELECT COUNT(*) FROM requirement_templates WHERE role_id = $1) AS template_count`,
    [id]
  );
  return rows[0] ?? { candidate_count: 0, template_count: 0 };
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await execute("DELETE FROM roles WHERE id = $1", [id]);
    },
    onSuccess: () => invalidateAll(qc),
  });
}
