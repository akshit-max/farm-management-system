"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function ClientRankingPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/crm/client-ranking').then(r => r.json()).then(d => setData(d.data || []));
  }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Client Revenue Ranking',
          columns: [
            { header: 'Client Name', key: 'name' },
            { header: 'Total Revenue (₹)', key: 'revenue' },
            { header: 'Orders', key: 'orderCount' },
            { header: 'Avg Order Value (₹)', key: 'avgOrderValue' },
            { header: 'Outstanding (₹)', key: 'outstandingBalance' },
            { header: 'Avg Days to Pay', key: 'avgDaysToPay' }
          ],
          data: data || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Client_Ranking.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Client Revenue Ranking</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Rank clients by revenue, order volume, and payment behavior.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Total Revenue (₹)</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg Order Value (₹)</TableHead>
                <TableHead className="text-right">Outstanding (₹)</TableHead>
                <TableHead className="text-right">Avg Days to Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c, i) => (
                <TableRow key={c.id || i}>
                  <TableCell className="font-medium">{c.name || c.company}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">₹{c.revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{c.orderCount}</TableCell>
                  <TableCell className="text-right">₹{c.avgOrderValue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-red-500">₹{c.outstandingBalance?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{c.avgDaysToPay?.toLocaleString(undefined, { maximumFractionDigits: 1 })} days</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
