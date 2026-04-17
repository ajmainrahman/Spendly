import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, incomeTable, expensesTable, budgetsTable, categoriesTable } from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetCategoryBreakdownQueryParams,
  GetMonthlyTrendQueryParams,
  GetBudgetVsActualQueryParams,
  GetDashboardSummaryResponse,
  GetCategoryBreakdownResponse,
  GetMonthlyTrendResponse,
  GetBudgetVsActualResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const queryParams = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const month = queryParams.data.month || new Date().toISOString().slice(0, 7);
  const uid = req.userId!;

  const [incomeResult] = await db
    .select({ total: sql<string>`coalesce(sum(${incomeTable.amount}), 0)`, count: sql<string>`count(*)` })
    .from(incomeTable)
    .where(and(
      eq(incomeTable.userId, uid),
      sql`to_char(${incomeTable.date}::date, 'YYYY-MM') = ${month}`
    ));

  const [expenseResult] = await db
    .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)`, count: sql<string>`count(*)` })
    .from(expensesTable)
    .where(and(
      eq(expensesTable.userId, uid),
      sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`
    ));

  const [budgetResult] = await db
    .select({ total: sql<string>`coalesce(sum(${budgetsTable.budgetAmount}), 0)` })
    .from(budgetsTable)
    .where(and(eq(budgetsTable.userId, uid), eq(budgetsTable.month, month)));

  const topCategoryRows = await db
    .select({ name: categoriesTable.name, total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(and(
      eq(expensesTable.userId, uid),
      sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`
    ))
    .groupBy(categoriesTable.name)
    .orderBy(sql`sum(${expensesTable.amount}) desc`)
    .limit(1);

  const totalIncome = parseFloat(incomeResult?.total ?? "0");
  const totalExpenses = parseFloat(expenseResult?.total ?? "0");
  const totalBudget = parseFloat(budgetResult?.total ?? "0");
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;
  const transactionCount = parseInt(incomeResult?.count ?? "0") + parseInt(expenseResult?.count ?? "0");

  res.json(GetDashboardSummaryResponse.parse({
    month,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    budgetUtilization,
    topExpenseCategory: topCategoryRows[0]?.name ?? undefined,
    transactionCount,
  }));
});

router.get("/dashboard/category-breakdown", async (req, res): Promise<void> => {
  const queryParams = GetCategoryBreakdownQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const month = queryParams.data.month || new Date().toISOString().slice(0, 7);
  const uid = req.userId!;

  const rows = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      categoryIcon: categoriesTable.icon,
      categoryColor: categoriesTable.color,
      total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)`,
      count: sql<string>`count(${expensesTable.id})`,
    })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(and(
      eq(expensesTable.userId, uid),
      sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`
    ))
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.icon, categoriesTable.color)
    .orderBy(sql`sum(${expensesTable.amount}) desc`);

  const grandTotal = rows.reduce((acc, r) => acc + parseFloat(r.total), 0);

  const result = rows.map(r => ({
    categoryId: r.categoryId ?? 0,
    categoryName: r.categoryName ?? "Unknown",
    categoryIcon: r.categoryIcon ?? "circle",
    categoryColor: r.categoryColor ?? "#6366f1",
    amount: parseFloat(r.total),
    percentage: grandTotal > 0 ? Math.round((parseFloat(r.total) / grandTotal) * 100) : 0,
    transactionCount: parseInt(r.count),
  }));

  res.json(GetCategoryBreakdownResponse.parse(result));
});

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  const queryParams = GetMonthlyTrendQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const monthsBack = queryParams.data.months ?? 6;
  const uid = req.userId!;

  const months: string[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const incomeRows = await db
    .select({
      month: sql<string>`to_char(${incomeTable.date}::date, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${incomeTable.amount}), 0)`,
    })
    .from(incomeTable)
    .where(and(
      eq(incomeTable.userId, uid),
      sql`to_char(${incomeTable.date}::date, 'YYYY-MM') >= ${months[0]}`
    ))
    .groupBy(sql`to_char(${incomeTable.date}::date, 'YYYY-MM')`);

  const expenseRows = await db
    .select({
      month: sql<string>`to_char(${expensesTable.date}::date, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)`,
    })
    .from(expensesTable)
    .where(and(
      eq(expensesTable.userId, uid),
      sql`to_char(${expensesTable.date}::date, 'YYYY-MM') >= ${months[0]}`
    ))
    .groupBy(sql`to_char(${expensesTable.date}::date, 'YYYY-MM')`);

  const incomeMap = Object.fromEntries(incomeRows.map(r => [r.month, parseFloat(r.total)]));
  const expenseMap = Object.fromEntries(expenseRows.map(r => [r.month, parseFloat(r.total)]));

  const result = months.map(m => {
    const income = incomeMap[m] ?? 0;
    const expenses = expenseMap[m] ?? 0;
    return { month: m, income, expenses, savings: income - expenses };
  });

  res.json(GetMonthlyTrendResponse.parse(result));
});

router.get("/dashboard/budget-vs-actual", async (req, res): Promise<void> => {
  const queryParams = GetBudgetVsActualQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const month = queryParams.data.month || new Date().toISOString().slice(0, 7);
  const uid = req.userId!;

  const budgets = await db
    .select({
      categoryId: budgetsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryIcon: categoriesTable.icon,
      categoryColor: categoriesTable.color,
      budgetAmount: budgetsTable.budgetAmount,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(and(eq(budgetsTable.userId, uid), eq(budgetsTable.month, month)));

  const result = await Promise.all(budgets.map(async (b) => {
    const [spent] = await db
      .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, uid),
        eq(expensesTable.categoryId, b.categoryId),
        sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`
      ));
    const budgeted = parseFloat(b.budgetAmount);
    const actual = parseFloat(spent?.total ?? "0");
    const variance = budgeted - actual;
    const percentUsed = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
    return {
      categoryId: b.categoryId,
      categoryName: b.categoryName ?? "Unknown",
      categoryIcon: b.categoryIcon ?? "circle",
      categoryColor: b.categoryColor ?? "#6366f1",
      budgeted,
      actual,
      variance,
      percentUsed,
    };
  }));

  res.json(GetBudgetVsActualResponse.parse(result));
});

export default router;
