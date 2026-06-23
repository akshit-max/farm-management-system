"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Eye, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const columnHelper = createColumnHelper<any>();

export function BatchTable({ keyIndex, onEdit }: { keyIndex: number; onEdit?: (batch: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canMutate } = useRBAC();

  const fetchBatches = async () => {
    setLoading(true);
    const { animalBatchRepository } = await import("@/lib/offline/repositories/animalBatchRepository");
    const batches = await animalBatchRepository.getAll();
    setData(batches || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, [keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { animalBatchRepository } = await import("@/lib/offline/repositories/animalBatchRepository");
      await animalBatchRepository.delete(deleteId);
      toast.success("Deleted successfully");
      fetchBatches();
    } catch (e) {
      toast.error("Failed to delete");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("batch_number", { header: "Batch #" }),
    columnHelper.accessor(r => r.animal_category?.name, { id: "category", header: "Category" }),
    columnHelper.accessor(r => r.room?.name, { id: "room", header: "Room" }),
    columnHelper.accessor(r => r.current_stage?.stage_name, { id: "stage", header: "Stage" }),
    columnHelper.accessor("quantity", { header: "Quantity" }),
    columnHelper.accessor("status", { header: "Status" }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/animal-batches/${info.row.original.id}`} className="text-blue-500 hover:text-blue-700 p-1.5 transition-colors hover:bg-blue-50 rounded-md">
            <Eye className="w-4 h-4" />
          </Link>
          {canMutate && (
            <>
              <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10 rounded-md transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteId(info.row.original.id)} className="text-red-500 hover:text-red-700 p-1.5 transition-colors hover:bg-red-50 rounded-md">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24">
                <EmptyState title="No batches found" description="Create a batch to track your animals." />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="px-6 py-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Batch"
        message="Are you sure you want to delete this batch? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
