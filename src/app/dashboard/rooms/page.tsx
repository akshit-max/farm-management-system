"use client";

import { RoomForm } from "@/features/rooms/components/RoomForm";
import { RoomTable } from "@/features/rooms/components/RoomTable";
import { useState } from "react";
import { useRBAC } from "@/lib/rbac-client";

export default function RoomsPage() {
  const [key, setKey] = useState(0);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const { canMutate } = useRBAC();

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Rooms & Structure</h1>
      </div>
      {canMutate && (
        <RoomForm
          onSuccess={handleSuccess}
          initialData={editingRoom}
          onCancel={editingRoom ? () => setEditingRoom(null) : undefined}
        />
      )}
      <RoomTable keyIndex={key} onEdit={(room) => setEditingRoom(room)} />
    </div>
  );
}
