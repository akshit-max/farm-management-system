"use client";

import { FeedTypeForm } from "@/features/feed/components/FeedTypeForm";
import { FeedTypeTable } from "@/features/feed/components/FeedTypeTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function FeedTypesPage() {
  const [key, setKey] = useState(0);
  const [editingFeedType, setEditingFeedType] = useState<any>(null);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingFeedType(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Feed Types Master</h1>
      </div>
      {canMutate && (
        <FeedTypeForm 
          onSuccess={handleSuccess} 
          initialData={editingFeedType} 
          onCancel={editingFeedType ? () => setEditingFeedType(null) : undefined} 
        />
      )}
      <FeedTypeTable 
        keyIndex={key} 
        onEdit={(feedType) => setEditingFeedType(feedType)} 
      />
    </div>
  );
}
