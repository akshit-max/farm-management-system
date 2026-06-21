"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function CRMRatingsPage() {
  const [data, setData] = useState<any[]>([]);
  const [type, setType] = useState<"customer" | "supplier">("customer");

  const fetchData = () => {
    fetch(`/api/crm/ratings?type=${type}`).then(r => r.json()).then(d => setData(d.data || []));
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(`Exporting ${format.toUpperCase()}...`, { id: 'export' });
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `CRM Ratings - ${type === 'customer' ? 'Customers' : 'Suppliers'}`,
          columns: [
            { header: 'Name', key: 'name' },
            { header: 'Calculated Rating', key: 'calculatedRating' },
            { header: 'Override Rating', key: 'overrideRating' },
            { header: 'Final Rating', key: 'finalRating' },
            { header: 'Override Reason', key: 'overrideReason' }
          ],
          data: data || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CRM_Ratings_${type}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  const handleOverride = async (id: string, currentRating: number) => {
    const ratingStr = window.prompt("Enter override rating (1-5), or leave blank to remove override:", "");
    if (ratingStr === null) return; // Cancelled
    
    let rating: number | null = null;
    if (ratingStr.trim() !== "") {
      rating = parseInt(ratingStr);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        alert("Invalid rating. Must be 1-5.");
        return;
      }
    }

    const reason = window.prompt("Enter reason for override (Required if setting rating):", "");
    if (rating !== null && !reason) {
      alert("Reason is required.");
      return;
    }

    const res = await fetch("/api/crm/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: type === "customer" ? "Customer" : "Supplier", rating, reason })
    });

    if (res.ok) {
      fetchData();
    } else {
      alert("Failed to override rating");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">CRM Ratings</CardTitle>
              <p className="text-sm text-gray-500 mt-1">View dynamically calculated AI ratings and manual overrides.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setType("customer")} variant={type === "customer" ? "primary" : "outline"}>Customers</Button>
              <Button onClick={() => setType("supplier")} variant={type === "supplier" ? "primary" : "outline"}>Suppliers</Button>
              <div className="border-l pl-2 ml-2 flex gap-2">
                <Button variant="outline" onClick={() => handleExport('excel')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                  <Download className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')} className="text-red-600 border-red-200 hover:bg-red-50">
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Calculated</TableHead>
                <TableHead className="text-center">Override</TableHead>
                <TableHead className="text-center">Final Rating</TableHead>
                <TableHead>Override Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={r.id || i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-center font-bold text-gray-500">{r.calculatedRating} ⭐</TableCell>
                  <TableCell className="text-center font-bold text-blue-600">{r.overrideRating ? `${r.overrideRating} ⭐` : '-'}</TableCell>
                  <TableCell className="text-center font-bold text-yellow-500 text-lg">{r.finalRating} ⭐</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.overrideReason || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOverride(r.id, r.finalRating)}>
                      Override
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
