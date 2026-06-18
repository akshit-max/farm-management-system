"use client";

import { useState, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<any>();

export function CategoryTable({ farmId, keyIndex }: { farmId: string; keyIndex: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    const res = await fetch(`/api/animal-categories?farmId=${farmId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [farmId, keyIndex]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const res = await fetch(`/api/animal-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted successfully");
      fetchCategories();
    } else {
      toast.error("Failed to delete");
    }
  };

  const columns = [
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor("mortality_percentage", { header: "Mortality %" }),
    columnHelper.accessor("sale_options", { header: "Sale Options" }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <button onClick={() => handleDelete(info.row.original.id)} className="text-red-500 hover:text-red-700 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
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
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No categories found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t flex items-center justify-between">
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="text-sm text-emerald-600 disabled:opacity-50">Previous</button>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="text-sm text-emerald-600 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
