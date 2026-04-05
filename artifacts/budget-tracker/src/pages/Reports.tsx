import { useState } from "react";
import { useGetMonthlyTrend, useGetCategoryBreakdown, useGetDashboardSummary } from "@workspace/api-client-react";
import { formatBDT, getCurrentMonth, getMonthLabel } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());

  const { data: trend } = useGetMonthlyTrend({ months: 12 });
  const { data: breakdown } = useGetCategoryBreakdown({ month });
  const { data: summary } = useGetDashboardSummary({ month });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Detailed financial analysis</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Income</div>
            <div className="font-bold text-emerald-600">{formatBDT(summary.totalIncome)}</div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Expenses</div>
            <div className="font-bold text-red-500">{formatBDT(summary.totalExpenses)}</div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Net Savings</div>
            <div className={`font-bold ${summary.netSavings >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatBDT(summary.netSavings)}</div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Savings Rate</div>
            <div className="font-bold">{summary.savingsRate}%</div>
          </div>
        </div>
      )}

      {/* 12-month trend */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">12-Month Income vs Expenses</h2>
        {trend && trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={m => m.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatBDT(v)} />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="savings" stroke="#3b82f6" name="Savings" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
        )}
      </div>

      {/* Category breakdown for selected month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Category Breakdown — {getMonthLabel(month)}</h2>
          {breakdown && breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={breakdown} dataKey="amount" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                    {breakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.categoryColor || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBDT(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.categoryColor || COLORS[idx % COLORS.length] }} />
                      <span>{item.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{item.percentage}%</span>
                      <span className="font-medium">{formatBDT(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No expenses for this month</div>
          )}
        </div>

        {/* Bar chart comparison */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Spending by Category</h2>
          {breakdown && breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={breakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="categoryName" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatBDT(v)} />
                <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                  {breakdown.map((entry, idx) => (
                    <Cell key={idx} fill={entry.categoryColor || COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
