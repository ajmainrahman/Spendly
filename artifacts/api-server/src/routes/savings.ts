import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, savingsGoalsTable } from "@workspace/db";
import {
  CreateSavingsGoalBody,
  UpdateSavingsGoalBody,
  UpdateSavingsGoalParams,
  DeleteSavingsGoalParams,
  AddSavingsContributionBody,
  AddSavingsContributionParams,
  ListSavingsGoalsResponse,
  UpdateSavingsGoalResponse,
  AddSavingsContributionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapGoal(goal: { id: number; name: string; targetAmount: string; currentAmount: string; deadline: string | null; notes: string | null; createdAt: Date }) {
  const targetAmount = parseFloat(goal.targetAmount);
  const currentAmount = parseFloat(goal.currentAmount);
  const percentComplete = targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;
  return {
    ...goal,
    targetAmount,
    currentAmount,
    percentComplete,
    notes: goal.notes ?? undefined,
    deadline: goal.deadline ?? undefined,
  };
}

router.get("/savings-goals", async (req, res): Promise<void> => {
  const goals = await db
    .select()
    .from(savingsGoalsTable)
    .where(eq(savingsGoalsTable.userId, req.userId!))
    .orderBy(savingsGoalsTable.createdAt);
  res.json(ListSavingsGoalsResponse.parse(goals.map(mapGoal)));
});

router.post("/savings-goals", async (req, res): Promise<void> => {
  const parsed = CreateSavingsGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [goal] = await db.insert(savingsGoalsTable).values({
    ...parsed.data,
    userId: req.userId,
    targetAmount: String(parsed.data.targetAmount),
    currentAmount: String(parsed.data.currentAmount ?? 0),
  }).returning();
  res.status(201).json(mapGoal(goal));
});

router.put("/savings-goals/:id", async (req, res): Promise<void> => {
  const params = UpdateSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSavingsGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [goal] = await db
    .update(savingsGoalsTable)
    .set({
      ...parsed.data,
      targetAmount: String(parsed.data.targetAmount),
      currentAmount: String(parsed.data.currentAmount ?? 0),
    })
    .where(and(eq(savingsGoalsTable.id, params.data.id), eq(savingsGoalsTable.userId, req.userId!)))
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.json(UpdateSavingsGoalResponse.parse(mapGoal(goal)));
});

router.delete("/savings-goals/:id", async (req, res): Promise<void> => {
  const params = DeleteSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(savingsGoalsTable)
    .where(and(eq(savingsGoalsTable.id, params.data.id), eq(savingsGoalsTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/savings-goals/:id/contribution", async (req, res): Promise<void> => {
  const params = AddSavingsContributionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddSavingsContributionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [goal] = await db
    .update(savingsGoalsTable)
    .set({ currentAmount: sql`${savingsGoalsTable.currentAmount} + ${String(parsed.data.amount)}` })
    .where(and(eq(savingsGoalsTable.id, params.data.id), eq(savingsGoalsTable.userId, req.userId!)))
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.json(AddSavingsContributionResponse.parse(mapGoal(goal)));
});

export default router;
