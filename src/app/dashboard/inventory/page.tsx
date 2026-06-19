"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryForm } from "@/features/inventory/components/InventoryForm";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function InventoryPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const isManager = session?.user?.role === "Manager" || session?.user?.role === "Owner";

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/inventory-items");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setItems(data.data || []);
    } catch (error) {
      toast.error("Failed to load inventory items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingItem(null);
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meat Inventory Master</h1>
          <p className="text-gray-500 text-sm mt-1">Manage post-slaughter products ready for sale.</p>
        </div>
        {!isCreating && !editingItem && isManager && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Inventory Item
          </Button>
        )}
      </div>

      {(isCreating || editingItem) && isManager && (
        <InventoryForm 
          initialData={editingItem} 
          onSuccess={handleSuccess} 
          onCancel={() => { setIsCreating(false); setEditingItem(null); }} 
        />
      )}

      {!isCreating && !editingItem && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <InventoryTable data={items} onEdit={setEditingItem} onRefresh={fetchItems} canMutate={isManager} />
        )
      )}
    </div>
  );
}
