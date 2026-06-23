import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const feedConsumptionRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];
    
    let onlineData: any[] = [];
    try {
        const res = await fetch(`/api/feed-consumption`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
      console.warn('Online fetch failed, falling back to local DB', err);
    }
    
    let pendingOffline: any[] = [];
    let offlineDeletes = new Set<string>();
    let offlineUpdates = new Map<string, any>();

    if (db) {
      const offlineRecords = await db.offline_feed_consumptions.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineRecords
        .filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED')
        .map((s: any) => ({ ...s.payload, id: s.local_id, isOffline: true, sync_status: s.sync_status }));

      const syncTasks = await db.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION').toArray();
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

  getOfflineFeedAdjustments: async (feedTypeId: string) => {
    if (typeof window === 'undefined' || !db) return { pending: 0, deleted: 0, updatedDelta: 0 };
    
    let pending = 0;
    let deleted = 0;
    let updatedDelta = 0;

    // 1. Pending NEW creations
    const offlineRecords = await db.offline_feed_consumptions.toArray();
    offlineRecords.forEach((m: any) => {
      if ((m.sync_status === 'PENDING' || m.sync_status === 'FAILED') && m.payload.feed_type_id === feedTypeId) {
        pending += Number(m.payload.quantity_kg) || 0;
      }
    });

    // 2. Pending DELETES and UPDATES of existing online records
    const syncTasks = await db.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION').toArray();
    syncTasks.forEach((task: any) => {
      if (task.payload.feed_type_id === feedTypeId) {
        if (task.action === 'DELETE') {
           deleted += Number(task.payload.original_quantity || task.payload.quantity_kg || 0);
        }
        if (task.action === 'UPDATE') {
           const newQty = Number(task.payload.quantity_kg || 0);
           const oldQty = Number(task.payload.original_quantity || 0);
           updatedDelta += (newQty - oldQty);
        }
      }
    });

    return { pending, deleted, updatedDelta };
  },
  
  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");
    
    const localId = uuidv4();
    const payload = { ...data, id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        try {
          await db.offline_feed_consumptions.add({
            local_id: localId,
            payload: payload,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'PENDING'
          });
          
          await db.sync_queue.add({
            id: uuidv4(),
            entity: 'FEED_CONSUMPTION',
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
      const res = await fetch("/api/feed-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to record feed consumption");
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
  
  update: async (id: string, data: any, originalData?: any) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_feed_consumptions.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_feed_consumptions.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });
      
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    const payload = { ...data, id, original_quantity: originalData?.quantity_kg };

    if (!navigator.onLine) {
      if (db) {
        const existingUpdate = await db.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION' && t.action === 'UPDATE' && t.payload.id === id).first();
        if (existingUpdate) {
           await db.sync_queue.update(existingUpdate.id, { payload: { ...payload, original_quantity: existingUpdate.payload.original_quantity }, status: 'PENDING' });
        } else {
           await db.sync_queue.add({
              id: uuidv4(),
              entity: 'FEED_CONSUMPTION',
              action: 'UPDATE',
              payload: payload,
              status: 'PENDING',
              created_at: new Date()
           });
        }
      }
      return { success: true, offline: true };
    }
    
    const res = await fetch(`/api/feed-consumption/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update feed consumption");
    }
    
    return { success: true, offline: false };
  },

  delete: async (id: string, originalData?: any) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_feed_consumptions.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_feed_consumptions.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
       if (db) {
          const existingUpdate = await db.sync_queue.filter((t: any) => t.entity === 'FEED_CONSUMPTION' && t.action === 'UPDATE' && t.payload.id === id).first();
          if (existingUpdate) {
             await db.sync_queue.delete(existingUpdate.id);
          }
          await db.sync_queue.add({
             id: uuidv4(),
             entity: 'FEED_CONSUMPTION',
             action: 'DELETE',
             payload: { id, feed_type_id: originalData?.feed_type_id, original_quantity: originalData?.quantity_kg },
             status: 'PENDING',
             created_at: new Date()
          });
       }
       return { success: true, offline: true };
    }

    const res = await fetch(`/api/feed-consumption/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete feed consumption");
    }
    return { success: true, offline: false };
  }
};
