"use client";

import { FeedTypeForm } from "@/features/feed/components/FeedTypeForm";
import { FeedTypeTable } from "@/features/feed/components/FeedTypeTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";
import { Plus } from "lucide-react";

export default function FeedTypesPage() {
  const [key, setKey] = useState(0);
  const [editingFeedType, setEditingFeedType] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingFeedType(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingFeedType(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Feed Types Master</h1>
        {canMutate && !isCreating && !editingFeedType && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Feed Type
          </button>
        )}
      </div>

      {(isCreating || editingFeedType) && (
        <FeedTypeForm
          onSuccess={handleSuccess}
          initialData={editingFeedType}
          onCancel={handleCancel}
        />
      )}

      <FeedTypeTable
        keyIndex={key}
        onEdit={(feedType) => { setEditingFeedType(feedType); setIsCreating(false); }}
      />
    </div>
  );
}
