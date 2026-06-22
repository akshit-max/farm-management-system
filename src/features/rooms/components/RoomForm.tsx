"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { stageRepository } from "@/lib/offline/repositories/stageRepository";
import { animalCategoryRepository } from "@/lib/offline/repositories/animalCategoryRepository";
import { roomRepository } from "@/lib/offline/repositories/roomRepository";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.coerce.number().min(1, "Capacity must be > 0"),
});

export function RoomForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", capacity: 100 }
  });

  useEffect(() => {
    async function loadStages() {
      try {
        const allStages = await stageRepository.getAll();
        const allCategories = await animalCategoryRepository.getAll();
        const enrichedStages = allStages.map((stage: any) => {
          if (!stage.animal_category && stage.animal_category_id) {
            const category = allCategories.find((c: any) => c.id === stage.animal_category_id);
            return { ...stage, animal_category: category ? { name: category.name } : null };
          }
          return stage;
        });
        setStages(enrichedStages);
      } catch (err) {
        console.error("Failed to load stages", err);
      }
    }
    loadStages();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        capacity: initialData.capacity || 100,
      });
      // allowed_stages is stored as a comma-separated string in DB, parse to array
      const raw = initialData.allowed_stages;
      if (Array.isArray(raw)) {
        setSelectedStages(raw);
      } else if (typeof raw === "string" && raw.length > 0) {
        setSelectedStages(raw.split(",").map((s: string) => s.trim()).filter(Boolean));
      } else {
        setSelectedStages([]);
      }
    } else {
      reset({ name: "", capacity: 100 });
      setSelectedStages([]);
    }
  }, [initialData, reset]);

  const toggleStage = (stageId: string) => {
    setSelectedStages(prev => prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]);
  };

  const onSubmit = async (data: any) => {
    if (selectedStages.length === 0) {
      toast.error("Please select at least one allowed stage.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = { ...data, allowed_stages: selectedStages.join(",") };
      if (initialData) {
        await roomRepository.update(initialData.id, payload);
        toast.success("Room updated!");
      } else {
        await roomRepository.create(payload);
        toast.success("Room saved!");
      }
      reset();
      setSelectedStages([]);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">{initialData ? "Edit Room" : "Add New Room"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Name <span className="text-red-500">*</span></label>
          <input required {...register("name")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Barn A" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Max Animals) <span className="text-red-500">*</span></label>
          <input required type="number" {...register("capacity")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message as string}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Stages <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap gap-2">
          {stages.map(stage => (
            <button
              type="button"
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedStages.includes(stage.id)
                  ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {stage.animal_category?.name} - {stage.stage_name}
            </button>
          ))}
          {stages.length === 0 && <span className="text-sm text-gray-500">No stages found. Create stages first.</span>}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        {initialData && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? "Saving..." : (initialData ? "Update Room" : "Save Room")}
        </button>
      </div>
    </form>
  );
}
