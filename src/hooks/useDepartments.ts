import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import { SQL_DEPARTMENTS_LIST } from "@/lib/queries";
import type { Department } from "@/lib/types";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => query<Department>(SQL_DEPARTMENTS_LIST),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["departments"] });
  qc.invalidateQueries({ queryKey: ["candidates"] });
  qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
  qc.invalidateQueries({ queryKey: ["roles"] });
  qc.invalidateQueries({ queryKey: ["templates"] });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<number> => {
      const res = await execute(
        "INSERT INTO departments (name) VALUES ($1)",
        [name.trim()]
      );
      if (res.lastInsertId == null) throw new Error("Failed to create department");
      return res.lastInsertId;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRenameDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; name: string }): Promise<void> => {
      await execute("UPDATE departments SET name = $1 WHERE id = $2", [
        args.name.trim(),
        args.id,
      ]);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/**
 * Returns usage counts for a department — how many candidates, roles, and
 * templates reference it. Used to decide whether to confirm-on-delete.
 */
export async function getDepartmentUsage(id: number) {
  const rows = await query<{
    candidate_count: number;
    role_count: number;
    template_count: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM candidates  WHERE department_id = $1) AS candidate_count,
      (SELECT COUNT(*) FROM roles       WHERE department_id = $1) AS role_count,
      (SELECT COUNT(*) FROM requirement_templates WHERE department_id = $1) AS template_count`,
    [id]
  );
  return rows[0] ?? { candidate_count: 0, role_count: 0, template_count: 0 };
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      // FK is ON DELETE SET NULL for candidates, ON DELETE CASCADE for templates
      // and ON DELETE SET NULL for roles, per schema. Delete cascades through.
      await execute("DELETE FROM departments WHERE id = $1", [id]);
    },
    onSuccess: () => invalidateAll(qc),
  });
}
