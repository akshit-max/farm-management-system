"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Box, LineChart, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

export default function AccountsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/accounting/dashboard");
      if (!res.ok) throw new Error("Failed to fetch accounts dashboard");
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>;
  if (!data) return <div className="p-6">Data not found.</div>;

  const { metrics, expenseBreakdown, recentActivity, revenueTrend } = data;
  const PIE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting & Finance</h1>
          <p className="text-gray-500 text-sm mt-1">Unified view of your financial health and assets.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/reports/pl" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm">
            Profit & Loss <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/reports/cash-flow" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary transition-colors text-sm font-medium flex items-center gap-2 shadow-sm">
            Cash Flow <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <div className="bg-emerald-100 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-4">₹{metrics.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <div className="bg-red-100 p-2 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
          </div>
          <p className="text-2xl font-bold text-status-danger mt-4">₹{metrics.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${metrics.netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${metrics.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>Net Profit</p>
            <div className={`p-2 rounded-lg ${metrics.netProfit >= 0 ? "bg-emerald-200" : "bg-red-200"}`}>
              <TrendingUp className={`w-4 h-4 ${metrics.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-4 ${metrics.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            ₹{metrics.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Cash Position</p>
            <div className="bg-blue-100 p-2 rounded-lg"><Wallet className="w-4 h-4 text-blue-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-4">₹{metrics.cashPosition.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        {/* Row 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Accounts Receivable</p>
          <p className="text-xl font-bold text-gray-900 mt-2">₹{metrics.receivables.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Accounts Payable</p>
          <p className="text-xl font-bold text-gray-900 mt-2">₹{metrics.payables.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Box className="w-4 h-4" /> Live Animal Assets
          </div>
          <p className="text-xl font-bold text-gray-900 mt-2">₹{metrics.liveAnimalAssetValue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Box className="w-4 h-4" /> Feed Inventory
          </div>
          <p className="text-xl font-bold text-gray-900 mt-2">₹{metrics.feedInventoryValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend (6 Months)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <Tooltip 
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Expense Breakdown</h2>
          {metrics.totalExpenses > 0 ? (
            <div className="h-64 w-full flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown.filter((d: any) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdown.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {expenseBreakdown.filter((d: any) => d.value > 0).map((entry: any, idx: number) => (
                  <div key={entry.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                      <span className="text-gray-600">{entry.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">₹{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No expenses recorded</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Financial Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length > 0 ? recentActivity.map((activity: any) => (
              <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 text-sm">{activity.description || activity.category}</span>
                  <span className="text-xs text-gray-500">{format(new Date(activity.date), "MMM d, yyyy")} • {activity.category}</span>
                </div>
                <span className={`font-bold text-sm ${activity.type === 'PAYMENT_RECEIVED' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {activity.type === 'PAYMENT_RECEIVED' ? '+' : '-'}₹{activity.amount.toLocaleString()}
                </span>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">No recent activity</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link href="/dashboard/reports/balance-sheet" className="p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Balance Sheet</p>
                <p className="text-xs text-gray-500">View assets & liabilities</p>
              </div>
            </Link>
            <Link href="/dashboard/reports/analytics" className="p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><LineChart className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Cost Analytics</p>
                <p className="text-xs text-gray-500">Cost per animal & meat</p>
              </div>
            </Link>
            <Link href="/dashboard/sales" className="p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Sales Invoices</p>
                <p className="text-xs text-gray-500">Manage incoming revenue</p>
              </div>
            </Link>
            <Link href="/dashboard/expenses" className="p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="bg-red-100 p-2 rounded-lg text-red-600"><TrendingDown className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Expenses</p>
                <p className="text-xs text-gray-500">Record manual costs</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
