"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpenseTable } from "@/features/accounting/components/ExpenseTable";
import { ExpenseForm } from "@/features/accounting/components/ExpenseForm";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const isManager = session?.user?.role === "Manager" || session?.user?.role === "Owner" || session?.user?.role === "Accountant";

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      setExpenses(data.data || []);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingExpense(null);
    fetchExpenses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track manual operating expenses (Labor, Veterinary, Maintenance, etc).</p>
        </div>
        {!isCreating && !editingExpense && isManager && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
        )}
      </div>

      {(isCreating || editingExpense) && isManager && (
        <ExpenseForm 
          initialData={editingExpense} 
          onSuccess={handleSuccess} 
          onCancel={() => { setIsCreating(false); setEditingExpense(null); }} 
        />
      )}

      {!isCreating && !editingExpense && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
        ) : (
          <ExpenseTable data={expenses} onEdit={setEditingExpense} onRefresh={fetchExpenses} canMutate={isManager} />
        )
      )}
    </div>
  );
}
