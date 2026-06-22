"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  room_id: z.string().min(1, "Room is required"),
  batch_id: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  allocation_liters: z.coerce.number().min(0.01, "Allocation must be > 0"),
  actual_consumption_liters: z.coerce.number().min(0.01, "Consumption must be > 0"),
  source: z.string().min(1, "Source is required"),
  cost_per_liter: z.coerce.number().min(0, "Cost must be >= 0"),
  notes: z.string().optional(),
});

import { waterUsageRepository } from "@/lib/offline/repositories/waterUsageRepository";

export function WaterUsageForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      room_id: "", batch_id: "", date: new Date().toISOString().split("T")[0], 
      allocation_liters: 0, actual_consumption_liters: 0, source: "Main Supply", cost_per_liter: 0, notes: ""
    }
  });

  const selectedRoomId = watch("room_id");

  useEffect(() => {
    Promise.all([
      fetch('/api/rooms').then(res => res.json()),
      fetch('/api/animal-batches').then(res => res.json())
    ]).then(([roomsData, batchesData]) => {
      setRooms(roomsData.data || []);
      setBatches(batchesData.data || []);
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        room_id: initialData.room_id || "",
        batch_id: initialData.batch_id || "",
        date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        allocation_liters: initialData.allocation_liters || 0,
        actual_consumption_liters: initialData.actual_consumption_liters || 0,
        source: initialData.source || "Main Supply",
        cost_per_liter: initialData.cost_per_liter || 0,
        notes: initialData.notes || "",
      });
    } else {
      reset({ 
        room_id: "", batch_id: "", date: new Date().toISOString().split("T")[0], 
        allocation_liters: 0, actual_consumption_liters: 0, source: "Main Supply", cost_per_liter: 0, notes: "" 
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await waterUsageRepository.update(initialData.id, data);
      } else {
        await waterUsageRepository.create(data);
      }
      
      toast.success(initialData ? "Water usage updated!" : "Water usage recorded!");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBatches = batches.filter(b => b.room_id === selectedRoomId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{initialData ? "Edit Water Usage" : "Record Water Usage"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
          <Input type="date" {...register("date")} error={errors.date?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room <span className="text-red-500">*</span></label>
          <select {...register("room_id")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
            <option value="">Select Room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch (Optional)</label>
          <select {...register("batch_id")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm" disabled={!selectedRoomId}>
            <option value="">Select Batch</option>
            {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source <span className="text-red-500">*</span></label>
          <Input {...register("source")} placeholder="e.g. Main Supply, Borewell" error={errors.source?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allocation (Liters) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("allocation_liters")} error={errors.allocation_liters?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consumption (Liters) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("actual_consumption_liters")} error={errors.actual_consumption_liters?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Liter (₹) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.001" {...register("cost_per_liter")} error={errors.cost_per_liter?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Input {...register("notes")} placeholder="Optional..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : (initialData ? "Update Water Usage" : "Record Usage")}
        </Button>
      </div>
    </form>
  );
}
