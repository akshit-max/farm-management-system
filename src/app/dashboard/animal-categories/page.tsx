"use client";

import { CategoryForm } from "@/features/animal-categories/components/CategoryForm";
import { CategoryTable } from "@/features/animal-categories/components/CategoryTable";
import { useState } from "react";

export default function AnimalCategoriesPage() {
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Animal Categories</h1>
      </div>
      <CategoryForm farmId="" onSuccess={() => setKey(k => k + 1)} />
      <CategoryTable farmId="" keyIndex={key} />
    </div>
  );
}
