const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

const reports = [
  { id: 'batch-profitability', title: 'Batch Profitability Report' },
  { id: 'mortality', title: 'Mortality Report' },
  { id: 'feed', title: 'Feed Consumption Report' },
  { id: 'water', title: 'Water Usage Report' },
  { id: 'electricity', title: 'Electricity Usage Report' },
  { id: 'customers', title: 'Customer Revenue Ranking' },
  { id: 'suppliers', title: 'Supplier Comparison' }
];

function writeFile(filePath, content) {
  const fullPath = path.join(baseDir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
}

// 1. UI Route Generator
reports.forEach(report => {
  const uiCode = `
"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function ${report.id.replace(/-./g, x => x[1].toUpperCase()).replace(/^./, x => x.toUpperCase())}Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = \`/api/reports/${report.id}?period=\${period}\`;
      if (period === "custom" && customStart && customEnd) {
        url += \`&startDate=\${customStart}&endDate=\${customEnd}\`;
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
    toast.success(\`Exporting \${format.toUpperCase()}...\`);
    // Export logic here
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
          <h1 className="text-2xl font-bold text-gray-900">${report.title}</h1>
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <EmptyState title="Report under construction" description="Data aggregation and visualization will be implemented here." />
      </div>
    </div>
  );
}
  `;
  writeFile(`src/app/dashboard/reports/${report.id}/page.tsx`, uiCode);
});

// Reports Hub Page
writeFile('src/app/dashboard/reports/page.tsx', `
"use client";

import Link from "next/link";
import { FileText, Users, Droplets, Zap, TrendingUp, Package, Activity } from "lucide-react";

export default function ReportsHub() {
  const reports = [
    { title: "Batch Profitability", desc: "Animal counts, feed & utility costs, ROI.", icon: TrendingUp, href: "/dashboard/reports/batch-profitability", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Mortality Report", desc: "Total deaths, reasons, and category trends.", icon: Activity, href: "/dashboard/reports/mortality", color: "text-rose-500", bg: "bg-rose-50" },
    { title: "Feed Consumption", desc: "Quantity consumed, costs, and efficiency.", icon: Package, href: "/dashboard/reports/feed", color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Water Report", desc: "Volume consumed, total cost, room usage.", icon: Droplets, href: "/dashboard/reports/water", color: "text-cyan-500", bg: "bg-cyan-50" },
    { title: "Electricity Report", desc: "Units consumed, cost, meter details.", icon: Zap, href: "/dashboard/reports/electricity", color: "text-yellow-500", bg: "bg-yellow-50" },
    { title: "Customer Revenue Ranking", desc: "Top customers, revenue, outstanding balances.", icon: Users, href: "/dashboard/reports/customers", color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Supplier Comparison", desc: "Top suppliers, linked feed types, frequency.", icon: Users, href: "/dashboard/reports/suppliers", color: "text-purple-500", bg: "bg-purple-50" }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Module</h1>
        <p className="text-sm text-gray-500">Comprehensive data reports and exports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => (
          <Link href={report.href} key={idx}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer h-full group">
              <div className="flex items-center gap-4">
                <div className={\`p-3 rounded-xl \${report.bg} \${report.color} group-hover:scale-110 transition-transform\`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{report.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
`);

console.log('UI Scaffolding complete.');
