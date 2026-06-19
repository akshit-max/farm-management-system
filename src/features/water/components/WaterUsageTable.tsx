"use client";

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, getFilteredRowModel } from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { Pencil, Trash2, Search, Droplets } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";
import { format } from "date-fns";

const columnHelper = createColumnHelper<any>();

export function WaterUsageTable({ data, onEdit, onRefresh, canMutate }: { data: any[]; onEdit: (u: any) => void; onRefresh: () => void; canMutate: boolean }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/water-usage/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Record deleted successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteId(null);
    }
  };

  const columns = useMemo(() => {
    const baseColumns: any[] = [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => format(new Date(info.getValue()), "PP"),
      }),
      columnHelper.accessor("room.name", {
        header: "Room",
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue() || "-"}</span>
      }),
      columnHelper.accessor("batch.batch_number", {
        header: "Batch",
        cell: (info) => <span className="text-gray-600">{info.getValue() || "-"}</span>
      }),
      columnHelper.accessor("source", {
        header: "Source",
      }),
      columnHelper.accessor("actual_consumption_liters", {
        header: "Consumption",
        cell: (info) => <span className="font-bold text-blue-600">{Number(info.getValue()).toLocaleString()} L</span>
      }),
      columnHelper.accessor("total_cost", {
        header: "Total Cost",
        cell: (info) => <span className="font-bold text-brand-primary">₹{Number(info.getValue()).toFixed(2)}</span>
      }),
    ];

    if (canMutate) {
      baseColumns.push(
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: (info) => (
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(info.row.original)} className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteId(info.row.original.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })
      );
    }
    return baseColumns;
  }, [canMutate]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search water usage..." 
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Droplets className="w-10 h-10 text-blue-200 mb-3" />
                    <p className="text-base font-medium text-gray-900">No records found</p>
                    <p className="text-sm">Record new water usage to see it here.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {table.getPageCount() > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} of {data.length} entries
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        title="Delete Water Record"
        message="Are you sure you want to delete this water usage record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
