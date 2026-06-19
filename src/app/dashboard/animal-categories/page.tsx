"use client";

import { CategoryForm } from "@/features/animal-categories/components/CategoryForm";
import { CategoryTable } from "@/features/animal-categories/components/CategoryTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function AnimalCategoriesPage() {
  const [key, setKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Animal Categories</h1>
      </div>
      {canMutate && (
        <CategoryForm
          onSuccess={handleSuccess}
          initialData={editingCategory}
          onCancel={editingCategory ? () => setEditingCategory(null) : undefined}
        />
      )}
      <CategoryTable keyIndex={key} onEdit={(cat) => setEditingCategory(cat)} />
    </div>
  );
}
