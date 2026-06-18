"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const schema = z.object({
  animal_category_id: z.string().uuid("Category is required"),
  stage_name: z.string().min(1, "Stage name is required"),
  expected_duration_days: z.coerce.number().min(1, "Duration must be > 0"),
  expected_weight: z.coerce.number().min(0.01, "Weight must be > 0"),
  display_order: z.coerce.number().min(0),
});

export function StageForm({ farmId, onSuccess, initialData, onCancel }: { farmId: string; onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      animal_category_id: "",
      stage_name: "",
      expected_duration_days: 0,
      expected_weight: 0,
      display_order: 0,
    }
  });

  useEffect(() => {
    fetch(`/api/animal-categories?farmId=${farmId}`)
      .then(res => res.json())
      .then(data => setCategories(data.data || []));
  }, [farmId]);

  useEffect(() => {
    if (initialData) {
      reset({
        animal_category_id: initialData.animal_category_id || "",
        stage_name: initialData.stage_name || "",
        expected_duration_days: initialData.expected_duration_days || 0,
        expected_weight: initialData.expected_weight || 0,
        display_order: initialData.display_order || 0,
      });
    } else {
      reset({
        animal_category_id: "",
        stage_name: "",
        expected_duration_days: 0,
        expected_weight: 0,
        display_order: 0,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const url = initialData ? `/api/stages/${initialData.id}` : "/api/stages";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, farm_id: farmId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }
      toast.success(initialData ? "Stage updated!" : "Stage saved!");
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
      <h2 className="text-lg font-semibold text-gray-800">{initialData ? "Edit Stage" : "Add New Stage"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select required {...register("animal_category_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">Select Category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.animal_category_id && <p className="text-red-500 text-xs mt-1">{errors.animal_category_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name <span className="text-red-500">*</span></label>
          <input required {...register("stage_name")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Grower" />
          {errors.stage_name && <p className="text-red-500 text-xs mt-1">{errors.stage_name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days) <span className="text-red-500">*</span></label>
          <input required type="number" {...register("expected_duration_days")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.expected_duration_days && <p className="text-red-500 text-xs mt-1">{errors.expected_duration_days.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Weight (kg) <span className="text-red-500">*</span></label>
          <input required type="number" step="0.01" {...register("expected_weight")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.expected_weight && <p className="text-red-500 text-xs mt-1">{errors.expected_weight.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
          <input required type="number" {...register("display_order")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.display_order && <p className="text-red-500 text-xs mt-1">{errors.display_order.message as string}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        {initialData && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? "Saving..." : (initialData ? "Update Stage" : "Save Stage")}
        </button>
      </div>
    </form>
  );
}
