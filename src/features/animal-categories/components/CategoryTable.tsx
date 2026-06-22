"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2, Search, Edit, MoreHorizontal, Filter, Layers, AlertCircle, CloudOff } from "lucide-react";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { animalCategoryRepository } from "@/lib/offline/repositories/animalCategoryRepository";

const columnHelper = createColumnHelper<any>();

export function CategoryTable({ keyIndex, onEdit }: { keyIndex: number; onEdit?: (cat: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canMutate } = useRBAC();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const allCategories = await animalCategoryRepository.getAll();
      setData(allCategories);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await animalCategoryRepository.delete(deleteId);
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("name", { 
      header: "Category Name",
      cell: (info) => (
        <span className="font-semibold text-text-heading flex items-center gap-2">
          {info.getValue()}
          {info.row.original.isOffline && (
            <span className="flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium" title="Pending Sync">
              <CloudOff className="w-3 h-3 mr-1" /> Pending
            </span>
          )}
        </span>
      )
    }),
    columnHelper.accessor("mortality_percentage", { 
      header: "Max Mortality %",
      cell: (info) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-danger/10 text-status-danger text-[12px] font-bold">
          <AlertCircle className="w-3.5 h-3.5" />
          {info.getValue()}%
        </span>
      )
    }),
    columnHelper.accessor("sale_options", { 
      header: "Sale Options",
      cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>
    }),
    ...(canMutate ? [columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(info.row.original.id)} className="p-1.5 text-gray-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    })] : []),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 5 }
    }
  });

  return (
    <div className="bg-card-bg rounded-[var(--radius-card)] border border-border-main shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-[16px] font-bold text-text-heading flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-primary" />
          Category Registry
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={globalFilter ?? ""}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-page-bg border border-border-main rounded-[var(--radius-input)] text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-[250px]"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-3 py-2 border border-border-main rounded-[var(--radius-input)] text-[13px] font-medium text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-colors bg-page-bg">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-divider">
          <thead className="bg-page-bg">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-card-bg divide-y divide-border-divider">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div></td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-page-bg/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-[14px] text-text-body">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-[15px] font-bold text-text-heading mb-1">No categories found</p>
                    <p className="text-[13px] text-text-secondary">Try adjusting your search or add a new category.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && data.length > 0 && (
        <div className="px-6 py-4 border-t border-border-divider flex items-center justify-between bg-page-bg/50">
          <span className="text-[13px] text-text-secondary">
            Showing <span className="font-semibold text-text-heading">{table.getRowModel().rows.length}</span> of <span className="font-semibold text-text-heading">{data.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1.5 border border-border-main rounded-md text-[13px] font-medium text-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">Previous</button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1.5 border border-border-main rounded-md text-[13px] font-medium text-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">Next</button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Category"
        message="Are you sure you want to permanently delete this category? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
