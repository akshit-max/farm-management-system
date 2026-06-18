"use client";

import { BatchForm } from "@/features/batches/components/BatchForm";
import { BatchTable } from "@/features/batches/components/BatchTable";
import { useState } from "react";

export default function BatchesPage() {
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Animal Batches</h1>
      </div>
      <BatchForm farmId="" onSuccess={() => setKey(k => k + 1)} />
      <BatchTable farmId="" keyIndex={key} />
    </div>
  );
}
