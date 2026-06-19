"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { format } from "date-fns";

const columnHelper = createColumnHelper<any>();

export function FeedConsumptionTable({ keyIndex }: { keyIndex: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchConsumptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed-consumption`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      toast.error("Failed to load feed consumption records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumptions();
  }, [keyIndex]);

  const columns = [
    columnHelper.accessor("date", { 
      header: "Date",
      cell: (info) => (
        <div className="flex items-center text-gray-900 font-medium">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          {format(new Date(info.getValue()), 'MMM d, yyyy')}
        </div>
      )
    }),
    columnHelper.accessor("batch", { 
      header: "Batch",
      cell: (info) => info.getValue()?.batch_number || <span className="text-gray-400 italic">Unknown</span>
    }),
    columnHelper.accessor("feed_type", { 
      header: "Feed Type",
      cell: (info) => info.getValue()?.name || <span className="text-gray-400 italic">Unknown</span>
    }),
    columnHelper.accessor("quantity_kg", { 
      header: "Quantity",
      cell: (info) => <span className="font-medium">{Number(info.getValue()).toFixed(2)} kg</span>
    }),
    columnHelper.accessor("cost", { 
      header: "Cost",
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`
    }),
    columnHelper.accessor("notes", { 
      header: "Notes",
      cell: (info) => <span className="text-gray-500 truncate max-w-[200px] block" title={info.getValue()}>{info.getValue() || "-"}</span>
    }),
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
        <h3 className="text-base font-semibold text-gray-800">Consumption History</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search records..." 
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
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
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
                  <EmptyState title="No records found" description="Try adjusting your search or record new consumption." />
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
    </div>
  );
}
