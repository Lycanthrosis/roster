// ============================================================
// SQL query strings — centralized so the shape of the DB is
// visible in one place.
// ============================================================

// ---------- Stages ----------

export const SQL_STAGES_LIST = `
  SELECT id, name, display_order, color, is_terminal, created_at
  FROM stages
  ORDER BY display_order ASC, id ASC
`;

export const SQL_STAGES_ACTIVE = `
  SELECT id, name, display_order, color, is_terminal, created_at
  FROM stages
  WHERE is_terminal = 0
  ORDER BY display_order ASC, id ASC
`;

// ---------- Roles ----------

export const SQL_ROLES_LIST = `
  SELECT id, title, created_at
  FROM roles
  ORDER BY title ASC
`;

// ---------- Candidates ----------

/**
 * The "open" requirements count uses the new statuses: anything that's not
 * 'complete', 'substituted', or 'waived' counts as open.
 */
const OPEN_REQ_PREDICATE = `cr.status NOT IN ('complete','substituted','waived')`;

const CANDIDATE_FIELDS = `
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
  c.created_at, c.updated_at
`;

export const SQL_CANDIDATES_LIST = `
  SELECT
    ${CANDIDATE_FIELDS},
    s.name  AS stage_name,
    s.color AS stage_color,
    s.is_terminal AS stage_is_terminal,
    r.title AS role_title,
    rec.name  AS recruiter_name,
    rec.phone AS recruiter_phone,
    rec.email AS recruiter_email,
    (SELECT COUNT(*) FROM candidate_requirements cr
      WHERE cr.candidate_id = c.id
        AND ${OPEN_REQ_PREDICATE}) AS open_requirements_count,
    (SELECT COUNT(*) FROM candidate_requirements cr
      WHERE cr.candidate_id = c.id) AS total_requirements_count
  FROM candidates c
  JOIN stages s          ON s.id = c.current_stage_id
  LEFT JOIN roles r      ON r.id = c.role_id
  LEFT JOIN recruiters rec ON rec.id = c.recruiter_id
  WHERE c.status = 'active'
  ORDER BY c.updated_at DESC
`;

export const SQL_CANDIDATE_BY_ID = `
  SELECT
    ${CANDIDATE_FIELDS},
    s.name  AS stage_name,
    s.color AS stage_color,
    s.is_terminal AS stage_is_terminal,
    r.title AS role_title,
    rec.name  AS recruiter_name,
    rec.phone AS recruiter_phone,
    rec.email AS recruiter_email,
    (SELECT COUNT(*) FROM candidate_requirements cr
      WHERE cr.candidate_id = c.id
        AND ${OPEN_REQ_PREDICATE}) AS open_requirements_count,
    (SELECT COUNT(*) FROM candidate_requirements cr
      WHERE cr.candidate_id = c.id) AS total_requirements_count
  FROM candidates c
  JOIN stages s          ON s.id = c.current_stage_id
  LEFT JOIN roles r      ON r.id = c.role_id
  LEFT JOIN recruiters rec ON rec.id = c.recruiter_id
  WHERE c.id = $1
`;

/**
 * INSERT / UPDATE param order matches the field order. Long, but explicit
 * is better than positional confusion.
 */
export const SQL_CANDIDATE_INSERT = `
  INSERT INTO candidates (
    first_name, last_name, email, phone,
    role_id, position_type, current_stage_id,
    offer_letter_signed_date, target_start_date, recruiter_id,
    occ_health_status, occ_health_appt,
    employee_type, keyed_date,
    position_number, req_number, location_code, team_id_number,
    shift, compensation_amount, amount_approved, compensation_approval_received,
    manager_name, manager_email,
    last_contact_date, last_contact_method,
    offer_letter_reviewed, peoplesoft_education_uploaded,
    sharepoint_folder_completed, onboarding_specialist
  ) VALUES (
    $1,$2,$3,$4,
    $5,$6,$7,
    $8,$9,$10,
    $11,$12,
    $13,$14,
    $15,$16,$17,$18,
    $19,$20,$21,$22,
    $23,$24,
    $25,$26,
    $27,$28,
    $29,$30
  )
`;

export const SQL_CANDIDATE_UPDATE = `
  UPDATE candidates SET
    first_name = $1, last_name = $2, email = $3, phone = $4,
    role_id = $5, position_type = $6,
    offer_letter_signed_date = $7, target_start_date = $8, recruiter_id = $9,
    occ_health_status = $10, occ_health_appt = $11,
    employee_type = $12, keyed_date = $13,
    position_number = $14, req_number = $15, location_code = $16, team_id_number = $17,
    shift = $18, compensation_amount = $19, amount_approved = $20, compensation_approval_received = $21,
    manager_name = $22, manager_email = $23,
    last_contact_date = $24, last_contact_method = $25,
    offer_letter_reviewed = $26, peoplesoft_education_uploaded = $27,
    sharepoint_folder_completed = $28, onboarding_specialist = $29
  WHERE id = $30
`;

export const SQL_CANDIDATE_ARCHIVE = `
  UPDATE candidates SET status = 'archived' WHERE id = $1
`;

export const SQL_CANDIDATE_UNARCHIVE = `
  UPDATE candidates SET status = 'active' WHERE id = $1
`;

export const SQL_CANDIDATE_DELETE = `
  DELETE FROM candidates WHERE id = $1
`;

// ---------- Stage transitions ----------

export const SQL_STAGE_CHANGE = `
  UPDATE candidates SET current_stage_id = $1 WHERE id = $2
`;

export const SQL_TRANSITION_INSERT = `
  INSERT INTO stage_transitions (candidate_id, from_stage_id, to_stage_id, note)
  VALUES ($1, $2, $3, $4)
`;

// ---------- Pipeline summary (still used by Reports) ----------

export const SQL_PIPELINE_COUNTS = `
  SELECT
    s.id AS stage_id,
    s.name AS stage_name,
    s.color AS stage_color,
    s.display_order,
    s.is_terminal,
    COUNT(c.id) AS count
  FROM stages s
  LEFT JOIN candidates c
    ON c.current_stage_id = s.id AND c.status = 'active'
  GROUP BY s.id
  ORDER BY s.display_order ASC
`;

// ---------- Stage management ----------

export const SQL_STAGE_INSERT = `
  INSERT INTO stages (name, display_order, color, is_terminal)
  VALUES ($1, $2, $3, $4)
`;

export const SQL_STAGE_UPDATE = `
  UPDATE stages SET name = $1, color = $2, is_terminal = $3 WHERE id = $4
`;

export const SQL_STAGE_UPDATE_ORDER = `
  UPDATE stages SET display_order = $1 WHERE id = $2
`;

export const SQL_STAGE_DELETE = `
  DELETE FROM stages WHERE id = $1
`;

export const SQL_STAGE_CANDIDATE_COUNT = `
  SELECT COUNT(*) AS cnt FROM candidates WHERE current_stage_id = $1 AND status = 'active'
`;

export const SQL_STAGE_REASSIGN_CANDIDATES = `
  UPDATE candidates SET current_stage_id = $1 WHERE current_stage_id = $2
`;

export const SQL_STAGE_REASSIGN_TRANSITIONS_FROM = `
  UPDATE stage_transitions SET from_stage_id = $1 WHERE from_stage_id = $2
`;
export const SQL_STAGE_REASSIGN_TRANSITIONS_TO = `
  UPDATE stage_transitions SET to_stage_id = $1 WHERE to_stage_id = $2
`;

export const SQL_STAGE_CLEAR_REQUIREMENT_TYPE_DEFAULTS = `
  UPDATE requirement_types SET default_stage_id = NULL WHERE default_stage_id = $1
`;
export const SQL_STAGE_CLEAR_TEMPLATE_ITEM_STAGES = `
  UPDATE requirement_template_items SET stage_id = NULL WHERE stage_id = $1
`;
export const SQL_STAGE_CLEAR_CANDIDATE_REQUIREMENT_STAGES = `
  UPDATE candidate_requirements SET stage_id = NULL WHERE stage_id = $1
`;

// ============================================================
// Requirement types
// ============================================================

export const SQL_REQUIREMENT_TYPES_LIST = `
  SELECT id, name, category, description, default_stage_id, requires_expiration, created_at
  FROM requirement_types
  ORDER BY
    CASE category
      WHEN 'compliance' THEN 1
      WHEN 'credentialing' THEN 2
      WHEN 'occupational_health' THEN 3
      WHEN 'document' THEN 4
      ELSE 5
    END,
    name ASC
`;

export const SQL_REQUIREMENT_TYPE_INSERT = `
  INSERT INTO requirement_types (name, category, description, default_stage_id, requires_expiration)
  VALUES ($1, $2, $3, $4, $5)
`;

export const SQL_REQUIREMENT_TYPE_UPDATE = `
  UPDATE requirement_types
  SET name = $1, category = $2, description = $3, default_stage_id = $4, requires_expiration = $5
  WHERE id = $6
`;

export const SQL_REQUIREMENT_TYPE_DELETE = `
  DELETE FROM requirement_types WHERE id = $1
`;

export const SQL_REQUIREMENT_TYPE_USAGE_COUNT = `
  SELECT
    (SELECT COUNT(*) FROM candidate_requirements WHERE requirement_type_id = $1) AS candidate_count,
    (SELECT COUNT(*) FROM requirement_template_items WHERE requirement_type_id = $1) AS template_count
`;

// ============================================================
// Templates
// ============================================================

export const SQL_TEMPLATES_LIST = `
  SELECT
    t.id, t.name, t.role_id, t.created_at,
    r.title AS role_title,
    (SELECT COUNT(*) FROM requirement_template_items ti WHERE ti.template_id = t.id) AS item_count
  FROM requirement_templates t
  LEFT JOIN roles r ON r.id = t.role_id
  ORDER BY t.name ASC
`;

export const SQL_TEMPLATE_BY_ID = `
  SELECT id, name, role_id, created_at
  FROM requirement_templates
  WHERE id = $1
`;

export const SQL_TEMPLATE_ITEMS = `
  SELECT
    ti.id, ti.template_id, ti.requirement_type_id, ti.stage_id,
    rt.name AS type_name,
    rt.category AS type_category,
    rt.requires_expiration AS type_requires_expiration,
    s.name AS stage_name
  FROM requirement_template_items ti
  JOIN requirement_types rt ON rt.id = ti.requirement_type_id
  LEFT JOIN stages s ON s.id = ti.stage_id
  WHERE ti.template_id = $1
  ORDER BY
    CASE rt.category
      WHEN 'compliance' THEN 1
      WHEN 'credentialing' THEN 2
      WHEN 'occupational_health' THEN 3
      WHEN 'document' THEN 4
      ELSE 5
    END,
    rt.name ASC
`;

export const SQL_TEMPLATE_INSERT = `
  INSERT INTO requirement_templates (name, role_id) VALUES ($1, $2)
`;

export const SQL_TEMPLATE_UPDATE = `
  UPDATE requirement_templates SET name = $1, role_id = $2 WHERE id = $3
`;

export const SQL_TEMPLATE_DELETE = `
  DELETE FROM requirement_templates WHERE id = $1
`;

export const SQL_TEMPLATE_ITEM_INSERT = `
  INSERT INTO requirement_template_items (template_id, requirement_type_id, stage_id)
  VALUES ($1, $2, $3)
`;

export const SQL_TEMPLATE_ITEM_DELETE = `
  DELETE FROM requirement_template_items WHERE id = $1
`;

export const SQL_TEMPLATE_MATCH = `
  SELECT id, name, role_id
  FROM requirement_templates
  WHERE role_id = $1
  ORDER BY created_at DESC
  LIMIT 1
`;

// ============================================================
// Per-candidate requirements
// ============================================================

/**
 * Note ordering: not_complete first, in_progress second, then complete /
 * substituted / waived. Matches the new vocabulary.
 */
export const SQL_CANDIDATE_REQUIREMENTS_LIST = `
  SELECT
    cr.id, cr.candidate_id, cr.requirement_type_id, cr.stage_id,
    cr.status, cr.completed_at, cr.expires_at, cr.notes,
    cr.created_at, cr.updated_at,
    rt.name AS type_name,
    rt.category AS type_category,
    rt.description AS type_description,
    rt.requires_expiration AS type_requires_expiration,
    s.name AS stage_name,
    (SELECT COUNT(*) FROM attachments a WHERE a.requirement_id = cr.id) AS attachment_count
  FROM candidate_requirements cr
  JOIN requirement_types rt ON rt.id = cr.requirement_type_id
  LEFT JOIN stages s ON s.id = cr.stage_id
  WHERE cr.candidate_id = $1
  ORDER BY
    CASE cr.status
      WHEN 'not_complete' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'complete' THEN 3
      WHEN 'substituted' THEN 4
      WHEN 'waived' THEN 5
    END,
    CASE rt.category
      WHEN 'compliance' THEN 1
      WHEN 'credentialing' THEN 2
      WHEN 'occupational_health' THEN 3
      WHEN 'document' THEN 4
      ELSE 5
    END,
    rt.name ASC
`;

export const SQL_CANDIDATE_REQUIREMENT_INSERT = `
  INSERT INTO candidate_requirements (candidate_id, requirement_type_id, stage_id, status)
  VALUES ($1, $2, $3, COALESCE($4, 'not_complete'))
`;

export const SQL_CANDIDATE_REQUIREMENT_UPDATE = `
  UPDATE candidate_requirements
  SET status = $1, completed_at = $2, expires_at = $3, notes = $4, stage_id = $5
  WHERE id = $6
`;

export const SQL_CANDIDATE_REQUIREMENT_DELETE = `
  DELETE FROM candidate_requirements WHERE id = $1
`;

// ============================================================
// Notes
// ============================================================

export const SQL_NOTES_LIST = `
  SELECT id, candidate_id, content, content_format, pinned, created_at, updated_at
  FROM notes
  WHERE candidate_id = $1
  ORDER BY pinned DESC, created_at DESC
`;

export const SQL_NOTE_INSERT = `
  INSERT INTO notes (candidate_id, content, content_format, pinned)
  VALUES ($1, $2, $3, $4)
`;

export const SQL_NOTE_UPDATE = `
  UPDATE notes SET content = $1 WHERE id = $2
`;

export const SQL_NOTE_TOGGLE_PIN = `
  UPDATE notes SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END WHERE id = $1
`;

export const SQL_NOTE_DELETE = `
  DELETE FROM notes WHERE id = $1
`;

// ============================================================
// Attachments
// ============================================================

export const SQL_ATTACHMENTS_FOR_CANDIDATE = `
  SELECT id, candidate_id, requirement_id, filename, stored_path, mime_type, size_bytes, created_at
  FROM attachments
  WHERE candidate_id = $1
  ORDER BY created_at DESC
`;

export const SQL_ATTACHMENTS_FOR_REQUIREMENT = `
  SELECT id, candidate_id, requirement_id, filename, stored_path, mime_type, size_bytes, created_at
  FROM attachments
  WHERE requirement_id = $1
  ORDER BY created_at DESC
`;

export const SQL_ATTACHMENT_BY_ID = `
  SELECT id, candidate_id, requirement_id, filename, stored_path, mime_type, size_bytes, created_at
  FROM attachments
  WHERE id = $1
`;

export const SQL_ATTACHMENT_INSERT = `
  INSERT INTO attachments (candidate_id, requirement_id, filename, stored_path, mime_type, size_bytes)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

export const SQL_ATTACHMENT_DELETE = `
  DELETE FROM attachments WHERE id = $1
`;

// ============================================================
// Search (Cmd+K palette)
// ============================================================

export const SQL_SEARCH_CANDIDATES = `
  SELECT
    c.id, c.first_name, c.last_name, c.email, c.phone,
    c.current_stage_id,
    s.name AS stage_name,
    s.color AS stage_color,
    r.title AS role_title
  FROM candidates c
  JOIN stages s     ON s.id = c.current_stage_id
  LEFT JOIN roles r ON r.id = c.role_id
  WHERE c.status = 'active'
    AND (
      (c.first_name || ' ' || c.last_name) LIKE $1
      OR c.email LIKE $1
      OR c.phone LIKE $1
    )
  ORDER BY c.updated_at DESC
  LIMIT 10
`;

export const SQL_SEARCH_NOTES = `
  SELECT
    n.id            AS note_id,
    n.candidate_id  AS candidate_id,
    n.created_at    AS created_at,
    c.first_name    AS first_name,
    c.last_name     AS last_name,
    snippet(notes_fts, 0, '<mark>', '</mark>', '…', 20) AS snippet
  FROM notes_fts
  JOIN notes n      ON n.id = notes_fts.rowid
  JOIN candidates c ON c.id = n.candidate_id
  WHERE notes_fts MATCH $1
    AND c.status = 'active'
  ORDER BY rank
  LIMIT 10
`;

// ============================================================
// Row peek queries — Notes show 'remaining' (non-complete) requirements
// ============================================================

export const SQL_RECENT_NOTES_FOR_CANDIDATE = `
  SELECT id, candidate_id, content, content_format, pinned, created_at, updated_at
  FROM notes
  WHERE candidate_id = $1
  ORDER BY pinned DESC, created_at DESC
  LIMIT 3
`;

/**
 * Updated for v4: 'remaining' means anything that is NOT complete — i.e.,
 * status in ('not_complete','in_progress','substituted','waived') minus
 * 'complete'. We want to show what still needs attention, so
 * 'substituted' and 'waived' are excluded too — they're terminal.
 *
 * Effective filter: status IN ('not_complete','in_progress')
 */
export const SQL_REMAINING_REQUIREMENTS_FOR_CANDIDATE = `
  SELECT
    cr.id, cr.candidate_id, cr.requirement_type_id, cr.stage_id,
    cr.status, cr.completed_at, cr.expires_at, cr.notes,
    cr.created_at, cr.updated_at,
    rt.name AS type_name,
    rt.category AS type_category,
    rt.description AS type_description,
    rt.requires_expiration AS type_requires_expiration,
    s.name AS stage_name,
    (SELECT COUNT(*) FROM attachments a WHERE a.requirement_id = cr.id) AS attachment_count
  FROM candidate_requirements cr
  JOIN requirement_types rt ON rt.id = cr.requirement_type_id
  LEFT JOIN stages s ON s.id = cr.stage_id
  WHERE cr.candidate_id = $1
    AND cr.status IN ('not_complete','in_progress')
  ORDER BY
    CASE cr.status WHEN 'in_progress' THEN 1 ELSE 2 END,
    rt.name ASC
  LIMIT 3
`;

export const SQL_STAGE_HISTORY_FOR_CANDIDATE = `
  SELECT
    st.id, st.candidate_id, st.from_stage_id, st.to_stage_id,
    st.transitioned_at, st.note,
    sf.name AS from_name, sf.color AS from_color,
    stt.name AS to_name, stt.color AS to_color
  FROM stage_transitions st
  LEFT JOIN stages sf   ON sf.id  = st.from_stage_id
  JOIN stages stt       ON stt.id = st.to_stage_id
  WHERE st.candidate_id = $1
  ORDER BY st.transitioned_at DESC
`;

// ============================================================
// Reports
// ============================================================

export const SQL_REPORT_HIRES_PER_MONTH = `
  SELECT
    strftime('%Y-%m', c.updated_at) AS month,
    COUNT(*) AS count
  FROM candidates c
  JOIN stages s ON s.id = c.current_stage_id
  WHERE s.name = 'Keyed'
    AND c.updated_at >= date('now', '-12 months')
  GROUP BY month
  ORDER BY month ASC
`;

export const SQL_REPORT_TOP_RECRUITERS = `
  SELECT
    COALESCE(rec.name, 'Unknown') AS recruiter,
    COUNT(*) AS count
  FROM candidates c
  LEFT JOIN recruiters rec ON rec.id = c.recruiter_id
  WHERE c.status = 'active'
  GROUP BY rec.id
  ORDER BY count DESC
  LIMIT 10
`;

export const SQL_REPORT_TIME_IN_STAGE = `
  SELECT
    c.id AS candidate_id,
    c.first_name,
    c.last_name,
    s.name AS stage_name,
    s.color AS stage_color,
    (SELECT MAX(st.transitioned_at)
       FROM stage_transitions st
      WHERE st.candidate_id = c.id
        AND st.to_stage_id = c.current_stage_id) AS entered_stage_at,
    CAST(julianday('now') - julianday(
      (SELECT MAX(st.transitioned_at)
         FROM stage_transitions st
        WHERE st.candidate_id = c.id
          AND st.to_stage_id = c.current_stage_id)
    ) AS INTEGER) AS days_in_stage
  FROM candidates c
  JOIN stages s ON s.id = c.current_stage_id
  WHERE c.status = 'active'
    AND s.is_terminal = 0
  ORDER BY days_in_stage DESC
`;

export const SQL_REPORT_REQUIREMENTS_SUMMARY = `
  SELECT
    COALESCE(rt.category, 'other') AS category,
    cr.status,
    COUNT(*) AS count
  FROM candidate_requirements cr
  JOIN requirement_types rt ON rt.id = cr.requirement_type_id
  JOIN candidates c ON c.id = cr.candidate_id
  WHERE c.status = 'active'
  GROUP BY category, cr.status
  ORDER BY category, cr.status
`;

export const SQL_REPORT_EXPIRING_REQUIREMENTS = `
  SELECT
    cr.id,
    cr.expires_at,
    CAST(julianday(cr.expires_at) - julianday('now') AS INTEGER) AS days_until,
    rt.name AS type_name,
    c.id AS candidate_id,
    c.first_name,
    c.last_name,
    s.name AS stage_name,
    s.color AS stage_color
  FROM candidate_requirements cr
  JOIN requirement_types rt ON rt.id = cr.requirement_type_id
  JOIN candidates c ON c.id = cr.candidate_id
  JOIN stages s ON s.id = c.current_stage_id
  WHERE c.status = 'active'
    AND cr.expires_at IS NOT NULL
    AND julianday(cr.expires_at) <= julianday('now', '+30 days')
  ORDER BY cr.expires_at ASC
  LIMIT 50
`;

// ============================================================
// Recruiters
// ============================================================

export const SQL_RECRUITERS_LIST = `
  SELECT id, name, phone, email, created_at
  FROM recruiters
  ORDER BY name COLLATE NOCASE ASC
`;

export const SQL_RECRUITER_BY_ID = `
  SELECT id, name, phone, email, created_at
  FROM recruiters
  WHERE id = $1
`;

export const SQL_RECRUITER_INSERT = `
  INSERT INTO recruiters (name, phone, email)
  VALUES ($1, $2, $3)
`;

export const SQL_RECRUITER_UPDATE = `
  UPDATE recruiters SET name = $1, phone = $2, email = $3 WHERE id = $4
`;

export const SQL_RECRUITER_DELETE = `
  DELETE FROM recruiters WHERE id = $1
`;

export const SQL_RECRUITER_USAGE_COUNT = `
  SELECT COUNT(*) AS candidate_count
  FROM candidates
  WHERE recruiter_id = $1
`;
