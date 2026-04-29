import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { query } from "@/lib/db";
import {
  SQL_PIPELINE_COUNTS,
  SQL_REPORT_HIRES_PER_MONTH,
  SQL_REPORT_TOP_RECRUITERS,
  SQL_REPORT_TIME_IN_STAGE,
  SQL_REPORT_REQUIREMENTS_SUMMARY,
  SQL_REPORT_EXPIRING_REQUIREMENTS,
} from "@/lib/queries";
import { cn, formatDate, initials } from "@/lib/utils";

// ============================================================
// Types for each report row
// ============================================================

interface PipelineRow {
  stage_id: number;
  stage_name: string;
  stage_color: string;
  display_order: number;
  is_terminal: 0 | 1;
  count: number;
}

interface HiresRow {
  month: string;
  count: number;
}

interface RecruiterRow {
  recruiter: string;
  count: number;
}

interface TimeInStageRow {
  candidate_id: number;
  first_name: string;
  last_name: string;
  stage_name: string;
  stage_color: string;
  entered_stage_at: string | null;
  days_in_stage: number | null;
}

interface RequirementsSummaryRow {
  category: string;
  status: string;
  count: number;
}

interface ExpiringRow {
  id: number;
  expires_at: string;
  days_until: number;
  type_name: string;
  candidate_id: number;
  first_name: string;
  last_name: string;
  stage_name: string;
  stage_color: string;
}

// ============================================================
// Page
// ============================================================

export default function Reports() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Reports"
        description="A snapshot of your hiring pipeline"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PipelineCard />
            <HiresCard />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RecruitersCard />
            <RequirementsCard />
          </div>
          <TimeInStageCard />
          <ExpiringCard />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Cards
// ============================================================

function ReportCard({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================================
// Pipeline snapshot
// ============================================================

function PipelineCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-counts"],
    queryFn: () => query<PipelineRow>(SQL_PIPELINE_COUNTS),
  });

  const active = (data ?? []).filter((r) => !r.is_terminal);
  const max = Math.max(1, ...active.map((r) => r.count));

  return (
    <ReportCard
      title="Pipeline snapshot"
      description="Active candidates per stage"
      icon={<Users className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : active.length === 0 ? (
        <Empty>No active stages configured</Empty>
      ) : (
        <div className="space-y-1.5">
          {active.map((row) => (
            <div key={row.stage_id} className="flex items-center gap-3">
              <div className="flex w-32 shrink-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.stage_color }}
                />
                <span className="truncate text-xs">{row.stage_name}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      backgroundColor: row.stage_color,
                    }}
                  />
                </div>
              </div>
              <div className="w-8 shrink-0 text-right text-xs tabular-nums">
                {row.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}

// ============================================================
// Hires per month
// ============================================================

function HiresCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-hires"],
    queryFn: () => query<HiresRow>(SQL_REPORT_HIRES_PER_MONTH),
  });

  const rows = data ?? [];
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ReportCard
      title="Hires per month"
      description={`${total} total in the last 12 months`}
      icon={<TrendingUp className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>
          No hires yet. A candidate counts as hired when their stage is named
          "Hired".
        </Empty>
      ) : (
        <div className="flex h-24 items-end gap-1">
          {rows.map((row) => (
            <div
              key={row.month}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative w-full flex-1">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-emerald-500/60 transition-all group-hover:bg-emerald-500"
                  style={{ height: `${(row.count / max) * 100}%` }}
                  title={`${row.month}: ${row.count}`}
                />
              </div>
              <div className="text-[9px] text-muted-foreground">
                {row.month.slice(5)}
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}

// ============================================================
// Top sources
// ============================================================

function RecruitersCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-recruiters"],
    queryFn: () => query<RecruiterRow>(SQL_REPORT_TOP_RECRUITERS),
  });

  const rows = data ?? [];
  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return (
    <ReportCard
      title="Candidates by recruiter"
      description="Active candidates grouped by their recruiter"
      icon={<Users className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No candidate data yet</Empty>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const pct = total > 0 ? (row.count / total) * 100 : 0;
            return (
              <div key={row.recruiter} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs" title={row.recruiter}>
                  {row.recruiter}
                </div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="w-14 shrink-0 text-right text-xs tabular-nums">
                  <span className="font-medium">{row.count}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ReportCard>
  );
}

// ============================================================
// Requirements summary
// ============================================================

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  not_complete: { label: "Not complete", color: "bg-muted-foreground/40" },
  in_progress: { label: "In progress", color: "bg-amber-500" },
  complete: { label: "Complete", color: "bg-emerald-500" },
  substituted: { label: "Substituted", color: "bg-sky-500" },
  waived: { label: "Waived", color: "bg-slate-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "Compliance",
  credentialing: "Credentialing",
  occupational_health: "Occupational Health",
  document: "Documents",
  other: "Other",
};

function RequirementsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-requirements-summary"],
    queryFn: () =>
      query<RequirementsSummaryRow>(SQL_REPORT_REQUIREMENTS_SUMMARY),
  });

  const rows = data ?? [];

  // Pivot by category
  const byCategory = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = byCategory.get(r.category) ?? new Map<string, number>();
    m.set(r.status, r.count);
    byCategory.set(r.category, m);
  }

  return (
    <ReportCard
      title="Requirements by category"
      description="Across all active candidates"
      icon={<CheckCircle2 className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : byCategory.size === 0 ? (
        <Empty>No requirements attached yet</Empty>
      ) : (
        <div className="space-y-3">
          {[...byCategory.entries()].map(([cat, statuses]) => {
            const total = [...statuses.values()].reduce((a, b) => a + b, 0);
            return (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {total}
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {Object.entries(STATUS_DISPLAY).map(([status, meta]) => {
                    const n = statuses.get(status) ?? 0;
                    if (n === 0) return null;
                    const pct = (n / total) * 100;
                    return (
                      <div
                        key={status}
                        className={meta.color}
                        style={{ width: `${pct}%` }}
                        title={`${meta.label}: ${n}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
            {Object.entries(STATUS_DISPLAY).map(([status, meta]) => (
              <div key={status} className="flex items-center gap-1">
                <span
                  className={cn("h-2 w-2 rounded-full", meta.color)}
                />
                {meta.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ============================================================
// Time in current stage
// ============================================================

function TimeInStageCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["report-time-in-stage"],
    queryFn: () => query<TimeInStageRow>(SQL_REPORT_TIME_IN_STAGE),
  });

  const rows = (data ?? []).slice(0, 10);

  return (
    <ReportCard
      title="Time in current stage"
      description="Longest-waiting candidates"
      icon={<Clock className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No active candidates in non-terminal stages</Empty>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-1.5">Candidate</th>
                <th className="px-3 py-1.5">Stage</th>
                <th className="px-3 py-1.5 text-right">Entered</th>
                <th className="px-3 py-1.5 text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = r.days_in_stage ?? 0;
                const isStale = days >= 14;
                return (
                  <tr
                    key={r.candidate_id}
                    onClick={() => navigate(`/candidates/${r.candidate_id}`)}
                    className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {initials(r.first_name, r.last_name)}
                        </div>
                        <span className="truncate">
                          {r.first_name} {r.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: r.stage_color }}
                        />
                        <span className="text-xs">{r.stage_name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground tabular-nums">
                      {formatDate(r.entered_stage_at)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right text-xs tabular-nums",
                        isStale
                          ? "font-medium text-amber-600 dark:text-amber-400"
                          : ""
                      )}
                    >
                      {days}
                      {isStale ? (
                        <AlertTriangle className="ml-1 inline h-3 w-3" />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ReportCard>
  );
}

// ============================================================
// Expiring requirements
// ============================================================

function ExpiringCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["report-expiring"],
    queryFn: () => query<ExpiringRow>(SQL_REPORT_EXPIRING_REQUIREMENTS),
  });

  const rows = data ?? [];
  const expired = rows.filter((r) => r.days_until < 0);
  const soon = rows.filter((r) => r.days_until >= 0);

  return (
    <ReportCard
      title="Expired or expiring soon"
      description="Requirements past or within 30 days of expiration"
      icon={<AlertTriangle className="h-4 w-4" />}
    >
      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Nothing expiring in the next 30 days</Empty>
      ) : (
        <div className="space-y-4">
          {expired.length > 0 ? (
            <ExpiringSection
              label="Expired"
              rows={expired}
              emphasisClass="text-destructive"
              onOpen={(id) => navigate(`/candidates/${id}`)}
            />
          ) : null}
          {soon.length > 0 ? (
            <ExpiringSection
              label="Expiring soon"
              rows={soon}
              emphasisClass="text-amber-600 dark:text-amber-400"
              onOpen={(id) => navigate(`/candidates/${id}`)}
            />
          ) : null}
        </div>
      )}
    </ReportCard>
  );
}

function ExpiringSection({
  label,
  rows,
  emphasisClass,
  onOpen,
}: {
  label: string;
  rows: ExpiringRow[];
  emphasisClass: string;
  onOpen: (id: number) => void;
}) {
  return (
    <div>
      <h3
        className={cn(
          "mb-1.5 text-[10px] font-semibold uppercase tracking-wider",
          emphasisClass
        )}
      >
        {label} ({rows.length})
      </h3>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onOpen(r.candidate_id)}
                className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-accent/40"
              >
                <td className="px-3 py-1.5">
                  <div className="text-xs font-medium">{r.type_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.first_name} {r.last_name}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="text-xs tabular-nums">
                    {formatDate(r.expires_at)}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-medium tabular-nums",
                      r.days_until < 0
                        ? "text-destructive"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {r.days_until < 0
                      ? `${-r.days_until}d overdue`
                      : `in ${r.days_until}d`}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Common bits
// ============================================================

function Loading() {
  return (
    <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-4 text-center text-xs italic text-muted-foreground">
      {children}
    </div>
  );
}
