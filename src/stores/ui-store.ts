import { create } from "zustand";

interface UIState {
  // Global command palette (Cmd+K)
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // Filter panel visibility on list view
  filtersOpen: boolean;
  toggleFilters: () => void;

  // Theme
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;

  // Selected candidate (for list view highlighting, etc.)
  selectedCandidateId: number | null;
  setSelectedCandidateId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),

  filtersOpen: false,
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),

  theme:
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  setTheme: (t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    set({ theme: t });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),

  selectedCandidateId: null,
  setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),
}));
