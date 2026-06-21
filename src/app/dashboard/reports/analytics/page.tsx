"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Activity, Percent, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";

export default function CostAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/accounting/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Failed to load Cost Analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const topBatchRows = (data?.top_batches || []).map((b: any) => ({
        category: 'Top Performing',
        batch: b.batch_number,
        revenue: b.revenue,
        expenses: b.expenses,
        profit: b.profit,
        roi: `${b.roi_percentage.toFixed(1)}%`
      }));
      
      const bottomBatchRows = (data?.bottom_batches || []).map((b: any) => ({
        category: 'Lowest Performing',
        batch: b.batch_number,
        revenue: b.revenue,
        expenses: b.expenses,
        profit: b.profit,
        roi: `${b.roi_percentage.toFixed(1)}%`
      }));

      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Cost Analytics Report',
          columns: [
            { header: 'Category', key: 'category' },
            { header: 'Batch', key: 'batch' },
            { header: 'Revenue (₹)', key: 'revenue' },
            { header: 'Expenses (₹)', key: 'expenses' },
            { header: 'Profit (₹)', key: 'profit' },
            { header: 'ROI', key: 'roi' }
          ],
          data: [
            { category: 'KPI', batch: 'Avg Cost Per Live Animal', revenue: data?.cost_per_animal || 0, expenses: '', profit: '', roi: '' },
            { category: 'KPI', batch: 'Avg Cost Per KG Meat', revenue: data?.cost_per_kg || 0, expenses: '', profit: '', roi: '' },
            { category: '---', batch: '---', revenue: '---', expenses: '---', profit: '---', roi: '---' },
            ...topBatchRows,
            ...bottomBatchRows
          ]
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cost_Analytics.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>;
  if (!data) return <div className="p-6">Data not found.</div>;

  const { cost_per_animal, cost_per_kg, top_batches, bottom_batches } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Deep dive into unit economics and batch performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Cost Per Live Animal</p>
            <p className="text-3xl font-bold text-gray-900">₹{cost_per_animal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            <p className="text-xs text-gray-400 mt-1">Based on total expenses / active animals</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
            <Percent className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Cost Per KG Meat</p>
            <p className="text-3xl font-bold text-gray-900">₹{cost_per_kg.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            <p className="text-xs text-gray-400 mt-1">Based on total expenses / total meat stock</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-emerald-50/30">
            <h2 className="font-bold text-emerald-800 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Top Performing Batches (ROI)
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {top_batches.length > 0 ? top_batches.map((b: any) => (
              <div key={b.batch_number} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{b.batch_number}</p>
                  <p className="text-xs text-gray-500">Rev: ₹{b.revenue.toLocaleString()} | Exp: ₹{b.expenses.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">+{b.roi_percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">₹{b.profit.toLocaleString()} Profit</p>
                </div>
              </div>
            )) : <div className="p-4 text-gray-500 text-sm">No Positive ROI Batches</div>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-red-50/30">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-600" /> Lowest Performing Batches (ROI)
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {bottom_batches.length > 0 ? bottom_batches.map((b: any) => (
              <div key={b.batch_number} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{b.batch_number}</p>
                  <p className="text-xs text-gray-500">Rev: ₹{b.revenue.toLocaleString()} | Exp: ₹{b.expenses.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${b.roi_percentage >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {b.roi_percentage > 0 ? "+" : ""}{b.roi_percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">₹{b.profit.toLocaleString()} Profit</p>
                </div>
              </div>
            )) : <div className="p-4 text-gray-500 text-sm">No Loss-Making Batches</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
