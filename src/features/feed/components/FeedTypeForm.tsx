"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Feed name is required"),
  supplier_id: z.string().optional().nullable(),
  cost_per_kg: z.coerce.number().min(0, "Cost must be >= 0"),
  stock_quantity: z.coerce.number().min(0, "Stock must be >= 0"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be >= 0"),
  notes: z.string().optional(),
});

export function FeedTypeForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", supplier_id: "", cost_per_kg: 0, stock_quantity: 0, reorder_level: 0, notes: ""
    }
  });

  useEffect(() => {
    import("@/lib/offline/repositories/supplierRepository").then(({ supplierRepository }) => {
      supplierRepository.getAll().then(all => setSuppliers(all));
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        supplier_id: initialData.supplier_id || "",
        cost_per_kg: initialData.cost_per_kg || 0,
        stock_quantity: initialData.stock_quantity || 0,
        reorder_level: initialData.reorder_level || 0,
        notes: initialData.notes || "",
      });
    } else {
      reset({ name: "", supplier_id: "", cost_per_kg: 0, stock_quantity: 0, reorder_level: 0, notes: "" });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const url = initialData ? `/api/feed-types/${initialData.id}` : "/api/feed-types";
      const method = initialData ? "PUT" : "POST";

      const payload = {
        ...data,
        supplier_id: data.supplier_id || null
      };

      console.log("URL:", url);
      console.log("Payload:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      
      toast.success(initialData ? "Feed type updated!" : "Feed type created!");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">{initialData ? "Edit Feed Type" : "Add New Feed Type"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feed Name <span className="text-red-500">*</span></label>
          <input {...register("name")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Layer Mash Phase 1" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select {...register("supplier_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">No Supplier</option>
            {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.company_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit (kg) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("cost_per_kg")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.cost_per_kg && <p className="text-red-500 text-xs mt-1">{errors.cost_per_kg.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock (kg) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("stock_quantity")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.stock_quantity && <p className="text-red-500 text-xs mt-1">{errors.stock_quantity.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level (kg) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("reorder_level")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.reorder_level && <p className="text-red-500 text-xs mt-1">{errors.reorder_level.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register("notes")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional details..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {isLoading ? "Saving..." : (initialData ? "Update Feed" : "Add Feed")}
        </button>
      </div>
    </form>
  );
}
