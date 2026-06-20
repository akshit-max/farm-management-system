"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function FeedConsumptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/feed?period=${period}`;
      if (period === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        toast.error("Failed to load report data");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== "custom" || (period === "custom" && customStart && customEnd)) {
      fetchData();
    }
  }, [period, customStart, customEnd]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Feed Consumption Report',
          columns: [{ header: 'Feed Type', key: 'feedType' }, { header: 'Quantity (kg)', key: 'quantity' }, { header: 'Cost (₹)', key: 'cost' }],
          data: data?.rows || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Feed_Consumption_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed Consumption Report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 outline-none"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}

          <div className="flex items-center gap-2 border-l pl-3 ml-2 border-gray-200">
            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Consumed</p>
          <h4 className="text-2xl font-bold text-gray-900">{data?.kpis?.totalConsumed || 0} kg</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Cost</p>
          <h4 className="text-2xl font-bold text-red-600">₹{data?.kpis?.totalCost?.toFixed(2) || 0}</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Feed Efficiency</p>
          <h4 className="text-2xl font-bold text-emerald-600">{data?.kpis?.feedEfficiency?.toFixed(2) || 0} kg/A</h4>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-800 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Feed Type</th>
                <th className="px-6 py-4 font-semibold">Quantity (kg)</th>
                <th className="px-6 py-4 font-semibold">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.rows?.length > 0 ? data.rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{row.feedType}</td>
                  <td className="px-6 py-4">{row.quantity} kg</td>
                  <td className="px-6 py-4 font-medium text-red-500">₹{row.cost?.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    <EmptyState title="No Data Found" description="No records match the selected filters." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}