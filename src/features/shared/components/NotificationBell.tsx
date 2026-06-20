"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        await fetch("/api/alerts/generate", { method: "POST" });
        const res = await fetch("/api/alerts?limit=1&unreadOnly=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch alerts", err);
      }
    };
    
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <Link href="/dashboard/alerts" className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
      <Bell className="w-[20px] h-[20px]" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
