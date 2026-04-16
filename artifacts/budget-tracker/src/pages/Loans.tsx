import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLoans,
  useCreateLoan,
  useUpdateLoan,
  useDeleteLoan,
  getListLoansQueryKey,
} from "@workspace/api-client-react";
import { formatBDT, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, HandCoins, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const schema = z.object({
  lenderName: z.string().min(1, "Lender name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  borrowedDate: z.string().min(1, "Date borrowed is required"),
  deadline: z.string().min(1, "Repayment deadline is required"),
  notes: z.string().optional(),
  isPaid: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

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

function daysUntil(deadline: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  return `${diff}d left`;
}

export default function Loans() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: loans, isLoading } = useListLoans();
  const createMutation = useCreateLoan();
  const updateMutation = useUpdateLoan();
  const deleteMutation = useDeleteLoan();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      borrowedDate: new Date().toISOString().slice(0, 10),
      isPaid: false,
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListLoansQueryKey() });

  const onSubmit = async (data: FormData) => {
    const currentEditId = editId;
    reset();
    setShowForm(false);
    setEditId(null);
    const payload = {
      lenderName: data.lenderName,
      amount: data.amount,
      borrowedDate: data.borrowedDate,
      deadline: data.deadline,
      notes: data.notes || undefined,
    };
    if (currentEditId !== null) {
      await updateMutation.mutateAsync({
        id: currentEditId,
        data: { ...payload, isPaid: data.isPaid ?? false },
      });
    } else {
      await createMutation.mutateAsync({ data: payload });
    }
    invalidate();
  };

  const startEdit = (loan: NonNullable<typeof loans>[0]) => {
    reset({
      lenderName: loan.lenderName,
      amount: loan.amount,
      borrowedDate: loan.borrowedDate,
      deadline: loan.deadline,
      notes: loan.notes || "",
      isPaid: loan.isPaid,
    });
    setEditId(loan.id);
    setShowForm(true);
  };

  const togglePaid = async (loan: NonNullable<typeof loans>[0]) => {
    await updateMutation.mutateAsync({
      id: loan.id,
      data: {
        lenderName: loan.lenderName,
        amount: loan.amount,
        borrowedDate: loan.borrowedDate,
        deadline: loan.deadline,
        notes: loan.notes || undefined,
        isPaid: !loan.isPaid,
      },
    });
    invalidate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this loan record?")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const totalOwed = loans?.filter(l => !l.isPaid).reduce((s, l) => s + l.amount, 0) ?? 0;
  const totalPaid = loans?.filter(l => l.isPaid).reduce((s, l) => s + l.amount, 0) ?? 0;
  const overdueCount = loans?.filter(l => deadlineStatus(l.deadline, l.isPaid) === "overdue").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-sm text-muted-foreground">Track money you've borrowed</p>
        </div>
        <button
          onClick={() => {
            reset({ borrowedDate: new Date().toISOString().slice(0, 10), isPaid: false });
            setEditId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Loan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <HandCoins className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Outstanding</div>
            <div className="text-xl font-bold text-red-500">{formatBDT(totalOwed)}</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Repaid</div>
            <div className="text-xl font-bold text-emerald-600">{formatBDT(totalPaid)}</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Overdue Loans</div>
            <div className="text-xl font-bold text-amber-500">{overdueCount}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{editId ? "Edit Loan" : "Add Loan"}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Lender Name
              </label>
              <input
                {...register("lenderName")}
                placeholder="e.g. Rahul, Friend, Bank"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.lenderName && (
                <p className="text-xs text-destructive mt-1">{errors.lenderName.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Amount (৳)
              </label>
              <input
                {...register("amount")}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.amount && (
                <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Date Borrowed
              </label>
              <input
                {...register("borrowedDate")}
                type="date"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.borrowedDate && (
                <p className="text-xs text-destructive mt-1">{errors.borrowedDate.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Repayment Deadline
              </label>
              <input
                {...register("deadline")}
                type="date"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.deadline && (
                <p className="text-xs text-destructive mt-1">{errors.deadline.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Notes (optional)
              </label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Additional notes..."
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            {editId !== null && (
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  {...register("isPaid")}
                  type="checkbox"
                  id="isPaid"
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                  Mark as repaid
                </label>
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                {editId ? "Update Loan" : "Save Loan"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); reset(); }}
                className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loan list */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !loans || loans.length === 0 ? (
          <div className="p-8 text-center">
            <HandCoins className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No loans recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {loans.map(loan => {
              const status = deadlineStatus(loan.deadline, loan.isPaid);
              return (
                <div
                  key={loan.id}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${loan.isPaid ? "opacity-60" : ""}`}
                >
                  <button
                    onClick={() => togglePaid(loan)}
                    title={loan.isPaid ? "Mark as unpaid" : "Mark as repaid"}
                    className="shrink-0"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 transition-colors ${loan.isPaid ? "text-emerald-500" : "text-muted-foreground/40 hover:text-emerald-400"}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${loan.isPaid ? "line-through text-muted-foreground" : ""}`}>
                      {loan.lenderName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Borrowed: {formatDate(loan.borrowedDate)} · Due: {formatDate(loan.deadline)}
                    </div>
                    {loan.notes && (
                      <div className="text-xs text-muted-foreground italic mt-0.5">{loan.notes}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-semibold text-sm ${loan.isPaid ? "text-muted-foreground" : "text-red-500"}`}>
                      {formatBDT(loan.amount)}
                    </div>
                    {!loan.isPaid && (
                      <div
                        className={`text-xs font-medium mt-0.5 ${
                          status === "overdue"
                            ? "text-red-500"
                            : status === "soon"
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {status === "overdue" && <span className="inline-flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> {daysUntil(loan.deadline)}</span>}
                        {status === "soon" && <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {daysUntil(loan.deadline)}</span>}
                        {status === "ok" && <span>{daysUntil(loan.deadline)}</span>}
                      </div>
                    )}
                    {loan.isPaid && (
                      <div className="text-xs text-emerald-600 font-medium mt-0.5">Repaid</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(loan)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(loan.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
