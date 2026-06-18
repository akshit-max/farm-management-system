"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar isCollapsed={isCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        <Navbar toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-page-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
