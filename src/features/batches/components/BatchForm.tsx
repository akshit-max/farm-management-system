"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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

export function BatchForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      batch_number: "", animal_category_id: "", room_id: "", current_stage_id: "",
      arrival_date: new Date().toISOString().split("T")[0],
      quantity: 1, initial_weight: 0, average_weight: 0, cost_per_animal: 0, notes: ""
    }
  });

  const selectedCategory = watch("animal_category_id");
  const selectedRoom = watch("room_id");
  const enteredQuantity = watch("quantity");

  useEffect(() => {
    import("@/lib/offline/repositories/animalCategoryRepository").then(({ animalCategoryRepository }) => {
      animalCategoryRepository.getAll().then(data => setCategories(data || []));
    });
    import("@/lib/offline/repositories/roomRepository").then(({ roomRepository }) => {
      roomRepository.getAll().then(data => setRooms(data || []));
    });
    import("@/lib/offline/repositories/stageRepository").then(({ stageRepository }) => {
      stageRepository.getAll().then(data => setStages(data || []));
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        batch_number: initialData.batch_number || "",
        animal_category_id: initialData.animal_category_id || "",
        room_id: initialData.room_id || "",
        current_stage_id: initialData.current_stage_id || "",
        arrival_date: initialData.arrival_date ? new Date(initialData.arrival_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        quantity: initialData.quantity || 1,
        initial_weight: initialData.initial_weight || 0,
        average_weight: initialData.average_weight || 0,
        cost_per_animal: initialData.cost_per_animal || 0,
        notes: initialData.notes || ""
      });
    } else {
      reset({
        batch_number: "", animal_category_id: "", room_id: "", current_stage_id: "",
        arrival_date: new Date().toISOString().split("T")[0],
        quantity: 1, initial_weight: 0, average_weight: 0, cost_per_animal: 0, notes: ""
      });
    }
  }, [initialData, reset]);

  // Get selected room details for capacity display
  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const roomCapacity = selectedRoomData?.capacity ?? null;
  const roomAllowedStages = selectedRoomData?.allowed_stages ?? "";

  // Filter stages: must match category AND be allowed in selected room
  const allowedStageIds = roomAllowedStages
    ? roomAllowedStages.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const filteredStages = stages.filter(s => {
    const matchesCategory = s.animal_category_id === selectedCategory;
    if (!selectedRoom) return matchesCategory; // no room chosen yet — just filter by category
    if (roomAllowedStages === "*") return matchesCategory; // wildcard — all stages allowed
    return matchesCategory && allowedStageIds.includes(s.id);
  });

  // When room changes, reset stage selection if it's no longer valid
  useEffect(() => {
    const currentStageId = watch("current_stage_id");
    if (currentStageId && filteredStages.length > 0) {
      const stillValid = filteredStages.some(s => s.id === currentStageId);
      if (!stillValid) setValue("current_stage_id", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, selectedCategory]);

  const quantityExceedsCapacity = roomCapacity !== null && Number(enteredQuantity) > roomCapacity;

  const onSubmit = async (data: any) => {
    if (quantityExceedsCapacity) {
      toast.error(`Quantity ${data.quantity} exceeds room capacity of ${roomCapacity}`);
      return;
    }
    setIsLoading(true);
    try {
      const { animalBatchRepository } = await import("@/lib/offline/repositories/animalBatchRepository");
      const payload = { ...data, arrival_date: new Date(data.arrival_date).toISOString() };
      
      if (initialData) {
        await animalBatchRepository.update(initialData.id, payload);
      } else {
        await animalBatchRepository.create(payload);
      }
      toast.success(initialData ? "Batch updated!" : "Batch created!");
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
      <h2 className="text-lg font-semibold text-gray-800">{initialData ? "Edit Animal Batch" : "Create Animal Batch"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Batch Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number <span className="text-red-500">*</span></label>
          <input {...register("batch_number")} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="B-2026-001" />
          {errors.batch_number && <p className="text-red-500 text-xs mt-1">{errors.batch_number.message as string}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select {...register("animal_category_id")} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            <option value="">Select category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.animal_category_id && <p className="text-red-500 text-xs mt-1">{errors.animal_category_id.message as string}</p>}
        </div>

        {/* Room — with capacity info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room <span className="text-red-500">*</span></label>
          <select {...register("room_id")} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            <option value="">Select room...</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
          </select>
          {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id.message as string}</p>}
        </div>

        {/* Stage — filtered by category AND room's allowed_stages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Stage <span className="text-red-500">*</span>
            {selectedRoom && filteredStages.length === 0 && selectedCategory && (
              <span className="ml-2 text-amber-600 text-xs font-normal">⚠ No stages allowed in this room for this category</span>
            )}
          </label>
          <select
            {...register("current_stage_id")}
            disabled={!selectedCategory || !selectedRoom}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">{!selectedCategory ? "Select a category first" : !selectedRoom ? "Select a room first" : "Select stage..."}</option>
            {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
          </select>
          {errors.current_stage_id && <p className="text-red-500 text-xs mt-1">{errors.current_stage_id.message as string}</p>}
        </div>

        {/* Arrival Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date <span className="text-red-500">*</span></label>
          <input type="date" {...register("arrival_date")} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          {errors.arrival_date && <p className="text-red-500 text-xs mt-1">{errors.arrival_date.message as string}</p>}
        </div>

        {/* Quantity — with live capacity warning */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
            {roomCapacity && <span className="ml-2 text-gray-400 text-xs font-normal">Room max: {roomCapacity}</span>}
          </label>
          <input
            type="number"
            min={1}
            max={roomCapacity ?? undefined}
            {...register("quantity")}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${quantityExceedsCapacity ? "border-red-400 bg-red-50" : ""}`}
          />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message as string}</p>}
          {quantityExceedsCapacity && <p className="text-red-500 text-xs mt-1">Exceeds room capacity of {roomCapacity}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Initial Weight (kg)</label>
          <input type="number" step="0.01" min={0} {...register("initial_weight")} className="w-full px-3 py-2 border rounded-md" />
          {errors.initial_weight && <p className="text-red-500 text-xs mt-1">{errors.initial_weight.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Average Weight (kg)</label>
          <input type="number" step="0.01" min={0} {...register("average_weight")} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Animal (₹)</label>
          <input type="number" step="0.01" min={0} {...register("cost_per_animal")} className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea {...register("notes")} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Optional notes..." />
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || quantityExceedsCapacity}
          className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors"
        >
          {isLoading ? "Saving..." : (initialData ? "Update Batch" : "Create Batch")}
        </button>
      </div>
    </form>
  );
}
