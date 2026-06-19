"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useEffect } from "react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  cost_basis: z.coerce.number().min(0, "Cost basis must be >= 0"),
});

export function InventoryForm({ initialData, onSuccess, onCancel }: { initialData?: any; onSuccess: () => void; onCancel: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "Meat",
      quantity: 0,
      unit: "kg",
      cost_basis: 0,
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        category: initialData.category,
        quantity: initialData.quantity,
        unit: initialData.unit,
        cost_basis: initialData.cost_basis,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    try {
      const url = initialData ? `/api/inventory-items/${initialData.id}` : `/api/inventory-items`;
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save inventory item");
      }

      toast.success(`Inventory item ${initialData ? "updated" : "created"} successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{initialData ? "Edit Inventory Item" : "Add Inventory Item"}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
          <Input {...register("name")} placeholder="e.g. Whole Chicken" error={errors.name?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <Input {...register("category")} placeholder="e.g. Meat" error={errors.category?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("quantity")} error={errors.quantity?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit <span className="text-red-500">*</span></label>
          <Input {...register("unit")} placeholder="e.g. kg" error={errors.unit?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Basis (₹) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("cost_basis")} error={errors.cost_basis?.message as string} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>{initialData ? "Save Changes" : "Create Item"}</Button>
      </div>
    </form>
  );
}
