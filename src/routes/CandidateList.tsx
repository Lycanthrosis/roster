import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowUp, ArrowDown, ChevronRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/filters/FilterBar";
import { AddCandidateDialog } from "@/components/candidate/AddCandidateDialog";
import { CandidateRowPeek } from "@/components/candidate/CandidateRowPeek";
import {
  useFilteredCandidates,
  type CandidateSortField,
} from "@/hooks/useCandidates";
import { useFilterStore } from "@/stores/filter-store";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  formatDateTimeWithDayOfWeek,
  validateOccHealthFreshness,
} from "@/lib/format";
import type { CandidateWithJoins, OccHealthStatus } from "@/lib/types";

const POSITION_LABELS: Record<string, string> = {
  FT: "Full-time",
  PT: "Part-time",
  PRN: "PRN",
  CONTRACT: "Contract",
  TEMP: "Temp",
};

// Color hints for occ health status
const OCC_HEALTH_TONE: Record<OccHealthStatus, string> = {
  Pending: "bg-muted text-muted-foreground border-border",
  Scheduled: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  Cleared: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  Failed: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function CandidateList() {
  const navigate = useNavigate();
  const { filters, sort, setSort } = useFilterStore();

  const { data, isLoading } = useFilteredCandidates({
    filters,
    sort: sort ?? undefined,
  });

  const count = data?.length ?? 0;
  const isArchivedView = filters.status === "archived";

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Candidates"
        description={
          isLoading
            ? "Loading…"
            : `${count} ${isArchivedView ? "archived" : "active"} candidate${
                count === 1 ? "" : "s"
              }`
        }
        actions={
          <AddCandidateDialog onCreated={(id) => navigate(`/candidates/${id}`)} />
        }
      />

      <FilterBar />

      <div className="flex-1 overflow-auto">
        {isLoading ? null : count === 0 ? (
          <EmptyState archived={isArchivedView} />
        ) : (
          <CandidateTable
            rows={data ?? []}
            onOpen={(id) => navigate(`/candidates/${id}`)}
            sortField={sort?.field}
            sortDir={sort?.dir}
            onSort={setSort}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ archived }: { archived: boolean }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm rounded-lg border border-dashed border-border p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">
          {archived ? "No archived candidates" : "No matching candidates"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {archived
            ? "Archived candidates will show up here."
            : "Try adjusting your filters, or click \"Add candidate\" to create one."}
        </p>
      </div>
    </div>
  );
}

interface CandidateTableProps {
  rows: CandidateWithJoins[];
  onOpen: (id: number) => void;
  sortField?: CandidateSortField;
  sortDir?: "asc" | "desc";
  onSort: (field: CandidateSortField) => void;
}

function CandidateTable({
  rows,
  onOpen,
  sortField,
  sortDir,
  onSort,
}: CandidateTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 11 columns: chevron, name, role, type, employee_type, stage, offer signed, keyed,
  // occ health status, occ health appt, open reqs
  const COL_COUNT = 11;

  return (
    <div className="min-w-full">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="w-6 border-b border-border py-2.5" aria-label="" />
            <SortHeader
              field="name"
              label="Name"
              className="pl-2 pr-4"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              field="role"
              label="Role"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="border-b border-border px-4 py-2.5 font-medium">Type</th>
            <th className="border-b border-border px-4 py-2.5 font-medium">
              Employee
            </th>
            <SortHeader
              field="stage"
              label="Stage"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              field="offer_letter_signed_date"
              label="Offer signed"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              field="keyed_date"
              label="Keyed"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="border-b border-border px-4 py-2.5 font-medium">
              Occ health
            </th>
            <SortHeader
              field="occ_health_appt"
              label="OH appt"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              field="open_requirements"
              label="Open reqs"
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const isOpen = expanded.has(c.id);
            const occHealthFresh = validateOccHealthFreshness(c.occ_health_appt);
            return (
              <Fragment key={c.id}>
                <tr
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent/40",
                    isOpen && "bg-accent/30"
                  )}
                >
                  <td
                    className="border-b border-border py-2.5 pl-3 pr-0 align-middle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(c.id);
                    }}
                  >
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      aria-label={isOpen ? "Collapse row" : "Expand row"}
                      aria-expanded={isOpen}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          isOpen && "rotate-90"
                        )}
                      />
                    </button>
                  </td>
                  <td
                    className="border-b border-border px-2 py-2.5"
                    onClick={() => onOpen(c.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {initials(c.first_name, c.last_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {c.first_name} {c.last_name}
                        </div>
                        {c.email ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {c.email}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 text-foreground"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.role_title ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 text-muted-foreground"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.position_type ? POSITION_LABELS[c.position_type] : "—"}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 text-muted-foreground"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.employee_type ?? "—"}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5"
                    onClick={() => onOpen(c.id)}
                  >
                    <StageChip name={c.stage_name} color={c.stage_color} />
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 text-muted-foreground"
                    onClick={() => onOpen(c.id)}
                  >
                    {formatDate(c.offer_letter_signed_date)}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.keyed_date
                      ? formatDateTimeWithDayOfWeek(c.keyed_date)
                      : "—"}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.occ_health_status ? (
                      <OccHealthChip status={c.occ_health_status} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "border-b border-border px-4 py-2.5 text-xs",
                      occHealthFresh && occHealthFresh.ok === false
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                    onClick={() => onOpen(c.id)}
                  >
                    {c.occ_health_appt ? (
                      <span className="inline-flex items-center gap-1">
                        {formatDateTimeWithDayOfWeek(c.occ_health_appt)}
                        {occHealthFresh && occHealthFresh.ok === false ? (
                          <AlertTriangle
                            className="h-3 w-3"
                            aria-label="Older than 30 days"
                          />
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className="border-b border-border px-4 py-2.5 tabular-nums"
                    onClick={() => onOpen(c.id)}
                  >
                    {c.open_requirements_count > 0 ? (
                      <span className="text-foreground">
                        {c.open_requirements_count}
                        <span className="text-muted-foreground">
                          {" "}
                          / {c.total_requirements_count}
                        </span>
                      </span>
                    ) : c.total_requirements_count > 0 ? (
                      <span className="text-muted-foreground">
                        0 / {c.total_requirements_count}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-muted/10">
                    <td
                      colSpan={COL_COUNT}
                      className="border-b border-border p-0 animate-in fade-in-0"
                    >
                      <CandidateRowPeek
                        candidateId={c.id}
                        totalRequirements={c.total_requirements_count}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SortHeaderProps {
  field: CandidateSortField;
  label: string;
  className?: string;
  sortField?: CandidateSortField;
  sortDir?: "asc" | "desc";
  onSort: (field: CandidateSortField) => void;
}

function SortHeader({
  field,
  label,
  className,
  sortField,
  sortDir,
  onSort,
}: SortHeaderProps) {
  const active = sortField === field;
  return (
    <th
      className={cn(
        "cursor-pointer border-b border-border px-4 py-2.5 font-medium transition-colors hover:text-foreground",
        active && "text-foreground",
        className
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </span>
    </th>
  );
}

function StageChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}14`,
        color: color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

function OccHealthChip({ status }: { status: OccHealthStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        OCC_HEALTH_TONE[status]
      )}
    >
      {status}
    </span>
  );
}
