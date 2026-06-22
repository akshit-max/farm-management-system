"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { salesRepository } from "@/lib/offline/repositories/salesRepository";
const itemSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be >= 0"),
});

const schemaCreate = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Date is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  payment_received: z.boolean().default(false),
  amount_paid: z.coerce.number().min(0).optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
});

const schemaEditFull = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

const schemaEditNotes = z.object({
  notes: z.string().optional(),
});

export function SalesForm({ onSuccess, initialData, onCancel }: { onSuccess: () => void; initialData?: any; onCancel: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  
  // mode can be "create", "edit", or "clone"
  const [mode, setMode] = useState<"create" | "edit" | "clone">(initialData ? "edit" : "create");

  const isActuallyEditing = mode === "edit";
  const paymentStatus = invoiceData?.payment_status || "PENDING";
  const isCancelled = invoiceData?.status === "CANCELLED";
  
  // Financial fields are only editable if it is PENDING and not cancelled.
  // During clone or create, they are always editable.
  const canEditFinancially = isActuallyEditing ? (paymentStatus === "PENDING" && !isCancelled) : true;
  const isReadOnly = isActuallyEditing && isCancelled;

  const activeSchema = (mode === "create" || mode === "clone")
    ? schemaCreate
    : (canEditFinancially ? schemaEditFull : schemaEditNotes);

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(activeSchema as any),
    defaultValues: {
      customer_id: "", 
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      notes: "",
      items: [{ batch_id: "", quantity: 1, unit_price: 0 }],
      payment_received: false,
      amount_paid: 0,
      payment_method: "Cash",
      reference_number: ""
    } as any
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items" as never,
  });

  const watchItems = watch("items" as never) || [];
  const watchPaymentReceived = watch("payment_received");
  const watchCustomerId = watch("customer_id");
  const watchAmountPaid = watch("amount_paid");

  const [offlineCustomerWarning, setOfflineCustomerWarning] = useState<any>(null);

  useEffect(() => {
    if (!navigator.onLine && watchCustomerId) {
      salesRepository.getPendingCustomerReceivables(watchCustomerId).then(pending => {
        const customer = customers.find((c: any) => c.id === watchCustomerId);
        if (customer && customer.credit_limit > 0) {
          const total = watchItems.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
          const paid = watchPaymentReceived ? (Number(watchAmountPaid) || 0) : 0;
          const newReceivable = Math.max(0, total - paid);
          
          // Assuming customer object has a cached outstanding_balance, if not we just use pending
          const baseOutstanding = customer.outstanding_balance || 0; 
          const estimated = baseOutstanding + pending + newReceivable;

          if (estimated > customer.credit_limit) {
            setOfflineCustomerWarning({
              limit: customer.credit_limit,
              estimated: estimated
            });
          } else {
            setOfflineCustomerWarning(null);
          }
        } else {
          setOfflineCustomerWarning(null);
        }
      });
    } else {
      setOfflineCustomerWarning(null);
    }
  }, [watchCustomerId, watchItems, watchPaymentReceived, watchAmountPaid, customers]);

  useEffect(() => {
    fetch(`/api/customers`).then(res => res.json()).then(data => setCustomers(data.data || []));
    fetch(`/api/animal-batches`).then(res => res.json()).then(data => setBatches(data.data || []));
  }, []);

  useEffect(() => {
    if (initialData && mode === "edit") {
      setIsFetchingData(true);
      fetch(`/api/sales/${initialData.id}`)
        .then(res => res.json())
        .then(json => {
           if (json.data) {
             setInvoiceData(json.data);
             reset({
                customer_id: json.data.customer_id,
                invoice_date: new Date(json.data.invoice_date).toISOString().split('T')[0],
                invoice_number: json.data.invoice_number,
                notes: json.data.notes || "",
                items: json.data.items.map((i: any) => ({
                   batch_id: i.batch_id,
                   quantity: i.quantity,
                   unit_price: i.rate
                })),
                payment_received: false,
                amount_paid: 0,
                payment_method: "Cash",
                reference_number: ""
             });
           } else {
             toast.error("Failed to load full invoice data");
             onCancel();
           }
        })
        .catch(() => {
           toast.error("Failed to load invoice");
           onCancel();
        })
        .finally(() => setIsFetchingData(false));
    }
  }, [initialData, mode, reset, onCancel]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const customer = customers.find(c => c.id === data.customer_id);
      const total = data.items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
      
      const enrichedData = {
        ...data,
        total: total,
        customer: customer ? { company_name: customer.company_name } : null
      };

      if (isActuallyEditing) {
        await salesRepository.update(initialData.id, enrichedData);
      } else {
        await salesRepository.create(enrichedData);
      }
      
      toast.success(isActuallyEditing ? "Invoice updated!" : "Invoice created successfully!");
      reset();
      onSuccess();
    } catch (err: any) {
      const json = err;
      if (json.code) {
        if (json.code === "CREDIT_LIMIT_EXCEEDED") {
          toast.error(
            <div className="flex flex-col gap-2 w-full">
              <span className="font-bold text-base">Credit Limit Exceeded</span>
              <div className="text-sm space-y-1 mt-1">
                <div className="flex justify-between"><span>Customer Limit:</span> <span>₹{json.creditLimit}</span></div>
                <div className="flex justify-between"><span>Current Outstanding:</span> <span>₹{json.currentOutstanding}</span></div>
                <div className="flex justify-between"><span>New Invoice:</span> <span>₹{json.invoiceAmount}</span></div>
                <div className="flex justify-between border-t border-red-200/30 pt-1 font-bold"><span>Projected Outstanding:</span> <span>₹{json.projectedOutstanding}</span></div>
              </div>
              <span className="text-xs mt-2 block">Collect payment or increase the credit limit before proceeding.</span>
            </div>,
            { duration: 8000 }
          );
          return;
        } else if (json.code === "NO_CREDIT_ALLOWED") {
          toast.error(
            <div className="flex flex-col gap-1 w-full">
              <span className="font-bold text-base">Cash Sale Required</span>
              <span className="text-sm">This customer is configured for immediate payment only.</span>
            </div>,
            { duration: 6000 }
          );
          return;
        } else if (json.code === "CONCURRENT_TRANSACTION") {
          toast.error(
            <div className="flex flex-col gap-1 w-full">
              <span className="font-bold text-base">Another sale is currently being processed for this customer.</span>
              <span className="text-sm">Please wait a few seconds and try again.</span>
            </div>,
            { duration: 6000 }
          );
          return;
        } else if (json.code === "CUSTOMER_NOT_FOUND") {
          toast.error("Customer no longer exists.");
          return;
        } else if (json.code === "CUSTOMER_INACTIVE") {
          toast.error("Customer account is inactive and cannot be used for new sales.");
          return;
        }
      }
      toast.error(err.error || err.message || "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = () => {
    setMode("clone");
    setInvoiceData(null);
    setValue("invoice_number", `INV-${Date.now().toString().slice(-6)}`);
    setValue("payment_received", false);
    setValue("amount_paid", 0);
    toast.info("Invoice cloned. You are now creating a new draft invoice.");
  };

  const calculateTotal = () => {
    if (!Array.isArray(watchItems)) return 0;
    return watchItems.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
  };

  const [pendingReservations, setPendingReservations] = useState<Record<string, number>>({});

  useEffect(() => {
    salesRepository.getPendingReservations().then(res => setPendingReservations(res));
  }, []);

  const getAvailableQty = (batchId: string) => {
    const b = batches.find(x => x.id === batchId);
    if (!b) return 0;
    let available = b.quantity;
    
    // Deduct offline reservations
    if (pendingReservations[batchId]) {
      available -= pendingReservations[batchId];
    }

    if (isActuallyEditing && invoiceData?.items) {
      const oldItem = invoiceData.items.find((i: any) => i.batch_id === batchId);
      if (oldItem) {
        available += oldItem.quantity;
      }
    }
    return Math.max(0, available);
  };

  if (isFetchingData) {
    return <div className="p-12 text-center text-gray-500">Loading invoice details...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {mode === "create" && "Create New Sales Invoice"}
          {mode === "edit" && `Edit Invoice: ${invoiceData?.invoice_number || ""}`}
          {mode === "clone" && "Draft Cloned Invoice"}
        </h2>
        <div className="flex items-center gap-2">
          {isActuallyEditing && !isCancelled && (
            <Button type="button" variant="outline" size="sm" onClick={handleClone} className="text-brand-primary border-brand-primary/30 hover:bg-brand-primary/5">
              <Copy className="w-4 h-4 mr-2" /> Clone Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Warning Banners */}
      {isActuallyEditing && !isCancelled && !canEditFinancially && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              {paymentStatus === "PAID" 
                ? "This invoice has been fully paid. Financial fields are locked." 
                : "This invoice contains recorded payments. Financial changes are locked to protect ledger integrity. Cancel and recreate if financial changes are required."}
            </p>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">This invoice is read-only.</p>
          </div>
        </div>
      )}

      {offlineCustomerWarning && (
        <div className="p-4 rounded-lg bg-status-danger/10 border border-status-danger flex gap-3 text-status-danger">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[14px]">Pending Server Validation</p>
            <p className="text-[13px] mt-1 text-text-secondary">
              Estimated outstanding balance (₹{offlineCustomerWarning.estimated.toLocaleString()}) exceeds the customer's credit limit (₹{offlineCustomerWarning.limit.toLocaleString()}).
              This invoice will be queued offline but may be rejected by the server upon sync.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {isActuallyEditing && invoiceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Invoice Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Customer:</span> <span className="font-medium text-gray-900">{invoiceData.customer?.company_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Status:</span> <span className="font-bold">{invoiceData.status} ({invoiceData.payment_status})</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Created:</span> <span className="font-medium text-gray-900">{format(new Date(invoiceData.created_at), "MMM d, yyyy")}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Last Updated:</span> <span className="font-medium text-gray-900">{format(new Date(invoiceData.last_modified), "MMM d, yyyy HH:mm")}</span></div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Total Amount:</span> <span className="font-bold text-gray-900">₹{invoiceData.total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Amount Paid:</span> <span className="font-bold text-emerald-600">₹{invoiceData.totalPaid?.toFixed(2) || '0.00'}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-200"><span className="text-gray-800 font-semibold">Outstanding:</span> <span className="font-bold text-amber-600">₹{invoiceData.outstanding?.toFixed(2) || '0.00'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
          <select {...register("customer_id")} disabled={!canEditFinancially || isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed">
            <option value="">Select Customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          {(errors as any).customer_id && <p className="text-red-500 text-xs mt-1">{(errors as any).customer_id.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date <span className="text-red-500">*</span></label>
          <input type="date" {...register("invoice_date")} disabled={!canEditFinancially || isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed" />
          {(errors as any).invoice_date && <p className="text-red-500 text-xs mt-1">{(errors as any).invoice_date.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number <span className="text-red-500">*</span></label>
          <input {...register("invoice_number")} disabled={isActuallyEditing} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed" />
          {(errors as any).invoice_number && <p className="text-red-500 text-xs mt-1">{(errors as any).invoice_number.message as string}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register("notes")} disabled={isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Optional details..." />
        </div>
      </div>

      {/* Initial Payment - ONLY in Create/Clone modes */}
      {!isActuallyEditing && (
        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
            <input type="checkbox" {...register("payment_received")} className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
            <span className="text-sm font-medium text-gray-700">Payment Received Now?</span>
          </label>
          
          {watchPaymentReceived && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid (₹) <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" {...register("amount_paid")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                <select {...register("payment_method")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reference Number</label>
                <input {...register("reference_number")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm" placeholder="UTR, Cheque No, etc." />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Items */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-800">Invoice Items</h3>
          {canEditFinancially && !isReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => append({ batch_id: "", quantity: 1, unit_price: 0 })}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const currentBatchId = (watchItems[index] as any)?.batch_id;
            const currentQty = Number((watchItems[index] as any)?.quantity) || 0;
            const rate = Number((watchItems[index] as any)?.unit_price) || 0;
            const maxQty = getAvailableQty(currentBatchId);
            const qtyExceeded = currentBatchId && currentQty > maxQty;
            const lineAmount = currentQty * rate;

            return (
              <div key={field.id} className={`flex flex-col md:flex-row gap-3 items-start md:items-end p-4 rounded-lg border ${qtyExceeded ? "bg-red-50/50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Animal Batch <span className="text-red-500">*</span></label>
                  <select {...register(`items.${index}.batch_id` as never)} disabled={!canEditFinancially || isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">Select Batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id} disabled={!isActuallyEditing && b.quantity <= 0}>
                        {b.batch_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-700">Qty <span className="text-red-500">*</span></label>
                    {currentBatchId && (
                      <span className={`text-[10px] font-bold ${qtyExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                        {maxQty} Avail
                      </span>
                    )}
                  </div>
                  <input type="number" {...register(`items.${index}.quantity` as never)} disabled={!canEditFinancially || isReadOnly} className={`w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${qtyExceeded ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300 focus:ring-brand-primary focus:border-brand-primary'}`} />
                  {qtyExceeded && <p className="text-[10px] text-red-500 mt-1 absolute">Exceeds available</p>}
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" {...register(`items.${index}.unit_price` as never)} disabled={!canEditFinancially || isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                </div>
                <div className="w-full md:w-32 pt-2 md:pt-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1 md:hidden">Line Total</label>
                  <div className="h-9 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm font-semibold text-gray-900 flex items-center justify-end">
                    ₹{lineAmount.toFixed(2)}
                  </div>
                </div>
                {canEditFinancially && !isReadOnly && (
                  <div className="w-full md:w-auto flex justify-end">
                    <button type="button" onClick={() => fields.length > 1 && remove(index)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" disabled={fields.length === 1}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {((errors as any).items as any)?.root && <p className="text-red-500 text-xs mt-1">{((errors as any).items as any).root.message}</p>}
      </div>

      {/* Payment History Table (Read Only) */}
      {isActuallyEditing && invoiceData?.payments && invoiceData.payments.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Payment History</h3>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reference</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoiceData.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">{format(new Date(p.payment_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-2">{p.payment_method}</td>
                    <td className="px-4 py-2">{p.reference_number || "-"}</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-600">₹{p.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer / Grand Total */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-lg text-gray-800">
          Total Amount: <span className="font-bold text-brand-primary">₹{calculateTotal().toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={isLoading} className="bg-brand-primary text-white hover:bg-brand-primary/90">
              {isLoading ? "Saving..." : (isActuallyEditing ? "Update Invoice" : "Save Invoice")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
