"use client";

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { Trash2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

import { customerPaymentRepository } from "@/lib/offline/repositories/customerPaymentRepository";

const columnHelper = createColumnHelper<any>();

export function PaymentTable({ data, onRefresh, canMutate }: { data: any[]; onRefresh: () => void; canMutate: boolean }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await customerPaymentRepository.delete(deleteId);
      toast.success("Payment deleted successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment");
    } finally {
      setDeleteId(null);
    }
  };

  const columns = useMemo(() => {
    const baseColumns: any[] = [
      columnHelper.accessor("payment_date", {
        header: "Date",
        cell: (info) => { const d = info.getValue(); return <span className="text-gray-900">{d ? format(new Date(d), "PP") : "-"}</span>; }
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => <span className="font-bold text-emerald-600">₹{Number(info.getValue()).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
      }),
      columnHelper.accessor("payment_method", {
        header: "Method",
        cell: (info) => <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">{info.getValue()}</span>
      }),
      columnHelper.accessor("reference_number", {
        header: "Reference",
        cell: (info) => <span className="text-gray-500">{info.getValue() || "-"}</span>
      })
    ];

    if (canMutate) {
      baseColumns.push(
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: (info) => (
            <div className="flex items-center gap-2">
              <button onClick={() => setDeleteId(info.row.original.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
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
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                    <IndianRupee className="w-10 h-10 text-brand-primary/30 mb-3" />
                    <p className="text-base font-medium text-gray-900">No payment history</p>
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
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This will revert the invoice status."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
