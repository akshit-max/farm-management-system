"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

const itemSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be >= 0"),
});

const schema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Date is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  payment_status: z.enum(["PENDING", "PARTIAL", "PAID"]).default("PENDING"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

const updateSchema = z.object({
  payment_status: z.enum(["PENDING", "PARTIAL", "PAID"]),
  notes: z.string().optional(),
});

export function SalesForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const isEditing = !!initialData;

  const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(isEditing ? updateSchema : schema),
    defaultValues: isEditing ? {
      payment_status: initialData.payment_status || "PENDING",
      notes: initialData.notes || ""
    } : {
      customer_id: "", invoice_date: new Date().toISOString().split('T')[0],
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      payment_status: "PENDING", notes: "",
      items: [{ batch_id: "", quantity: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items" as never, // cast to never for TS workaround with conditional schemas
  });

  const watchItems = watch("items" as never);

  useEffect(() => {
    fetch(`/api/customers`).then(res => res.json()).then(data => setCustomers(data.data || []));
    fetch(`/api/animal-batches`).then(res => res.json()).then(data => setBatches(data.data || []));
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/sales/${initialData.id}` : "/api/sales";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      
      toast.success(isEditing ? "Invoice updated!" : "Invoice created successfully!");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (isEditing) return initialData?.total || 0;
    if (!Array.isArray(watchItems)) return 0;
    return watchItems.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">{isEditing ? `Edit Invoice: ${initialData.invoice_number}` : "Create New Sales Invoice"}</h2>
        {isEditing && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">Editing Mode: Only Status & Notes editable</span>}
      </div>

      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
            <select {...register("customer_id")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary">
              <option value="">Select Customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            {(errors as any).customer_id && <p className="text-red-500 text-xs mt-1">{(errors as any).customer_id.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date <span className="text-red-500">*</span></label>
            <input type="date" {...register("invoice_date")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" />
            {(errors as any).invoice_date && <p className="text-red-500 text-xs mt-1">{(errors as any).invoice_date.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number <span className="text-red-500">*</span></label>
            <input {...register("invoice_number")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" />
            {(errors as any).invoice_number && <p className="text-red-500 text-xs mt-1">{(errors as any).invoice_number.message as string}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status <span className="text-red-500">*</span></label>
          <select {...register("payment_status")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary">
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register("notes")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" placeholder="Optional details..." />
        </div>
      </div>

      {!isEditing && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Invoice Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ batch_id: "", quantity: 1, unit_price: 0 })}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start md:items-end p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Animal Batch <span className="text-red-500">*</span></label>
                  <select {...register(`items.${index}.batch_id` as never)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
                    <option value="">Select Batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id} disabled={b.quantity <= 0}>
                        {b.batch_number} ({b.quantity} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
                  <input type="number" {...register(`items.${index}.quantity` as never)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm" />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate ($) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" {...register(`items.${index}.unit_price` as never)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm" />
                </div>
                <div className="w-full md:w-auto flex justify-end">
                  <button type="button" onClick={() => fields.length > 1 && remove(index)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" disabled={fields.length === 1}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {((errors as any).items as any)?.root && <p className="text-red-500 text-xs mt-1">{((errors as any).items as any).root.message}</p>}
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-lg text-gray-800">
          Total Amount: <span className="font-bold text-brand-primary">${calculateTotal().toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-brand-primary text-white hover:bg-brand-primary/90">
            {isLoading ? "Saving..." : (isEditing ? "Update Invoice" : "Create Invoice")}
          </Button>
        </div>
      </div>
    </form>
  );
}
