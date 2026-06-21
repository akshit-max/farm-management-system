"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function SupplierComparisonPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/crm/supplier-comparison').then(r => r.json()).then(d => setData(d.data || []));
  }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Supplier Comparison',
          columns: [
            { header: 'Supplier', key: 'name' },
            { header: 'Purchase Volume (kg)', key: 'purchaseVolume' },
            { header: 'Purchase Value (₹)', key: 'purchaseValue' },
            { header: 'Avg Cost Per Animal (₹)', key: 'avgCostPerAnimal' },
            { header: 'Mortality Impact (%)', key: 'mortalityImpact' }
          ],
          data: data || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Supplier_Comparison.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
            <CardTitle className="text-2xl font-bold">Supplier Comparison</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Evaluate suppliers based on purchase volume, cost, and mortality impact.</p>
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
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Purchase Volume (kg)</TableHead>
                <TableHead className="text-right">Purchase Value (₹)</TableHead>
                <TableHead className="text-right">Avg Cost Per Animal (₹)</TableHead>
                <TableHead className="text-right">Mortality Impact (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s, i) => (
                <TableRow key={s.id || i}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.purchaseVolume?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">₹{s.purchaseValue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">₹{s.avgCostPerAnimal?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{s.mortalityImpact?.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
