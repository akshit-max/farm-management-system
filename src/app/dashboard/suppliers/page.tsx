"use client";

import { SupplierForm } from "@/features/suppliers/components/SupplierForm";
import { SupplierTable } from "@/features/suppliers/components/SupplierTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function SuppliersPage() {
  const [key, setKey] = useState(0);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingSupplier(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers CRM</h1>
      </div>
      {canMutate && (
        <SupplierForm 
          onSuccess={handleSuccess} 
          initialData={editingSupplier} 
          onCancel={editingSupplier ? () => setEditingSupplier(null) : undefined} 
        />
      )}
      <SupplierTable 
        keyIndex={key} 
        onEdit={(supplier) => setEditingSupplier(supplier)} 
      />
    </div>
  );
}
