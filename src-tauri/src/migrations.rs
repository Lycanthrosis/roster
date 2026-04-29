use tauri_plugin_sql::{Migration, MigrationKind};

pub fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: SCHEMA_V1,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_defaults",
            sql: SEED_V2,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "drop_departments_rename_columns_add_offer_review",
            sql: SCHEMA_V3,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "expand_candidate_fields_replace_stages_no_uploads",
            sql: SCHEMA_V4,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_recruiters_table_and_link",
            sql: SCHEMA_V5,
            kind: MigrationKind::Up,
        },
    ]
}

const SCHEMA_V1: &str = r#"
-- ============================================================
-- Hiring Tracker: initial schema
-- ============================================================

-- Stages are user-configurable.
CREATE TABLE stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_terminal INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_stages_order ON stages(display_order);

-- Departments
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Roles
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(title, department_id)
);

-- Candidates
CREATE TABLE candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    position_type TEXT CHECK (position_type IN ('FT','PT','PRN','CONTRACT','TEMP')),
    current_stage_id INTEGER NOT NULL REFERENCES stages(id),
    applied_date TEXT NOT NULL DEFAULT (date('now')),
    target_start_date TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_candidates_stage ON candidates(current_stage_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_role ON candidates(role_id);
CREATE INDEX idx_candidates_dept ON candidates(department_id);
CREATE INDEX idx_candidates_applied ON candidates(applied_date);

-- Stage history
CREATE TABLE stage_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    from_stage_id INTEGER REFERENCES stages(id),
    to_stage_id INTEGER NOT NULL REFERENCES stages(id),
    transitioned_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
);
CREATE INDEX idx_transitions_candidate ON stage_transitions(candidate_id);

-- Requirement type catalog
CREATE TABLE requirement_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    default_stage_id INTEGER REFERENCES stages(id),
    requires_expiration INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Templates
CREATE TABLE requirement_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE requirement_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES requirement_templates(id) ON DELETE CASCADE,
    requirement_type_id INTEGER NOT NULL REFERENCES requirement_types(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES stages(id),
    UNIQUE(template_id, requirement_type_id)
);

-- Per-candidate requirements
CREATE TABLE candidate_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    requirement_type_id INTEGER NOT NULL REFERENCES requirement_types(id),
    stage_id INTEGER REFERENCES stages(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','waived','not_applicable')),
    completed_at TEXT,
    expires_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cand_reqs_candidate ON candidate_requirements(candidate_id);
CREATE INDEX idx_cand_reqs_status ON candidate_requirements(status);
CREATE INDEX idx_cand_reqs_type ON candidate_requirements(requirement_type_id);

-- Notes
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_format TEXT NOT NULL DEFAULT 'html' CHECK (content_format IN ('html','json','plain')),
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_candidate ON notes(candidate_id);
CREATE INDEX idx_notes_pinned ON notes(candidate_id, pinned);

-- Notes FTS5
CREATE VIRTUAL TABLE notes_fts USING fts5(
    content,
    content=notes,
    content_rowid=id,
    tokenize='porter unicode61'
);

-- Keep FTS in sync
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.id, old.content);
END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.id, old.content);
    INSERT INTO notes_fts(rowid, content) VALUES (new.id, new.content);
END;

-- Attachments
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    requirement_id INTEGER REFERENCES candidate_requirements(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_attachments_candidate ON attachments(candidate_id);
CREATE INDEX idx_attachments_requirement ON attachments(requirement_id);

-- Update-stamp triggers
CREATE TRIGGER candidates_updated_at AFTER UPDATE ON candidates
BEGIN
    UPDATE candidates SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER cand_reqs_updated_at AFTER UPDATE ON candidate_requirements
BEGIN
    UPDATE candidate_requirements SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER notes_updated_at AFTER UPDATE OF content, pinned ON notes
BEGIN
    UPDATE notes SET updated_at = datetime('now') WHERE id = new.id;
END;
"#;

const SEED_V2: &str = r#"
-- ============================================================
-- Seed default stages, departments, requirement types
-- These are starting points the user can edit/delete.
-- ============================================================

INSERT INTO stages (name, display_order, color, is_terminal) VALUES
    ('Applied',          10, '#64748b', 0),
    ('Screening',        20, '#0ea5e9', 0),
    ('Interviewing',     30, '#6366f1', 0),
    ('Offer',            40, '#8b5cf6', 0),
    ('Background Check', 50, '#f59e0b', 0),
    ('Onboarding',       60, '#10b981', 0),
    ('Hired',            70, '#059669', 1),
    ('Rejected',         80, '#ef4444', 1),
    ('Withdrawn',        90, '#6b7280', 1);

INSERT INTO departments (name) VALUES
    ('Nursing'),
    ('Clinical Support'),
    ('Administration'),
    ('Billing & Coding'),
    ('Facilities');

INSERT INTO requirement_types (name, category, description, requires_expiration) VALUES
    ('I-9 Verification',           'compliance',          'Employment eligibility verification', 0),
    ('W-4 Tax Form',               'compliance',          'Federal withholding form', 0),
    ('Background Check',           'compliance',          'Criminal and employment history check', 0),
    ('Drug Screening',             'occupational_health', 'Pre-employment drug test', 0),
    ('Reference Check',            'compliance',          'Professional reference verification', 0),
    ('Offer Letter Signed',        'document',            'Signed offer acceptance', 0),
    ('Direct Deposit Form',        'document',            'Bank info for payroll', 0),
    ('RN License Verification',    'credentialing',       'Registered Nurse licensure (state board)', 1),
    ('LPN License Verification',   'credentialing',       'Licensed Practical Nurse licensure', 1),
    ('CPR / BLS Certification',    'credentialing',       'Basic Life Support certification', 1),
    ('ACLS Certification',         'credentialing',       'Advanced Cardiac Life Support', 1),
    ('TB Test',                    'occupational_health', 'Tuberculosis screening', 1),
    ('Immunization Records',       'occupational_health', 'MMR, Varicella, Hepatitis B, Tdap', 0),
    ('Flu Vaccine',                'occupational_health', 'Annual influenza vaccination', 1),
    ('Fit-For-Duty Physical',      'occupational_health', 'Pre-employment physical exam', 0),
    ('OIG Exclusion Check',        'compliance',          'Office of Inspector General exclusion list', 0),
    ('SAM.gov Exclusion Check',    'compliance',          'System for Award Management exclusion check', 0),
    ('HIPAA Training Completed',   'compliance',          'Patient privacy training', 0),
    ('Handbook Acknowledgment',    'document',            'Employee handbook signed acknowledgment', 0);
"#;

const SCHEMA_V3: &str = r#"
-- ============================================================
-- Migration v3:
--   * Drop departments table and all department_id references
--   * Rename candidates.applied_date -> offer_letter_signed_date
--   * Rename candidates.source -> recruiter
--   * Add offer_letter_reviews table (one row per candidate, optional)
--
-- Implementation note:
-- SQLite's `ALTER TABLE ... DROP COLUMN` runs an internal integrity check
-- afterwards, and that check trips on inline `UNIQUE` constraints / indexes
-- that reference the dropped column. To stay safe regardless of what an
-- earlier schema looked like, we use the documented "safe alter" pattern:
-- create a new table with the desired schema, copy data, drop old, rename.
--
-- Foreign keys: rebuilding tables that are FK targets (roles, candidates,
-- requirement_templates) requires deferred FK checks. PRAGMA defer_foreign_keys
-- can be set inside a transaction (unlike PRAGMA foreign_keys), so we use
-- that. The final state is consistent because `_new` carries the same row IDs
-- and we rename it back to the original name.
-- ============================================================

PRAGMA defer_foreign_keys = ON;

-- ---- 1. Drop indexes that reference doomed columns ----
DROP INDEX IF EXISTS idx_candidates_dept;
DROP INDEX IF EXISTS idx_candidates_applied;
DROP INDEX IF EXISTS idx_candidates_role;
DROP INDEX IF EXISTS idx_candidates_stage;
DROP INDEX IF EXISTS idx_candidates_status;

-- ---- 2. Rebuild the `roles` table (drop department_id, drop UNIQUE(title,department_id)) ----
CREATE TABLE roles_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO roles_new (id, title, created_at)
SELECT id, title, created_at FROM roles;
DROP TABLE roles;
ALTER TABLE roles_new RENAME TO roles;

-- ---- 3. Rebuild the `candidates` table (drop department_id, rename two columns) ----
CREATE TABLE candidates_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    position_type TEXT CHECK (position_type IN ('FT','PT','PRN','CONTRACT','TEMP')),
    current_stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
    offer_letter_signed_date TEXT,
    target_start_date TEXT,
    recruiter TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO candidates_new (
    id, first_name, last_name, email, phone, role_id, position_type,
    current_stage_id, offer_letter_signed_date, target_start_date,
    recruiter, status, created_at, updated_at
)
SELECT
    id, first_name, last_name, email, phone, role_id, position_type,
    current_stage_id, applied_date, target_start_date,
    source, status, created_at, updated_at
FROM candidates;
DROP TABLE candidates;
ALTER TABLE candidates_new RENAME TO candidates;

-- The `candidates_updated_at` trigger from v1 was attached to the old table,
-- which is now gone. Recreate it on the new table.
CREATE TRIGGER candidates_updated_at AFTER UPDATE ON candidates
BEGIN
    UPDATE candidates SET updated_at = datetime('now') WHERE id = new.id;
END;

-- ---- 4. Rebuild the `requirement_templates` table (drop department_id) ----
CREATE TABLE requirement_templates_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO requirement_templates_new (id, name, role_id, created_at)
SELECT id, name, role_id, created_at FROM requirement_templates;
DROP TABLE requirement_templates;
ALTER TABLE requirement_templates_new RENAME TO requirement_templates;

-- ---- 5. Recreate the indexes on candidates that we dropped ----
CREATE INDEX idx_candidates_stage ON candidates(current_stage_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_role ON candidates(role_id);
CREATE INDEX idx_candidates_offer_signed ON candidates(offer_letter_signed_date);

-- ---- 6. Drop the now-orphaned departments table ----
DROP TABLE IF EXISTS departments;

-- ---- 7. New offer_letter_reviews table ----
CREATE TABLE offer_letter_reviews (
    candidate_id INTEGER PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    compensation_matches INTEGER
        CHECK (compensation_matches IS NULL OR compensation_matches IN (0,1)),
    compensation_mismatch_note TEXT,
    offer_letter_attachment_id INTEGER REFERENCES attachments(id) ON DELETE SET NULL,
    job_description_attachment_id INTEGER REFERENCES attachments(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER offer_letter_reviews_updated_at
AFTER UPDATE ON offer_letter_reviews
BEGIN
    UPDATE offer_letter_reviews SET updated_at = datetime('now')
    WHERE candidate_id = new.candidate_id;
END;
"#;

const SCHEMA_V4: &str = r#"
-- ============================================================
-- Migration v4:
--   * Drop offer_letter_reviews (no more uploads)
--   * Add many candidate fields:
--       - occ_health_status (Pending/Scheduled/Cleared/Failed)
--       - occ_health_appt (datetime)
--       - employee_type (Rehire/New Hire/Transfer)
--       - keyed_date (datetime)
--       - position_number, req_number, location_code, team_id_number
--       - shift (First/Second/Third)
--       - compensation_amount (numeric)
--       - amount_approved (bool, default 0)
--       - compensation_approval_received (bool, only meaningful when amount_approved=0)
--       - manager_name, manager_email
--       - last_contact_date, last_contact_method (Phone/Email)
--       - offer_letter_reviewed (bool)
--       - peoplesoft_education_uploaded (bool)
--       - sharepoint_folder_completed (bool)
--       - onboarding_specialist (text)
--   * Replace the seeded stages with the new workflow:
--     Welcome Call Needed -> Onboarding Tasks Needed -> Pending ->
--     Keyed -> Late Keyed -> Pushed -> Not Starting
--   * Replace candidate_requirements.status CHECK constraint with the new
--     vocabulary: 'not_complete' (default), 'in_progress', 'complete',
--     'substituted', 'waived'.
-- ============================================================

PRAGMA defer_foreign_keys = ON;

-- ---- 1. Drop the offer-letter-review feature entirely ----
DROP TRIGGER IF EXISTS offer_letter_reviews_updated_at;
DROP TABLE IF EXISTS offer_letter_reviews;

-- ---- 2. Add new columns to candidates ----
ALTER TABLE candidates ADD COLUMN occ_health_status TEXT
    CHECK (occ_health_status IS NULL OR occ_health_status IN
        ('Pending','Scheduled','Cleared','Failed'));
ALTER TABLE candidates ADD COLUMN occ_health_appt TEXT;
ALTER TABLE candidates ADD COLUMN employee_type TEXT
    CHECK (employee_type IS NULL OR employee_type IN
        ('Rehire','New Hire','Transfer'));
ALTER TABLE candidates ADD COLUMN keyed_date TEXT;
ALTER TABLE candidates ADD COLUMN position_number TEXT;
ALTER TABLE candidates ADD COLUMN req_number TEXT;
ALTER TABLE candidates ADD COLUMN location_code TEXT;
ALTER TABLE candidates ADD COLUMN team_id_number TEXT;
ALTER TABLE candidates ADD COLUMN shift TEXT
    CHECK (shift IS NULL OR shift IN
        ('First Shift','Second Shift','Third Shift'));
ALTER TABLE candidates ADD COLUMN compensation_amount REAL;
ALTER TABLE candidates ADD COLUMN amount_approved INTEGER NOT NULL DEFAULT 0
    CHECK (amount_approved IN (0,1));
ALTER TABLE candidates ADD COLUMN compensation_approval_received INTEGER
    CHECK (compensation_approval_received IS NULL OR compensation_approval_received IN (0,1));
ALTER TABLE candidates ADD COLUMN manager_name TEXT;
ALTER TABLE candidates ADD COLUMN manager_email TEXT;
ALTER TABLE candidates ADD COLUMN last_contact_date TEXT;
ALTER TABLE candidates ADD COLUMN last_contact_method TEXT
    CHECK (last_contact_method IS NULL OR last_contact_method IN ('Phone','Email'));
ALTER TABLE candidates ADD COLUMN offer_letter_reviewed INTEGER NOT NULL DEFAULT 0
    CHECK (offer_letter_reviewed IN (0,1));
ALTER TABLE candidates ADD COLUMN peoplesoft_education_uploaded INTEGER NOT NULL DEFAULT 0
    CHECK (peoplesoft_education_uploaded IN (0,1));
ALTER TABLE candidates ADD COLUMN sharepoint_folder_completed INTEGER NOT NULL DEFAULT 0
    CHECK (sharepoint_folder_completed IN (0,1));
ALTER TABLE candidates ADD COLUMN onboarding_specialist TEXT;

-- ---- 3. Rebuild candidate_requirements with the new status vocabulary ----
-- Old: 'pending','in_progress','complete','waived','not_applicable'
-- New: 'not_complete','in_progress','complete','substituted','waived'
-- Map old -> new where possible.
CREATE TABLE candidate_requirements_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    requirement_type_id INTEGER NOT NULL REFERENCES requirement_types(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'not_complete'
        CHECK (status IN ('not_complete','in_progress','complete','substituted','waived')),
    completed_at TEXT,
    expires_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO candidate_requirements_new (
    id, candidate_id, requirement_type_id, stage_id, status,
    completed_at, expires_at, notes, created_at, updated_at
)
SELECT
    id, candidate_id, requirement_type_id, stage_id,
    CASE status
        WHEN 'pending' THEN 'not_complete'
        WHEN 'not_applicable' THEN 'waived'
        ELSE status
    END,
    completed_at, expires_at, notes, created_at, updated_at
FROM candidate_requirements;
DROP TABLE candidate_requirements;
ALTER TABLE candidate_requirements_new RENAME TO candidate_requirements;

CREATE INDEX idx_cand_reqs_candidate ON candidate_requirements(candidate_id);
CREATE INDEX idx_cand_reqs_status ON candidate_requirements(status);
CREATE INDEX idx_cand_reqs_type ON candidate_requirements(requirement_type_id);

-- The candidate_requirements_updated_at trigger from v1 was attached to the
-- old table. Recreate it.
CREATE TRIGGER candidate_requirements_updated_at AFTER UPDATE ON candidate_requirements
BEGIN
    UPDATE candidate_requirements SET updated_at = datetime('now') WHERE id = new.id;
END;

-- ---- 4. Replace the seeded stages with the new workflow ----
-- Reassign any candidates currently using a stage to the first new stage so
-- the FK doesn't break, then delete old stages and seed new ones.
-- We need at least one new stage to exist before we can reassign, so the
-- order is: insert new stages, repoint candidates and transitions, delete old.

-- Insert new stages (with high display_order temporarily so old + new can coexist)
INSERT INTO stages (name, display_order, color, is_terminal) VALUES
    ('Welcome Call Needed',     1001, '#0ea5e9', 0),
    ('Onboarding Tasks Needed', 1002, '#8b5cf6', 0),
    ('Pending',                 1003, '#f59e0b', 0),
    ('Keyed',                   1004, '#10b981', 0),
    ('Late Keyed',              1005, '#f97316', 0),
    ('Pushed',                  1006, '#ef4444', 0),
    ('Not Starting',            1007, '#64748b', 1);

-- Repoint candidates from old stages to the first new stage.
UPDATE candidates
SET current_stage_id = (SELECT id FROM stages WHERE name = 'Welcome Call Needed')
WHERE current_stage_id IN (SELECT id FROM stages WHERE display_order < 1000);

-- Repoint stage_transitions similarly so we don't break the FK.
UPDATE stage_transitions
SET to_stage_id = (SELECT id FROM stages WHERE name = 'Welcome Call Needed')
WHERE to_stage_id IN (SELECT id FROM stages WHERE display_order < 1000);
UPDATE stage_transitions
SET from_stage_id = (SELECT id FROM stages WHERE name = 'Welcome Call Needed')
WHERE from_stage_id IN (SELECT id FROM stages WHERE display_order < 1000);

-- Repoint requirement_types.default_stage_id and template items as well.
UPDATE requirement_types
SET default_stage_id = NULL
WHERE default_stage_id IN (SELECT id FROM stages WHERE display_order < 1000);
UPDATE requirement_template_items
SET stage_id = NULL
WHERE stage_id IN (SELECT id FROM stages WHERE display_order < 1000);
UPDATE candidate_requirements
SET stage_id = NULL
WHERE stage_id IN (SELECT id FROM stages WHERE display_order < 1000);

-- Now safe to delete old stages.
DELETE FROM stages WHERE display_order < 1000;

-- Renumber the new stages to display_order 1..7.
UPDATE stages SET display_order = display_order - 1000 WHERE display_order >= 1000;
"#;

const SCHEMA_V5: &str = r#"
-- ============================================================
-- Migration v5:
--   * Add `recruiters` table (name, phone, email)
--   * Replace candidates.recruiter (text) with candidates.recruiter_id (FK)
--     - Existing distinct recruiter names are migrated into the new table
--     - Each candidate's recruiter text is mapped to the matching FK
-- ============================================================

PRAGMA defer_foreign_keys = ON;

-- 1. Create the recruiters table
CREATE TABLE recruiters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Seed recruiters from any existing distinct candidate.recruiter values.
INSERT INTO recruiters (name)
SELECT DISTINCT TRIM(recruiter)
FROM candidates
WHERE recruiter IS NOT NULL AND TRIM(recruiter) <> '';

-- 3. Rebuild candidates with recruiter_id replacing recruiter.
--    Same safe-alter pattern we used in v3.
CREATE TABLE candidates_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    position_type TEXT CHECK (position_type IN ('FT','PT','PRN','CONTRACT','TEMP')),
    current_stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
    offer_letter_signed_date TEXT,
    target_start_date TEXT,
    recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    occ_health_status TEXT
        CHECK (occ_health_status IS NULL OR occ_health_status IN
            ('Pending','Scheduled','Cleared','Failed')),
    occ_health_appt TEXT,
    employee_type TEXT
        CHECK (employee_type IS NULL OR employee_type IN
            ('Rehire','New Hire','Transfer')),
    keyed_date TEXT,
    position_number TEXT,
    req_number TEXT,
    location_code TEXT,
    team_id_number TEXT,
    shift TEXT
        CHECK (shift IS NULL OR shift IN
            ('First Shift','Second Shift','Third Shift')),
    compensation_amount REAL,
    amount_approved INTEGER NOT NULL DEFAULT 0
        CHECK (amount_approved IN (0,1)),
    compensation_approval_received INTEGER
        CHECK (compensation_approval_received IS NULL OR compensation_approval_received IN (0,1)),
    manager_name TEXT,
    manager_email TEXT,
    last_contact_date TEXT,
    last_contact_method TEXT
        CHECK (last_contact_method IS NULL OR last_contact_method IN ('Phone','Email')),
    offer_letter_reviewed INTEGER NOT NULL DEFAULT 0
        CHECK (offer_letter_reviewed IN (0,1)),
    peoplesoft_education_uploaded INTEGER NOT NULL DEFAULT 0
        CHECK (peoplesoft_education_uploaded IN (0,1)),
    sharepoint_folder_completed INTEGER NOT NULL DEFAULT 0
        CHECK (sharepoint_folder_completed IN (0,1)),
    onboarding_specialist TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO candidates_new (
    id, first_name, last_name, email, phone,
    role_id, position_type, current_stage_id,
    offer_letter_signed_date, target_start_date,
    recruiter_id, status,
    occ_health_status, occ_health_appt,
    employee_type, keyed_date,
    position_number, req_number, location_code, team_id_number,
    shift, compensation_amount, amount_approved, compensation_approval_received,
    manager_name, manager_email,
    last_contact_date, last_contact_method,
    offer_letter_reviewed, peoplesoft_education_uploaded,
    sharepoint_folder_completed, onboarding_specialist,
    created_at, updated_at
)
SELECT
    c.id, c.first_name, c.last_name, c.email, c.phone,
    c.role_id, c.position_type, c.current_stage_id,
    c.offer_letter_signed_date, c.target_start_date,
    (SELECT r.id FROM recruiters r WHERE r.name = TRIM(c.recruiter)),
    c.status,
    c.occ_health_status, c.occ_health_appt,
    c.employee_type, c.keyed_date,
    c.position_number, c.req_number, c.location_code, c.team_id_number,
    c.shift, c.compensation_amount, c.amount_approved, c.compensation_approval_received,
    c.manager_name, c.manager_email,
    c.last_contact_date, c.last_contact_method,
    c.offer_letter_reviewed, c.peoplesoft_education_uploaded,
    c.sharepoint_folder_completed, c.onboarding_specialist,
    c.created_at, c.updated_at
FROM candidates c;

DROP TABLE candidates;
ALTER TABLE candidates_new RENAME TO candidates;

CREATE TRIGGER candidates_updated_at AFTER UPDATE ON candidates
BEGIN
    UPDATE candidates SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE INDEX idx_candidates_stage ON candidates(current_stage_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_role ON candidates(role_id);
CREATE INDEX idx_candidates_recruiter ON candidates(recruiter_id);
CREATE INDEX idx_candidates_offer_signed ON candidates(offer_letter_signed_date);
"#;
