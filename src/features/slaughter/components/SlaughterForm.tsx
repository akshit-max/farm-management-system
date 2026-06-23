"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const schema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  slaughter_date: z.string().min(1, "Date is required"),
  quantity_slaughtered: z.coerce.number().min(1, "Must be > 0"),
  average_live_weight: z.coerce.number().min(0.01, "Must be > 0"),
  notes: z.string().optional(),
  yield: z.object({
    carcass_weight: z.coerce.number().min(0.01, "Must be > 0"),
    usable_meat_weight: z.coerce.number().min(0.01, "Must be > 0"),
  }),
  waste: z.object({
    bones_weight: z.coerce.number().min(0).default(0),
    fat_weight: z.coerce.number().min(0).default(0),
    organ_weight: z.coerce.number().min(0).default(0),
    waste_weight: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
  }),
  inventory_items: z.array(z.object({
    name: z.string().min(1, "Name required"),
    category: z.string().min(1, "Category required"),
    quantity: z.coerce.number().min(0, "Must be >= 0"),
    unit: z.string().min(1, "Unit required"),
    cost_basis: z.coerce.number().min(0, "Must be >= 0"),
  })).min(1, "At least one inventory item must be generated")
}).refine(data => data.yield.usable_meat_weight <= data.yield.carcass_weight, {
  message: "Usable meat weight cannot exceed carcass weight",
  path: ["yield.usable_meat_weight"]
});

export function SlaughterForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [customModes, setCustomModes] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      slaughter_date: new Date().toISOString().split('T')[0],
      quantity_slaughtered: 0,
      average_live_weight: 0,
      yield: { carcass_weight: 0, usable_meat_weight: 0 },
      waste: { bones_weight: 0, fat_weight: 0, organ_weight: 0, waste_weight: 0 },
      inventory_items: [{ name: "", category: "Meat", quantity: 0, unit: "kg", cost_basis: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "inventory_items" });

  useEffect(() => {
    import("@/lib/offline/repositories/animalBatchRepository").then(({ animalBatchRepository }) => {
      animalBatchRepository.getAll().then(data => setBatches(data || []));
    });

    import("@/lib/offline/repositories/inventoryRepository").then(({ inventoryRepository }) => {
      inventoryRepository.getAll().then(data => setExistingItems(data || []));
    });
  }, []);

  const onSubmit = async (data: any) => {
    if (!navigator.onLine) {
      toast.error("Slaughter module requires an internet connection.");
      return;
    }
    
    try {
      const url = "/api/slaughter-records";
      console.log("URL:", url);
      console.log("Payload:", data);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process slaughter");
      }

      toast.success("Slaughter recorded and inventory generated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">1. Basic Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch <span className="text-red-500">*</span></label>
            <select
              {...register("batch_id")}
              className={`w-full h-10 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${errors.batch_id ? "border-red-500" : "border-gray-200"}`}
            >
              <option value="">Select Batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_number} ({b.quantity} animals)</option>
              ))}
            </select>
            {errors.batch_id && <p className="text-red-500 text-xs mt-1">{errors.batch_id.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <Input type="date" {...register("slaughter_date")} error={errors.slaughter_date?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty Slaughtered <span className="text-red-500">*</span></label>
            <Input type="number" {...register("quantity_slaughtered")} error={errors.quantity_slaughtered?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Live Weight (kg) <span className="text-red-500">*</span></label>
            <Input type="number" step="0.01" {...register("average_live_weight")} error={errors.average_live_weight?.message as string} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">2. Yield Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carcass Weight (kg) <span className="text-red-500">*</span></label>
            <Input type="number" step="0.01" {...register("yield.carcass_weight")} error={errors.yield?.carcass_weight?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usable Meat Weight (kg) <span className="text-red-500">*</span></label>
            <Input type="number" step="0.01" {...register("yield.usable_meat_weight")} error={errors.yield?.usable_meat_weight?.message as string} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">3. Waste Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bones Weight (kg)</label>
            <Input type="number" step="0.01" {...register("waste.bones_weight")} error={errors.waste?.bones_weight?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fat Weight (kg)</label>
            <Input type="number" step="0.01" {...register("waste.fat_weight")} error={errors.waste?.fat_weight?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organ Weight (kg)</label>
            <Input type="number" step="0.01" {...register("waste.organ_weight")} error={errors.waste?.organ_weight?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Waste (kg)</label>
            <Input type="number" step="0.01" {...register("waste.waste_weight")} error={errors.waste?.waste_weight?.message as string} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex justify-between items-center">
          <span>4. Generate Inventory</span>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", category: "Meat", quantity: 0, unit: "kg", cost_basis: 0 })}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </h3>
        {errors.inventory_items?.root && <p className="text-red-500 text-sm mb-4">{errors.inventory_items.root.message as string}</p>}
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap md:flex-nowrap items-start gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
                {customModes[index] ? (
                  <div className="flex gap-2">
                    <Input {...register(`inventory_items.${index}.name`)} placeholder="e.g. Whole Chicken" error={(errors.inventory_items?.[index] as any)?.name?.message} />
                    <Button type="button" variant="outline" className="px-2" onClick={() => setCustomModes(prev => ({ ...prev, [index]: false }))}>
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                ) : (
                  <select
                    className={`w-full h-10 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${((errors.inventory_items?.[index] as any)?.name) ? "border-red-500" : "border-gray-200"}`}
                    value={watch(`inventory_items.${index}.name`) || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "CUSTOM") {
                        setCustomModes(prev => ({ ...prev, [index]: true }));
                        setValue(`inventory_items.${index}.name`, "");
                        setValue(`inventory_items.${index}.category`, "Meat");
                        setValue(`inventory_items.${index}.unit`, "kg");
                      } else {
                        const item = existingItems.find(i => i.name === val);
                        if (item) {
                          setValue(`inventory_items.${index}.name`, item.name);
                          setValue(`inventory_items.${index}.category`, item.category);
                          setValue(`inventory_items.${index}.unit`, item.unit);
                        }
                      }
                    }}
                  >
                    <option value="" disabled>Select Item</option>
                    {existingItems.map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                    <option value="CUSTOM" className="font-semibold text-brand-primary">+ Custom Item</option>
                  </select>
                )}
                {((errors.inventory_items?.[index] as any)?.name && !customModes[index]) && <p className="text-red-500 text-xs mt-1">{(errors.inventory_items?.[index] as any)?.name?.message}</p>}
              </div>
              <div className="w-full md:w-40">
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <Input {...register(`inventory_items.${index}.category`)} placeholder="Meat" error={(errors.inventory_items?.[index] as any)?.category?.message} />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                <Input type="number" step="0.01" {...register(`inventory_items.${index}.quantity`)} error={(errors.inventory_items?.[index] as any)?.quantity?.message} />
              </div>
              <div className="w-full md:w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                <Input {...register(`inventory_items.${index}.unit`)} placeholder="kg" error={(errors.inventory_items?.[index] as any)?.unit?.message} />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Cost Basis (₹)</label>
                <Input type="number" step="0.01" {...register(`inventory_items.${index}.cost_basis`)} error={(errors.inventory_items?.[index] as any)?.cost_basis?.message} />
              </div>
              {fields.length > 1 && (
                <div className="pt-6">
                  <button type="button" onClick={() => remove(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>Process Slaughter</Button>
      </div>
    </form>
  );
}
