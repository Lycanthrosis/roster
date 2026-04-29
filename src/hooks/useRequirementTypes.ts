import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_REQUIREMENT_TYPES_LIST,
  SQL_REQUIREMENT_TYPE_INSERT,
  SQL_REQUIREMENT_TYPE_UPDATE,
  SQL_REQUIREMENT_TYPE_DELETE,
  SQL_REQUIREMENT_TYPE_USAGE_COUNT,
} from "@/lib/queries";
import type { RequirementType, RequirementTypeInput } from "@/lib/types";

export function useRequirementTypes() {
  return useQuery({
    queryKey: ["requirement-types"],
    queryFn: () => query<RequirementType>(SQL_REQUIREMENT_TYPES_LIST),
  });
}

export function useCreateRequirementType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequirementTypeInput): Promise<number> => {
      const res = await execute(SQL_REQUIREMENT_TYPE_INSERT, [
        input.name.trim(),
        input.category ?? null,
        input.description ?? null,
        input.default_stage_id ?? null,
        input.requires_expiration ? 1 : 0,
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to create requirement type");
      return res.lastInsertId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirement-types"] });
    },
  });
}

interface UpdateRequirementTypeInput extends RequirementTypeInput {
  id: number;
}

export function useUpdateRequirementType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRequirementTypeInput): Promise<void> => {
      await execute(SQL_REQUIREMENT_TYPE_UPDATE, [
        input.name.trim(),
        input.category ?? null,
        input.description ?? null,
        input.default_stage_id ?? null,
        input.requires_expiration ? 1 : 0,
        input.id,
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirement-types"] });
      qc.invalidateQueries({ queryKey: ["candidate-requirements"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export async function getRequirementTypeUsage(typeId: number) {
  const rows = await query<{ candidate_count: number; template_count: number }>(
    SQL_REQUIREMENT_TYPE_USAGE_COUNT,
    [typeId]
  );
  return rows[0] ?? { candidate_count: 0, template_count: 0 };
}

export function useDeleteRequirementType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const usage = await getRequirementTypeUsage(id);
      if (usage.candidate_count > 0 || usage.template_count > 0) {
        const parts: string[] = [];
        if (usage.candidate_count > 0)
          parts.push(`${usage.candidate_count} candidate record${usage.candidate_count === 1 ? "" : "s"}`);
        if (usage.template_count > 0)
          parts.push(`${usage.template_count} template${usage.template_count === 1 ? "" : "s"}`);
        throw new Error(
          `Cannot delete: in use by ${parts.join(" and ")}. Remove those first.`
        );
      }
      await execute(SQL_REQUIREMENT_TYPE_DELETE, [id]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirement-types"] });
    },
  });
}
