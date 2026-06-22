"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpenseTable } from "@/features/accounting/components/ExpenseTable";
import { ExpenseForm } from "@/features/accounting/components/ExpenseForm";
import { toast } from "sonner";
import { useRBAC } from "@/lib/rbac-client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { expenseRepository } from "@/lib/offline/repositories/expenseRepository";

export default function ExpensesPage() {
  const { canMutate, isAccountant } = useRBAC();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const canManageExpenses = canMutate || isAccountant;

  const pendingSyncCount = useLiveQuery(
    () => typeof window !== 'undefined' && db ? db.sync_queue.where('status').equals('PENDING').count() : 0,
    []
  );

  // We re-fetch expenses whenever there's a change in IndexedDB sync queue
  // This triggers a UI refresh after sync
  useLiveQuery(() => {
    if (typeof window !== 'undefined' && db) {
      return db.offline_expenses.toArray();
    }
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const data = await expenseRepository.getAll();
      setExpenses(data);
    } catch (error) {
      if (navigator.onLine) toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingExpense(null);
    if (navigator.onLine) {
      fetchExpenses();
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm">Track manual operating expenses.</p>
            {isOffline ? (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span> OFFLINE
              </span>
            ) : isSyncing ? (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-spin"></span> SYNCING
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> ONLINE
              </span>
            )}
            {pendingSyncCount !== undefined && pendingSyncCount > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                {pendingSyncCount} Pending Sync
              </span>
            )}
          </div>
        </div>
        {!isCreating && !editingExpense && canManageExpenses && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
        )}
      </div>

      {(isCreating || editingExpense) && canManageExpenses && (
        <ExpenseForm 
          initialData={editingExpense} 
          onSuccess={handleSuccess} 
          onCancel={() => { setIsCreating(false); setEditingExpense(null); }} 
        />
      )}

      {!isCreating && !editingExpense && (
        isLoading && !isOffline ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <ExpenseTable data={expenses} onEdit={setEditingExpense} onRefresh={fetchExpenses} canMutate={canManageExpenses} />
        )
      )}
    </div>
  );
}
