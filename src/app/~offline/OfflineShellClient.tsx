"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/features/shared/components/DashboardShell";
import ExpensesPage from "@/app/dashboard/expenses/page";
import CustomerLedgerPage from "@/app/dashboard/customers/[id]/page";
import BatchDetailPage from "@/app/dashboard/animal-batches/[id]/page";
import SuppliersPage from "@/app/dashboard/suppliers/page";
import CustomersPage from "@/app/dashboard/customers/page";
import FeedTypesPage from "@/app/dashboard/feed-types/page";
import { useRBAC } from "@/lib/rbac-client";

export default function OfflineFallback() {
  const [currentPath, setCurrentPath] = useState("");
  const { role } = useRBAC();

  useEffect(() => {
    // We are on the client side, get the path the user actually requested
    setCurrentPath(window.location.pathname);
  }, []);

  // Determine what to render based on the path
  const renderContent = () => {
    if (currentPath.includes("/dashboard/expenses")) {
      return <ExpensesPage />;
    }
    
    if (currentPath === "/dashboard/suppliers" || currentPath === "/dashboard/suppliers/") {
      return <SuppliersPage />;
    }
    
    if (currentPath === "/dashboard/customers" || currentPath === "/dashboard/customers/") {
      return <CustomersPage />;
    }
    
    if (currentPath === "/dashboard/feed-types" || currentPath === "/dashboard/feed-types/") {
      return <FeedTypesPage />;
    }
    
    if (currentPath.startsWith("/dashboard/customers/")) {
      const parts = currentPath.split("/");
      if (parts.length > 3 && parts[3]) {
        const LedgerPageAny = CustomerLedgerPage as any;
        return <LedgerPageAny params={Promise.resolve({ id: parts[3] })} />;
      }
    }
    
    if (currentPath.startsWith("/dashboard/animal-batches/")) {
      const parts = currentPath.split("/");
      if (parts.length > 3 && parts[3]) {
        const BatchPageAny = BatchDetailPage as any;
        return <BatchPageAny params={Promise.resolve({ id: parts[3] })} />;
      }
    }
    
    // Default offline view for unsupported modules
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-20">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Offline Mode</h2>
        <p className="text-gray-500 max-w-md text-center">
          You are offline. Direct URL navigation to this module is not supported in offline mode.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Please use the sidebar menus to navigate to cached pages.
        </p>
      </div>
    );
  };

  return (
    <DashboardShell userRole={role}>
      {currentPath ? renderContent() : null}
    </DashboardShell>
  );
}
