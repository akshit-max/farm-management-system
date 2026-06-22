import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const animalBatchRepository = {
  getAll: async (roomId?: string) => {
    if (typeof window === 'undefined') return [];

    let onlineData: any[] = [];
    if (navigator.onLine) {
      try {
        const url = roomId ? `/api/animal-batches?roomId=${roomId}` : `/api/animal-batches`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
        console.warn('Online fetch failed, falling back to local DB', err);
      }
    }

    let pendingOffline: any[] = [];
    if (db) {
      const offlineBatches = await db.offline_animal_batches.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineBatches
        .filter((b: any) => (b.sync_status === 'PENDING' || b.sync_status === 'FAILED') && (!roomId || b.payload.room_id === roomId))
        .map((b: any) => ({ ...b.payload, id: b.local_id, isOffline: true, sync_status: b.sync_status }));
    }

    const localIds = new Set(pendingOffline.map(b => b.id));
    const merged = [
      ...pendingOffline,
      ...onlineData.filter(b => !localIds.has(b.id))
    ];

    return merged.filter(b => !b.deleted_at);
  },

  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");

    const localId = uuidv4();
    const payload = { ...data, id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        await db.offline_animal_batches.add({
          local_id: localId,
          payload: payload,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'PENDING'
        });

        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'ANIMAL_BATCH',
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
      const res = await fetch("/api/animal-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to create batch");
      }

      const result = await res.json();
      return { success: true, offline: false, data: result };
    } catch (err: any) {
      if (err.message === "Failed to fetch" || (err.message && err.message.includes("NetworkError")) || err.name === "TypeError") {
        return saveOffline();
      }
      throw err;
    }
  }
};
