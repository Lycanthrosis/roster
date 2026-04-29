import { create } from "zustand";
import type { CandidateFilters } from "@/lib/types";
import type { CandidateSortField, SortDirection } from "@/hooks/useCandidates";

interface FilterState {
  filters: CandidateFilters;
  sort: { field: CandidateSortField; dir: SortDirection } | null;

  setFilter: <K extends keyof CandidateFilters>(
    key: K,
    value: CandidateFilters[K]
  ) => void;
  clearFilters: () => void;
  toggleFilterValue: <K extends keyof CandidateFilters>(
    key: K,
    value: CandidateFilters[K] extends (infer U)[] | undefined ? U : never
  ) => void;

  setSort: (field: CandidateSortField) => void;
  clearSort: () => void;
}

const INITIAL: CandidateFilters = {
  status: "active",
};

export const useFilterStore = create<FilterState>((set) => ({
  filters: INITIAL,
  sort: null,

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  clearFilters: () => set({ filters: INITIAL }),

  toggleFilterValue: (key, value) =>
    set((s) => {
      const current = (s.filters[key] as unknown as unknown[] | undefined) ?? [];
      const exists = current.includes(value as unknown);
      const next = exists
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        filters: {
          ...s.filters,
          [key]: next.length === 0 ? undefined : (next as unknown as never),
        },
      };
    }),

  setSort: (field) =>
    set((s) => {
      if (s.sort?.field === field) {
        return { sort: { field, dir: s.sort.dir === "asc" ? "desc" : "asc" } };
      }
      return { sort: { field, dir: "asc" } };
    }),

  clearSort: () => set({ sort: null }),
}));
