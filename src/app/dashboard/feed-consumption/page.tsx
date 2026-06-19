"use client";

import { FeedConsumptionForm } from "@/features/feed/components/FeedConsumptionForm";
import { FeedConsumptionTable } from "@/features/feed/components/FeedConsumptionTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function FeedConsumptionPage() {
  const [key, setKey] = useState(0);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Feed Consumption</h1>
      </div>
      {canMutate && (
        <FeedConsumptionForm onSuccess={handleSuccess} />
      )}
      <FeedConsumptionTable keyIndex={key} />
    </div>
  );
}
