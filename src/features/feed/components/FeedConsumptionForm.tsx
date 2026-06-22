"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const schema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  feed_type_id: z.string().min(1, "Feed type is required"),
  date: z.string().min(1, "Date is required"),
  quantity_kg: z.coerce.number().min(0.01, "Quantity must be > 0"),
  cost: z.coerce.number().min(0, "Cost must be >= 0"),
  notes: z.string().optional(),
});

import { feedConsumptionRepository } from "@/lib/offline/repositories/feedConsumptionRepository";

export function FeedConsumptionForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [feedTypes, setFeedTypes] = useState<any[]>([]);
  const [selectedFeedType, setSelectedFeedType] = useState<any>(null);
  const [offlineAdjustments, setOfflineAdjustments] = useState<Record<string, number>>({});

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      batch_id: "", feed_type_id: "", date: new Date().toISOString().split('T')[0], quantity_kg: 0, cost: 0, notes: ""
    }
  });

  const watchFeedTypeId = watch("feed_type_id");
  const watchQuantity = watch("quantity_kg");

  const loadData = async () => {
    try {
      const [bRes, fRes] = await Promise.all([
        fetch(`/api/animal-batches`),
        fetch(`/api/feed-types`)
      ]);
      const [bData, fData] = await Promise.all([
        bRes.json(),
        fRes.json()
      ]);
      setBatches(bData.data || []);
      const fList = fData.data || [];
      setFeedTypes(fList);

      const adjs: Record<string, number> = {};
      if (!navigator.onLine) {
        for (const ft of fList) {
           const a = await feedConsumptionRepository.getOfflineFeedAdjustments(ft.id);
           adjs[ft.id] = (a.pending || 0) - (a.deleted || 0) + (a.updatedDelta || 0);
        }
      }
      setOfflineAdjustments(adjs);
    } catch (e) {
      console.warn("Error loading form data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAdjustedStock = (feed: any) => {
    if (!feed) return 0;
    const adj = offlineAdjustments[feed.id] || 0;
    return feed.stock_quantity - adj;
  };

  useEffect(() => {
    if (watchFeedTypeId) {
      const feed = feedTypes.find(f => f.id === watchFeedTypeId);
      setSelectedFeedType(feed);
      if (feed && watchQuantity) {
        setValue("cost", parseFloat((feed.cost_per_kg * Number(watchQuantity)).toFixed(2)));
      }
    } else {
      setSelectedFeedType(null);
      setValue("cost", 0);
    }
  }, [watchFeedTypeId, watchQuantity, feedTypes, setValue]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const feed = feedTypes.find(f => f.id === data.feed_type_id);
      const currentStock = getAdjustedStock(feed);
      if (data.quantity_kg > currentStock) {
         throw new Error(`Insufficient stock. Projected available: ${currentStock} kg`);
      }

      await feedConsumptionRepository.create(data);
      
      toast.success("Feed consumption recorded!");
      reset({ batch_id: "", feed_type_id: "", date: new Date().toISOString().split('T')[0], quantity_kg: 0, cost: 0, notes: "" });
      onSuccess();
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Record Feed Consumption</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
          <input type="date" {...register("date")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Animal Batch <span className="text-red-500">*</span></label>
          <select {...register("batch_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">Select Batch...</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} - {b.animal_category.name}</option>)}
          </select>
          {errors.batch_id && <p className="text-red-500 text-xs mt-1">{errors.batch_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feed Type <span className="text-red-500">*</span></label>
          <select {...register("feed_type_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">Select Feed...</option>
            {feedTypes.map(f => {
              const adjStock = getAdjustedStock(f);
              return (
                <option key={f.id} value={f.id} disabled={adjStock <= 0}>
                  {f.name} (Projected Stock: {adjStock}kg)
                </option>
              );
            })}
          </select>
          {errors.feed_type_id && <p className="text-red-500 text-xs mt-1">{errors.feed_type_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("quantity_kg")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
          {errors.quantity_kg && <p className="text-red-500 text-xs mt-1">{errors.quantity_kg.message as string}</p>}
          {selectedFeedType && <p className="text-xs text-gray-500 mt-1">Available: {getAdjustedStock(selectedFeedType)} kg</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("cost")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" readOnly />
          <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register("notes")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional details..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {isLoading ? "Recording..." : "Record Consumption"}
        </button>
      </div>
    </form>
  );
}
