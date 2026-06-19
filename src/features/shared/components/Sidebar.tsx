"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Grid, Settings, LineChart, FileText, ShoppingCart, Activity, Zap, Droplets, BookOpen, Tractor, Layers, Plus, UserCog, Package } from 'lucide-react';

export function Sidebar({ isCollapsed = false, userRole = "Worker" }: { isCollapsed?: boolean; userRole?: string }) {
  const pathname = usePathname();

  const isOwner = userRole === "Owner";
  const isManager = userRole === "Manager" || isOwner;
  const isAccountant = userRole === "Accountant" || isOwner;

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', show: true },
    { name: 'Animals', icon: Users, href: '/dashboard/animal-categories', show: true },
    { name: 'Stages', icon: Activity, href: '/dashboard/stages', show: true },
    { name: 'Rooms & Structure', icon: Grid, href: '/dashboard/rooms', show: true },
    { name: 'Batches', icon: Layers, href: '/dashboard/animal-batches', show: true },
    { name: 'Slaughter', icon: Activity, href: '/dashboard/slaughter', show: isManager || isAccountant },
    { name: 'Meat Inventory', icon: Package, href: '/dashboard/inventory', show: isManager || isAccountant },
    { name: 'Feed Types', icon: FileText, href: '/dashboard/feed-types', show: true },
    { name: 'Feed Consumption', icon: Activity, href: '/dashboard/feed-consumption', show: true },
    { name: 'Water Usage', icon: Droplets, href: '/dashboard/water-usage', show: true },
    { name: 'Utility Meters', icon: Zap, href: '/dashboard/utility-meters', show: true },
    { name: 'Electricity Usage', icon: Activity, href: '/dashboard/electricity-usage', show: true },
    { name: 'Sales', icon: ShoppingCart, href: '/dashboard/sales', show: isManager || isAccountant },
    { name: 'Accounts', icon: BookOpen, href: '/dashboard/accounts', show: isOwner || isAccountant },
    { name: 'CRM (Suppliers)', icon: Users, href: '/dashboard/suppliers', show: isManager || isAccountant },
    { name: 'CRM (Customers)', icon: Users, href: '/dashboard/customers', show: isManager || isAccountant },
    { name: 'Reports & Analytics', icon: LineChart, href: '/dashboard/reports', show: isManager || isAccountant },
    { name: 'User Management', icon: UserCog, href: '/dashboard/users', show: isOwner },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', show: true },
  ].filter(item => item.show);

  return (
    <aside className={`bg-[var(--color-brand-sidebar)] text-gray-300 flex flex-col h-full overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[260px] hidden md:flex'}`}>
      <div className={`h-[70px] px-6 flex items-center border-b border-[#0a3128] ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <div className="bg-transparent rounded flex items-center justify-center shrink-0">
          <Tractor className="text-white w-7 h-7 stroke-[1.5]" />
        </div>
        {!isCollapsed && <span className="text-white text-xl font-bold tracking-wide whitespace-nowrap">Farm ERP</span>}
      </div>
      
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-x-hidden">
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-[#3a685c] uppercase tracking-wider">
            Main Menu
          </div>
        )}
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group text-[15px] font-medium ${
                isActive 
                  ? 'bg-[var(--color-brand-sidebar-active)] text-white' 
                  : 'hover:bg-[var(--color-brand-sidebar-hover)] hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 transition-opacity ${isActive ? 'opacity-100 text-[var(--color-brand-primary)]' : 'opacity-70 group-hover:opacity-100'}`} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className={`p-4 border-t border-[#0a3128] ${isCollapsed ? 'flex justify-center' : ''}`}>
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
