import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, query } from "@/lib/db";
import {
  SQL_CANDIDATES_LIST,
  SQL_CANDIDATE_BY_ID,
  SQL_CANDIDATE_INSERT,
  SQL_CANDIDATE_UPDATE,
  SQL_CANDIDATE_ARCHIVE,
  SQL_CANDIDATE_UNARCHIVE,
  SQL_STAGE_CHANGE,
  SQL_TRANSITION_INSERT,
} from "@/lib/queries";
import { attachRequirementsFromTemplate } from "@/hooks/useTemplates";
import type {
  CandidateWithJoins,
  CandidateInput,
  CandidateFilters,
} from "@/lib/types";

// ============================================================
// Reads
// ============================================================

export function useCandidates() {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: () => query<CandidateWithJoins>(SQL_CANDIDATES_LIST),
  });
}

export type CandidateSortField =
  | "name"
  | "role"
  | "stage"
  | "offer_letter_signed_date"
  | "keyed_date"
  | "occ_health_appt"
  | "open_requirements";
export type SortDirection = "asc" | "desc";

interface UseFilteredCandidatesArgs {
  filters: CandidateFilters;
  sort?: { field: CandidateSortField; dir: SortDirection };
}

export function useFilteredCandidates({ filters, sort }: UseFilteredCandidatesArgs) {
  const { sql, params } = buildCandidatesQuery(filters, sort);
  return useQuery({
    queryKey: ["candidates-filtered", filters, sort],
    queryFn: () => query<CandidateWithJoins>(sql, params),
  });
}

export function buildCandidatesQuery(
  filters: CandidateFilters,
  sort?: { field: CandidateSortField; dir: SortDirection }
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const where: string[] = [];

  const status = filters.status ?? "active";
  where.push(`c.status = $${params.length + 1}`);
  params.push(status);

  if (filters.stageIds?.length) {
    const start = params.length;
    const ph = filters.stageIds.map((_, i) => `$${start + i + 1}`);
    where.push(`c.current_stage_id IN (${ph.join(",")})`);
    params.push(...filters.stageIds);
  }

  if (filters.roleIds?.length) {
    const start = params.length;
    const ph = filters.roleIds.map((_, i) => `$${start + i + 1}`);
    where.push(`c.role_id IN (${ph.join(",")})`);
    params.push(...filters.roleIds);
  }

  if (filters.positionTypes?.length) {
    const start = params.length;
    const ph = filters.positionTypes.map((_, i) => `$${start + i + 1}`);
    where.push(`c.position_type IN (${ph.join(",")})`);
    params.push(...filters.positionTypes);
  }

  if (filters.appliedFrom) {
    where.push(`c.offer_letter_signed_date >= $${params.length + 1}`);
    params.push(filters.appliedFrom);
  }
  if (filters.appliedTo) {
    where.push(`c.offer_letter_signed_date <= $${params.length + 1}`);
    params.push(filters.appliedTo);
  }

  if (filters.recruiterId != null) {
    where.push(`c.recruiter_id = $${params.length + 1}`);
    params.push(filters.recruiterId);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const like = `%${filters.search.trim()}%`;
    const p = `$${params.length + 1}`;
    where.push(
      `((c.first_name || ' ' || c.last_name) LIKE ${p}
        OR c.email LIKE ${p}
        OR c.phone LIKE ${p}
        OR rec.name LIKE ${p})`
    );
    params.push(like);
  }

  const orderBy = buildOrderBy(sort);

  // Note: SELECT mirrors SQL_CANDIDATES_LIST + the "open" status predicate.
  const sql = `
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.phone,
      c.role_id, c.position_type,
      c.current_stage_id, c.offer_letter_signed_date, c.target_start_date,
      c.recruiter_id, c.status,
      c.occ_health_status, c.occ_health_appt,
      c.employee_type, c.keyed_date,
      c.position_number, c.req_number, c.location_code, c.team_id_number,
      c.shift, c.compensation_amount, c.amount_approved, c.compensation_approval_received,
      c.manager_name, c.manager_email,
      c.last_contact_date, c.last_contact_method,
      c.offer_letter_reviewed, c.peoplesoft_education_uploaded,
      c.sharepoint_folder_completed, c.onboarding_specialist,
      c.created_at, c.updated_at,
      s.name  AS stage_name,
      s.color AS stage_color,
      s.is_terminal AS stage_is_terminal,
      r.title AS role_title,
      rec.name  AS recruiter_name,
      rec.phone AS recruiter_phone,
      rec.email AS recruiter_email,
      (SELECT COUNT(*) FROM candidate_requirements cr
        WHERE cr.candidate_id = c.id
          AND cr.status NOT IN ('complete','substituted','waived')) AS open_requirements_count,
      (SELECT COUNT(*) FROM candidate_requirements cr
        WHERE cr.candidate_id = c.id) AS total_requirements_count
    FROM candidates c
    JOIN stages s          ON s.id = c.current_stage_id
    LEFT JOIN roles r      ON r.id = c.role_id
    LEFT JOIN recruiters rec ON rec.id = c.recruiter_id
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
  `;

  return { sql, params };
}

function buildOrderBy(
  sort: { field: CandidateSortField; dir: SortDirection } | undefined
): string {
  const dir = sort?.dir === "asc" ? "ASC" : "DESC";
  if (!sort) return "c.updated_at DESC";
  switch (sort.field) {
    case "name":
      return `c.last_name ${dir}, c.first_name ${dir}`;
    case "role":
      return `r.title ${dir}`;
    case "stage":
      return `s.display_order ${dir}`;
    case "offer_letter_signed_date":
      return `c.offer_letter_signed_date ${dir}`;
    case "keyed_date":
      return `c.keyed_date ${dir}`;
    case "occ_health_appt":
      return `c.occ_health_appt ${dir}`;
    case "open_requirements":
      return `open_requirements_count ${dir}`;
    default:
      return "c.updated_at DESC";
  }
}

export function useCandidate(id: number | null | undefined) {
  return useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      if (id == null) return null;
      const rows = await query<CandidateWithJoins>(SQL_CANDIDATE_BY_ID, [id]);
      return rows[0] ?? null;
    },
    enabled: id != null,
  });
}


// ============================================================
// Mutations
// ============================================================

/**
 * Build the parameter array in the same order as SQL_CANDIDATE_INSERT/UPDATE
 * placeholders. Centralized so create + update can't drift.
 */
function candidateInputToInsertParams(input: CandidateInput): unknown[] {
  return [
    input.first_name,
    input.last_name,
    input.email,
    input.phone,
    input.role_id,
    input.position_type,
    input.current_stage_id,
    input.offer_letter_signed_date,
    input.target_start_date,
    input.recruiter_id,
    input.occ_health_status,
    input.occ_health_appt,
    input.employee_type,
    input.keyed_date,
    input.position_number,
    input.req_number,
    input.location_code,
    input.team_id_number,
    input.shift,
    input.compensation_amount,
    input.amount_approved,
    input.compensation_approval_received,
    input.manager_name,
    input.manager_email,
    input.last_contact_date,
    input.last_contact_method,
    input.offer_letter_reviewed,
    input.peoplesoft_education_uploaded,
    input.sharepoint_folder_completed,
    input.onboarding_specialist,
  ];
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CandidateInput): Promise<number> => {
      const res = await execute(
        SQL_CANDIDATE_INSERT,
        candidateInputToInsertParams(input)
      );
      if (res.lastInsertId == null) throw new Error("Failed to create candidate");
      const candidateId = res.lastInsertId;

      await execute(SQL_TRANSITION_INSERT, [
        candidateId,
        null,
        input.current_stage_id,
        null,
      ]);

      if (input.role_id != null) {
        await attachRequirementsFromTemplate(candidateId, input.role_id);
      }

      return candidateId;
    },
    onSuccess: (candidateId) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["pipeline-counts"] });
      qc.invalidateQueries({ queryKey: ["candidate-requirements", candidateId] });
      qc.invalidateQueries({ queryKey: ["stage-history", candidateId] });
    },
  });
}

interface UpdateCandidateInput extends CandidateInput {
  id: number;
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCandidateInput): Promise<void> => {
      // UPDATE: same param order as INSERT but without current_stage_id
      // (stage is changed separately via the transition flow), and with id last.
      await execute(SQL_CANDIDATE_UPDATE, [
        input.first_name,
        input.last_name,
        input.email,
        input.phone,
        input.role_id,
        input.position_type,
        input.offer_letter_signed_date,
        input.target_start_date,
        input.recruiter_id,
        input.occ_health_status,
        input.occ_health_appt,
        input.employee_type,
        input.keyed_date,
        input.position_number,
        input.req_number,
        input.location_code,
        input.team_id_number,
        input.shift,
        input.compensation_amount,
        input.amount_approved,
        input.compensation_approval_received,
        input.manager_name,
        input.manager_email,
        input.last_contact_date,
        input.last_contact_method,
        input.offer_letter_reviewed,
        input.peoplesoft_education_uploaded,
        input.sharepoint_folder_completed,
        input.onboarding_specialist,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["candidate", vars.id] });
    },
  });
}

/**
 * Patch a single field on a candidate. Used by inline editors (the copy
 * buttons, the boolean toggles in the onboarding card, etc.). Building one
 * UPDATE per field is more parameters but lets every editor be independent.
 *
 * Restriction: only columns whose names appear in this allow-list can be
 * patched. This prevents the field name from coming from user data.
 */
const PATCHABLE_FIELDS = new Set([
  "email",
  "phone",
  "recruiter_id",
  "offer_letter_signed_date",
  "target_start_date",
  "occ_health_status",
  "occ_health_appt",
  "employee_type",
  "keyed_date",
  "position_number",
  "req_number",
  "location_code",
  "team_id_number",
  "shift",
  "compensation_amount",
  "amount_approved",
  "compensation_approval_received",
  "manager_name",
  "manager_email",
  "last_contact_date",
  "last_contact_method",
  "offer_letter_reviewed",
  "peoplesoft_education_uploaded",
  "sharepoint_folder_completed",
  "onboarding_specialist",
] as const);

export type PatchableCandidateField = typeof PATCHABLE_FIELDS extends Set<infer T>
  ? T
  : never;

export function usePatchCandidateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      field: PatchableCandidateField;
      value: unknown;
    }): Promise<void> => {
      if (!PATCHABLE_FIELDS.has(input.field)) {
        throw new Error(`Field "${input.field}" is not patchable`);
      }
      await execute(
        `UPDATE candidates SET ${input.field} = $1 WHERE id = $2`,
        [input.value, input.id]
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["candidate", vars.id] });
    },
  });
}

interface ChangeStageInput {
  candidateId: number;
  fromStageId: number;
  toStageId: number;
  note?: string;
}

export function useChangeStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangeStageInput): Promise<void> => {
      await execute(SQL_STAGE_CHANGE, [input.toStageId, input.candidateId]);
      await execute(SQL_TRANSITION_INSERT, [
        input.candidateId,
        input.fromStageId,
        input.toStageId,
        input.note ?? null,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["candidate", vars.candidateId] });
      qc.invalidateQueries({ queryKey: ["pipeline-counts"] });
      qc.invalidateQueries({ queryKey: ["stage-history", vars.candidateId] });
    },
  });
}

export function useArchiveCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => execute(SQL_CANDIDATE_ARCHIVE, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["pipeline-counts"] });
    },
  });
}

export function useUnarchiveCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => execute(SQL_CANDIDATE_UNARCHIVE, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-filtered"] });
      qc.invalidateQueries({ queryKey: ["pipeline-counts"] });
    },
  });
}
