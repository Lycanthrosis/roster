// ============================================================
// Database row types — TypeScript shape mirrors the SQLite schema.
// ============================================================

export type StageColor = string;
export type ISODate = string;
export type ISODateTime = string;

export interface Stage {
  id: number;
  name: string;
  display_order: number;
  color: StageColor;
  is_terminal: 0 | 1;
  created_at: ISODateTime;
}

/** Form input shape for creating a new stage. */
export interface StageInput {
  name: string;
  display_order: number;
  color: string;
  is_terminal: boolean;
}

export interface Role {
  id: number;
  title: string;
  created_at: ISODateTime;
}

export interface Recruiter {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: ISODateTime;
}

export type PositionType = "FT" | "PT" | "PRN" | "CONTRACT" | "TEMP";
export type CandidateStatus = "active" | "archived";

// New enums for v4
export type OccHealthStatus = "Pending" | "Scheduled" | "Cleared" | "Failed";
export type EmployeeType = "Rehire" | "New Hire" | "Transfer";
export type Shift = "First Shift" | "Second Shift" | "Third Shift";
export type ContactMethod = "Phone" | "Email";

/** Maps SQL int 0/1 columns to a readable boolean type. */
export type Bit = 0 | 1;

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  position_type: PositionType | null;
  current_stage_id: number;
  offer_letter_signed_date: ISODate | null;
  target_start_date: ISODate | null;
  recruiter_id: number | null;
  status: CandidateStatus;

  // v4 additions
  occ_health_status: OccHealthStatus | null;
  occ_health_appt: ISODateTime | null;
  employee_type: EmployeeType | null;
  keyed_date: ISODateTime | null;
  position_number: string | null;
  req_number: string | null;
  location_code: string | null;
  team_id_number: string | null;
  shift: Shift | null;
  compensation_amount: number | null;
  amount_approved: Bit;
  compensation_approval_received: Bit | null;
  manager_name: string | null;
  manager_email: string | null;
  last_contact_date: ISODateTime | null;
  last_contact_method: ContactMethod | null;
  offer_letter_reviewed: Bit;
  peoplesoft_education_uploaded: Bit;
  sharepoint_folder_completed: Bit;
  onboarding_specialist: string | null;

  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CandidateWithJoins extends Candidate {
  stage_name: string;
  stage_color: StageColor;
  stage_is_terminal: 0 | 1;
  role_title: string | null;
  recruiter_name: string | null;
  recruiter_phone: string | null;
  recruiter_email: string | null;
  open_requirements_count: number;
  total_requirements_count: number;
}

export interface CandidateInput {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  position_type: PositionType | null;
  current_stage_id: number;
  offer_letter_signed_date: ISODate | null;
  target_start_date: ISODate | null;
  recruiter_id: number | null;

  // v4 additions
  occ_health_status: OccHealthStatus | null;
  occ_health_appt: ISODateTime | null;
  employee_type: EmployeeType | null;
  keyed_date: ISODateTime | null;
  position_number: string | null;
  req_number: string | null;
  location_code: string | null;
  team_id_number: string | null;
  shift: Shift | null;
  compensation_amount: number | null;
  amount_approved: Bit;
  compensation_approval_received: Bit | null;
  manager_name: string | null;
  manager_email: string | null;
  last_contact_date: ISODateTime | null;
  last_contact_method: ContactMethod | null;
  offer_letter_reviewed: Bit;
  peoplesoft_education_uploaded: Bit;
  sharepoint_folder_completed: Bit;
  onboarding_specialist: string | null;
}

// ============================================================
// Stage transitions
// ============================================================

export interface StageTransition {
  id: number;
  candidate_id: number;
  from_stage_id: number | null;
  to_stage_id: number;
  transitioned_at: ISODateTime;
  note: string | null;
}

// ============================================================
// Requirements
// ============================================================

export type RequirementCategory =
  | "compliance"
  | "credentialing"
  | "occupational_health"
  | "document"
  | "other";

/** Updated in v4. */
export type RequirementStatus =
  | "not_complete"
  | "in_progress"
  | "complete"
  | "substituted"
  | "waived";

export interface RequirementType {
  id: number;
  name: string;
  category: RequirementCategory;
  description: string | null;
  default_stage_id: number | null;
  requires_expiration: 0 | 1;
  created_at: ISODateTime;
}

/** Form input shape used by useCreateRequirementType / useUpdateRequirementType. */
export interface RequirementTypeInput {
  name: string;
  category: RequirementCategory;
  description?: string | null;
  default_stage_id?: number | null;
  requires_expiration?: boolean | 0 | 1;
}

export interface CandidateRequirement {
  id: number;
  candidate_id: number;
  requirement_type_id: number;
  stage_id: number | null;
  status: RequirementStatus;
  completed_at: ISODate | null;
  expires_at: ISODate | null;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CandidateRequirementWithType extends CandidateRequirement {
  type_name: string;
  type_category: RequirementCategory;
  type_description: string | null;
  type_requires_expiration: 0 | 1;
  stage_name: string | null;
  attachment_count: number;
}

// ============================================================
// Templates
// ============================================================

export interface RequirementTemplate {
  id: number;
  name: string;
  role_id: number | null;
  created_at: ISODateTime;
}

export interface RequirementTemplateWithJoins extends RequirementTemplate {
  role_title: string | null;
  item_count: number;
}

export interface RequirementTemplateItem {
  id: number;
  template_id: number;
  requirement_type_id: number;
  stage_id: number | null;
  type_name: string;
  type_category: RequirementCategory;
  type_requires_expiration: 0 | 1;
  stage_name: string | null;
}

// ============================================================
// Notes
// ============================================================

export type NoteFormat = "html";

export interface Note {
  id: number;
  candidate_id: number;
  content: string;
  content_format: NoteFormat;
  pinned: 0 | 1;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ============================================================
// Attachments
// ============================================================

export interface Attachment {
  id: number;
  candidate_id: number;
  requirement_id: number | null;
  filename: string;
  stored_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: ISODateTime;
}

// ============================================================
// Filters
// ============================================================

export interface CandidateFilters {
  status?: CandidateStatus;
  stageIds?: number[];
  roleIds?: number[];
  positionTypes?: PositionType[];
  appliedFrom?: ISODate;
  appliedTo?: ISODate;
  search?: string;
  recruiterId?: number;
}
