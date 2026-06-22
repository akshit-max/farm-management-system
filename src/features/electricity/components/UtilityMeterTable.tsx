"use client";

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, getFilteredRowModel } from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { Pencil, Trash2, Search, Zap, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";
import { utilityMeterRepository } from "@/lib/offline/repositories/utilityMeterRepository";

const columnHelper = createColumnHelper<any>();

export function UtilityMeterTable({ data, onEdit, onRefresh, canMutate }: { data: any[]; onEdit: (u: any) => void; onRefresh: () => void; canMutate: boolean }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await utilityMeterRepository.delete(deleteId);
      toast.success("Meter deleted successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleteId(null);
    }
  };

  const columns = useMemo(() => {
    const baseColumns: any[] = [
      columnHelper.accessor("meter_name", {
        header: "Meter Name",
        cell: (info) => (
          <span className="font-bold text-gray-900 flex items-center gap-2">
            {info.getValue()}
            {info.row.original.isOffline && (
              <span className="flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium" title="Pending Sync">
                <CloudOff className="w-3 h-3 mr-1" /> Pending
              </span>
            )}
          </span>
        )
      }),
      columnHelper.accessor("meter_number", {
        header: "Meter Number",
        cell: (info) => <span className="text-gray-600 font-mono text-sm">{info.getValue()}</span>
      }),
      columnHelper.accessor("room.name", {
        header: "Linked Room",
        cell: (info) => <span className="text-gray-500">{info.getValue() || "Global"}</span>
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const colors: any = {
            ACTIVE: "bg-emerald-100 text-emerald-800",
            INACTIVE: "bg-gray-100 text-gray-800",
            MAINTENANCE: "bg-amber-100 text-amber-800",
          };
          return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
        }
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
            placeholder="Search meters..." 
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
                    <Zap className="w-10 h-10 text-amber-200 mb-3" />
                    <p className="text-base font-medium text-gray-900">No meters found</p>
                    <p className="text-sm">Add a utility meter to start tracking electricity.</p>
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
        title="Delete Utility Meter"
        message="Are you sure you want to delete this meter? It cannot be deleted if it has usage records attached."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
