"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UtilityMeterTable } from "@/features/electricity/components/UtilityMeterTable";
import { UtilityMeterForm } from "@/features/electricity/components/UtilityMeterForm";
import { toast } from "sonner";
import { useRBAC } from "@/lib/rbac-client";

export default function UtilityMetersPage() {
  const { canMutate } = useRBAC();
  const [meters, setMeters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMeter, setEditingMeter] = useState<any | null>(null);

  const fetchMeters = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/utility-meters");
      if (!res.ok) throw new Error("Failed to fetch meters");
      const data = await res.json();
      setMeters(data.data || []);
    } catch (error) {
      toast.error("Failed to load utility meters");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingMeter(null);
    fetchMeters();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utility Meters</h1>
          <p className="text-gray-500 text-sm mt-1">Manage farm electricity and utility meters.</p>
        </div>
        {!isCreating && !editingMeter && canMutate && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Meter
          </Button>
        )}
      </div>

      {(isCreating || editingMeter) && canMutate && (
        <UtilityMeterForm 
          initialData={editingMeter} 
          onSuccess={handleSuccess} 
          onCancel={() => { setIsCreating(false); setEditingMeter(null); }} 
        />
      )}

      {!isCreating && !editingMeter && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <UtilityMeterTable data={meters} onEdit={setEditingMeter} onRefresh={fetchMeters} canMutate={canMutate} />
        )
      )}
    </div>
  );
}
