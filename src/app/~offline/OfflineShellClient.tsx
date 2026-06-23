"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/features/shared/components/DashboardShell";
import ExpensesPage from "@/app/dashboard/expenses/page";

export default function OfflineFallback() {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    // We are on the client side, get the path the user actually requested
    setCurrentPath(window.location.pathname);
  }, []);

  // Determine what to render based on the path
  const renderContent = () => {
    if (currentPath.includes("/dashboard/expenses")) {
      return <ExpensesPage />;
    }
    
    // Default offline view for unsupported modules
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">You are offline</h2>
        <p className="text-gray-500 max-w-md text-center">
          This module is not yet available offline. The Expenses module is currently supported.
        </p>
      </div>
    );
  };

  return (
    <DashboardShell>
      {currentPath ? renderContent() : null}
    </DashboardShell>
  );
}
