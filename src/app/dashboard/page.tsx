import { OverviewAnalytics } from "@/features/dashboard/components/OverviewAnalytics";
import { ArrowUpRight, ArrowDownRight, Droplets, Zap, Activity, Users, FileText, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Animals by Stage", value: "825 Chicks", icon: Users, color: "text-blue-500", bg: "bg-blue-50", trend: "+1.2%", positive: true },
          { label: "Mortality Today", value: "7", icon: Activity, color: "text-red-500", bg: "bg-red-50", trend: "+1.7%", positive: false },
          { label: "Today's Feed Cost", value: "820 kg", icon: FileText, color: "text-orange-500", bg: "bg-orange-50", trend: "+2.1%", positive: false },
          { label: "Today's Revenue", value: "$1,640", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50", trend: "+5.3%", positive: true },
          { label: "Water Usage", value: "1,350 L", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-50", trend: "-15.3%", positive: true },
          { label: "Electricity", value: "545 kWh", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50", trend: "+2.1%", positive: false },
          { label: "Total Animals", value: "1,120", icon: Users, color: "text-indigo-500", bg: "bg-indigo-50", trend: "+4.2%", positive: true },
          { label: "Receivables", value: "$3,400", icon: DollarSign, color: "text-gray-500", bg: "bg-gray-100", trend: "-1.1%", positive: false },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${kpi.bg}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
              </div>
            </div>
            <div className={`flex items-center text-sm font-medium ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              {kpi.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Widgets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Overview Analytics</h2>
          <button className="text-sm font-medium text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md">
            Show More
          </button>
        </div>
        <OverviewAnalytics />
      </div>
    </div>
  );
}
