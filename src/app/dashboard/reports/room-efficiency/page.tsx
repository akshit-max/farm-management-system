"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function RoomEfficiencyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/room-efficiency`)
      .then(res => res.json())
      .then(d => {
        setData(d.data || []);
        setLoading(false);
      });
  }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Room Efficiency Report',
          columns: [
            { header: 'Room', key: 'name' },
            { header: 'Capacity', key: 'capacity' },
            { header: 'Occupancy', key: 'currentOccupancy' },
            { header: 'Occupancy %', key: 'occupancyPercent' },
            { header: 'Mortality', key: 'mortality' },
            { header: 'Revenue', key: 'revenue' },
            { header: 'Feed Cost', key: 'feedCost' },
            { header: 'Utility Cost', key: 'utilityCost' },
            { header: 'Profitability', key: 'profitability' }
          ],
          data: data || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Room_Efficiency_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Room Efficiency Report</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Room Performance</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2">Room</th>
                  <th className="pb-2">Capacity</th>
                  <th className="pb-2">Occupancy</th>
                  <th className="pb-2">Occupancy %</th>
                  <th className="pb-2">Mortality</th>
                  <th className="pb-2">Revenue</th>
                  <th className="pb-2">Feed Cost</th>
                  <th className="pb-2">Utility Cost</th>
                  <th className="pb-2">Profitability</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">{r.capacity}</td>
                    <td className="py-3">{r.currentOccupancy}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${r.occupancyPercent > 80 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {r.occupancyPercent}%
                      </span>
                    </td>
                    <td className="py-3 text-red-600">{r.mortality}</td>
                    <td className="py-3 text-green-600">₹{(r.revenue || 0).toFixed(2)}</td>
                    <td className="py-3 text-red-600">₹{(r.feedCost || 0).toFixed(2)}</td>
                    <td className="py-3 text-red-600">₹{(r.utilityCost || 0).toFixed(2)}</td>
                    <td className={`py-3 font-bold ${(r.profitability || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ₹{(r.profitability || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
