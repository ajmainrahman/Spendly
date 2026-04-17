import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import {
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, req.userId!))
    .orderBy(notesTable.updatedAt);
  res.json(notes);
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db
    .insert(notesTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(note);
});

router.put("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.userId!)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
