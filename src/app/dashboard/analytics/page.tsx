"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Activity, Users, Zap, Droplets, TrendingUp, DollarSign, Package, AlertTriangle 
} from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

import { feedConsumptionRepository } from "@/lib/offline/repositories/feedConsumptionRepository";

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  const [offlineFeedQty, setOfflineFeedQty] = useState(0);
  const [offlineFeedCost, setOfflineFeedCost] = useState(0);
  const [offlineWaterQty, setOfflineWaterQty] = useState(0);
  const [offlineWaterCost, setOfflineWaterCost] = useState(0);
  const [offlineElecQty, setOfflineElecQty] = useState(0);
  const [offlineElecCost, setOfflineElecCost] = useState(0);
  
  const [offlineExpense, setOfflineExpense] = useState(0);
  const [offlineSalesRevenue, setOfflineSalesRevenue] = useState(0);
  const [offlineSalesReceivables, setOfflineSalesReceivables] = useState(0);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/dashboard?period=${period}`;
      if (period === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        toast.error("Failed to load analytics data");
      }

      // Calculate offline additions
      if (!navigator.onLine) {
         import("@/lib/offline/repositories/feedConsumptionRepository").then(async mod => {
           const all = await mod.feedConsumptionRepository.getAll();
           let addedQty = 0;
           let addedCost = 0;
           all.forEach((item: any) => {
             if (item.isOffline) {
               addedQty += Number(item.quantity_kg || 0);
               addedCost += Number(item.cost || 0);
             }
           });
           setOfflineFeedQty(addedQty);
           setOfflineFeedCost(addedCost);
         });
         import("@/lib/offline/repositories/waterUsageRepository").then(async mod => {
           const all = await mod.waterUsageRepository.getAll();
           let addedQty = 0;
           let addedCost = 0;
           all.forEach((item: any) => {
             if (item.isOffline) {
               addedQty += Number(item.actual_consumption_liters || 0);
               addedCost += Number(item.total_cost || (Number(item.actual_consumption_liters || 0) * Number(item.cost_per_liter || 0)));
             }
           });
           setOfflineWaterQty(addedQty);
           setOfflineWaterCost(addedCost);
         });
         import("@/lib/offline/repositories/electricityUsageRepository").then(async mod => {
           const all = await mod.electricityUsageRepository.getAll();
           let addedQty = 0;
           let addedCost = 0;
           all.forEach((item: any) => {
             if (item.isOffline) {
               addedQty += Number(item.units_consumed || 0);
               addedCost += Number(item.total_cost || (Number(item.units_consumed || 0) * Number(item.cost_per_unit || 0)));
             }
           });
           setOfflineElecQty(addedQty);
           setOfflineElecCost(addedCost);
         });
         import("@/lib/offline/repositories/expenseRepository").then(async mod => {
           const all = await mod.expenseRepository.getAll();
           let addedCost = 0;
           all.forEach((item: any) => {
             if (item.isOffline) {
               addedCost += Number(item.amount || 0);
             }
           });
           setOfflineExpense(addedCost);
         });
         import("@/lib/offline/repositories/salesRepository").then(async mod => {
           const all = await mod.salesRepository.getAll();
           let revenue = 0;
           let receivables = 0;
           all.forEach((sale: any) => {
             if (sale.isOffline) {
               let total = 0;
               if (Array.isArray(sale.items)) {
                 total = sale.items.reduce((sum: number, i: any) => sum + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
               }
               let paid = Number(sale.amount_paid || 0);
               revenue += total;
               receivables += Math.max(0, total - paid);
             }
           });
           setOfflineSalesRevenue(revenue);
           setOfflineSalesReceivables(receivables);
         });
      } else {
         setOfflineFeedQty(0);
         setOfflineFeedCost(0);
         setOfflineWaterQty(0);
         setOfflineWaterCost(0);
         setOfflineElecQty(0);
         setOfflineElecCost(0);
         setOfflineExpense(0);
         setOfflineSalesRevenue(0);
         setOfflineSalesReceivables(0);
      }

    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== "custom" || (period === "custom" && customStart && customEnd)) {
      fetchAnalytics();
    }
  }, [period, customStart, customEnd]);

  const KPICard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 transition-all hover:shadow-md">
      <div className={`p-3 rounded-lg ${colorClass} shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  const ChartCard = ({ title, children }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">{title}</h3>
      <div className="h-[300px] w-full">
        {children}
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] w-full rounded-xl" />
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const { kpis = {}, charts = {}, slaughterMetrics = {} } = data || {};

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Comprehensive farm performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Revenue" value={`₹${(kpis.revenue + offlineSalesRevenue)?.toLocaleString() || 0}`} icon={DollarSign} colorClass="bg-emerald-100 text-emerald-600" />
        <KPICard title="Expenses" value={`₹${(kpis.expenses + offlineFeedCost + offlineWaterCost + offlineElecCost + offlineExpense)?.toLocaleString() || 0}`} icon={TrendingUp} colorClass="bg-red-100 text-red-600" />
        <KPICard title="Net Profit" value={`₹${(kpis.netProfit + offlineSalesRevenue - offlineFeedCost - offlineWaterCost - offlineElecCost - offlineExpense)?.toLocaleString() || 0}`} icon={Activity} colorClass="bg-blue-100 text-blue-600" />
        <KPICard title="Receivables" value={`₹${(kpis.receivables + offlineSalesReceivables)?.toLocaleString() || 0}`} icon={DollarSign} colorClass="bg-amber-100 text-amber-600" />
        
        <KPICard title="Live Animals" value={kpis.liveAnimals || 0} icon={Users} colorClass="bg-indigo-100 text-indigo-600" />
        <KPICard title="Mortality Rate" value={`${kpis.mortalityRate?.toFixed(2) || 0}%`} subtext={`${kpis.mortalityCount || 0} deaths`} icon={AlertTriangle} colorClass="bg-rose-100 text-rose-600" />
        
        <KPICard title="Feed Consumed" value={`${(kpis.feedConsumed + offlineFeedQty)?.toLocaleString() || 0} kg`} subtext={`Efficiency: ${((kpis.feedConsumed + offlineFeedQty) / (kpis.liveAnimals || 1))?.toFixed(2)} kg/animal`} icon={Package} colorClass="bg-orange-100 text-orange-600" />
        <KPICard title="Water Consumed" value={`${(kpis.waterConsumed + offlineWaterQty)?.toLocaleString() || 0} L`} subtext={`Cost: ₹${(kpis.waterCost + offlineWaterCost)?.toFixed(2)}`} icon={Droplets} colorClass="bg-cyan-100 text-cyan-600" />
        <KPICard title="Elec Consumed" value={`${(kpis.elecConsumed + offlineElecQty)?.toLocaleString() || 0} kWh`} subtext={`Cost: ₹${(kpis.elecCost + offlineElecCost)?.toFixed(2)}`} icon={Zap} colorClass="bg-yellow-100 text-yellow-600" />
        <KPICard title="Utility Efficiency" value={`Water: ${((kpis.waterConsumed + offlineWaterQty) / (kpis.liveAnimals || 1))?.toFixed(2)} L/A`} subtext={`Elec: ${((kpis.elecConsumed + offlineElecQty) / (kpis.liveAnimals || 1))?.toFixed(2)} kWh/A`} icon={Activity} colorClass="bg-purple-100 text-purple-600" />
      </div>

      {/* CHARTS ROW 1: FINANCIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue vs Expense Trend">
          {charts.financialTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.financialTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v: any) => `₹${Number(v || 0).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Financial Data" description="No revenue or expenses recorded in this period." />}
        </ChartCard>

        <ChartCard title="Customer Revenue Distribution">
          {charts.customerDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.customerDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                  {charts.customerDistribution.map((_: any, idx: number) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `₹${Number(v || 0).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Customer Data" description="No customer revenue recorded." />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 2: OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Mortality Trend">
          {charts.mortalityTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.mortalityTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="count" name="Deaths" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Mortalities" description="No mortalities recorded." />}
        </ChartCard>

        <ChartCard title="Inventory Distribution">
          {charts.inventoryDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.inventoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {charts.inventoryDistribution.map((_: any, idx: number) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Empty Inventory" description="No inventory items found." />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 3: FEED & UTILITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Feed Consumption Trend">
          {charts.feedTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.feedTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="quantity" name="Quantity (kg)" stroke="#f59e0b" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost (₹)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Feed Data" description="No feed consumption recorded." />}
        </ChartCard>

        <ChartCard title="Room Occupancy & Utilization">
          {charts.roomOccupancy?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.roomOccupancy}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="room" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" name="Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupancy" name="Occupied" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Room Data" description="No batches assigned to rooms." />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 4: SLAUGHTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Slaughter Processing Trend">
          {charts.slaughterTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.slaughterTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="step" dataKey="count" name="Animals Processed" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Processing Data" description="No slaughter records found." />}
        </ChartCard>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6">Yield Analytics</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-500 font-medium">Average Yield</span>
              <span className="text-2xl font-bold text-emerald-600">{slaughterMetrics.avgYield?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-500 font-medium">Total Meat Produced</span>
              <span className="text-2xl font-bold text-gray-900">{slaughterMetrics.totalMeatProduced?.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Total Waste</span>
              <span className="text-2xl font-bold text-red-500">{slaughterMetrics.totalWaste?.toFixed(2)} kg</span>
            </div>
          </div>
        </div>
      </div>
      {/* CHARTS ROW 5: UTILITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Water Consumption & Cost Trend">
          {charts.waterTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.waterTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="consumption" name="Volume (L)" stroke="#06b6d4" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost (₹)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Water Data" description="No water usage recorded." />}
        </ChartCard>

        <ChartCard title="Electricity Consumption & Cost Trend">
          {charts.elecTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.elecTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="consumption" name="Usage (kWh)" stroke="#eab308" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost (₹)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Electricity Data" description="No electricity usage recorded." />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 6: GROWTH TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Animal Growth Trend">
          {charts.animalGrowthTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.animalGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="stepAfter" dataKey="population" name="Total Animals" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Animal Growth Data" description="No batches recorded." />}
        </ChartCard>

        <ChartCard title="Revenue Growth Trend">
          {charts.revenueGrowthTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.revenueGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v: any) => `₹${Number(v || 0).toFixed(2)}`} />
                <Line type="monotone" dataKey="revenue" name="Cumulative Revenue" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Revenue Growth Data" description="No sales recorded." />}
        </ChartCard>

        <ChartCard title="Inventory Value Growth Trend">
          {charts.inventoryGrowthTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.inventoryGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v: any) => `₹${Number(v || 0).toFixed(2)}`} />
                <Line type="monotone" dataKey="value" name="Cumulative Value" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Inventory Growth Data" description="No inventory items added." />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 7: STAGE & SUPPLIER ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Stage Distribution">
          {charts.stageDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.stageDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label>
                  {charts.stageDistribution.map((_: any, idx: number) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Stage Data" description="No active batches assigned to stages." />}
        </ChartCard>

        <ChartCard title="Animals Per Stage">
          {charts.stageDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.stageDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="value" name="Animals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No Stage Data" description="No active batches assigned to stages." />}
        </ChartCard>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Stage Profitability</h3>
          <EmptyState title="Insufficient Data" description="Granular stage-level costing is unavailable for profitability calculations." />
        </div>
      </div>

      {/* CHARTS ROW 8: RANKING TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-auto max-h-[400px]">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 sticky top-0 bg-white">Top Customers</h3>
          {charts.topCustomers?.length > 0 ? (
            <div className="space-y-4">
              {charts.topCustomers.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="font-medium text-gray-700">{i+1}. {c.customer}</span>
                  <span className="font-bold text-emerald-600">₹{c.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No Customer Data" description="No revenue recorded." />}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-auto max-h-[400px]">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 sticky top-0 bg-white">Outstanding Balances</h3>
          {charts.outstandingBalances?.length > 0 ? (
            <div className="space-y-4">
              {charts.outstandingBalances.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="font-medium text-gray-700">{i+1}. {c.customer}</span>
                  <span className="font-bold text-red-500">₹{c.outstanding.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No Outstanding Balances" description="All invoices are paid." />}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-auto max-h-[400px]">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 sticky top-0 bg-white">Top Suppliers</h3>
          {charts.topSuppliers?.length > 0 ? (
            <div className="space-y-4">
              {charts.topSuppliers.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="font-medium text-gray-700">{i+1}. {s.supplier}</span>
                  <span className="text-sm text-gray-500">{s.count} purchases</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No Supplier Data" description="No suppliers recorded." />}
        </div>
      </div>
    </div>
  );
}
