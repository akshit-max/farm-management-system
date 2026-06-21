"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function CashFlowReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Default to year to date
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    fetch(`/api/reports/cash-flow?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
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
          title: 'Cash Flow Statement',
          columns: [
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount' }
          ],
          data: data ? [
            { category: 'Opening Cash', amount: data.metrics?.openingCash || 0 },
            { category: 'Cash Received (Inflow)', amount: data.metrics?.cashReceived || 0 },
            { category: 'Cash Paid (Outflow)', amount: data.metrics?.cashPaid || 0 },
            { category: 'Net Movement', amount: data.metrics?.netMovement || 0 },
            { category: 'Closing Cash', amount: data.metrics?.closingCash || 0 },
            { category: 'Outflow: General Expenses', amount: data.breakdown?.outflows?.expenses || 0 },
            { category: 'Outflow: Livestock Purchases', amount: data.breakdown?.outflows?.animalPurchases || 0 },
            { category: 'Outflow: Water Utility', amount: data.breakdown?.outflows?.water || 0 },
            { category: 'Outflow: Electricity Utility', amount: data.breakdown?.outflows?.electricity || 0 }
          ] : []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cash_Flow_Statement.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
        <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
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
      ) : data?.error ? (
        <div className="text-red-500">{data.error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Cash Position</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between font-bold"><span>Opening Cash</span><span>₹{(data.metrics?.openingCash || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Cash Received (Operating Inflow)</span><span>₹{(data.metrics?.cashReceived || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600"><span>Cash Paid (Operating Outflow)</span><span>-₹{(data.metrics?.cashPaid || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Net Movement</span><span>₹{(data.metrics?.netMovement || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg bg-gray-100 p-2 rounded"><span>Closing Cash</span><span>₹{(data.metrics?.closingCash || 0).toFixed(2)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Outflow Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between"><span>General Expenses</span><span>₹{(data.breakdown?.outflows?.expenses || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Livestock Purchases</span><span>₹{(data.breakdown?.outflows?.animalPurchases || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Water Utility</span><span>₹{(data.breakdown?.outflows?.water || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Electricity Utility</span><span>₹{(data.breakdown?.outflows?.electricity || 0).toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
