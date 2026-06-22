"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PaymentTermsPage() {
  const [data, setData] = useState<any[]>([]);
  const [type, setType] = useState<"customer" | "supplier">("customer");

  const fetchData = async () => {
    // We can fetch from client-ranking API to get customers, or supplier comparison API for suppliers to show names, then fetch their specific DB fields.
    // However, we don't have a specific GET /payment-terms endpoint. 
    // Wait, the client-ranking API didn't return credit_limit, but I can fetch /api/customers directly.
    const res = await fetch(`/api/${type}s`);
    const json = await res.json();
    setData(json.data || []);
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const handleUpdate = async (id: string) => {
    const limitStr = type === "customer" ? window.prompt("Enter Credit Limit (₹):", "0") : null;
    const daysStr = window.prompt("Enter Credit Days:", "0");
    
    let credit_limit = undefined;
    if (limitStr !== null) {
      credit_limit = parseFloat(limitStr);
      if (isNaN(credit_limit) || credit_limit < 0) return alert("Invalid credit limit");
    }

    let credit_days = undefined;
    if (daysStr !== null) {
      credit_days = parseInt(daysStr);
      if (isNaN(credit_days) || credit_days < 0) return alert("Invalid credit days");
    }

    const payload = type === "customer" 
      ? { id, type: "Customer", credit_limit, credit_days }
      : { id, type: "Supplier", credit_days };

    const res = await fetch("/api/crm/payment-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      fetchData();
    } else {
      alert("Failed to update payment terms");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Payment Terms Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Manage credit limits and payment days for your partners.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setType("customer")} variant={type === "customer" ? "primary" : "outline"}>Customers</Button>
              <Button onClick={() => setType("supplier")} variant={type === "supplier" ? "primary" : "outline"}>Suppliers</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {type === "customer" && <TableHead className="text-right">Credit Limit (₹)</TableHead>}
                <TableHead className="text-right">Credit Days</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={r.id || i}>
                  <TableCell className="font-medium">{r.company_name}</TableCell>
                  {type === "customer" && <TableCell className="text-right font-bold text-red-500">{r.credit_limit === null ? "No Limit" : `₹${r.credit_limit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</TableCell>}
                  <TableCell className="text-right">{r.credit_days === null ? "Not Configured" : `${r.credit_days} days`}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleUpdate(r.id)}>
                      Edit Terms
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
