"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const schema = z.object({
  batch_number: z.string().min(1, "Batch number is required"),
  animal_category_id: z.string().uuid("Category is required"),
  room_id: z.string().uuid("Room is required"),
  current_stage_id: z.string().uuid("Stage is required"),
  arrival_date: z.string().min(1, "Arrival date is required"),
  quantity: z.coerce.number().min(1, "Quantity must be > 0"),
  initial_weight: z.coerce.number().min(0, "Initial weight must be >= 0"),
  average_weight: z.coerce.number().min(0),
  cost_per_animal: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export function BatchForm({ farmId, onSuccess }: { farmId: string; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      batch_number: "", animal_category_id: "", room_id: "", current_stage_id: "",
      arrival_date: new Date().toISOString().split("T")[0],
      quantity: 0, initial_weight: 0, average_weight: 0, cost_per_animal: 0, notes: ""
    }
  });

  const selectedCategory = watch("animal_category_id");

  useEffect(() => {
    fetch(`/api/animal-categories?farmId=${farmId}`).then(r => r.json()).then(d => setCategories(d.data || []));
    fetch(`/api/rooms?farmId=${farmId}`).then(r => r.json()).then(d => setRooms(d.data || []));
    fetch(`/api/stages?farmId=${farmId}`).then(r => r.json()).then(d => setStages(d.data || []));
  }, [farmId]);

  const filteredStages = stages.filter(s => s.animal_category_id === selectedCategory);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const payload = { ...data, farm_id: farmId, arrival_date: new Date(data.arrival_date).toISOString() };
      const res = await fetch("/api/animal-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Batch created!");
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
      <h2 className="text-lg font-semibold text-gray-800">Create Animal Batch</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
          <input {...register("batch_number")} className="w-full px-3 py-2 border rounded-md" placeholder="B-2026-001" />
          {errors.batch_number && <p className="text-red-500 text-xs mt-1">{errors.batch_number.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select {...register("animal_category_id")} className="w-full px-3 py-2 border rounded-md">
            <option value="">Select...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.animal_category_id && <p className="text-red-500 text-xs mt-1">{errors.animal_category_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
          <select {...register("room_id")} className="w-full px-3 py-2 border rounded-md">
            <option value="">Select...</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
          </select>
          {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Stage</label>
          <select {...register("current_stage_id")} className="w-full px-3 py-2 border rounded-md" disabled={!selectedCategory}>
            <option value="">Select...</option>
            {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
          </select>
          {errors.current_stage_id && <p className="text-red-500 text-xs mt-1">{errors.current_stage_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date</label>
          <input type="date" {...register("arrival_date")} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" {...register("quantity")} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Initial Weight (kg)</label>
          <input type="number" step="0.01" {...register("initial_weight")} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Average Weight (kg)</label>
          <input type="number" step="0.01" {...register("average_weight")} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Animal ($)</label>
          <input type="number" step="0.01" {...register("cost_per_animal")} className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea {...register("notes")} className="w-full px-3 py-2 border rounded-md" rows={2} />
      </div>
      <div className="flex justify-end mt-4">
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? "Saving..." : "Create Batch"}
        </button>
      </div>
    </form>
  );
}
