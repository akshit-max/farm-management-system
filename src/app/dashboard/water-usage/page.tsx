"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WaterUsageTable } from "@/features/water/components/WaterUsageTable";
import { WaterUsageForm } from "@/features/water/components/WaterUsageForm";
import { toast } from "sonner";

export default function WaterUsagePage() {
  const [usages, setUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUsage, setEditingUsage] = useState<any | null>(null);

  const fetchUsages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/water-usage");
      if (!res.ok) throw new Error("Failed to fetch water usage");
      const data = await res.json();
      setUsages(data.data || []);
    } catch (error) {
      toast.error("Failed to load water usage records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsages();
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingUsage(null);
    fetchUsages();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Water Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track daily water consumption across rooms and batches.</p>
        </div>
        {!isCreating && !editingUsage && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Usage
          </Button>
        )}
      </div>

      {(isCreating || editingUsage) && (
        <WaterUsageForm 
          initialData={editingUsage} 
          onSuccess={handleSuccess} 
          onCancel={() => { setIsCreating(false); setEditingUsage(null); }} 
        />
      )}

      {!isCreating && !editingUsage && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <WaterUsageTable data={usages} onEdit={setEditingUsage} onRefresh={fetchUsages} />
        )
      )}
    </div>
  );
}
