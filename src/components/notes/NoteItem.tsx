import { useEffect, useRef, useState } from "react";
import { Pin, PinOff, Trash2, MoreHorizontal, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NoteEditor, NoteEditorHandle } from "./NoteEditor";
import { useUpdateNote, useTogglePinNote, useDeleteNote } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface NoteItemProps {
  note: Note;
  candidateId: number;
}

export function NoteItem({ note, candidateId }: NoteItemProps) {
  const update = useUpdateNote();
  const togglePin = useTogglePinNote();
  const remove = useDeleteNote();

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Single source of truth for the editor's content while editing.
  // Synced from NoteEditor's onChange. Reading editorRef.getHTML() in
  // event handlers is a bug-magnet (timing issues, ref races); using
  // controlled state avoids all of that.
  const [draft, setDraft] = useState<string>(note.content);
  const editorRef = useRef<NoteEditorHandle>(null);

  // When the user opens edit mode, seed draft from the latest persisted
  // content. This is essential — without it, draft would be stale from
  // the previous editing session.
  function startEditing() {
    setDraft(note.content);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(note.content);
    setEditing(false);
  }

  // Single save path. Used by: explicit Save button, Ctrl+Enter, blur.
  // Idempotent: safe to call repeatedly (the if-guard prevents duplicate writes).
  async function saveEdit() {
    const html = draft;
    const trimmed = stripHtml(html).trim();
    if (trimmed.length === 0) {
      // Empty content — treat as cancel rather than create an empty note.
      cancelEdit();
      return;
    }
    if (html !== note.content) {
      await update.mutateAsync({ id: note.id, candidateId, content: html });
    }
    setEditing(false);
  }

  // Esc cancels edit. (Ctrl+Enter is handled in the editor itself, see below.)
  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card transition-colors",
        note.pinned && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {note.pinned ? (
            <Pin className="h-3 w-3 fill-amber-500 text-amber-500" />
          ) : null}
          <span title={new Date(note.created_at).toLocaleString()}>
            {timeAgo(note.created_at)}
          </span>
          {note.updated_at !== note.created_at ? (
            <span className="italic">· edited</span>
          ) : null}
        </div>

        {!editing ? (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="Note actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  startEditing();
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  togglePin.mutate({ id: note.id, candidateId });
                  setMenuOpen(false);
                }}
              >
                {note.pinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5" /> Pin
                  </>
                )}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Delete this note? This can't be undone.")) {
                    remove.mutate({ id: note.id, candidateId });
                  }
                  setMenuOpen(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {/* Body */}
      {editing ? (
        <div className="p-1">
          <NoteEditor
            ref={editorRef}
            initialContent={note.content}
            autoFocus
            onChange={setDraft}
            // Ctrl/Cmd+Enter on the editor calls saveEdit. Single source.
            onSubmit={saveEdit}
            // No onBlur save — the user might click Save / Cancel buttons,
            // which themselves don't trigger blur in a useful order.
          />
          <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5">
            <span className="flex-1 text-[10px] italic text-muted-foreground">
              Ctrl+Enter to save · Esc to cancel
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={cancelEdit}
              disabled={update.isPending}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7"
              onClick={saveEdit}
              disabled={update.isPending}
            >
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="note-prose select-text px-3 py-2"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      )}
    </div>
  );
}

/** Strip HTML tags for the "is this empty?" check. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** "5m ago", "2h ago", "3d ago", or full date. */
function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
