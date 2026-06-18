import Link from 'next/link';
import { LayoutDashboard, Users, Grid, Settings, LineChart, FileText, ShoppingCart, Activity, Zap, Droplets, BookOpen, Layers } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Animals', icon: Users, href: '/dashboard/animals' },
  { name: 'Rooms & Farm Structure', icon: Grid, href: '/dashboard/structure' },
  { name: 'Feed Management', icon: Layers, href: '/dashboard/feed' },
  { name: 'Water Management', icon: Droplets, href: '/dashboard/water' },
  { name: 'Electricity Manager', icon: Zap, href: '/dashboard/electricity' },
  { name: 'Inventory', icon: BookOpen, href: '/dashboard/inventory' },
  { name: 'Sales', icon: ShoppingCart, href: '/dashboard/sales' },
  { name: 'CRM', icon: Users, href: '/dashboard/crm' },
  { name: 'Accounts', icon: FileText, href: '/dashboard/accounts' },
  { name: 'Reports & Analytics', icon: LineChart, href: '/dashboard/reports' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#112a23] text-gray-300 flex flex-col h-full overflow-y-auto">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-emerald-500 rounded p-1">
          <Activity className="text-white w-6 h-6" />
        </div>
        <span className="text-white text-2xl font-semibold tracking-wide">ynex</span>
      </div>
      <nav className="flex-1 px-4 pb-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#1a3a31] hover:text-white transition-colors group text-sm font-medium"
          >
            <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[#1a3a31]">
        <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md transition-colors text-sm font-medium">
          <span className="text-lg leading-none">+</span> Farm Action
        </button>
      </div>
    </aside>
  );
}
