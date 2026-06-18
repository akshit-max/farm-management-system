"use client";

import { StageForm } from "@/features/stages/components/StageForm";
import { StageTable } from "@/features/stages/components/StageTable";
import { useState } from "react";

export default function StagesPage() {
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Stage Definitions</h1>
      </div>
      <StageForm farmId="" onSuccess={() => setKey(k => k + 1)} />
      <StageTable farmId="" keyIndex={key} />
    </div>
  );
}
