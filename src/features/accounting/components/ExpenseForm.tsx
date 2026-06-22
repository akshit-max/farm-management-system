"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useEffect } from "react";
import { expenseRepository } from "@/lib/offline/repositories/expenseRepository";

const schema = z.object({
  expense_date: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  notes: z.string().optional()
});

const CATEGORIES = ["Feed", "Water", "Electricity", "Veterinary", "Labor", "Maintenance", "Transport", "Miscellaneous"];

export function ExpenseForm({ initialData, onSuccess, onCancel }: { initialData?: any; onSuccess: () => void; onCancel: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      category: "Miscellaneous",
      description: "",
      amount: 0,
      notes: ""
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        expense_date: new Date(initialData.expense_date).toISOString().split('T')[0],
        category: initialData.category,
        description: initialData.description,
        amount: initialData.amount,
        notes: initialData.notes || ""
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (initialData) {
        await expenseRepository.update(initialData.id, data);
        toast.success("Expense updated successfully");
      } else {
        const result = await expenseRepository.create(data);
        if (result?.offline) {
          toast.success("Saved offline. Will sync when online.");
        } else {
          toast.success("Expense created successfully");
        }
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{initialData ? "Edit Expense" : "Add Expense"}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
          <Input type="date" {...register("expense_date")} error={errors.expense_date?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select
            {...register("category")}
            className={`w-full h-10 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${errors.category ? "border-red-500" : "border-gray-200"}`}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("amount")} error={errors.amount?.message as string} />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
          <Input {...register("description")} placeholder="e.g. Monthly salary for 3 workers" error={errors.description?.message as string} />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Input {...register("notes")} placeholder="Optional notes..." error={errors.notes?.message as string} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>{initialData ? "Save Changes" : "Record Expense"}</Button>
      </div>
    </form>
  );
}
