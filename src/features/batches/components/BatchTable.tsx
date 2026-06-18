"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";

const columnHelper = createColumnHelper<any>();

export function BatchTable({ farmId, keyIndex }: { farmId: string; keyIndex: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const res = await fetch(`/api/animal-batches/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted successfully");
      fetchBatches();
    } else {
      toast.error("Failed to delete");
    }
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
          <Link href={`/dashboard/animal-batches/${info.row.original.id}`} className="text-blue-500 hover:text-blue-700 p-1">
            <Eye className="w-4 h-4" />
          </Link>
          <button onClick={() => handleDelete(info.row.original.id)} className="text-red-500 hover:text-red-700 p-1">
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
          <tbody className="bg-white divide-y divide-gray-200">
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
    </div>
  );
}
