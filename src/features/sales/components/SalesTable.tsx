"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Search, Edit, XCircle } from "lucide-react";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { format } from "date-fns";

const columnHelper = createColumnHelper<any>();

export function SalesTable({ keyIndex, onEdit }: { keyIndex: number; onEdit: (invoice: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { canMutate, role } = useRBAC();
  
  // Accountants can also mutate Sales
  const canManageSales = canMutate || role === "Accountant";

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      toast.error("Failed to load sales invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [keyIndex]);

  const confirmCancel = async () => {
    if (!cancelId) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/sales/${cancelId}/cancel`, { method: "POST" });
      if (res.ok) {
        toast.success("Invoice cancelled successfully. Inventory restored.");
        fetchSales();
      } else {
        toast.error("Failed to cancel invoice");
      }
    } catch (err) {
      toast.error("Network error");
    }
    setIsCancelling(false);
    setCancelId(null);
  };

  const columns = [
    columnHelper.accessor("invoice_number", { 
      header: "Invoice #",
      cell: (info) => <div className="font-bold text-gray-900">{info.getValue()}</div>
    }),
    columnHelper.accessor("invoice_date", { 
      header: "Date",
      cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy')
    }),
    columnHelper.accessor("customer", { 
      header: "Customer",
      cell: (info) => <div className="font-medium">{info.getValue()?.company_name || "-"}</div>
    }),
    columnHelper.accessor("total", { 
      header: "Amount",
      cell: (info) => <div className="font-bold text-emerald-600">${Number(info.getValue()).toFixed(2)}</div>
    }),
    columnHelper.accessor("payment_status", { 
      header: "Payment",
      cell: (info) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          info.getValue() === "PAID" ? "bg-emerald-100 text-emerald-800" : 
          info.getValue() === "PARTIAL" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
        }`}>
          {info.getValue()}
        </span>
      )
    }),

    ...(canManageSales ? [columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
            <>
              <button onClick={() => onEdit(info.row.original)} className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors" title="Edit">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => setCancelId(info.row.original.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Cancel Invoice">
                <XCircle className="w-4 h-4" />
              </button>
            </>
        </div>
      ),
    })] : []),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-800">Sales Invoices</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search invoices..." 
            value={globalFilter ?? ""}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-full sm:w-[250px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="transition-colors hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <EmptyState title="No invoices found" description="Create a new invoice to get started." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && data.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{table.getRowModel().rows.length}</span> of <span className="font-medium text-gray-900">{data.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!cancelId}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice? This action will restore all sold animal quantities back to their respective batches. This cannot be undone."
        isLoading={isCancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}
