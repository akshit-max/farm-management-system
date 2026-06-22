"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  meter_id: z.string().min(1, "Meter is required"),
  room_id: z.string().min(1, "Room is required"),
  date: z.string().min(1, "Date is required"),
  units_consumed: z.coerce.number().min(0.01, "Units must be > 0"),
  cost_per_unit: z.coerce.number().min(0, "Cost must be >= 0"),
  equipment_type: z.string().min(1, "Equipment type is required"),
  notes: z.string().optional(),
});

import { electricityUsageRepository } from "@/lib/offline/repositories/electricityUsageRepository";
import { roomRepository } from "@/lib/offline/repositories/roomRepository";
import { utilityMeterRepository } from "@/lib/offline/repositories/utilityMeterRepository";

export function ElectricityUsageForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [meters, setMeters] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      meter_id: "", room_id: "", date: new Date().toISOString().split("T")[0], 
      units_consumed: 0, cost_per_unit: 0, equipment_type: "General/Mixed", notes: ""
    }
  });

  const selectedMeterId = watch("meter_id");

  useEffect(() => {
    Promise.all([
      roomRepository.getAll(),
      utilityMeterRepository.getAll()
    ]).then(([roomsData, metersData]) => {
      setRooms(roomsData || []);
      setMeters(metersData || []);
    });
  }, []);

  // Auto-select room if the chosen meter is hard-linked to a specific room
  useEffect(() => {
    if (selectedMeterId) {
      const meter = meters.find(m => m.id === selectedMeterId);
      if (meter && meter.room_id) {
        reset((values) => ({ ...values, room_id: meter.room_id }));
      }
    }
  }, [selectedMeterId, meters, reset]);

  useEffect(() => {
    if (initialData) {
      reset({
        meter_id: initialData.meter_id || "",
        room_id: initialData.room_id || "",
        date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        units_consumed: initialData.units_consumed || 0,
        cost_per_unit: initialData.cost_per_unit || 0,
        equipment_type: initialData.equipment_type || "General/Mixed",
        notes: initialData.notes || "",
      });
    } else {
      reset({ 
        meter_id: "", room_id: "", date: new Date().toISOString().split("T")[0], 
        units_consumed: 0, cost_per_unit: 0, equipment_type: "General/Mixed", notes: "" 
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const meter = meters.find(m => m.id === data.meter_id);
      const room = rooms.find(r => r.id === data.room_id);
      
      const enrichedData = {
        ...data,
        total_cost: Number(data.units_consumed) * Number(data.cost_per_unit),
        meter: meter ? { meter_name: meter.meter_name } : null,
        room: room ? { name: room.name } : null
      };

      if (initialData) {
        await electricityUsageRepository.update(initialData.id, enrichedData);
      } else {
        await electricityUsageRepository.create(enrichedData);
      }
      
      toast.success(initialData ? "Electricity usage updated!" : "Electricity usage recorded!");
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
      <h2 className="text-lg font-bold text-gray-800">{initialData ? "Edit Electricity Usage" : "Record Electricity Usage"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
          <Input type="date" {...register("date")} error={errors.date?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meter <span className="text-red-500">*</span></label>
          <select {...register("meter_id")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
            <option value="">Select Meter</option>
            {meters.map(m => <option key={m.id} value={m.id}>{m.meter_name} ({m.meter_number})</option>)}
          </select>
          {errors.meter_id && <p className="text-red-500 text-xs mt-1">{errors.meter_id.message as string}</p>}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type <span className="text-red-500">*</span></label>
          <select {...register("equipment_type")} className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
            <option value="General/Mixed">General/Mixed</option>
            <option value="HVAC/Cooling">HVAC/Cooling</option>
            <option value="Heating">Heating</option>
            <option value="Lighting">Lighting</option>
            <option value="Processing/Machinery">Processing/Machinery</option>
          </select>
          {errors.equipment_type && <p className="text-red-500 text-xs mt-1">{errors.equipment_type.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Units Consumed (kWh) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.01" {...register("units_consumed")} error={errors.units_consumed?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit (₹) <span className="text-red-500">*</span></label>
          <Input type="number" step="0.001" {...register("cost_per_unit")} error={errors.cost_per_unit?.message as string} />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Input {...register("notes")} placeholder="Optional details about this usage cycle..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : (initialData ? "Update Usage" : "Record Usage")}
        </Button>
      </div>
    </form>
  );
}
