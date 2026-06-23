"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryForm } from "@/features/inventory/components/InventoryForm";
import { toast } from "sonner";
import { useRBAC } from "@/lib/rbac-client";

export default function InventoryPage() {
  const { canMutate } = useRBAC();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const { inventoryRepository } = await import("@/lib/offline/repositories/inventoryRepository");
      const allItems = await inventoryRepository.getAll();
      setItems(allItems);
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
        {!isCreating && !editingItem && canMutate && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Inventory Item
          </Button>
        )}
      </div>

      {(isCreating || editingItem) && canMutate && (
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
          <InventoryTable data={items} onEdit={setEditingItem} onRefresh={fetchItems} canMutate={canMutate} />
        )
      )}
    </div>
  );
}
