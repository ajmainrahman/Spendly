import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, loansTable, loanPaymentsTable } from "@workspace/db";
import {
  CreateLoanBody,
  UpdateLoanBody,
  UpdateLoanParams,
  DeleteLoanParams,
  ListLoansResponse,
  UpdateLoanResponse,
  CreateLoanPaymentBody,
  ListLoanPaymentsParams,
  CreateLoanPaymentParams,
  DeleteLoanPaymentParams,
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

function mapPayment(payment: {
  id: number;
  loanId: number;
  amount: string;
  paidDate: string;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    ...payment,
    amount: parseFloat(payment.amount),
    notes: payment.notes ?? undefined,
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

router.get("/loans/:id/payments", async (req, res): Promise<void> => {
  const params = ListLoanPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const loan = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, req.userId!)))
    .limit(1);
  if (!loan.length) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const payments = await db
    .select()
    .from(loanPaymentsTable)
    .where(eq(loanPaymentsTable.loanId, params.data.id))
    .orderBy(loanPaymentsTable.paidDate);
  res.json(payments.map(mapPayment));
});

router.post("/loans/:id/payments", async (req, res): Promise<void> => {
  const params = CreateLoanPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const loan = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, req.userId!)))
    .limit(1);
  if (!loan.length) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const parsed = CreateLoanPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [payment] = await db
    .insert(loanPaymentsTable)
    .values({
      loanId: params.data.id,
      userId: req.userId,
      amount: String(parsed.data.amount),
      paidDate: parsed.data.paidDate,
      notes: parsed.data.notes,
    })
    .returning();
  res.status(201).json(mapPayment(payment));
});

router.delete("/loans/:id/payments/:paymentId", async (req, res): Promise<void> => {
  const params = DeleteLoanPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const loan = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, req.userId!)))
    .limit(1);
  if (!loan.length) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const [deleted] = await db
    .delete(loanPaymentsTable)
    .where(
      and(
        eq(loanPaymentsTable.id, params.data.paymentId),
        eq(loanPaymentsTable.loanId, params.data.id),
      )
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
