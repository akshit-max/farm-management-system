"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SlaughterTable } from "@/features/slaughter/components/SlaughterTable";
import { SlaughterForm } from "@/features/slaughter/components/SlaughterForm";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function SlaughterPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const isManager = session?.user?.role === "Manager" || session?.user?.role === "Owner";

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/slaughter-records");
      if (!res.ok) throw new Error("Failed to fetch slaughter records");
      const data = await res.json();
      setRecords(data.data || []);
    } catch (error) {
      toast.error("Failed to load slaughter records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    fetchRecords();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slaughter Operations</h1>
          <p className="text-gray-500 text-sm mt-1">Record slaughter batches, yield percentages, and generate meat inventory.</p>
        </div>
        {!isCreating && isManager && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Slaughter
          </Button>
        )}
      </div>

      {isCreating && isManager && (
        <SlaughterForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsCreating(false)} 
        />
      )}

      {!isCreating && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <SlaughterTable data={records} onRefresh={fetchRecords} canMutate={isManager} />
        )
      )}
    </div>
  );
}
