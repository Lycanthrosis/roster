import { useState } from "react";
import { Search, SlidersHorizontal, X, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/stores/filter-store";
import { useStages } from "@/hooks/useStages";
import { useRoles } from "@/hooks/useRoles";
import { useRecruiters } from "@/hooks/useRecruiters";
import { cn } from "@/lib/utils";
import type { PositionType } from "@/lib/types";

const POSITION_TYPES: { value: PositionType; label: string }[] = [
  { value: "FT", label: "Full-time" },
  { value: "PT", label: "Part-time" },
  { value: "PRN", label: "PRN" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMP", label: "Temp" },
];

const ANY_RECRUITER = "__any__";

export function FilterBar() {
  const { filters, setFilter, clearFilters, toggleFilterValue } = useFilterStore();
  const stagesQuery = useStages();
  const rolesQuery = useRoles();
  const recruitersQuery = useRecruiters();

  const [panelOpen, setPanelOpen] = useState(false);
  const activeCount = countActiveFilters(filters);
  const showArchived = filters.status === "archived";

  return (
    <div className="border-b border-border bg-background px-6 py-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => setFilter("search", e.target.value || undefined)}
            placeholder="Search name, email, phone, or recruiter…"
            className="h-8 pl-8 pr-8"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilter("search", undefined)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <Popover open={panelOpen} onOpenChange={setPanelOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeCount > 0 ? (
                <span className="ml-1 rounded-sm bg-primary px-1.5 text-[10px] font-medium tabular-nums text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            <div className="space-y-4">
              <FilterGroup label="Stage">
                <CheckboxList
                  items={(stagesQuery.data ?? []).map((s) => ({
                    id: s.id,
                    label: s.name,
                    color: s.color,
                  }))}
                  selected={filters.stageIds ?? []}
                  onToggle={(id) => toggleFilterValue("stageIds", id)}
                />
              </FilterGroup>

              <FilterGroup label="Role">
                <CheckboxList
                  items={(rolesQuery.data ?? []).map((r) => ({
                    id: r.id,
                    label: r.title,
                  }))}
                  selected={filters.roleIds ?? []}
                  onToggle={(id) => toggleFilterValue("roleIds", id)}
                />
              </FilterGroup>

              <FilterGroup label="Recruiter">
                <Select
                  value={
                    filters.recruiterId == null
                      ? ANY_RECRUITER
                      : String(filters.recruiterId)
                  }
                  onValueChange={(v) =>
                    setFilter(
                      "recruiterId",
                      v === ANY_RECRUITER ? undefined : Number(v)
                    )
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Any recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_RECRUITER}>Any recruiter</SelectItem>
                    {(recruitersQuery.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterGroup>

              <FilterGroup label="Position type">
                <div className="flex flex-wrap gap-1.5">
                  {POSITION_TYPES.map((p) => {
                    const active = (filters.positionTypes ?? []).includes(p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => toggleFilterValue("positionTypes", p.value)}
                        className={cn(
                          "rounded-sm border px-2 py-0.5 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>

              <FilterGroup label="Offer signed date">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      From
                    </Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={filters.appliedFrom ?? ""}
                      onChange={(e) =>
                        setFilter("appliedFrom", e.target.value || undefined)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      To
                    </Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={filters.appliedTo ?? ""}
                      onChange={(e) =>
                        setFilter("appliedTo", e.target.value || undefined)
                      }
                    />
                  </div>
                </div>
              </FilterGroup>

              <div className="flex justify-between border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  disabled={activeCount === 0}
                >
                  Clear all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPanelOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={showArchived ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setFilter("status", showArchived ? "active" : "archived")}
          title={showArchived ? "Showing archived" : "Show archived"}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "Archived" : "Active"}
        </Button>
      </div>

      {activeCount > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {renderChips(
            filters,
            stagesQuery.data ?? [],
            rolesQuery.data ?? [],
            recruitersQuery.data ?? [],
            toggleFilterValue,
            setFilter
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface CheckboxListProps {
  items: { id: number; label: string; color?: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}

function CheckboxList({ items, selected, onToggle }: CheckboxListProps) {
  if (items.length === 0) {
    return (
      <div className="text-xs italic text-muted-foreground">None available</div>
    );
  }
  return (
    <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border border-border bg-muted/20 p-1">
      {items.map((it) => {
        const checked = selected.includes(it.id);
        return (
          <label
            key={it.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(it.id)}
              className="h-3.5 w-3.5 cursor-pointer accent-primary"
            />
            {it.color ? (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: it.color }}
              />
            ) : null}
            <span className="truncate">{it.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function countActiveFilters(f: {
  stageIds?: number[];
  roleIds?: number[];
  positionTypes?: string[];
  appliedFrom?: string;
  appliedTo?: string;
  search?: string;
  recruiterId?: number;
}): number {
  let n = 0;
  if (f.stageIds?.length) n++;
  if (f.roleIds?.length) n++;
  if (f.positionTypes?.length) n++;
  if (f.appliedFrom) n++;
  if (f.appliedTo) n++;
  if (f.recruiterId != null) n++;
  return n;
}

function renderChips(
  filters: ReturnType<typeof useFilterStore.getState>["filters"],
  stages: { id: number; name: string; color: string }[],
  roles: { id: number; title: string }[],
  recruiters: { id: number; name: string }[],
  toggle: ReturnType<typeof useFilterStore.getState>["toggleFilterValue"],
  setFilter: ReturnType<typeof useFilterStore.getState>["setFilter"]
): React.ReactNode[] {
  const chips: React.ReactNode[] = [];

  for (const id of filters.stageIds ?? []) {
    const s = stages.find((x) => x.id === id);
    if (!s) continue;
    chips.push(
      <Chip
        key={`stage-${id}`}
        label={`Stage: ${s.name}`}
        color={s.color}
        onRemove={() => toggle("stageIds", id)}
      />
    );
  }

  for (const id of filters.roleIds ?? []) {
    const r = roles.find((x) => x.id === id);
    if (!r) continue;
    chips.push(
      <Chip
        key={`role-${id}`}
        label={`Role: ${r.title}`}
        onRemove={() => toggle("roleIds", id)}
      />
    );
  }

  if (filters.recruiterId != null) {
    const rec = recruiters.find((x) => x.id === filters.recruiterId);
    if (rec) {
      chips.push(
        <Chip
          key="recruiter"
          label={`Recruiter: ${rec.name}`}
          onRemove={() => setFilter("recruiterId", undefined)}
        />
      );
    }
  }

  for (const pt of filters.positionTypes ?? []) {
    const label = POSITION_TYPES.find((p) => p.value === pt)?.label ?? pt;
    chips.push(
      <Chip
        key={`pos-${pt}`}
        label={`Type: ${label}`}
        onRemove={() => toggle("positionTypes", pt as PositionType)}
      />
    );
  }

  if (filters.appliedFrom) {
    chips.push(
      <Chip
        key="from"
        label={`From: ${filters.appliedFrom}`}
        onRemove={() => setFilter("appliedFrom", undefined)}
      />
    );
  }

  if (filters.appliedTo) {
    chips.push(
      <Chip
        key="to"
        label={`To: ${filters.appliedTo}`}
        onRemove={() => setFilter("appliedTo", undefined)}
      />
    );
  }

  return chips;
}

function Chip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs"
      style={color ? { borderColor: `${color}40` } : undefined}
    >
      {color ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Remove filter"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
