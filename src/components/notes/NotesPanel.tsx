import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteEditor, NoteEditorHandle } from "./NoteEditor";
import { NoteItem } from "./NoteItem";
import { useNotes, useCreateNote } from "@/hooks/useNotes";

interface NotesPanelProps {
  candidateId: number;
}

export function NotesPanel({ candidateId }: NotesPanelProps) {
  const notesQuery = useNotes(candidateId);
  const createNote = useCreateNote();

  const editorRef = useRef<NoteEditorHandle>(null);
  const [draft, setDraft] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  const notes = notesQuery.data ?? [];

  async function submitNote() {
    const html = editorRef.current?.getHTML() ?? "";
    const plain = stripHtml(html).trim();
    if (!plain) return;
    await createNote.mutateAsync({ candidateId, content: html });
    editorRef.current?.clear();
    setDraft("");
    setHasDraft(false);
    editorRef.current?.focus();
  }

  // Ctrl/Cmd+N focuses the composer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in any input/contenteditable
      const target = e.target as HTMLElement | null;
      const inEditor =
        target?.closest(".tiptap") != null ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n" && !inEditor) {
        e.preventDefault();
        editorRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Warn on unload if there's a draft
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (hasDraft) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasDraft]);

  // When switching candidates, reset draft state
  useEffect(() => {
    editorRef.current?.clear();
    setDraft("");
    setHasDraft(false);
  }, [candidateId]);

  return (
    <div className="flex h-full flex-col">
      {/* Composer */}
      <div className="border-b border-border bg-background p-4">
        <NoteEditor
          ref={editorRef}
          placeholder="Write a note… (Ctrl+Enter to save)"
          onChange={(html) => {
            setDraft(html);
            setHasDraft(stripHtml(html).trim().length > 0);
          }}
          onSubmit={submitNote}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {hasDraft ? (
              <span className="text-amber-600 dark:text-amber-400">
                Unsaved draft
              </span>
            ) : (
              <>Tip: Ctrl+N from anywhere to start a note</>
            )}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={submitNote}
            disabled={!hasDraft || createNote.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            Save note
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {notes.length === 0 ? (
          <EmptyState onStart={() => editorRef.current?.focus()} />
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <NoteItem key={n.id} note={n} candidateId={candidateId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium">No notes yet</h4>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Capture interview feedback, next steps, anything that matters. Notes are
        searchable from anywhere.
      </p>
      <Button variant="link" size="sm" className="mt-2" onClick={onStart}>
        Start the first note
      </Button>
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
