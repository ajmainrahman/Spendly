import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, budgetsTable, categoriesTable, expensesTable } from "@workspace/db";
import {
  CreateBudgetBody,
  UpdateBudgetBody,
  UpdateBudgetParams,
  DeleteBudgetParams,
  ListBudgetsQueryParams,
  ListBudgetsResponse,
  UpdateBudgetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/budgets", async (req, res): Promise<void> => {
  const queryParams = ListBudgetsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const { month } = queryParams.data;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const budgetRows = await db
    .select({
      id: budgetsTable.id,
      categoryId: budgetsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryIcon: categoriesTable.icon,
      categoryColor: categoriesTable.color,
      month: budgetsTable.month,
      budgetAmount: budgetsTable.budgetAmount,
      createdAt: budgetsTable.createdAt,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(eq(budgetsTable.month, targetMonth));

  const result = await Promise.all(budgetRows.map(async (budget) => {
    const spent = await db
      .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.categoryId, budget.categoryId),
        sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${targetMonth}`
      ));
    const spentAmount = parseFloat(spent[0]?.total ?? "0");
    const budgetAmount = parseFloat(budget.budgetAmount);
    const remainingAmount = budgetAmount - spentAmount;
    const percentUsed = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
    return {
      ...budget,
      budgetAmount,
      spentAmount,
      remainingAmount,
      percentUsed,
      categoryName: budget.categoryName ?? "Unknown",
      categoryIcon: budget.categoryIcon ?? "circle",
      categoryColor: budget.categoryColor ?? "#6366f1",
    };
  }));

  res.json(ListBudgetsResponse.parse(result));
});

router.post("/budgets", async (req, res): Promise<void> => {
  const parsed = CreateBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(budgetsTable).values({ ...parsed.data, budgetAmount: String(parsed.data.budgetAmount) }).returning();
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  const budgetAmount = parseFloat(entry.budgetAmount);
  res.status(201).json({
    ...entry,
    budgetAmount,
    spentAmount: 0,
    remainingAmount: budgetAmount,
    percentUsed: 0,
    categoryName: category[0]?.name ?? "Unknown",
    categoryIcon: category[0]?.icon ?? "circle",
    categoryColor: category[0]?.color ?? "#6366f1",
  });
});

router.put("/budgets/:id", async (req, res): Promise<void> => {
  const params = UpdateBudgetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.update(budgetsTable).set({ ...parsed.data, budgetAmount: String(parsed.data.budgetAmount) }).where(eq(budgetsTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, entry.categoryId)).limit(1);
  const budgetAmount = parseFloat(entry.budgetAmount);
  const spent = await db
    .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(and(
      eq(expensesTable.categoryId, entry.categoryId),
      sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${entry.month}`
    ));
  const spentAmount = parseFloat(spent[0]?.total ?? "0");
  res.json(UpdateBudgetResponse.parse({
    ...entry,
    budgetAmount,
    spentAmount,
    remainingAmount: budgetAmount - spentAmount,
    percentUsed: budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0,
    categoryName: category[0]?.name ?? "Unknown",
    categoryIcon: category[0]?.icon ?? "circle",
    categoryColor: category[0]?.color ?? "#6366f1",
  }));
});

router.delete("/budgets/:id", async (req, res): Promise<void> => {
  const params = DeleteBudgetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(budgetsTable).where(eq(budgetsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
