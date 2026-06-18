import { OverviewAnalytics } from "@/features/dashboard/components/OverviewAnalytics";
import { ArrowUpRight, ArrowDownRight, Droplets, Zap, Activity, Users, FileText, DollarSign, Layers, ShieldPlus, Cloud, Sun, Leaf, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  
  if (!farmId) {
    return <div className="p-6">Error: User is not assigned to a farm.</div>;
  }

  // Fetch Real Phase 1 Data
  let totalBatches = 0;
  let animalSum: { _sum: { quantity: number | null } } = { _sum: { quantity: 0 } };
  let mortalities: { _sum: { quantity: number | null } } = { _sum: { quantity: 0 } };
  let pendingVaccinations: any[] = [];
  let categories: any[] = [];
  let isOffline = false;

  try {
    const [tb, as, m, pv, c] = await Promise.all([
      db.animalBatch.count({ where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" } }),
      db.animalBatch.aggregate({ _sum: { quantity: true }, where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" } }),
      db.mortality.aggregate({ _sum: { quantity: true }, where: { batch: { farm_id: farmId }, deleted_at: null } }),
      db.vaccination.findMany({ where: { batch: { farm_id: farmId }, status: "PENDING", deleted_at: null } }),
      db.animalCategory.findMany({ 
        where: { farm_id: farmId, deleted_at: null },
        include: { animal_batches: { where: { deleted_at: null, status: "ACTIVE" } } }
      }),
    ]);
    totalBatches = tb;
    animalSum = as as any;
    mortalities = m as any;
    pendingVaccinations = pv;
    categories = c;
  } catch (err) {
    console.error("Database connection error (Offline Mode):", err);
    isOffline = true;
  }

  const totalAnimals = animalSum._sum.quantity || 0;
  const totalMortality = mortalities._sum.quantity || 0;
  
  const now = new Date();
  const overdueVaccinationsCount = pendingVaccinations.filter(v => new Date(v.due_date) < now).length;
  const upcomingVaccinationsCount = pendingVaccinations.length - overdueVaccinationsCount;

  // Mock data for Phase 2 pending items to match YNEX UI
  const topMetrics = [
    { label: "Weather", value: "27°C", sub: "Wed, 24-06-39", icon: Sun, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Total Animals", value: totalAnimals.toLocaleString(), sub: "Across all categories", icon: Users, color: "text-brand-primary", bg: "bg-brand-primary/10" },
    { label: "Mortality Today", value: "0", sub: "0.0%", icon: Activity, color: "text-status-danger", bg: "bg-status-danger/10", trend: "0.0%" },
    { label: "Active Batches", value: totalBatches.toString(), sub: "Currently housed", icon: Layers, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Today's Feed", value: "0 kg", sub: "Consumption", icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+0%" },
    { label: "Today's Water", value: "0 liters", sub: "Usage", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-50", trend: "-0%" },
    { label: "Overdue Vax", value: overdueVaccinationsCount.toString(), sub: "Action Required", icon: ShieldPlus, color: "text-status-danger", bg: "bg-status-danger/10" },
    { label: "Today's Revenue", value: "$0.00", sub: "Sales", icon: DollarSign, color: "text-brand-primary", bg: "bg-brand-primary/10" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <Cloud className="w-6 h-6 text-amber-500" />
          <div>
            <p className="font-bold text-sm">Offline Mode Active</p>
            <p className="text-xs mt-0.5">We couldn't connect to the live database (Neon DB is sleeping or network is disconnected). Displaying default layout.</p>
          </div>
        </div>
      )}

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetrics.map((kpi, idx) => (
          <div key={idx} className="bg-card-bg p-4 rounded-[var(--radius-card)] border border-border-main shadow-soft flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[12px] text-text-secondary font-medium">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[18px] font-bold text-text-heading leading-tight">{kpi.value}</p>
                  {kpi.trend && <span className={`text-[11px] font-bold ${kpi.trend.startsWith('+') ? 'text-status-success' : kpi.trend.startsWith('-') ? 'text-status-danger' : 'text-gray-400'}`}>{kpi.trend}</span>}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-text-disabled text-right whitespace-nowrap hidden xl:block">
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Animals */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card-bg rounded-[var(--radius-card)] border border-border-main shadow-soft p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-text-heading flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-primary" /> Animals Inventory
              </h2>
              <div className="flex items-center gap-2">
                <button className="text-[12px] text-text-secondary hover:text-brand-primary bg-page-bg px-3 py-1.5 rounded-md transition-colors">
                  Filter
                </button>
              </div>
            </div>
            
            {categories.length === 0 ? (
              <div className="text-center py-10 text-text-secondary">No categories created yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const total = cat.animal_batches.reduce((sum: number, b: any) => sum + b.quantity, 0);
                  return (
                    <div key={cat.id} className="border border-border-divider rounded-[12px] p-4 hover:border-brand-primary/30 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-page-bg flex items-center justify-center text-[16px]">
                            🐾
                          </div>
                          <span className="font-semibold text-text-heading">{cat.name}</span>
                        </div>
                        <span className="text-xl font-bold text-text-heading">{total.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-brand-primary"></div> {cat.animal_batches.length} Batches
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-status-danger"></div> {cat.mortality_percentage}% Max Mort.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Analytics Widgets */}
          <div className="bg-card-bg rounded-[var(--radius-card)] border border-border-main shadow-soft p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-text-heading">Overview Analytics</h2>
              <button className="text-[12px] font-medium text-text-secondary hover:text-brand-primary bg-page-bg border border-border-divider px-3 py-1.5 rounded-md transition-colors">
                Show More
              </button>
            </div>
            <OverviewAnalytics />
          </div>
        </div>

        {/* Right Column: Live Report */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card-bg rounded-[var(--radius-card)] border border-border-main shadow-soft p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-text-heading flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-primary" /> Live Report
              </h2>
            </div>
            
            <div className="bg-brand-primary rounded-[12px] p-5 text-white mb-6">
              <p className="text-white/80 text-[13px] font-medium mb-1">Total System Capacity</p>
              <div className="flex items-end gap-3 mb-4">
                <h3 className="text-3xl font-bold">{totalAnimals.toLocaleString()}</h3>
                <span className="text-[12px] bg-white/20 px-2 py-0.5 rounded-full mb-1">Active</span>
              </div>
              <div className="flex items-center justify-between text-[12px] border-t border-white/20 pt-3">
                <span>Mortality Rate</span>
                <span className="font-bold">{totalAnimals > 0 ? ((totalMortality / totalAnimals) * 100).toFixed(1) : '0.0'}%</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-bold text-text-heading uppercase tracking-wide border-b border-border-divider pb-2">Upcoming Tasks</h4>
              
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-divider bg-page-bg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-status-danger/10 text-status-danger">
                    <ShieldPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-text-heading">Overdue Vaccinations</p>
                    <p className="text-[11px] text-text-secondary">Requires immediate action</p>
                  </div>
                </div>
                <span className="font-bold text-status-danger">{overdueVaccinationsCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border-divider bg-page-bg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-status-warning/10 text-status-warning">
                    <ShieldPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-text-heading">Pending Vaccinations</p>
                    <p className="text-[11px] text-text-secondary">Upcoming schedule</p>
                  </div>
                </div>
                <span className="font-bold text-text-heading">{upcomingVaccinationsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
