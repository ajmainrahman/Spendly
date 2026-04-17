import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey,
} from "@workspace/api-client-react";
import { Plus, Trash2, NotebookPen, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";

const newNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
});
type NewNoteData = z.infer<typeof newNoteSchema>;

export default function Notepad() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notes, isLoading } = useListNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewNoteData>({
    resolver: zodResolver(newNoteSchema),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListNotesQueryKey() });

  const selectedNote = notes?.find(n => n.id === selectedId);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setDirty(false);
    }
  }, [selectedId, selectedNote?.id]);

  const autoSave = (title: string, content: string) => {
    if (!selectedId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await updateNote.mutateAsync({ id: selectedId, data: { title, content } });
      invalidate();
      setDirty(false);
    }, 1000);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    setDirty(true);
    autoSave(value, editContent);
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setDirty(true);
    autoSave(editTitle, value);
  };

  const saveNow = async () => {
    if (!selectedId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await updateNote.mutateAsync({ id: selectedId, data: { title: editTitle, content: editContent } });
    invalidate();
    setDirty(false);
  };

  const onCreateNote = async (data: NewNoteData) => {
    const note = await createNote.mutateAsync({ data: { title: data.title, content: "" } });
    await invalidate();
    reset();
    setShowNewForm(false);
    setSelectedId(note.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync({ id });
    if (selectedId === id) setSelectedId(null);
    invalidate();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Notepad</h1>
          <p className="text-sm text-muted-foreground">Write, plan, and organise your thoughts</p>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {showNewForm && (
        <div className="mb-4 bg-card border border-card-border rounded-xl p-4">
          <form onSubmit={handleSubmit(onCreateNote)} className="flex gap-3 items-start">
            <div className="flex-1">
              <input
                {...register("title")}
                placeholder="Note title..."
                autoFocus
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shrink-0">
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); reset(); }}
              className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition shrink-0"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        <aside className="w-56 shrink-0 bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : !notes || notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
              <NotebookPen className="w-8 h-8 text-muted-foreground opacity-40 mb-2" />
              <p className="text-xs text-muted-foreground">No notes yet. Create one!</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {[...notes].reverse().map(note => (
                <div
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={`group flex items-start gap-2 px-3 py-3 cursor-pointer transition-colors ${
                    selectedId === note.id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${selectedId === note.id ? "text-primary" : ""}`}>
                      {note.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {note.content ? note.content.slice(0, 40) : "Empty"}
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatDate(note.updatedAt instanceof Date ? note.updatedAt.toISOString().slice(0,10) : String(note.updatedAt).slice(0,10))}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col bg-card border border-card-border rounded-xl overflow-hidden">
          {!selectedNote ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <NotebookPen className="w-12 h-12 text-muted-foreground opacity-30 mb-3" />
              <p className="text-muted-foreground">Select a note to start editing</p>
              <p className="text-sm text-muted-foreground/60 mt-1">or create a new one</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <input
                  value={editTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="flex-1 text-base font-semibold bg-transparent focus:outline-none border-b border-transparent focus:border-primary transition-colors"
                  placeholder="Note title..."
                />
                <div className="flex items-center gap-2 shrink-0">
                  {dirty && (
                    <span className="text-xs text-muted-foreground italic">Unsaved</span>
                  )}
                  <button
                    onClick={saveNow}
                    className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Write your note here... You can plan anything — budgets, goals, ideas."
                className="flex-1 resize-none p-4 text-sm bg-transparent focus:outline-none leading-relaxed"
              />
              <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                Last updated: {formatDate(selectedNote.updatedAt instanceof Date ? selectedNote.updatedAt.toISOString().slice(0,10) : String(selectedNote.updatedAt).slice(0,10))}
                {" · "}{editContent.split(/\s+/).filter(Boolean).length} words
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
