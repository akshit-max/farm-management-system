"use client";

import { Search, Bell, LogOut, ChevronDown, MapPin, Menu, ShoppingCart, Globe, Maximize } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function Navbar({ toggleSidebar }: { toggleSidebar?: () => void }) {
  return (
    <header className="h-[70px] bg-white shadow-sm flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
      <div className="flex items-center gap-6">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-brand-primary"/>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-text-secondary uppercase font-semibold tracking-wide">Select Farm</span>
            <div className="flex items-center gap-1 cursor-pointer group">
              <span className="text-[14px] font-bold text-text-heading group-hover:text-brand-primary transition-colors">Main Farm</span>
              <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-brand-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden md:flex relative group mr-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-[200px] xl:w-[300px]"
          />
        </div>
        
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors hidden sm:flex">
          <Globe className="w-[20px] h-[20px]" />
        </button>
        
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors relative">
          <ShoppingCart className="w-[20px] h-[20px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-primary rounded-full border border-white"></span>
        </button>
        
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors relative">
          <Bell className="w-[20px] h-[20px]" />
          <span className="absolute top-2 right-2 w-4 h-4 bg-status-danger rounded-full border-[1.5px] border-white text-[9px] text-white flex items-center justify-center font-bold">3</span>
        </button>

        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors hidden sm:flex">
          <Maximize className="w-[20px] h-[20px]" />
        </button>
        
        <div className="flex items-center gap-3 pl-2 md:pl-5 md:border-l border-gray-200 ml-1">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 cursor-pointer">
            <img src="https://ui-avatars.com/api/?name=Jason+Taylor&background=00C291&color=fff&bold=true" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:flex flex-col cursor-pointer">
            <span className="text-[14px] font-bold text-text-heading leading-tight">Jason Taylor</span>
            <span className="text-[12px] text-text-secondary">Owner</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="ml-2 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-status-danger/10 hover:text-status-danger transition-colors" title="Logout">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
