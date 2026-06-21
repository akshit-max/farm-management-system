"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function StagePerformancePage() {
  const [data, setData] = useState<any[]>([]);
  const [warning, setWarning] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/stage-performance`)
      .then(res => res.json())
      .then(d => {
        setData(d.data || []);
        if (d.warning) setWarning(d.warning);
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
          title: 'Stage Performance Report',
          columns: [
            { header: 'Stage', key: 'name' },
            { header: 'Duration (Days)', key: 'duration' },
            { header: 'Animals Entered', key: 'animalsEntered' },
            { header: 'Mortality %', key: 'mortalityPercent' },
            { header: 'Feed Cost', key: 'feedCost' },
            { header: 'Revenue', key: 'revenue' },
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
      a.download = `Stage_Performance_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
        <h1 className="text-2xl font-bold">Stage Performance Report</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
          <strong>Notice: </strong>{warning}
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Performance by Stage Definition</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2">Stage</th>
                  <th className="pb-2">Duration (Days)</th>
                  <th className="pb-2">Animals Entered</th>
                  <th className="pb-2">Animals Exited</th>
                  <th className="pb-2">Mortality %</th>
                  <th className="pb-2">Feed Cost</th>
                  <th className="pb-2">Utility Cost</th>
                  <th className="pb-2">Revenue</th>
                  <th className="pb-2">Profitability</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.map(s => (
                  <tr key={s.id} className="border-b">
                    <td className="py-3 font-medium">
                      {s.name}
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] leading-tight">{s.limitation}</p>
                    </td>
                    <td className="py-3">{s.duration || 'N/A'}</td>
                    <td className="py-3">{s.animalsEntered}</td>
                    <td className="py-3 text-gray-400 italic">N/A</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${s.mortalityPercent > 5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {s.mortalityPercent}%
                      </span>
                    </td>
                    <td className="py-3 text-red-600">₹{(s.feedCost || 0).toFixed(2)}</td>
                    <td className="py-3 text-gray-400 italic">Unallocated</td>
                    <td className="py-3 text-green-600">₹{(s.revenue || 0).toFixed(2)}</td>
                    <td className={`py-3 font-bold ${(s.profitability || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ₹{(s.profitability || 0).toFixed(2)}
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
