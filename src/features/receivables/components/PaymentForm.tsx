"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { customerPaymentRepository } from "@/lib/offline/repositories/customerPaymentRepository";

const schema = z.object({
  invoice_id: z.string().min(1, "Invoice is required"),
  payment_date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  payment_method: z.string().min(1, "Method is required"),
  reference_number: z.string().optional(),
  notes: z.string().optional()
});

const METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Credit", "Other"];

export function PaymentForm({ customerId, onSuccess, onCancel }: { customerId: string; onSuccess: () => void; onCancel: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      import("@/lib/offline/repositories/salesRepository").then(m => m.salesRepository.getAll()),
      import("@/lib/offline/repositories/customerPaymentRepository").then(m => m.customerPaymentRepository.getAll())
    ]).then(([allSales, allPayments]) => {
      const customerSales = allSales.filter((inv: any) => inv.customer_id === customerId);
      const customerPayments = allPayments.filter((p: any) => p.customer_id === customerId);
      
      const salesWithPayments = customerSales.map(inv => {
        // Merge server payments with offline payments for accurate outstanding calc
        const existingPayments = inv.payments || [];
        const offlinePaymentsForInv = customerPayments.filter(p => p.invoice_id === inv.id && !existingPayments.find((ep: any) => ep.id === p.id));
        return {
          ...inv,
          payments: [...existingPayments, ...offlinePaymentsForInv]
        };
      });
      setInvoices(salesWithPayments);
    });
  }, [customerId]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_id: "",
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: "Bank Transfer",
      reference_number: "",
      notes: ""
    }
  });

  const selectedInvoiceId = watch("invoice_id");
  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  useEffect(() => {
    if (selectedInvoice) {
      // Calculate outstanding
      const paid = (selectedInvoice?.payments ?? []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const invTotal = selectedInvoice.total !== undefined ? selectedInvoice.total : ((selectedInvoice?.items ?? []).reduce((s: number, i: any) => s + ((Number(i.quantity)||0)*(Number(i.unit_price)||0)), 0));
      const outstanding = invTotal - paid;
      if (outstanding > 0) {
        setValue("amount", outstanding);
      }
    }
  }, [selectedInvoiceId, selectedInvoice, setValue]);

  const onSubmit = async (data: any) => {
    try {
      await customerPaymentRepository.create({ ...data, customer_id: customerId });
      toast.success(`Payment recorded successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    }
  };

  const pendingInvoices = invoices.filter(inv => inv.payment_status !== "PAID" && inv.payment_status !== "CANCELLED");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
      
      {pendingInvoices.length === 0 ? (
        <div className="p-4 bg-amber-50 text-amber-700 rounded-md">
          This customer has no outstanding invoices.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice <span className="text-red-500">*</span></label>
            <select
              {...register("invoice_id")}
              className={`w-full h-10 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${errors.invoice_id ? "border-red-500" : "border-gray-200"}`}
            >
              <option value="">-- Select Pending Invoice --</option>
              {pendingInvoices.map(inv => {
                const paid = (inv?.payments ?? []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
                const invTotal = inv.total !== undefined ? inv.total : ((inv?.items ?? []).reduce((s: number, i: any) => s + ((Number(i.quantity)||0)*(Number(i.unit_price)||0)), 0));
                const outstanding = invTotal - paid;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} (Total: ₹{invTotal} | Outstanding: ₹{outstanding.toFixed(2)})
                  </option>
                );
              })}
            </select>
            {errors.invoice_id && <p className="text-red-500 text-xs mt-1">{errors.invoice_id.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <Input type="date" {...register("payment_date")} error={errors.payment_date?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
            <Input type="number" step="0.01" {...register("amount")} error={errors.amount?.message as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method <span className="text-red-500">*</span></label>
            <select
              {...register("payment_method")}
              className={`w-full h-10 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 border-gray-200`}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
            <Input {...register("reference_number")} placeholder="e.g. UTR / Chq No." />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <Input {...register("notes")} placeholder="Optional notes..." />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting} disabled={pendingInvoices.length === 0}>Record Payment</Button>
      </div>
    </form>
  );
}
