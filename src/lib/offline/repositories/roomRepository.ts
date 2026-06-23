import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const roomRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];

    let onlineData: any[] = [];
    try {
        const res = await fetch(`/api/rooms`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
      console.warn('Online fetch failed, falling back to local DB', err);
    }

    let pendingOffline: any[] = [];
    if (db) {
      const offlineRooms = await db.offline_rooms.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineRooms
        .filter((r: any) => r.sync_status === 'PENDING' || r.sync_status === 'FAILED')
        .map((r: any) => ({ ...r.payload, id: r.local_id, isOffline: true, sync_status: r.sync_status }));
    }

    const localIds = new Set(pendingOffline.map(r => r.id));
    const merged = [
      ...pendingOffline,
      ...onlineData.filter(r => !localIds.has(r.id))
    ];

    return merged.filter(r => !r.deleted_at);
  },

  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");

    const localId = uuidv4();
    const payload = { ...data, id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        await db.offline_rooms.add({
          local_id: localId,
          payload: payload,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'PENDING'
        });

        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'ROOM',
          action: 'CREATE',
          payload: payload,
          status: 'PENDING',
          created_at: new Date()
        });
      }
      return { success: true, offline: true, data: payload };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to create room");
      }

      const result = await res.json();
      return { success: true, offline: false, data: result };
    } catch (err: any) {
      if (err.message === "Failed to fetch" || (err.message && err.message.includes("NetworkError")) || err.name === "TypeError") {
        return saveOffline();
      }
      throw err;
    }
  },

  update: async (id: string, data: any) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_rooms.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_rooms.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });

      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'ROOM' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Editing existing online rooms offline is not supported in this version.");
    }

    const res = await fetch(`/api/rooms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update room");
    }

    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_rooms.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_rooms.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'ROOM' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Deleting existing online rooms offline is not supported in this version.");
    }

    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete room");
    }
    return { success: true, offline: false };
  }
};
