"use client";

import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { CustomerTable } from "@/features/customers/components/CustomerTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function CustomersPage() {
  const [key, setKey] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const { canManageCustomers } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Customers CRM</h1>
      </div>
      {canManageCustomers && (
        <CustomerForm 
          onSuccess={handleSuccess} 
          initialData={editingCustomer} 
          onCancel={editingCustomer ? () => setEditingCustomer(null) : undefined} 
        />
      )}
      <CustomerTable 
        keyIndex={key} 
        onEdit={(customer) => setEditingCustomer(customer)} 
      />
    </div>
  );
}
