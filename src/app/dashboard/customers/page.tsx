"use client";

import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { CustomerTable } from "@/features/customers/components/CustomerTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";
import { Plus } from "lucide-react";

export default function CustomersPage() {
  const [key, setKey] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { canManageCustomers } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingCustomer(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingCustomer(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Customers CRM</h1>
        {canManageCustomers && !isCreating && !editingCustomer && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {(isCreating || editingCustomer) && (
        <CustomerForm
          onSuccess={handleSuccess}
          initialData={editingCustomer}
          onCancel={handleCancel}
        />
      )}

      <CustomerTable
        keyIndex={key}
        onEdit={(customer) => { setEditingCustomer(customer); setIsCreating(false); }}
      />
    </div>
  );
}
