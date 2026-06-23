import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const customerRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];

    let onlineData: any[] = [];
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/customers");
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
      const offlineCustomers = await db.offline_customers.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineCustomers
        .filter((c: any) => c.sync_status === 'PENDING' || c.sync_status === 'FAILED')
        .map((c: any) => ({ ...c.payload, id: c.local_id, isOffline: true, sync_status: c.sync_status }));
    }

    // Filter out from onlineData any customers that have been locally modified/deleted
    const localIds = new Set(pendingOffline.map(c => c.id));
    const merged = [
      ...pendingOffline,
      ...onlineData.filter(c => !localIds.has(c.id))
    ];

    // Filter out deleted offline items
    return merged.filter(c => !c.deleted_at);
  },

  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");

    const localId = uuidv4();
    const payload = { ...data, id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        await db.offline_customers.add({
          local_id: localId,
          payload: payload,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'PENDING'
        });

        await db.sync_queue.add({
          id: uuidv4(),
          entity: 'CUSTOMER',
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
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to create customer");
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
      const localRecord = await db.offline_customers.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_customers.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });

      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'CUSTOMER' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Editing existing online customers offline is not supported in this version.");
    }

    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update customer");
    }

    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_customers.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_customers.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'CUSTOMER' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Deleting existing online customers offline is not supported in this version.");
    }

    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete customer");
    }
    return { success: true, offline: false };
  }
};
