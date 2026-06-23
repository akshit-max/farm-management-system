import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const animalBatchRepository = {
  getAll: async (roomId?: string) => {
    if (typeof window === 'undefined') return [];

    let onlineData: any[] = [];
    try {
        const url = roomId ? `/api/animal-batches?roomId=${roomId}` : `/api/animal-batches`;
        const res = await fetch(url, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
      console.warn('Online fetch failed, falling back to local DB', err);
    }

    let pendingOffline: any[] = [];
    if (db) {
      const offlineBatches = await db.offline_animal_batches.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineBatches
        .filter((b: any) => (b.sync_status === 'PENDING' || b.sync_status === 'FAILED') && (!roomId || b.payload.room_id === roomId))
        .map((b: any) => ({ ...b.payload, id: b.local_id, isOffline: true, sync_status: b.sync_status }));

      if (pendingOffline.length > 0) {
        const { animalCategoryRepository } = await import('./animalCategoryRepository');
        const { roomRepository } = await import('./roomRepository');
        const { stageRepository } = await import('./stageRepository');
        
        const [categories, rooms, stages] = await Promise.all([
          animalCategoryRepository.getAll(),
          roomRepository.getAll(),
          stageRepository.getAll()
        ]);
        
        pendingOffline = pendingOffline.map(b => ({
          ...b,
          animal_category: categories.find(c => c.id === b.category_id),
          room: rooms.find(r => r.id === b.room_id),
          current_stage: stages.find(s => s.id === b.current_stage_id)
        }));
      }
    }

    const localIds = new Set(pendingOffline.map(b => b.id));
    const merged = [
      ...pendingOffline,
      ...onlineData.filter(b => !localIds.has(b.id))
    ];

    return merged.filter(b => !b.deleted_at);
  },

  getById: async (id: string) => {
    if (typeof window === 'undefined') return null;

    if (db) {
      const offlineBatch = await db.offline_animal_batches.get(id);
      if (offlineBatch) {
        const batch = { ...offlineBatch.payload, id: offlineBatch.local_id, isOffline: true, sync_status: offlineBatch.sync_status };
        
        const { animalCategoryRepository } = await import('./animalCategoryRepository');
        const { roomRepository } = await import('./roomRepository');
        const { stageRepository } = await import('./stageRepository');
        
        const [categories, rooms, stages] = await Promise.all([
          animalCategoryRepository.getAll(),
          roomRepository.getAll(),
          stageRepository.getAll()
        ]);
        
        batch.animal_category = categories.find((c: any) => c.id === batch.category_id);
        batch.room = rooms.find((r: any) => r.id === batch.room_id);
        batch.current_stage = stages.find((s: any) => s.id === batch.current_stage_id);
        
        return batch;
      }
    }

    try {
        const res = await fetch(`/api/animal-batches/${id}`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          // API returns batch directly, not { data: batch }
          return json || null;
        }
      } catch (err) {
      console.warn('Online fetch failed', err);
    }
    return null;
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
  },

  update: async (id: string, data: any) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_animal_batches.get(id);
      if (localRecord) isLocal = true;
    }

    const saveOffline = async () => {
      if (!db) return { success: false };
      const payload = { ...data, id };
      
      if (isLocal) {
        await db.offline_animal_batches.update(id, {
          payload,
          updated_at: new Date(),
          sync_status: 'PENDING'
        });
      } else {
        await db.offline_animal_batches.add({
          local_id: id,
          payload,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'PENDING'
        });
      }

      const queueTask = await db.sync_queue.where('entity').equals('ANIMAL_BATCH').and((t: any) => t.payload?.id === id && t.action === 'CREATE').first();
      if (!queueTask) {
        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'ANIMAL_BATCH',
          action: 'UPDATE',
          payload,
          status: 'PENDING',
          created_at: new Date()
        });
      } else {
        await db.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }

    try {
      const res = await fetch(`/api/animal-batches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch(e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to update batch");
      }

      return { success: true, offline: false };
    } catch (err: any) {
      if (err.message === "Failed to fetch" || (err.message && err.message.includes("NetworkError")) || err.name === "TypeError") {
        return saveOffline();
      }
      throw err;
    }
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_animal_batches.get(id);
      if (localRecord) isLocal = true;
    }

    const saveOffline = async () => {
      if (!db) return { success: false };
      
      if (isLocal) {
        await db.offline_animal_batches.delete(id);
      }

      const queueTask = await db.sync_queue.where('entity').equals('ANIMAL_BATCH').and((t: any) => t.payload?.id === id && t.action === 'CREATE').first();
      if (queueTask) {
        await db.sync_queue.delete(queueTask.id);
      } else {
        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'ANIMAL_BATCH',
          action: 'DELETE',
          payload: { id },
          status: 'PENDING',
          created_at: new Date()
        });
      }
      return { success: true, offline: true };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }

    try {
      const res = await fetch(`/api/animal-batches/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch(e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to delete batch");
      }

      if (isLocal && db) {
        await db.offline_animal_batches.delete(id);
      }

      return { success: true, offline: false };
    } catch (err: any) {
      if (err.message === "Failed to fetch" || (err.message && err.message.includes("NetworkError")) || err.name === "TypeError") {
        return saveOffline();
      }
      throw err;
    }
  }
};
