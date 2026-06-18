"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Eye, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";

const columnHelper = createColumnHelper<any>();

export function BatchTable({ farmId, keyIndex, onEdit }: { farmId: string; keyIndex: number; onEdit?: (batch: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    const res = await fetch(`/api/animal-batches?farmId=${farmId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, [farmId, keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await fetch(`/api/animal-batches/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted successfully");
      fetchBatches();
    } else {
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
          <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10 rounded-md transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(info.row.original.id)} className="text-red-500 hover:text-red-700 p-1.5 transition-colors hover:bg-red-50 rounded-md">
            <Trash2 className="w-4 h-4" />
          </button>
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No batches found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="text-sm text-[var(--color-brand-primary)] disabled:opacity-50 font-medium">Previous</button>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="text-sm text-[var(--color-brand-primary)] disabled:opacity-50 font-medium">Next</button>
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
