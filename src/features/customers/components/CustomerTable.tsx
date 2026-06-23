"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2, Search, Edit, Phone, Mail, BookOpen, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { customerRepository } from "@/lib/offline/repositories/customerRepository";

const columnHelper = createColumnHelper<any>();

export function CustomerTable({ keyIndex, onEdit }: { keyIndex: number; onEdit?: (customer: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const { canManageCustomers } = useRBAC();

  const handleRetry = async (customer: any) => {
    toast.info("Retrying sync...");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customer, client_request_id: customer.id })
      });
      if (res.ok) {
        const { db } = await import("@/lib/offline/db");
        if (db) {
          await db.offline_customers.update(customer.id, { sync_status: 'SYNCED' });
        }
        toast.success("Sync successful!");
        fetchCustomers();
      } else {
        const err = await res.json();
        setSyncErrors(prev => ({ ...prev, [customer.id]: err.error || "Validation failed" }));
        toast.error(err.error || "Sync failed");
      }
    } catch (err: any) {
      toast.error("Network error");
    }
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const allCustomers = await customerRepository.getAll();
      setData(allCustomers);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await customerRepository.delete(deleteId);
      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("company_name", { 
      header: "Customer Name",
      cell: (info) => (
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            {info.getValue()}
            {info.row.original.isOffline && info.row.original.sync_status === 'PENDING' && (
              <span className="flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium" title="Pending Sync">
                <CloudOff className="w-3 h-3 mr-1" /> Pending
              </span>
            )}
            {info.row.original.isOffline && info.row.original.sync_status === 'FAILED' && (
              <div className="flex flex-col mt-1">
                <span className="flex items-center text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-medium w-fit" title="Sync Failed">
                  <CloudOff className="w-3 h-3 mr-1" /> Failed
                </span>
                {syncErrors[info.row.original.id] && (
                  <span className="text-[10px] text-red-600 mt-0.5 max-w-[200px] truncate" title={syncErrors[info.row.original.id]}>
                    Failed: {syncErrors[info.row.original.id]}
                  </span>
                )}
              </div>
            )}
            {info.row.original.isOffline && info.row.original.sync_status === 'SYNCED' && (
              <span className="flex items-center text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium" title="Synced Successfully">
                <CloudOff className="w-3 h-3 mr-1" /> Synced
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{info.row.original.customer_type}</div>
        </div>
      )
    }),
    columnHelper.accessor("contact_person", { header: "Contact Person" }),
    columnHelper.accessor("contact_info", { 
      header: "Contact Info",
      cell: (info) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" /> {info.row.original.phone}
          </div>
          {info.row.original.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> {info.row.original.email}
            </div>
          )}
        </div>
      )
    }),
    columnHelper.accessor("status", { 
      header: "Status",
      cell: (info) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          info.getValue() === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"
        }`}>
          {info.getValue()}
        </span>
      )
    }),
    ...(canManageCustomers ? [columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
          {info.row.original.isOffline && info.row.original.sync_status === 'FAILED' && (
            <button onClick={() => handleRetry(info.row.original)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Retry Sync">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <Link href={`/dashboard/customers/${info.row.original.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Ledger">
            <BookOpen className="w-4 h-4" />
          </Link>
          <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(info.row.original.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-800">Customer Directory</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search customers..." 
            value={globalFilter ?? ""}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full sm:w-[250px]"
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
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <EmptyState title="No customers found" description="Try adjusting your search or add a new customer." />
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
        isOpen={!!deleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
