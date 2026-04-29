import { create } from "zustand";

export type ToastVariant = "default" | "success" | "destructive";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs?: number;
}

interface ToastState {
  items: ToastItem[];
  push: (input: Omit<ToastItem, "id">) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (input) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { ...input, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/**
 * Ergonomic hook. Use as:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Couldn't save", "Try again later");
 */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    show: (input: Omit<ToastItem, "id">) => push(input),
    success: (title: string, description?: string) =>
      push({ title, description, variant: "success", durationMs: 3000 }),
    error: (title: string, description?: string) =>
      push({ title, description, variant: "destructive", durationMs: 6000 }),
    info: (title: string, description?: string) =>
      push({ title, description, variant: "default", durationMs: 4000 }),
  };
}
