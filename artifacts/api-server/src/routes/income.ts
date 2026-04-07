import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, incomeTable, categoriesTable } from "@workspace/db";
import {
  CreateIncomeBody,
  UpdateIncomeBody,
  UpdateIncomeParams,
  DeleteIncomeParams,
  ListIncomeQueryParams,
  ListIncomeResponse,
  UpdateIncomeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/income", async (req, res): Promise<void> => {
  const queryParams = ListIncomeQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const { month } = queryParams.data;

  const conditions = [eq(incomeTable.userId, req.userId!)];
  if (month) {
    conditions.push(sql`to_char(${incomeTable.date}::date, 'YYYY-MM') = ${month}`);
  }

  const rows = await db
    .select({
      id: incomeTable.id,
      source: incomeTable.source,
      amount: incomeTable.amount,
      date: incomeTable.date,
      categoryId: incomeTable.categoryId,
      categoryName: categoriesTable.name,
      notes: incomeTable.notes,
      createdAt: incomeTable.createdAt,
    })
    .from(incomeTable)
    .leftJoin(categoriesTable, eq(incomeTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(incomeTable.date);

  const mapped = rows.map(r => ({
    ...r,
    amount: parseFloat(r.amount),
    categoryName: r.categoryName ?? "Unknown",
    notes: r.notes ?? undefined,
  }));

  res.json(ListIncomeResponse.parse(mapped));
});

router.post("/income", async (req, res): Promise<void> => {
  const parsed = CreateIncomeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(incomeTable)
    .values({ ...parsed.data, userId: req.userId, amount: String(parsed.data.amount) })
    .returning();
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  res.status(201).json({
    ...entry,
    amount: parseFloat(entry.amount),
    categoryName: category[0]?.name ?? "Unknown",
    notes: entry.notes ?? undefined,
  });
});

router.put("/income/:id", async (req, res): Promise<void> => {
  const params = UpdateIncomeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateIncomeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(incomeTable)
    .set({ ...parsed.data, amount: String(parsed.data.amount) })
    .where(and(eq(incomeTable.id, params.data.id), eq(incomeTable.userId, req.userId!)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Income entry not found" });
    return;
  }
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  res.json(UpdateIncomeResponse.parse({
    ...entry,
    amount: parseFloat(entry.amount),
    categoryName: category[0]?.name ?? "Unknown",
    notes: entry.notes ?? undefined,
  }));
});

router.delete("/income/:id", async (req, res): Promise<void> => {
  const params = DeleteIncomeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(incomeTable)
    .where(and(eq(incomeTable.id, params.data.id), eq(incomeTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Income entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
