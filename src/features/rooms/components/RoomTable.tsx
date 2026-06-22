"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from "@tanstack/react-table";
import { toast } from "sonner";
import { Trash2, CloudOff } from "lucide-react";
import { ConfirmModal } from "@/features/shared/components/ConfirmModal";
import { useRBAC } from "@/lib/rbac-client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { roomRepository } from "@/lib/offline/repositories/roomRepository";

const columnHelper = createColumnHelper<any>();

export function RoomTable({ keyIndex, onEdit }: { keyIndex: number; onEdit?: (room: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canMutate } = useRBAC();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const allRooms = await roomRepository.getAll();
      setData(allRooms);
    } catch (err) {
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, keyIndex]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await roomRepository.delete(deleteId);
      toast.success("Deleted successfully");
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const columns = [
    columnHelper.accessor("name", { 
      header: "Room Name",
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
    columnHelper.accessor("capacity", { header: "Capacity" }),
    columnHelper.accessor("allowed_stages", { 
      header: "Allowed Stages",
      cell: (info) => {
        const value = info.getValue() as string;
        if (value === "*") return "All Stages";
        if (!value) return "None";
        const stages = value.split(",").map(s => s.trim()).filter(Boolean);
        return stages.length ? stages.length + " Stages" : "None";
      }
    }),
    ...(canMutate ? [columnHelper.display({
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
    })] : []),
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
              <TableCell colSpan={4} className="h-24">
                <EmptyState title="No rooms found" description="Create a room to start assigning batches." />
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
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
