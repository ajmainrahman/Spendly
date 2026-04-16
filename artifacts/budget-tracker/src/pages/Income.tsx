import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListIncome, useCreateIncome, useUpdateIncome, useDeleteIncome,
  useListCategories, getListIncomeQueryKey, getListCategoriesQueryKey
} from "@workspace/api-client-react";
import { formatBDT, formatDate, getCurrentMonth } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";

const schema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.coerce.number().positive("Category is required"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Income() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: income, isLoading } = useListIncome({ month });
  const { data: categories } = useListCategories();
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListIncomeQueryKey() });
  };

  const onSubmit = async (data: FormData) => {
    const currentEditId = editId;
    reset();
    setShowForm(false);
    setEditId(null);
    if (currentEditId !== null) {
      await updateMutation.mutateAsync({ id: currentEditId, data: { ...data, amount: data.amount, notes: data.notes || undefined } });
    } else {
      await createMutation.mutateAsync({ data: { ...data, amount: data.amount, notes: data.notes || undefined } });
    }
    invalidate();
  };

  const startEdit = (entry: NonNullable<typeof income>[0]) => {
    reset({
      source: entry.source,
      amount: entry.amount,
      date: entry.date,
      categoryId: entry.categoryId,
      notes: entry.notes || "",
    });
    setEditId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this income entry?")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const incomeCategories = categories?.filter(c => c.type === "income" || c.type === "both") ?? [];
  const totalIncome = income?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Income</h1>
          <p className="text-sm text-muted-foreground">Track your income sources</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker month={month} onChange={setMonth} />
          <button
            onClick={() => { reset({ date: new Date().toISOString().slice(0, 10) }); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Income
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Total Income This Month</div>
          <div className="text-2xl font-bold text-emerald-600">{formatBDT(totalIncome)}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{editId ? "Edit Income" : "Add Income"}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Source</label>
              <input {...register("source")} placeholder="e.g. Monthly Salary" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.source && <p className="text-xs text-destructive mt-1">{errors.source.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Amount (৳)</label>
              <input {...register("amount")} type="number" step="0.01" placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
              <input {...register("date")} type="date" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select {...register("categoryId")} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select category</option>
                {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (optional)</label>
              <textarea {...register("notes")} rows={2} placeholder="Additional notes..." className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                {editId ? "Update" : "Save"} Income
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset(); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !income || income.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No income entries for this month.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {income.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{entry.source}</div>
                  <div className="text-xs text-muted-foreground">{entry.categoryName} · {formatDate(entry.date)}</div>
                  {entry.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{entry.notes}</div>}
                </div>
                <div className="text-emerald-600 font-semibold text-sm">{formatBDT(entry.amount)}</div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => startEdit(entry)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
