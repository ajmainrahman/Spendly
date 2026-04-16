import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, loansTable } from "@workspace/db";
import {
  CreateLoanBody,
  UpdateLoanBody,
  UpdateLoanParams,
  DeleteLoanParams,
  ListLoansResponse,
  UpdateLoanResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapLoan(loan: {
  id: number;
  lenderName: string;
  amount: string;
  borrowedDate: string;
  deadline: string;
  notes: string | null;
  isPaid: boolean;
  createdAt: Date;
}) {
  return {
    ...loan,
    amount: parseFloat(loan.amount),
    notes: loan.notes ?? undefined,
  };
}

router.get("/loans", async (req, res): Promise<void> => {
  const loans = await db
    .select()
    .from(loansTable)
    .where(eq(loansTable.userId, req.userId!))
    .orderBy(loansTable.deadline);

  res.json(ListLoansResponse.parse(loans.map(mapLoan)));
});

router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [loan] = await db
    .insert(loansTable)
    .values({
      ...parsed.data,
      userId: req.userId,
      amount: String(parsed.data.amount),
    })
    .returning();
  res.status(201).json(mapLoan(loan));
});

router.put("/loans/:id", async (req, res): Promise<void> => {
  const params = UpdateLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [loan] = await db
    .update(loansTable)
    .set({ ...parsed.data, amount: String(parsed.data.amount) })
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, req.userId!)))
    .returning();
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json(UpdateLoanResponse.parse(mapLoan(loan)));
});

router.delete("/loans/:id", async (req, res): Promise<void> => {
  const params = DeleteLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
