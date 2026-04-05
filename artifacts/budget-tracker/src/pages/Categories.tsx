import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCategories, useCreateCategory, useDeleteCategory, getListCategoriesQueryKey
} from "@workspace/api-client-react";
import { Plus, Trash2, Tag } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  type: z.enum(["income", "expense", "both"]),
});
type FormData = z.infer<typeof schema>;

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#6366f1",
];

export default function Categories() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: categories, isLoading } = useListCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "expense", color: "#10b981", icon: "circle" },
  });

  const selectedColor = watch("color");
  const invalidate = () => qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({ data });
    invalidate();
    reset({ type: "expense", color: "#10b981", icon: "circle" });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? This may affect existing transactions.")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const incomeCategories = categories?.filter(c => c.type === "income" || c.type === "both") ?? [];
  const expenseCategories = categories?.filter(c => c.type === "expense" || c.type === "both") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize your income and expenses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">New Category</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
              <input {...register("name")} placeholder="e.g. Food & Dining" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
              <select {...register("type")} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Icon label</label>
              <input {...register("icon")} placeholder="e.g. food, car, home" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("color", c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow: selectedColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
                    }}
                  />
                ))}
                <input {...register("color")} type="color" className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                Save Category
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground p-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="font-semibold text-sm">Income Categories ({incomeCategories.length})</h2>
            </div>
            {incomeCategories.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No income categories</div>
            ) : (
              <div className="divide-y divide-border">
                {incomeCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: cat.color }}>
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{cat.type}</span>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expense Categories */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="font-semibold text-sm">Expense Categories ({expenseCategories.length})</h2>
            </div>
            {expenseCategories.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No expense categories</div>
            ) : (
              <div className="divide-y divide-border">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: cat.color }}>
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{cat.type}</span>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
