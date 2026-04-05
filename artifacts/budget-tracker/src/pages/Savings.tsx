import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal,
  useAddSavingsContribution, getListSavingsGoalsQueryKey
} from "@workspace/api-client-react";
import { formatBDT, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, Target, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  currentAmount: z.coerce.number().min(0, "Cannot be negative"),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});
type GoalFormData = z.infer<typeof goalSchema>;

const contributionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
});
type ContributionFormData = z.infer<typeof contributionSchema>;

export default function Savings() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [contributionId, setContributionId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: goals, isLoading } = useListSavingsGoals();
  const createMutation = useCreateSavingsGoal();
  const updateMutation = useUpdateSavingsGoal();
  const deleteMutation = useDeleteSavingsGoal();
  const addContributionMutation = useAddSavingsContribution();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { currentAmount: 0 },
  });

  const { register: regC, handleSubmit: handleC, reset: resetC, formState: { errors: errC } } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey() });

  const onSubmitGoal = async (data: GoalFormData) => {
    if (editId !== null) {
      await updateMutation.mutateAsync({ id: editId, data: { ...data, targetAmount: data.targetAmount, currentAmount: data.currentAmount, deadline: data.deadline || undefined, notes: data.notes || undefined } });
    } else {
      await createMutation.mutateAsync({ data: { ...data, targetAmount: data.targetAmount, currentAmount: data.currentAmount, deadline: data.deadline || undefined, notes: data.notes || undefined } });
    }
    invalidate();
    reset({ currentAmount: 0 });
    setShowForm(false);
    setEditId(null);
  };

  const onSubmitContribution = async (data: ContributionFormData) => {
    if (contributionId === null) return;
    await addContributionMutation.mutateAsync({ id: contributionId, data });
    invalidate();
    resetC();
    setContributionId(null);
  };

  const startEdit = (goal: NonNullable<typeof goals>[0]) => {
    reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline || "",
      notes: goal.notes || "",
    });
    setEditId(goal.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this savings goal?")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const totalTarget = goals?.reduce((s, g) => s + g.targetAmount, 0) ?? 0;
  const totalSaved = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">Track your financial milestones</p>
        </div>
        <button
          onClick={() => { reset({ currentAmount: 0 }); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Saved</div>
          <div className="text-xl font-bold text-emerald-600">{formatBDT(totalSaved)}</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Target</div>
          <div className="text-xl font-bold">{formatBDT(totalTarget)}</div>
        </div>
      </div>

      {/* Goal Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{editId ? "Edit Goal" : "New Savings Goal"}</h2>
          <form onSubmit={handleSubmit(onSubmitGoal)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Goal Name</label>
              <input {...register("name")} placeholder="e.g. Emergency Fund" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Target Amount (৳)</label>
              <input {...register("targetAmount")} type="number" step="0.01" placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.targetAmount && <p className="text-xs text-destructive mt-1">{errors.targetAmount.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Current Amount (৳)</label>
              <input {...register("currentAmount")} type="number" step="0.01" placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.currentAmount && <p className="text-xs text-destructive mt-1">{errors.currentAmount.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Deadline (optional)</label>
              <input {...register("deadline")} type="date" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (optional)</label>
              <input {...register("notes")} placeholder="Brief description..." className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                {editId ? "Update" : "Create"} Goal
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset({ currentAmount: 0 }); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contribution Form */}
      {contributionId !== null && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Add Contribution</h2>
          <form onSubmit={handleC(onSubmitContribution)} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Amount (৳)</label>
              <input {...regC("amount")} type="number" step="0.01" placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errC.amount && <p className="text-xs text-destructive mt-1">{errC.amount.message}</p>}
            </div>
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
              Add
            </button>
            <button type="button" onClick={() => { setContributionId(null); resetC(); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 bg-card border border-card-border rounded-xl p-8 text-center text-muted-foreground">Loading...</div>
        ) : !goals || goals.length === 0 ? (
          <div className="col-span-2 bg-card border border-card-border rounded-xl p-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No savings goals yet. Create your first goal!</p>
          </div>
        ) : goals.map(goal => (
          <div key={goal.id} className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{goal.name}</h3>
                {goal.notes && <p className="text-xs text-muted-foreground mt-0.5">{goal.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setContributionId(goal.id); setShowForm(false); }} className="p-1.5 rounded-md hover:bg-emerald-50 transition-colors" title="Add contribution">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                </button>
                <button onClick={() => startEdit(goal)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{formatBDT(goal.currentAmount)} saved</span>
                <span>Target: {formatBDT(goal.targetAmount)}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(goal.percentComplete, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={cn("font-semibold", goal.percentComplete >= 100 ? "text-emerald-600" : "text-primary")}>
                {goal.percentComplete}% complete
              </span>
              {goal.deadline && (
                <span className="text-muted-foreground">Due: {formatDate(goal.deadline)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
