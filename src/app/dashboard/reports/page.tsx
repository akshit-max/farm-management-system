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
                <div className={`p-3 rounded-xl ${report.bg} ${report.color} group-hover:scale-110 transition-transform`}>
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