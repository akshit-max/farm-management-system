"use client";

import { BatchForm } from "@/features/batches/components/BatchForm";
import { BatchTable } from "@/features/batches/components/BatchTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function BatchesPage() {
  const [key, setKey] = useState(0);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingBatch(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Animal Batches</h1>
      </div>
      {canMutate && (
        <BatchForm
          onSuccess={handleSuccess}
          initialData={editingBatch}
          onCancel={editingBatch ? () => setEditingBatch(null) : undefined}
        />
      )}
      <BatchTable keyIndex={key} onEdit={(batch) => setEditingBatch(batch)} />
    </div>
  );
}
