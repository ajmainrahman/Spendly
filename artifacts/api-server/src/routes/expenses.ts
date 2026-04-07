import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, expensesTable, categoriesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  UpdateExpenseParams,
  DeleteExpenseParams,
  ListExpensesQueryParams,
  ListExpensesResponse,
  UpdateExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/expenses", async (req, res): Promise<void> => {
  const queryParams = ListExpensesQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const { month, categoryId } = queryParams.data;

  const conditions = [eq(expensesTable.userId, req.userId!)];
  if (month) {
    conditions.push(sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`);
  }
  if (categoryId) {
    conditions.push(eq(expensesTable.categoryId, categoryId));
  }

  const rows = await db
    .select({
      id: expensesTable.id,
      description: expensesTable.description,
      amount: expensesTable.amount,
      date: expensesTable.date,
      categoryId: expensesTable.categoryId,
      categoryName: categoriesTable.name,
      categoryIcon: categoriesTable.icon,
      categoryColor: categoriesTable.color,
      notes: expensesTable.notes,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(expensesTable.date);

  const mapped = rows.map(r => ({
    ...r,
    amount: parseFloat(r.amount),
    categoryName: r.categoryName ?? "Unknown",
    categoryIcon: r.categoryIcon ?? "circle",
    categoryColor: r.categoryColor ?? "#6366f1",
    notes: r.notes ?? undefined,
  }));

  res.json(ListExpensesResponse.parse(mapped));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(expensesTable)
    .values({ ...parsed.data, userId: req.userId, amount: String(parsed.data.amount) })
    .returning();
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  res.status(201).json({
    ...entry,
    amount: parseFloat(entry.amount),
    categoryName: category[0]?.name ?? "Unknown",
    categoryIcon: category[0]?.icon ?? "circle",
    categoryColor: category[0]?.color ?? "#6366f1",
    notes: entry.notes ?? undefined,
  });
});

router.put("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(expensesTable)
    .set({ ...parsed.data, amount: String(parsed.data.amount) })
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, req.userId!)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Expense entry not found" });
    return;
  }
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  res.json(UpdateExpenseResponse.parse({
    ...entry,
    amount: parseFloat(entry.amount),
    categoryName: category[0]?.name ?? "Unknown",
    categoryIcon: category[0]?.icon ?? "circle",
    categoryColor: category[0]?.color ?? "#6366f1",
    notes: entry.notes ?? undefined,
  }));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Expense entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
