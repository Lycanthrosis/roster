import { useNotes } from "@/hooks/useNotes";
import { useCandidateRequirements } from "@/hooks/useCandidateRequirements";
import { useStageHistory } from "@/hooks/usePeekData";
import { formatDate } from "@/lib/utils";
import type {
  CandidateWithJoins,
  RequirementStatus,
  RequirementCategory,
} from "@/lib/types";

const POSITION_LABELS: Record<string, string> = {
  FT: "Full-time",
  PT: "Part-time",
  PRN: "PRN",
  CONTRACT: "Contract",
  TEMP: "Temporary",
};

const STATUS_LABELS: Record<RequirementStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
  waived: "Waived",
  not_applicable: "N/A",
};

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "Compliance",
  credentialing: "Credentialing",
  occupational_health: "Occupational Health",
  document: "Documents",
  other: "Other",
};

const CATEGORY_ORDER: RequirementCategory[] = [
  "compliance",
  "credentialing",
  "occupational_health",
  "document",
  "other",
];

interface CandidatePrintViewProps {
  candidate: CandidateWithJoins;
}

export function CandidatePrintView({ candidate }: CandidatePrintViewProps) {
  const notes = useNotes(candidate.id);
  const reqs = useCandidateRequirements(candidate.id);
  const history = useStageHistory(candidate.id);

  const reqsByCategory = new Map<RequirementCategory, typeof reqs.data>();
  for (const r of reqs.data ?? []) {
    const cat = (r.type_category ?? "other") as RequirementCategory;
    const list = reqsByCategory.get(cat) ?? [];
    list.push(r);
    reqsByCategory.set(cat, list as typeof reqs.data);
  }

  return (
    <div id="candidate-print-view" className="print-view">
      <header className="print-header">
        <div>
          <h1>
            {candidate.first_name} {candidate.last_name}
          </h1>
          <div className="subtitle">
            {candidate.role_title ?? "No role"}
            {candidate.department_name ? ` · ${candidate.department_name}` : ""}
          </div>
        </div>
        <div className="print-stage">
          <span
            className="print-dot"
            style={{ backgroundColor: candidate.stage_color }}
          />
          {candidate.stage_name}
        </div>
      </header>

      <section className="print-section print-grid">
        <PrintField label="Email" value={candidate.email ?? "—"} />
        <PrintField label="Phone" value={candidate.phone ?? "—"} />
        <PrintField
          label="Position type"
          value={
            candidate.position_type
              ? POSITION_LABELS[candidate.position_type]
              : "—"
          }
        />
        <PrintField label="Source" value={candidate.source ?? "—"} />
        <PrintField label="Applied" value={formatDate(candidate.applied_date)} />
        <PrintField
          label="Target start"
          value={formatDate(candidate.target_start_date)}
        />
      </section>

      {/* Requirements */}
      <section className="print-section">
        <h2>Requirements</h2>
        {(reqs.data?.length ?? 0) === 0 ? (
          <p className="muted">No requirements attached.</p>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const group = reqsByCategory.get(cat);
            if (!group || group.length === 0) return null;
            return (
              <div key={cat} className="print-subgroup">
                <h3>{CATEGORY_LABELS[cat]}</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Status</th>
                      <th>Completed</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((r) => (
                      <tr key={r.id}>
                        <td>{r.type_name}</td>
                        <td>{STATUS_LABELS[r.status]}</td>
                        <td>{formatDate(r.completed_at)}</td>
                        <td>{formatDate(r.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </section>

      {/* Stage history */}
      <section className="print-section">
        <h2>Stage history</h2>
        {(history.data?.length ?? 0) === 0 ? (
          <p className="muted">No history.</p>
        ) : (
          <ul className="print-timeline">
            {history.data?.map((t) => (
              <li key={t.id}>
                <span className="print-timeline-date">
                  {formatDate(t.transitioned_at)}
                </span>
                <span>
                  {t.from_name ? `${t.from_name} → ` : "Created at "}
                  <strong>{t.to_name}</strong>
                </span>
                {t.note ? <div className="print-timeline-note">{t.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notes */}
      <section className="print-section">
        <h2>Notes</h2>
        {(notes.data?.length ?? 0) === 0 ? (
          <p className="muted">No notes.</p>
        ) : (
          notes.data?.map((n) => (
            <article key={n.id} className="print-note">
              <header>
                {n.pinned ? <span className="print-pin">Pinned</span> : null}
                <time>{formatDate(n.created_at)}</time>
              </header>
              <div
                className="print-note-body"
                dangerouslySetInnerHTML={{ __html: n.content }}
              />
            </article>
          ))
        )}
      </section>

      <footer className="print-footer">
        Exported from Hiring Tracker on {formatDate(new Date().toISOString())}
      </footer>
    </div>
  );
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-field">
      <div className="print-field-label">{label}</div>
      <div className="print-field-value">{value}</div>
    </div>
  );
}
