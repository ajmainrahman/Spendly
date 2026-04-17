import { pgTable, text, serial, timestamp, numeric, date, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  lenderName: text("lender_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  borrowedDate: date("borrowed_date").notNull(),
  deadline: date("deadline").notNull(),
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loanPaymentsTable = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loansTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidDate: date("paid_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;

export const insertLoanPaymentSchema = createInsertSchema(loanPaymentsTable).omit({ id: true, createdAt: true });
export type InsertLoanPayment = z.infer<typeof insertLoanPaymentSchema>;
export type LoanPayment = typeof loanPaymentsTable.$inferSelect;
