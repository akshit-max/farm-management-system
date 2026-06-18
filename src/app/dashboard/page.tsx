import { OverviewAnalytics } from "@/features/dashboard/components/OverviewAnalytics";
import { ArrowUpRight, ArrowDownRight, Droplets, Zap, Activity, Users, FileText, DollarSign, Layers, ShieldPlus } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  
  if (!farmId) {
    return <div className="p-6">Error: User is not assigned to a farm.</div>;
  }

  // Fetch Real Phase 1 Data
  const [totalBatches, animalSum, mortalities, pendingVaccinations] = await Promise.all([
    db.animalBatch.count({ where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" } }),
    db.animalBatch.aggregate({ _sum: { quantity: true }, where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" } }),
    db.mortality.aggregate({ _sum: { quantity: true }, where: { batch: { farm_id: farmId }, deleted_at: null } }),
    db.vaccination.findMany({ where: { batch: { farm_id: farmId }, status: "PENDING", deleted_at: null } }),
  ]);

  const totalAnimals = animalSum._sum.quantity || 0;
  const totalMortality = mortalities._sum.quantity || 0;
  
  const now = new Date();
  const overdueVaccinationsCount = pendingVaccinations.filter(v => new Date(v.due_date) < now).length;
  const upcomingVaccinationsCount = pendingVaccinations.length - overdueVaccinationsCount;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Batches", value: totalBatches.toString(), icon: Layers, color: "text-blue-500", bg: "bg-blue-50", trend: "Live", positive: true },
          { label: "Total Animals", value: totalAnimals.toLocaleString(), icon: Users, color: "text-indigo-500", bg: "bg-indigo-50", trend: "Active", positive: true },
          { label: "Total Mortality", value: totalMortality.toString(), icon: Activity, color: "text-red-500", bg: "bg-red-50", trend: "Cumulative", positive: false },
          { label: "Upcoming Vaccinations", value: upcomingVaccinationsCount.toString(), icon: ShieldPlus, color: "text-orange-500", bg: "bg-orange-50", trend: "Pending", positive: false },
          { label: "Overdue Vaccinations", value: overdueVaccinationsCount.toString(), icon: ShieldPlus, color: "text-red-500", bg: "bg-red-50", trend: "Action Required", positive: false },
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
            <div className={`flex items-center text-sm font-medium ${kpi.positive ? 'text-emerald-500' : 'text-gray-500'}`}>
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
