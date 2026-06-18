"use client";

import { RoomForm } from "@/features/rooms/components/RoomForm";
import { RoomTable } from "@/features/rooms/components/RoomTable";
import { useState } from "react";

export default function RoomsPage() {
  const [key, setKey] = useState(0);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  const handleSuccess = () => {
    setKey(k => k + 1);
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Rooms</h1>
      </div>
      <RoomForm farmId="" onSuccess={handleSuccess} initialData={editingRoom} onCancel={() => setEditingRoom(null)} />
      <RoomTable farmId="" keyIndex={key} onEdit={(room) => setEditingRoom(room)} />
    </div>
  );
}
