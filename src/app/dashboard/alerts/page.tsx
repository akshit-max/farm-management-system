"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/features/shared/components/ui/Card";
import { Check, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canMutate = session?.user?.role !== "Worker";

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      await fetch("/api/alerts/generate", { method: "POST" });
      const res = await fetch("/api/alerts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markAsRead = async (id: string) => {
    if (!canMutate) return;
    try {
      const res = await fetch(`/api/alerts/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
      }
    } catch (err) {}
  };

  const markAllRead = async () => {
    if (!canMutate) return;
    try {
      const res = await fetch("/api/alerts/mark-all-read", { method: "POST" });
      if (res.ok) {
        setAlerts(alerts.map(a => ({ ...a, is_read: true })));
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Center</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor farm warnings and critical events</p>
        </div>
        {canMutate && alerts.some(a => !a.is_read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Check className="w-4 h-4 text-brand-primary" />
            Mark All as Read
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No alerts found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 flex gap-4 transition-colors ${!alert.is_read ? 'bg-[var(--color-brand-primary)]/5' : 'bg-white'}`}>
                  <div className="mt-1 shrink-0">
                    {alert.severity === 'CRITICAL' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {alert.severity === 'WARNING' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    {alert.severity === 'INFO' && <Info className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-semibold ${!alert.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {alert.title}
                      </h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${!alert.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {alert.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        {alert.type}
                      </span>
                      {canMutate && !alert.is_read && (
                        <button onClick={() => markAsRead(alert.id)} className="text-xs text-[var(--color-brand-primary)] hover:underline font-medium">
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
