"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

import { processSyncQueue, recoverFailedSyncTasks } from "@/lib/offline/sync";

export function DashboardShell({ children, userRole }: { children: React.ReactNode; userRole?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network restored. Processing sync queue globally...");
      processSyncQueue();
    };
    
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) {
      recoverFailedSyncTasks().then(() => {
        processSyncQueue();
      });
    }
    
    return () => window.removeEventListener("online", handleOnline);
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar isCollapsed={isCollapsed} userRole={userRole} />
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        <Navbar toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-page-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
