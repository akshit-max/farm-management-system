"use client";

import { Search, Bell, LogOut, ChevronDown, MapPin } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 bg-emerald-50 p-2 rounded-full"><MapPin className="w-5 h-5"/></span>
          <div>
            <p className="text-xs text-gray-500 font-medium">Select Farm</p>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-sm font-bold text-gray-800">Main Farm</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <button className="text-gray-400 hover:text-gray-600"><Search className="w-5 h-5" /></button>
        <button className="text-gray-400 hover:text-gray-600 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">Jason Taylor</p>
            <p className="text-xs text-emerald-600 font-medium">Owner</p>
          </div>
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 shadow-sm">
            JT
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-gray-400 hover:text-red-600 ml-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
