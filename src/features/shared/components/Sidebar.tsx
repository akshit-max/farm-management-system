"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Grid, Settings, LineChart, FileText, ShoppingCart, Activity, Zap, Droplets, BookOpen, Tractor, Layers, Plus, UserCog, Package, TrendingUp, ShieldCheck } from 'lucide-react';

export function Sidebar({ isCollapsed = false, userRole = "Worker" }: { isCollapsed?: boolean; userRole?: string }) {
  const pathname = usePathname();

  const isOwner = userRole === "Owner";
  const isManager = userRole === "Manager" || isOwner;
  const isAccountant = userRole === "Accountant" || isOwner;

  const menuGroups = [
    {
      title: "Overview",
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', show: true },
      ]
    },
    {
      title: "Operations",
      items: [
        { name: 'Animals', icon: Users, href: '/dashboard/animal-categories', show: true },
        { name: 'Stages', icon: Activity, href: '/dashboard/stages', show: true },
        { name: 'Rooms & Structure', icon: Grid, href: '/dashboard/rooms', show: true },
        { name: 'Batches', icon: Layers, href: '/dashboard/animal-batches', show: true },
      ]
    },
    {
      title: "Processing",
      items: [
        { name: 'Slaughter', icon: Activity, href: '/dashboard/slaughter', show: true },
        { name: 'Meat Inventory', icon: Package, href: '/dashboard/inventory', show: true },
      ]
    },
    {
      title: "Feed & Utilities",
      items: [
        { name: 'Feed Types', icon: FileText, href: '/dashboard/feed-types', show: true },
        { name: 'Feed Consumption', icon: Activity, href: '/dashboard/feed-consumption', show: true },
        { name: 'Water Usage', icon: Droplets, href: '/dashboard/water-usage', show: true },
        { name: 'Utility Meters', icon: Zap, href: '/dashboard/utility-meters', show: true },
        { name: 'Electricity Usage', icon: Activity, href: '/dashboard/electricity-usage', show: true },
      ]
    },
    {
      title: "Sales & Finance",
      items: [
        { name: 'Sales', icon: ShoppingCart, href: '/dashboard/sales', show: isManager || isAccountant },
        { name: 'Accounts', icon: BookOpen, href: '/dashboard/accounts', show: isOwner || isAccountant },
        { name: 'Expenses', icon: FileText, href: '/dashboard/expenses', show: true },
      ]
    },
    {
      title: "Analytics & Reports",
      items: [
        { name: 'Analytics', icon: LineChart, href: '/dashboard/analytics', show: true },
        { name: 'Reports', icon: FileText, href: '/dashboard/reports', show: isManager || isAccountant },
        { name: 'Profit & Loss', icon: TrendingUp, href: '/dashboard/reports/pl', show: isManager || isAccountant },
        { name: 'Cost Analytics', icon: LineChart, href: '/dashboard/reports/analytics', show: isManager || isAccountant },
        { name: 'Cash Flow', icon: FileText, href: '/dashboard/reports/cash-flow', show: isManager || isAccountant },
        { name: 'Balance Sheet', icon: FileText, href: '/dashboard/reports/balance-sheet', show: isManager || isAccountant },
        { name: 'Room Efficiency', icon: Activity, href: '/dashboard/reports/room-efficiency', show: isManager || isAccountant },
        { name: 'Stage Performance', icon: Activity, href: '/dashboard/reports/stage-performance', show: isManager || isAccountant },
      ]
    },
    {
      title: "CRM",
      items: [
        { name: 'CRM (Suppliers)', icon: Users, href: '/dashboard/suppliers', show: isManager || isAccountant },
        { name: 'CRM (Customers)', icon: Users, href: '/dashboard/customers', show: isManager || isAccountant },
        { name: 'CRM Ratings', icon: Activity, href: '/dashboard/crm/ratings', show: isManager || isAccountant },
        { name: 'Payment Terms', icon: Settings, href: '/dashboard/crm/payment-terms', show: isManager || isAccountant },
        { name: 'Client Ranking', icon: TrendingUp, href: '/dashboard/crm/client-ranking', show: isManager || isAccountant },
        { name: 'Supplier Compare', icon: Users, href: '/dashboard/crm/supplier-comparison', show: isManager || isAccountant },
      ]
    },
    {
      title: "Administration",
      items: [
        { name: 'User Management', icon: UserCog, href: '/dashboard/users', show: isOwner },
        { name: 'Settings', icon: Settings, href: '/dashboard/settings', show: true },
        { name: 'Security', icon: ShieldCheck, href: '/dashboard/settings/security', show: isOwner || isManager || isAccountant },
      ]
    }
  ];

  return (
    <aside className={`bg-[var(--color-brand-sidebar)] text-gray-300 flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[260px] hidden md:flex'}`}>
      <div className={`h-[70px] shrink-0 px-6 flex items-center border-b border-[#0a3128] ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <div className="bg-transparent rounded flex items-center justify-center shrink-0">
          <Tractor className="text-white w-7 h-7 stroke-[1.5]" />
        </div>
        {!isCollapsed && <span className="text-white text-xl font-bold tracking-wide whitespace-nowrap">Farm ERP</span>}
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {menuGroups.map((group, idx) => {
          const visibleItems = group.items.filter(i => i.show);
          if (visibleItems.length === 0) return null;
          
          return (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 mb-1.5 mt-2 text-[10px] font-bold text-[#3a685c] uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {isCollapsed && idx !== 0 && <div className="w-8 h-px bg-[#0a3128] mx-auto my-3" />}
              
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors group text-[14px] font-medium ${
                      isActive 
                        ? 'bg-[var(--color-brand-sidebar-active)] text-white' 
                        : 'hover:bg-[var(--color-brand-sidebar-hover)] hover:text-white'
                    } ${isCollapsed ? 'justify-center py-2' : ''}`}
                  >
                    <item.icon className={`w-[16px] h-[16px] shrink-0 transition-opacity ${isActive ? 'opacity-100 text-[var(--color-brand-primary)]' : 'opacity-70 group-hover:opacity-100'}`} />
                    {!isCollapsed && (
                      <>
                        <span className="whitespace-nowrap">{item.name}</span>
                        {isActive && (
                          <span className="ml-auto text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)]">
                            Active
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      
      <div className={`shrink-0 p-4 border-t border-[#0a3128] ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button 
          title={isCollapsed ? "Farm Action" : undefined}
          className={`flex items-center justify-center gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white py-2.5 rounded-lg transition-colors text-[15px] font-medium ${isCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full'}`}
        >
          {isCollapsed ? <Plus className="w-5 h-5" /> : <><span className="text-lg leading-none">+</span> Farm Action</>}
        </button>
      </div>
    </aside>
  );
}
