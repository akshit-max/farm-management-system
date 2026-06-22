"use client";

import { useState, useEffect, use } from "react";
import { Plus, IndianRupee, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentForm } from "@/features/receivables/components/PaymentForm";
import { PaymentTable } from "@/features/receivables/components/PaymentTable";
import { toast } from "sonner";
import { useRBAC } from "@/lib/rbac-client";
import { format } from "date-fns";

import { customerPaymentRepository } from "@/lib/offline/repositories/customerPaymentRepository";
import { salesRepository } from "@/lib/offline/repositories/salesRepository";

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { canManageCustomers } = useRBAC();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [offlineSnapshot, setOfflineSnapshot] = useState<{ estimated: number } | null>(null);
  const [offlinePayments, setOfflinePayments] = useState<any[]>([]);

  useEffect(() => {
    if (data && !navigator.onLine) {
      Promise.all([
        salesRepository.getPendingCustomerReceivables(id),
        customerPaymentRepository.getPendingCustomerPayments(id)
      ]).then(([pendingSalesReceivables, pendingPaymentsSum]) => {
        const estimated = data.metrics.outstanding_balance + pendingSalesReceivables - pendingPaymentsSum;
        setOfflineSnapshot({ estimated: Math.max(0, estimated) });
      });

      // Get full list of offline payments
      customerPaymentRepository.getAll().then(all => {
        const pending = all.filter(p => p.isOffline && p.customer_id === id);
        setOfflinePayments(pending);
      });
    } else {
      setOfflineSnapshot(null);
      setOfflinePayments([]);
    }
  }, [data, id, isRecording]);

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/customers/${id}/ledger`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Failed to load customer ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [id]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>;
  if (!data) return <div className="p-6">Customer not found.</div>;

  const { customer, metrics } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.company_name}</h1>
          <p className="text-gray-500 text-sm mt-1">Customer Profile & Financial Ledger</p>
        </div>
        {!isRecording && canManageCustomers && (
          <Button onClick={() => setIsRecording(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText className="w-5 h-5" /></div>
            <h3 className="text-sm font-medium text-gray-600">Total Invoices</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.invoice_count}</p>
          <p className="text-xs text-gray-500 mt-1">₹{metrics.total_sales.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div>
            <h3 className="text-sm font-medium text-gray-600">Total Payments</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{metrics.total_payments.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div>
            <h3 className="text-sm font-medium text-gray-600">Outstanding</h3>
          </div>
          {offlineSnapshot ? (
             <div className="flex flex-col">
               <p className="text-2xl font-bold text-status-danger">₹{offlineSnapshot.estimated.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
               <span className="text-[11px] text-gray-500 font-medium tracking-wider uppercase mt-1">Estimated Offline</span>
             </div>
          ) : (
             <p className="text-2xl font-bold text-status-danger">₹{metrics.outstanding_balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
            <h3 className="text-sm font-medium text-gray-600">Last Payment</h3>
          </div>
          <p className="text-lg font-bold text-gray-900">{metrics.last_payment_date ? format(new Date(metrics.last_payment_date), "PP") : "-"}</p>
        </div>
      </div>

      {isRecording && canManageCustomers && (
        <PaymentForm 
          customerId={customer.id} 
          invoices={customer.sales_invoices} 
          onSuccess={() => { setIsRecording(false); fetchLedger(); }} 
          onCancel={() => setIsRecording(false)} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Payment History</h2>
          <PaymentTable data={[...offlinePayments, ...customer.payments]} onRefresh={fetchLedger} canMutate={canManageCustomers} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Invoices</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {customer.sales_invoices.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {customer.sales_invoices.map((inv: any) => (
                  <div key={inv.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-500">{format(new Date(inv.invoice_date), "PP")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{inv.total.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${inv.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inv.payment_status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">No invoices found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
