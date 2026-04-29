import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string[];
  label: string;
}

interface Group {
  title: string;
  items: Shortcut[];
}

const GROUPS: Group[] = [
  {
    title: "Global",
    items: [
      { keys: ["Ctrl", "K"], label: "Open search (candidates + notes)" },
      { keys: ["?"], label: "Show this help" },
      { keys: ["Esc"], label: "Close dialogs / menus" },
    ],
  },
  {
    title: "Notes",
    items: [
      { keys: ["Ctrl", "N"], label: "Start a new note on the current candidate" },
      { keys: ["Ctrl", "Enter"], label: "Save note" },
      { keys: ["Esc"], label: "Cancel editing a note" },
    ],
  },
  {
    title: "Candidate detail",
    items: [
      { keys: ["Click note"], label: "Edit note (saves on blur)" },
      { keys: ["Drag card"], label: "Change stage (on pipeline board)" },
      { keys: ["Click stage dropdown"], label: "Change stage (on detail page)" },
    ],
  },
  {
    title: "Requirements",
    items: [
      { keys: ["Click status chip"], label: "Advance status (pending → in progress → complete)" },
      { keys: ["Click ⋯"], label: "Full requirement editor" },
      { keys: ["Click paperclip"], label: "Attach files / manage attachments" },
    ],
  },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept '?' while typing in an input or the TipTap editor
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.closest(".tiptap") != null ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (e.key === "?" && !inEditable && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> anywhere to open this.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </h3>
              <ul className="space-y-1">
                {g.items.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-1 text-sm hover:bg-accent/40"
                  >
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <Kbd key={ki}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
      {children}
    </kbd>
  );
}
