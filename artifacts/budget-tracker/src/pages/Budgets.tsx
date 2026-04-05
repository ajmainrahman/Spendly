import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget,
  useListCategories, getListBudgetsQueryKey
} from "@workspace/api-client-react";
import { formatBDT, getCurrentMonth, getMonthLabel } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";
import { Plus, Pencil, Trash2, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  categoryId: z.coerce.number().positive("Category is required"),
  month: z.string().min(1, "Month is required"),
  budgetAmount: z.coerce.number().positive("Amount must be positive"),
});
type FormData = z.infer<typeof schema>;

export default function Budgets() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: budgets, isLoading } = useListBudgets({ month });
  const { data: categories } = useListCategories();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { month },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() });

  const onSubmit = async (data: FormData) => {
    if (editId !== null) {
      await updateMutation.mutateAsync({ id: editId, data });
    } else {
      await createMutation.mutateAsync({ data });
    }
    invalidate();
    reset({ month });
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (entry: NonNullable<typeof budgets>[0]) => {
    reset({ categoryId: entry.categoryId, month: entry.month, budgetAmount: entry.budgetAmount });
    setEditId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this budget?")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const totalBudget = budgets?.reduce((sum, b) => sum + b.budgetAmount, 0) ?? 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + b.spentAmount, 0) ?? 0;
  const expenseCategories = categories?.filter(c => c.type === "expense" || c.type === "both") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground">Plan and track your monthly budget</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker month={month} onChange={m => { setMonth(m); setValue("month", m); }} />
          <button
            onClick={() => { reset({ month }); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
          <div className="text-xl font-bold">{formatBDT(totalBudget)}</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
          <div className="text-xl font-bold text-red-500">{formatBDT(totalSpent)}</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Remaining</div>
          <div className={cn("text-xl font-bold", totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-red-500")}>
            {formatBDT(totalBudget - totalSpent)}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{editId ? "Edit Budget" : "Add Budget"}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select {...register("categoryId")} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select category</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Month</label>
              <input {...register("month")} type="month" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.month && <p className="text-xs text-destructive mt-1">{errors.month.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Budget Amount (৳)</label>
              <input {...register("budgetAmount")} type="number" step="0.01" placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.budgetAmount && <p className="text-xs text-destructive mt-1">{errors.budgetAmount.message}</p>}
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                {editId ? "Update" : "Save"} Budget
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset({ month }); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted-foreground">Loading...</div>
        ) : !budgets || budgets.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center">
            <PiggyBank className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No budgets set for {getMonthLabel(month)}.</p>
          </div>
        ) : (
          budgets.map(budget => (
            <div key={budget.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: budget.categoryColor }}
                  >
                    {budget.categoryName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{budget.categoryName}</div>
                    <div className="text-xs text-muted-foreground">
                      Spent: {formatBDT(budget.spentAmount)} of {formatBDT(budget.budgetAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={cn("font-semibold text-sm", budget.remainingAmount >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {budget.remainingAmount >= 0 ? `${formatBDT(budget.remainingAmount)} left` : `${formatBDT(Math.abs(budget.remainingAmount))} over`}
                    </div>
                    <div className="text-xs text-muted-foreground">{budget.percentUsed}% used</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(budget)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(budget.percentUsed, 100)}%`,
                    backgroundColor: budget.percentUsed > 90 ? "#ef4444" : budget.percentUsed > 70 ? "#f59e0b" : budget.categoryColor,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
