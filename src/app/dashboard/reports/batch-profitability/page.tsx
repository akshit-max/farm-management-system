"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function BatchProfitabilityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/batch-profitability`);
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

  useEffect(() => { fetchData(); }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Batch Profitability Report',
          columns: [{ header: 'Batch', key: 'batch' }, { header: 'Category', key: 'category' }, { header: 'Animal Count', key: 'animalCount' }, { header: 'Purchase Cost', key: 'purchaseCost' }, { header: 'Feed Cost', key: 'feedCost' }, { header: 'Utility Cost', key: 'utilityCost' }, { header: 'Revenue', key: 'revenue' }, { header: 'Net Profit', key: 'netProfit' }, { header: 'ROI %', key: 'roi' }],
          data: data?.rows || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Batch_Profitability_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
          <h1 className="text-2xl font-bold text-gray-900">Batch Profitability Report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200">
            All-Time Report
          </span>
            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-800 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Batch</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Animal Count</th>
                <th className="px-6 py-4 font-semibold">Purchase Cost (₹)</th>
                <th className="px-6 py-4 font-semibold">Feed Cost (₹)</th>
                <th className="px-6 py-4 font-semibold">Utility Cost (₹)</th>
                <th className="px-6 py-4 font-semibold">Revenue (₹)</th>
                <th className="px-6 py-4 font-semibold">Net Profit (₹)</th>
                <th className="px-6 py-4 font-semibold">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.rows?.length > 0 ? data.rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.batch}</td>
                  <td className="px-6 py-4">{row.category}</td>
                  <td className="px-6 py-4">{row.animalCount}</td>
                  <td className="px-6 py-4">₹{row.purchaseCost?.toFixed(2)}</td>
                  <td className="px-6 py-4">₹{row.feedCost?.toFixed(2)}</td>
                  <td className="px-6 py-4">₹{row.utilityCost?.toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">₹{row.revenue?.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-bold ${row.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{row.netProfit?.toFixed(2)}</td>
                  <td className="px-6 py-4">{row.roi?.toFixed(2)}%</td>
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