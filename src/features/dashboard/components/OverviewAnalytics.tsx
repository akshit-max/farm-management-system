"use client";

import { useMemo, useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export function OverviewAnalytics({ categories = [], mortalities = [], vaccinations = [] }: { categories?: any[], mortalities?: any[], vaccinations?: any[] }) {
  const [offlineMortalities, setOfflineMortalities] = useState<any[]>([]);

  useEffect(() => {
    import("@/lib/offline/repositories/mortalityRepository").then(mod => {
      mod.mortalityRepository.getAll().then(all => {
        setOfflineMortalities(all.filter((m: any) => m.isOffline));
      });
    });
  }, []);

  const combinedMortalities = useMemo(() => {
    return [...offlineMortalities, ...mortalities];
  }, [offlineMortalities, mortalities]);

  // 1. Animal Distribution (Pie Chart)
  const distributionData = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      value: cat.animal_batches?.reduce((acc: number, batch: any) => acc + (batch.quantity || 0), 0) || 0
    })).filter(cat => cat.value > 0);
  }, [categories]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  // 2. Mortality Trend (Line Chart over last 7 days)
  const mortalityData = useMemo(() => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const counts: Record<string, number> = {};
    last7Days.forEach(d => counts[d] = 0);

    combinedMortalities.forEach(m => {
      const dateStr = new Date(m.date).toISOString().split('T')[0];
      if (counts[dateStr] !== undefined) {
        counts[dateStr] += m.quantity;
      }
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      deaths: counts[date]
    }));
  }, [mortalities]);

  // 3. Vaccination Trend (Bar Chart over next 7 days)
  const vaccinationData = useMemo(() => {
    const next7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const counts: Record<string, number> = {};
    next7Days.forEach(d => counts[d] = 0);

    vaccinations.forEach(v => {
      const dateStr = new Date(v.due_date).toISOString().split('T')[0];
      if (counts[dateStr] !== undefined) {
        counts[dateStr] += 1;
      }
    });

    return next7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      pending: counts[date]
    }));
  }, [vaccinations]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1">
        <h3 className="text-[14px] font-bold text-gray-500 mb-4">Animal Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {distributionData.length > 0 ? (
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No animals found</div>
            )}
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {distributionData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1 text-[12px] text-gray-600">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1">
        <h3 className="text-[14px] font-bold text-gray-500 mb-4">Mortality Trend (7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mortalityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="deaths" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1">
        <h3 className="text-[14px] font-bold text-gray-500 mb-4">Vaccinations (Next 7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vaccinationData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="pending" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
