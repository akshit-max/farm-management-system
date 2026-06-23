import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const utilityMeterRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];

    let onlineData: any[] = [];
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/utility-meters?t=${Date.now()}`);
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
      const offlineRecords = await db.offline_utility_meters.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineRecords
        .filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED')
        .map((s: any) => ({ ...s.payload, id: s.local_id, isOffline: true, sync_status: s.sync_status }));

      if (pendingOffline.length > 0) {
        const { roomRepository } = await import('./roomRepository');
        const rooms = await roomRepository.getAll();
        
        pendingOffline = pendingOffline.map(m => ({
          ...m,
          room: m.room_id ? rooms.find(r => r.id === m.room_id) : undefined
        }));
      }
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
        await db.offline_utility_meters.add({
          local_id: localId,
          payload: payload,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'PENDING'
        });

        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'UTILITY_METER',
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
      const res = await fetch("/api/utility-meters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to create utility meter");
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
      const localRecord = await db.offline_utility_meters.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_utility_meters.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });

      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'UTILITY_METER' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Editing existing online meters offline is not supported in this version.");
    }

    const res = await fetch(`/api/utility-meters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update utility meter");
    }

    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_utility_meters.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_utility_meters.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'UTILITY_METER' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Deleting existing online meters offline is not supported in this version.");
    }

    const res = await fetch(`/api/utility-meters/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete utility meter");
    }
    return { success: true, offline: false };
  }
};
