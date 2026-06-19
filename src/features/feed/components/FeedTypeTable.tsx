"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2, Search, Edit, AlertTriangle } from "lucide-react";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const columnHelper = createColumnHelper<any>();

export function FeedTypeTable({ keyIndex, onEdit }: { keyIndex: number; onEdit?: (feedType: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canMutate } = useRBAC();

  const fetchFeedTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed-types`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      toast.error("Failed to load feed types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedTypes();
  }, [keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/feed-types/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Feed type deleted successfully");
        fetchFeedTypes();
      } else {
        toast.error("Cannot delete feed type. It may have existing consumption records.");
      }
    } catch (err) {
      toast.error("Network error");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("name", { 
      header: "Feed Name",
      cell: (info) => <div className="font-semibold text-gray-900">{info.getValue()}</div>
    }),
    columnHelper.accessor("supplier", { 
      header: "Supplier",
      cell: (info) => info.getValue()?.company_name || <span className="text-gray-400 italic">None</span>
    }),
    columnHelper.accessor("cost_per_kg", { 
      header: "Cost/kg",
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`
    }),
    columnHelper.accessor("stock_quantity", { 
      header: "Current Stock",
      cell: (info) => {
        const stock = Number(info.getValue());
        const reorder = Number(info.row.original.reorder_level);
        const isLow = stock <= reorder;
        
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
              {stock.toFixed(2)} kg
            </span>
            {isLow && <span title="Low Stock"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>}
          </div>
        );
      }
    }),
    columnHelper.accessor("reorder_level", { 
      header: "Reorder Level",
      cell: (info) => `${Number(info.getValue()).toFixed(2)} kg`
    }),
    ...(canMutate ? [columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
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
        <h3 className="text-base font-semibold text-gray-800">Feed Inventory</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search feeds..." 
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
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
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
                <td colSpan={6} className="px-6 py-12 text-center">
                  <EmptyState title="No feed types found" description="Try adjusting your search or add a new feed type." />
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
        title="Delete Feed Type"
        message="Are you sure you want to delete this feed type? This action cannot be undone and is only allowed if no consumption records exist."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
