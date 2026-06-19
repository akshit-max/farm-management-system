"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const schema = z.object({
  company_name: z.string().min(1, "Customer name is required"),
  contact_person: z.string().optional(),
  phone: z.string().min(10, "Phone number should be at least 10 characters"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  customer_type: z.string().min(1, "Customer type is required"),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export function CustomerForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "", contact_person: "", phone: "", email: "",
      address: "", customer_type: "", notes: "", status: "ACTIVE"
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        company_name: initialData.company_name || "",
        contact_person: initialData.contact_person || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        customer_type: initialData.customer_type || "",
        notes: initialData.notes || "",
        status: initialData.status || "ACTIVE"
      });
    } else {
      reset({
        company_name: "", contact_person: "", phone: "", email: "",
        address: "", customer_type: "", notes: "", status: "ACTIVE"
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const url = initialData ? `/api/customers/${initialData.id}` : "/api/customers";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      
      toast.success(initialData ? "Customer updated!" : "Customer created!");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const customerTypes = ["Retail", "Wholesale", "Contract Buyer", "Other"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">{initialData ? "Edit Customer" : "Add New Customer"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company / Name <span className="text-red-500">*</span></label>
          <input {...register("company_name")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Farm Fresh Foods" />
          {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type <span className="text-red-500">*</span></label>
          <select {...register("customer_type")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
            <option value="">Select Type...</option>
            {customerTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          {errors.customer_type && <p className="text-red-500 text-xs mt-1">{errors.customer_type.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
          <input {...register("phone")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="+1234567890" />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input {...register("contact_person")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" {...register("email")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="contact@farmfresh.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input {...register("address")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" placeholder="123 Market Street, City" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea {...register("notes")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" rows={2} placeholder="Additional details..." />
        </div>
        {initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register("status")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isLoading} className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {isLoading ? "Saving..." : (initialData ? "Update Customer" : "Add Customer")}
        </button>
      </div>
    </form>
  );
}
