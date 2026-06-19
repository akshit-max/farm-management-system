"use client";

import { SupplierForm } from "@/features/suppliers/components/SupplierForm";
import { SupplierTable } from "@/features/suppliers/components/SupplierTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";
import { Plus } from "lucide-react";

export default function SuppliersPage() {
  const [key, setKey] = useState(0);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingSupplier(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingSupplier(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers CRM</h1>
        {canMutate && !isCreating && !editingSupplier && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {(isCreating || editingSupplier) && (
        <SupplierForm
          onSuccess={handleSuccess}
          initialData={editingSupplier}
          onCancel={handleCancel}
        />
      )}

      <SupplierTable
        keyIndex={key}
        onEdit={(supplier) => { setEditingSupplier(supplier); setIsCreating(false); }}
      />
    </div>
  );
}
