import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_TEMPLATES_LIST,
  SQL_TEMPLATE_BY_ID,
  SQL_TEMPLATE_ITEMS,
  SQL_TEMPLATE_INSERT,
  SQL_TEMPLATE_UPDATE,
  SQL_TEMPLATE_DELETE,
  SQL_TEMPLATE_ITEM_INSERT,
  SQL_TEMPLATE_ITEM_DELETE,
  SQL_TEMPLATE_MATCH,
  SQL_CANDIDATE_REQUIREMENT_INSERT,
} from "@/lib/queries";
import type {
  RequirementTemplate,
  RequirementTemplateWithJoins,
  RequirementTemplateItem,
} from "@/lib/types";

// ============================================================
// Reads
// ============================================================

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => query<RequirementTemplateWithJoins>(SQL_TEMPLATES_LIST),
  });
}

export function useTemplate(id: number | null | undefined) {
  return useQuery({
    queryKey: ["template", id],
    queryFn: async () => {
      if (id == null) return null;
      const rows = await query<RequirementTemplate>(SQL_TEMPLATE_BY_ID, [id]);
      return rows[0] ?? null;
    },
    enabled: id != null,
  });
}

export function useTemplateItems(templateId: number | null | undefined) {
  return useQuery({
    queryKey: ["template-items", templateId],
    queryFn: async () => {
      if (templateId == null) return [];
      return query<RequirementTemplateItem>(SQL_TEMPLATE_ITEMS, [templateId]);
    },
    enabled: templateId != null,
  });
}

// ============================================================
// Mutations
// ============================================================

interface CreateTemplateInput {
  name: string;
  role_id: number | null;
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<number> => {
      const res = await execute(SQL_TEMPLATE_INSERT, [
        input.name.trim(),
        input.role_id,
      ]);
      if (res.lastInsertId == null) throw new Error("Failed to create template");
      return res.lastInsertId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

interface UpdateTemplateInput {
  id: number;
  name: string;
  role_id: number | null;
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTemplateInput): Promise<void> => {
      await execute(SQL_TEMPLATE_UPDATE, [
        input.name.trim(),
        input.role_id,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", vars.id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => execute(SQL_TEMPLATE_DELETE, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useAddTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      template_id: number;
      requirement_type_id: number;
      stage_id: number | null;
    }): Promise<void> => {
      await execute(SQL_TEMPLATE_ITEM_INSERT, [
        input.template_id,
        input.requirement_type_id,
        input.stage_id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["template-items", vars.template_id] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useRemoveTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; templateId: number }) => {
      await execute(SQL_TEMPLATE_ITEM_DELETE, [input.id]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["template-items", vars.templateId] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// ============================================================
// Auto-attach: when a candidate is created, find a template that
// matches the role and copy all its items into candidate_requirements.
// ============================================================

export async function attachRequirementsFromTemplate(
  candidateId: number,
  roleId: number
): Promise<number> {
  const templates = await query<RequirementTemplate>(SQL_TEMPLATE_MATCH, [roleId]);
  if (templates.length === 0) return 0;
  const template = templates[0];

  const items = await query<RequirementTemplateItem>(SQL_TEMPLATE_ITEMS, [template.id]);
  for (const item of items) {
    await execute(SQL_CANDIDATE_REQUIREMENT_INSERT, [
      candidateId,
      item.requirement_type_id,
      item.stage_id,
      "not_complete",
    ]);
  }
  return items.length;
}
