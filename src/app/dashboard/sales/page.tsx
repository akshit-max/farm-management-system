"use client";

import { SalesForm } from "@/features/sales/components/SalesForm";
import { SalesTable } from "@/features/sales/components/SalesTable";
import { useState, useEffect } from "react";
import { useRBAC } from "@/lib/rbac-client";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function SalesPage() {
  const [key, setKey] = useState(0);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, paid: 0, invoices: 0 });
  const { canMutate, role } = useRBAC();
  const canManageSales = canMutate || role === "Accountant";

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/analytics/sales-kpis`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMetrics({
            total: json.data.total,
            pending: json.data.pending,
            paid: json.data.paid,
            invoices: json.data.invoices,
          });
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchMetrics();
  }, [key]);

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingInvoice(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sales Management</h1>
        <div className="flex items-center gap-3">
          {canManageSales && !isCreating && !editingInvoice && (
            <>
              <button
                onClick={() => setShowCancelled(s => !s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showCancelled
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {showCancelled ? "Hide Cancelled" : "Show Cancelled"}
              </button>
              <Button onClick={() => setIsCreating(true)} className="bg-brand-primary text-white">
                <Plus className="w-4 h-4 mr-2" /> New Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {!isCreating && !editingInvoice && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">All-Time Revenue</span>
            <span className="text-2xl font-bold text-gray-900">₹{metrics.total.toFixed(2)}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">All-Time Receivables</span>
            <span className="text-2xl font-bold text-gray-900">₹{metrics.pending.toFixed(2)}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">All-Time Paid</span>
            <span className="text-2xl font-bold text-gray-900">₹{metrics.paid.toFixed(2)}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <span className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-1">Total Invoices</span>
            <span className="text-2xl font-bold text-gray-900">{metrics.invoices}</span>
          </div>
        </div>
      )}

      {(isCreating || editingInvoice) && (
        <SalesForm 
          onSuccess={handleSuccess} 
          initialData={editingInvoice} 
          onCancel={() => { setEditingInvoice(null); setIsCreating(false); }} 
        />
      )}
      
      {!isCreating && !editingInvoice && (
        <SalesTable 
          keyIndex={key} 
          onEdit={(invoice) => setEditingInvoice(invoice)}
          showCancelled={showCancelled}
        />
      )}
    </div>
  );
}
