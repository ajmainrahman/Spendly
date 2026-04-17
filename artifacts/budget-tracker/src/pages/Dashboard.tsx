import { useState } from "react";
import { useGetDashboardSummary, useGetCategoryBreakdown, useGetMonthlyTrend, useGetBudgetVsActual, useListLoans } from "@workspace/api-client-react";
import { formatBDT, getCurrentMonth, getMonthLabel } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Percent, BarChart3, Activity, HandCoins, AlertTriangle, Clock } from "lucide-react";
import { Link } from "wouter";

function deadlineStatus(deadline: string, isPaid: boolean) {
  if (isPaid) return "paid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "soon";
  return "ok";
}

export default function Dashboard() {
  const [month, setMonth] = useState(getCurrentMonth());

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({ month });
  const { data: breakdown } = useGetCategoryBreakdown({ month });
  const { data: trend } = useGetMonthlyTrend({ months: 6 });
  const { data: budgetVsActual } = useGetBudgetVsActual({ month });
  const { data: loans } = useListLoans();

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  const activeLoans = loans?.filter(l => !l.isPaid) ?? [];
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.amount, 0);
  const overdueLoans = activeLoans.filter(l => deadlineStatus(l.deadline, l.isPaid) === "overdue");
  const soonLoans = activeLoans.filter(l => deadlineStatus(l.deadline, l.isPaid) === "soon");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your financial overview</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-7 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Income</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{formatBDT(summary?.totalIncome ?? 0)}</div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{formatBDT(summary?.totalExpenses ?? 0)}</div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Savings</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className={`text-xl font-bold ${(summary?.netSavings ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {formatBDT(summary?.netSavings ?? 0)}
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Savings Rate</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Percent className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{summary?.savingsRate ?? 0}%</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">6-Month Trend</h2>
          </div>
          {trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={m => m.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBDT(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No trend data available</div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Expense Breakdown</h2>
          </div>
          {breakdown && breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={breakdown} dataKey="amount" nameKey="categoryName" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                    {breakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.categoryColor || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBDT(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {breakdown.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.categoryColor || COLORS[idx % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.categoryName}</span>
                    </div>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">No expense data</div>
          )}
        </div>
      </div>

      {/* Budget vs Actual */}
      {budgetVsActual && budgetVsActual.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Budget vs Actual — {getMonthLabel(month)}</h2>
          <div className="space-y-3">
            {budgetVsActual.map((item) => (
              <div key={item.categoryId}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{item.categoryName}</span>
                  <span className="text-muted-foreground">
                    {formatBDT(item.actual)} / {formatBDT(item.budgeted)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.percentUsed, 100)}%`,
                      backgroundColor: item.percentUsed > 90 ? "#ef4444" : item.percentUsed > 70 ? "#f59e0b" : "#10b981",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loan Summary Widget */}
      {loans && loans.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Loan Overview</h2>
            </div>
            <Link href="/loans" className="text-xs text-primary hover:underline">View all</Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
              <div className="text-lg font-bold text-red-500">{formatBDT(totalOutstanding)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Active Loans</div>
              <div className="text-lg font-bold">{activeLoans.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Overdue</div>
              <div className={`text-lg font-bold ${overdueLoans.length > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {overdueLoans.length}
              </div>
            </div>
          </div>

          {(overdueLoans.length > 0 || soonLoans.length > 0) && (
            <div className="space-y-2">
              {overdueLoans.slice(0, 2).map(loan => (
                <div key={loan.id} className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-400 flex-1 min-w-0 truncate">{loan.lenderName}</span>
                  <span className="text-xs font-semibold text-red-600 shrink-0">{formatBDT(loan.amount)}</span>
                  <span className="text-xs text-red-500 shrink-0">Overdue</span>
                </div>
              ))}
              {soonLoans.slice(0, 2).map(loan => (
                <div key={loan.id} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex-1 min-w-0 truncate">{loan.lenderName}</span>
                  <span className="text-xs font-semibold text-amber-600 shrink-0">{formatBDT(loan.amount)}</span>
                  <span className="text-xs text-amber-500 shrink-0">Due soon</span>
                </div>
              ))}
            </div>
          )}

          {overdueLoans.length === 0 && soonLoans.length === 0 && activeLoans.length > 0 && (
            <div className="text-xs text-emerald-600 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-3 py-2">
              <span className="font-medium">All loans are on track</span>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-muted-foreground mb-1">Transactions</div>
          <div className="font-bold text-lg">{summary?.transactionCount ?? 0}</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-muted-foreground mb-1">Budget Used</div>
          <div className="font-bold text-lg">{summary?.budgetUtilization ?? 0}%</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-muted-foreground mb-1">Top Category</div>
          <div className="font-bold text-lg truncate">{summary?.topExpenseCategory ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
