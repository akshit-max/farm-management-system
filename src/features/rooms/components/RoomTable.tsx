"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";

const columnHelper = createColumnHelper<any>();

export function RoomTable({ farmId, keyIndex, onEdit }: { farmId: string; keyIndex: number; onEdit?: (room: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    const res = await fetch(`/api/rooms?farmId=${farmId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [farmId, keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await fetch(`/api/rooms/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted successfully");
      fetchRooms();
    } else {
      toast.error("Failed to delete");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("name", { header: "Room Name" }),
    columnHelper.accessor("capacity", { header: "Capacity" }),
    columnHelper.accessor("allowed_stages", { 
      header: "Allowed Stages",
      cell: (info) => {
        const stages = info.getValue() as string[];
        return stages?.length ? stages.length + " Stages" : "None";
      }
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10 rounded-md transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
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
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No rooms found.</td></tr>
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
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
