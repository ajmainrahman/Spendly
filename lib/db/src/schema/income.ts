import { pgTable, text, serial, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

export const incomeTable = pgTable("income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  source: text("source").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncomeSchema = createInsertSchema(incomeTable).omit({ id: true, createdAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomeTable.$inferSelect;
