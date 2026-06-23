import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const waterUsageRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];
    
    let onlineData: any[] = [];
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/water-usage?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
        console.warn('Online fetch failed, falling back to local DB', err);
      }
    }
    
    let pendingOffline: any[] = [];
    let offlineDeletes = new Set<string>();
    let offlineUpdates = new Map<string, any>();

    if (db) {
      const offlineRecords = await db.offline_water_usages.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineRecords
        .filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED')
        .map((s: any) => ({ ...s.payload, id: s.local_id, isOffline: true, sync_status: s.sync_status }));

      if (pendingOffline.length > 0) {
        const { roomRepository } = await import('./roomRepository');
        const rooms = await roomRepository.getAll();
        
        pendingOffline = pendingOffline.map(w => ({
          ...w,
          room: w.room_id ? rooms.find(r => r.id === w.room_id) : undefined
        }));
      }

      const syncTasks = await db.sync_queue.filter((t: any) => t.entity === 'WATER_USAGE').toArray();
      syncTasks.forEach((task: any) => {
        if (task.action === 'DELETE') offlineDeletes.add(task.payload.id);
        if (task.action === 'UPDATE') offlineUpdates.set(task.payload.id, task.payload);
      });
    }
    
    // Apply offline mutations to online data
    const activeOnline = onlineData.filter(item => !offlineDeletes.has(item.id)).map(item => {
      if (offlineUpdates.has(item.id)) {
        return { ...item, ...offlineUpdates.get(item.id), sync_status: 'PENDING' };
      }
      return item;
    });

    return [...pendingOffline, ...activeOnline];
  },
  
  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");
    
    const localId = uuidv4();
    const payload = { ...data, id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        try {
          await db.offline_water_usages.add({
            local_id: localId,
            payload: payload,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'PENDING'
          });
          
          await db.sync_queue.add({
            id: uuidv4(),
            entity: 'WATER_USAGE',
            action: 'CREATE',
            payload: payload,
            status: 'PENDING',
            created_at: new Date()
          });
        } catch (e) {
          throw e;
        }
      }
      return { success: true, offline: true, data: payload };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }
    
    try {
      const res = await fetch("/api/water-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to record water usage");
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
      const localRecord = await db.offline_water_usages.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_water_usages.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });
      
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'WATER_USAGE' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    const payload = { ...data, id };

    if (!navigator.onLine) {
      if (db) {
        const existingUpdate = await db.sync_queue.filter((t: any) => t.entity === 'WATER_USAGE' && t.action === 'UPDATE' && t.payload.id === id).first();
        if (existingUpdate) {
           await db.sync_queue.update(existingUpdate.id, { payload, status: 'PENDING' });
        } else {
           await db.sync_queue.add({
              id: uuidv4(),
              entity: 'WATER_USAGE',
              action: 'UPDATE',
              payload: payload,
              status: 'PENDING',
              created_at: new Date()
           });
        }
      }
      return { success: true, offline: true };
    }
    
    const res = await fetch(`/api/water-usage/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update water usage");
    }
    
    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_water_usages.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_water_usages.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'WATER_USAGE' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
       if (db) {
          const existingUpdate = await db.sync_queue.filter((t: any) => t.entity === 'WATER_USAGE' && t.action === 'UPDATE' && t.payload.id === id).first();
          if (existingUpdate) {
             await db.sync_queue.delete(existingUpdate.id);
          }
          await db.sync_queue.add({
             id: uuidv4(),
             entity: 'WATER_USAGE',
             action: 'DELETE',
             payload: { id },
             status: 'PENDING',
             created_at: new Date()
          });
       }
       return { success: true, offline: true };
    }

    const res = await fetch(`/api/water-usage/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete water usage");
    }
    return { success: true, offline: false };
  }
};
