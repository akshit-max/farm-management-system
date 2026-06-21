"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ui/Card";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/balance-sheet`)
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
          title: 'Balance Sheet',
          columns: [
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount' }
          ],
          data: data ? [
            { category: 'ASSETS', amount: '' },
            { category: 'Cash (System Aggregated)', amount: data.assets?.cash || 0 },
            { category: 'Accounts Receivable', amount: data.assets?.receivables || 0 },
            { category: 'Feed Inventory', amount: data.assets?.feedInventory || 0 },
            { category: 'Meat Inventory', amount: data.assets?.meatInventory || 0 },
            { category: 'Live Animal Assets', amount: data.assets?.liveAnimalAssets || 0 },
            { category: 'Total Assets', amount: data.assets?.total || 0 },
            { category: '---', amount: '---' },
            { category: 'LIABILITIES', amount: '' },
            { category: 'Accounts Payable', amount: data.liabilities?.payables || 0 },
            { category: 'Outstanding Supplier Balances', amount: data.liabilities?.outstandingSupplierBalances || 0 },
            { category: 'Total Liabilities', amount: data.liabilities?.total || 0 },
            { category: '---', amount: '---' },
            { category: 'EQUITY', amount: '' },
            { category: 'Total Equity', amount: data.equity || 0 }
          ] : []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Balance_Sheet.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
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
            <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Cash (System Aggregated)</span><span>₹{(data?.assets?.cash || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Accounts Receivable</span><span>₹{(data?.assets?.receivables || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Feed Inventory</span><span>₹{(data?.assets?.feedInventory || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Meat Inventory</span><span>₹{(data?.assets?.meatInventory || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Live Animal Assets (current)</span><span>₹{(data?.assets?.liveAnimalAssets || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-2 text-base"><span>Total Assets</span><span>₹{(data?.assets?.total || 0).toFixed(2)}</span></div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Accounts Payable</span><span>₹{(data?.liabilities?.payables || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Outstanding Supplier Balances</span><span>₹{(data?.liabilities?.outstandingSupplierBalances || 0).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 text-base"><span>Total Liabilities</span><span>₹{(data?.liabilities?.total || 0).toFixed(2)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Equity</CardTitle></CardHeader>
              <CardContent>
                <div className="flex justify-between font-bold text-lg text-emerald-700 bg-emerald-50 p-2 rounded">
                  <span>Total Equity</span>
                  <span>₹{(data?.equity || 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded border border-blue-200">
              <strong>Note:</strong> A negative Total Assets or Cash balance can occur when livestock investments and operating expenses temporarily exceed collected revenue. This reflects cash-outflow intensive growth phases.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
