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
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, paid: 0, invoices: 0 });
  const { canMutate, role } = useRBAC();
  const canManageSales = canMutate || role === "Accountant";

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/sales`);
      if (res.ok) {
        const json = await res.json();
        const invoices = json.data || [];
        let total = 0; let pending = 0; let paid = 0;
        invoices.forEach((inv: any) => {
          total += inv.total;
          if (inv.payment_status === "PENDING" || inv.payment_status === "PARTIAL") pending += inv.total; // simplified pending
          if (inv.payment_status === "PAID") paid += inv.total;
        });
        setMetrics({ total, pending, paid, invoices: invoices.length });
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
        {canManageSales && !isCreating && !editingInvoice && (
          <Button onClick={() => setIsCreating(true)} className="bg-brand-primary text-white">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        )}
      </div>

      {!isCreating && !editingInvoice && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Revenue</span>
            <span className="text-2xl font-bold text-gray-900">${metrics.total.toFixed(2)}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <span className="text-xs text-amber-500 font-medium uppercase tracking-wider mb-1">Pending Revenue</span>
            <span className="text-2xl font-bold text-gray-900">${metrics.pending.toFixed(2)}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider mb-1">Paid Revenue</span>
            <span className="text-2xl font-bold text-gray-900">${metrics.paid.toFixed(2)}</span>
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
        />
      )}
    </div>
  );
}
