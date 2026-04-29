import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, User, FileText } from "lucide-react";
import { query } from "@/lib/db";
import { SQL_SEARCH_CANDIDATES, SQL_SEARCH_NOTES } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface CandidateHit {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  current_stage_id: number;
  stage_name: string;
  stage_color: string;
  role_title: string | null;
}

interface NoteHit {
  note_id: number;
  candidate_id: number;
  created_at: string;
  first_name: string;
  last_name: string;
  snippet: string;
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUIStore();
  const navigate = useNavigate();
  const [input, setInput] = useState("");

  // Debounce input so we don't hammer SQLite on every keystroke
  const debounced = useDebounced(input, 150);

  // Clear input when closing
  useEffect(() => {
    if (!commandOpen) setInput("");
  }, [commandOpen]);

  // Global keyboard shortcut — toggle on Ctrl/Cmd+K, close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Toggle — if open, close; if closed, open
        useUIStore.getState().setCommandOpen(!useUIStore.getState().commandOpen);
        return;
      }
      if (e.key === "Escape" && useUIStore.getState().commandOpen) {
        e.preventDefault();
        useUIStore.getState().setCommandOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hasQuery = debounced.trim().length > 0;

  const candidatesQuery = useQuery({
    queryKey: ["search-candidates", debounced],
    queryFn: () =>
      query<CandidateHit>(SQL_SEARCH_CANDIDATES, [`%${debounced.trim()}%`]),
    enabled: hasQuery,
  });

  const notesQuery = useQuery({
    queryKey: ["search-notes", debounced],
    queryFn: () => {
      // FTS5 wants a proper MATCH expression — split into tokens, add prefix asterisks
      const terms = debounced
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .map((t) => `${sanitizeFtsToken(t)}*`)
        .join(" ");
      if (!terms) return Promise.resolve([]);
      return query<NoteHit>(SQL_SEARCH_NOTES, [terms]);
    },
    enabled: hasQuery,
  });

  const candidateHits = candidatesQuery.data ?? [];
  const noteHits = notesQuery.data ?? [];

  function handleSelect(candidateId: number, noteId?: number) {
    setCommandOpen(false);
    // Note-hit navigation is just the candidate page; we don't deep-link to notes yet
    void noteId;
    navigate(`/candidates/${candidateId}`);
  }

  if (!commandOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="mx-auto mt-[10vh] max-w-xl overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          className="flex flex-col"
          label="Global search"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={input}
              onValueChange={setInput}
              placeholder="Search candidates or notes…"
              autoFocus
              className="h-12 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-1">
            {!hasQuery ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Start typing to search.
              </div>
            ) : candidatesQuery.isLoading || notesQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            ) : candidateHits.length === 0 && noteHits.length === 0 ? (
              <Command.Empty className="p-8 text-center text-sm text-muted-foreground">
                No results for "{debounced}"
              </Command.Empty>
            ) : null}

            {candidateHits.length > 0 ? (
              <Command.Group
                heading={<GroupHeader>Candidates</GroupHeader>}
                className="pb-2"
              >
                {candidateHits.map((c) => (
                  <Command.Item
                    key={`c-${c.id}`}
                    value={`candidate-${c.id}-${c.first_name}-${c.last_name}`}
                    onSelect={() => handleSelect(c.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    )}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[c.role_title, c.email]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </div>
                    </div>
                    <StageChip name={c.stage_name} color={c.stage_color} />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {noteHits.length > 0 ? (
              <Command.Group heading={<GroupHeader>Notes</GroupHeader>}>
                {noteHits.map((n) => (
                  <Command.Item
                    key={`n-${n.note_id}`}
                    value={`note-${n.note_id}`}
                    onSelect={() => handleSelect(n.candidate_id, n.note_id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    )}
                  >
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {n.first_name} {n.last_name}
                      </div>
                      <div
                        className="line-clamp-2 text-sm [&_mark]:bg-amber-500/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
                        dangerouslySetInnerHTML={{
                          __html: stripTagsExceptMark(n.snippet),
                        }}
                      />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd>{" "}
                Navigate
              </span>
              <span>
                <kbd className="rounded border border-border bg-muted px-1">↵</kbd>{" "}
                Open
              </span>
            </div>
            <span>
              <kbd className="rounded border border-border bg-muted px-1">
                Ctrl+K
              </kbd>{" "}
              to toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function StageChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}14`,
        color: color,
      }}
    >
      {name}
    </span>
  );
}

// ============================================================
// Helpers
// ============================================================

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Strip FTS5-unfriendly characters from a search token.
 * FTS5 treats punctuation specially — quotes, parens, asterisks, hyphens would
 * break the query. We keep only alphanumerics and underscores.
 */
function sanitizeFtsToken(t: string): string {
  return t.replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Allow only <mark> tags in the FTS snippet output. Everything else gets
 * entity-encoded — the snippet comes from note content which is HTML-rich.
 */
function stripTagsExceptMark(html: string): string {
  // First, encode everything
  const encoded = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Then re-enable <mark> and </mark>
  return encoded
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
