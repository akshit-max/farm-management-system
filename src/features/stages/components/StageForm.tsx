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

export function StageForm({ farmId, onSuccess }: { farmId: string; onSuccess: () => void }) {
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

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, farm_id: farmId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }
      toast.success("Stage saved!");
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
      <h2 className="text-lg font-semibold text-gray-800">Add New Stage</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select {...register("animal_category_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">Select Category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.animal_category_id && <p className="text-red-500 text-xs mt-1">{errors.animal_category_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name</label>
          <input {...register("stage_name")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Grower" />
          {errors.stage_name && <p className="text-red-500 text-xs mt-1">{errors.stage_name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
          <input type="number" {...register("expected_duration_days")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.expected_duration_days && <p className="text-red-500 text-xs mt-1">{errors.expected_duration_days.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Weight (kg)</label>
          <input type="number" step="0.01" {...register("expected_weight")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.expected_weight && <p className="text-red-500 text-xs mt-1">{errors.expected_weight.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
          <input type="number" {...register("display_order")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.display_order && <p className="text-red-500 text-xs mt-1">{errors.display_order.message as string}</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? "Saving..." : "Save Stage"}
        </button>
      </div>
    </form>
  );
}
