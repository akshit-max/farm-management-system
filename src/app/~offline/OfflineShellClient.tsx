"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/features/shared/components/DashboardShell";
import dynamic from 'next/dynamic';

const ExpensesPage = dynamic(() => import('@/app/dashboard/expenses/page'));
const SalesPage = dynamic(() => import('@/app/dashboard/sales/page'));
const CustomersPage = dynamic(() => import('@/app/dashboard/customers/page'));
const CustomerLedgerPage = dynamic(() => import('@/app/dashboard/customers/[id]/page'));
const AnimalBatchesPage = dynamic(() => import('@/app/dashboard/animal-batches/page'));
const BatchDetailsPage = dynamic(() => import('@/app/dashboard/animal-batches/[id]/page'));
const RoomsPage = dynamic(() => import('@/app/dashboard/rooms/page'));
const CategoriesPage = dynamic(() => import('@/app/dashboard/animal-categories/page'));
const StagesPage = dynamic(() => import('@/app/dashboard/stages/page'));
const WaterPage = dynamic(() => import('@/app/dashboard/water-usage/page'));
const ElectricityPage = dynamic(() => import('@/app/dashboard/electricity-usage/page'));

export default function OfflineFallback() {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const renderContent = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const id = parts.length > 2 ? parts[2] : null;

    if (currentPath.includes("/dashboard/expenses")) return <ExpensesPage />;
    if (currentPath.includes("/dashboard/sales")) return <SalesPage />;
    if (currentPath.includes("/dashboard/customers") && id) return <CustomerLedgerPage params={Promise.resolve({ id })} />;
    if (currentPath.includes("/dashboard/customers")) return <CustomersPage />;
    if (currentPath.includes("/dashboard/animal-batches") && id) return <BatchDetailsPage />;
    if (currentPath.includes("/dashboard/animal-batches")) return <AnimalBatchesPage />;
    if (currentPath.includes("/dashboard/rooms")) return <RoomsPage />;
    if (currentPath.includes("/dashboard/animal-categories")) return <CategoriesPage />;
    if (currentPath.includes("/dashboard/stages")) return <StagesPage />;
    if (currentPath.includes("/dashboard/water-usage")) return <WaterPage />;
    if (currentPath.includes("/dashboard/electricity-usage")) return <ElectricityPage />;
    
    // Default offline view for unsupported modules
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">You are offline</h2>
        <p className="text-gray-500 max-w-md text-center">
          This module is not yet available offline. Please connect to the internet to access it.
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
