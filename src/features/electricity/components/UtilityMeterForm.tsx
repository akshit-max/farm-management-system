"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { roomRepository } from "@/lib/offline/repositories/roomRepository";
import { utilityMeterRepository } from "@/lib/offline/repositories/utilityMeterRepository";

const schema = z.object({
  meter_name: z.string().min(1, "Meter name is required"),
  meter_number: z.string().min(1, "Meter number is required"),
  room_id: z.string().min(1, "Linked Room is required"),
  status: z.string().default("ACTIVE"),
});

export function UtilityMeterForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      meter_name: "", meter_number: "", room_id: "", status: "ACTIVE"
    }
  });

  useEffect(() => {
    roomRepository.getAll().then(data => setRooms(data || []));
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        meter_name: initialData.meter_name || "",
        meter_number: initialData.meter_number || "",
        room_id: initialData.room_id || "",
        status: initialData.status || "ACTIVE",
      });
    } else {
      reset({ meter_name: "", meter_number: "", room_id: "", status: "ACTIVE" });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await utilityMeterRepository.update(initialData.id, data);
        toast.success("Meter updated!");
      } else {
        await utilityMeterRepository.create(data);
        toast.success("Meter created!");
      }
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{initialData ? "Edit Utility Meter" : "Add Utility Meter"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meter Name <span className="text-red-500">*</span></label>
          <Input {...register("meter_name")} placeholder="Main Barn AC Meter" error={errors.meter_name?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number <span className="text-red-500">*</span></label>
          <Input {...register("meter_number")} placeholder="MTR-89422" error={errors.meter_number?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked Room <span className="text-red-500">*</span></label>
          <select {...register("room_id")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
            <option value="" disabled>Select Room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register("status")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : (initialData ? "Update Meter" : "Add Meter")}
        </Button>
      </div>
    </form>
  );
}
