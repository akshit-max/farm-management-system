"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProfitAndLossPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  const fetchPL = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/accounting/pl?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch P&L");
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Failed to load Profit & Loss data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPL();
  }, [period]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>;
  if (!data) return <div className="p-6">Data not found.</div>;

  const { revenue, expenses, profit, margin } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time financial aggregation across all modules.</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-10 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 bg-white"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">₹{revenue.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-status-danger">₹{expenses.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm ${profit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className={`text-sm font-medium mb-1 ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>Net Profit</p>
          <p className={`text-3xl font-bold ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            ₹{profit.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </p>
          <div className="mt-2 flex items-center gap-1 text-sm font-medium">
            <TrendingUp className="w-4 h-4" /> {margin.toFixed(1)}% Margin
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-900">Revenue Breakdown</h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Sales Invoices</span>
              <span className="font-medium">₹{revenue.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-900">Expense Breakdown</h2>
          </div>
          <div className="p-4 space-y-1">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Cost of Goods Sold (COGS)</span>
              <span className="font-medium text-status-danger">₹{expenses.cogs?.toLocaleString(undefined, {minimumFractionDigits: 2}) || "0.00"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Water Cost</span>
              <span className="font-medium text-status-danger">₹{expenses.water.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Electricity Cost</span>
              <span className="font-medium text-status-danger">₹{expenses.electricity.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            {expenses.breakdown.map((b: any) => (
              <div key={b.category} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">{b.category} (Manual)</span>
                <span className="font-medium text-status-danger">₹{b.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
