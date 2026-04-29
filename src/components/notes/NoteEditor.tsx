import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Heading2,
  Code,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoteEditorHandle {
  focus: () => void;
  getHTML: () => string;
  setContent: (html: string) => void;
  isEmpty: () => boolean;
  clear: () => void;
}

interface NoteEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  /** Called when Ctrl/Cmd+Enter is pressed inside the editor. */
  onSubmit?: () => void;
  /** Called when editor blurs (used for auto-save on inline edit). */
  onBlur?: () => void;
  /** Compact mode uses smaller toolbar styling. */
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  function NoteEditor(
    {
      initialContent = "",
      placeholder = "Write a note…",
      onChange,
      onSubmit,
      onBlur,
      compact,
      autoFocus,
      className,
    },
    ref
  ) {
    const extensions = useMemo(
      () => [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          // StarterKit's codeBlock would override our code-only styling; keep it off.
          codeBlock: false,
        }),
        Placeholder.configure({ placeholder }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      [placeholder]
    );

    // The editor below is created once and never reconfigured. To make
    // sure handleKeyDown / onUpdate / onBlur always call the LATEST
    // callbacks (and not stale ones from the first render), we stash
    // them in refs that update on every render.
    const onSubmitRef = useRef(onSubmit);
    const onChangeRef = useRef(onChange);
    const onBlurRef = useRef(onBlur);
    useEffect(() => {
      onSubmitRef.current = onSubmit;
      onChangeRef.current = onChange;
      onBlurRef.current = onBlur;
    });

    const editor = useEditor({
      extensions,
      content: initialContent,
      autofocus: autoFocus ? "end" : false,
      editorProps: {
        attributes: {
          class: cn("tiptap note-prose min-h-[60px] px-3 py-2", className),
        },
        handleKeyDown(_view, event) {
          // Ctrl/Cmd+Enter submits. Accept either event.key === "Enter" or
          // event.code === "Enter" — different layouts/IMEs can fire one
          // and not the other.
          const isEnter = event.key === "Enter" || event.code === "Enter";
          if ((event.ctrlKey || event.metaKey) && isEnter) {
            const submit = onSubmitRef.current;
            event.preventDefault();
            event.stopPropagation();
            if (submit) {
              submit();
            }
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current?.(editor.getHTML());
      },
      onBlur: () => {
        onBlurRef.current?.();
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus("end"),
        getHTML: () => editor?.getHTML() ?? "",
        setContent: (html: string) => editor?.commands.setContent(html),
        isEmpty: () => editor?.isEmpty ?? true,
        clear: () => editor?.commands.clearContent(),
      }),
      [editor]
    );

    // When initialContent changes from outside (e.g. switching candidates),
    // sync the editor.
    useEffect(() => {
      if (editor && initialContent !== editor.getHTML()) {
        editor.commands.setContent(initialContent);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialContent]);

    if (!editor) return null;

    return (
      <div
        className={cn(
          "overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring",
          compact && "text-sm"
        )}
      >
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  }
);

// ============================================================
// Toolbar
// ============================================================

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-0.5">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Checklist"
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );
}
