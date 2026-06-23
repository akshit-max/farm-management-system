import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const customerPaymentRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];
    
    let onlineData: any[] = [];
    try {
        const res = await fetch(`/api/customer-payments`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
      console.warn('Online fetch failed, falling back to local DB', err);
    }
    
    let pendingOffline: any[] = [];
    if (db) {
      const offlineRecords = await db.offline_customer_payments.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineRecords
        .filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED')
        .map((s: any) => ({ ...s.payload, id: s.local_id, isOffline: true, sync_status: s.sync_status }));
    }
    
    return [...pendingOffline, ...onlineData];
  },

  getPendingCustomerPayments: async (customerId: string) => {
    if (typeof window === 'undefined' || !db) return 0;
    const offlinePayments = await db.offline_customer_payments.toArray();
    const pendingPayments = offlinePayments.filter((p: any) => 
      (p.sync_status === 'PENDING' || p.sync_status === 'FAILED') && 
      p.payload.customer_id === customerId
    );
    
    return pendingPayments.reduce((sum: number, p: any) => sum + (Number(p.payload.amount) || 0), 0);
  },
  
  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");
    
    const localId = uuidv4();
    const payload = { ...data, amount: Number(data.amount), id: localId, client_request_id: localId };

    const saveOffline = async () => {
      if (db) {
        try {
          await db.offline_customer_payments.add({
            local_id: localId,
            payload: payload,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'PENDING'
          });
          
          await db.sync_queue.add({
            id: uuidv4(),
            entity: 'CUSTOMER_PAYMENT',
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
      const res = await fetch("/api/customer-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let errJson;
        try {
          errJson = await res.json();
        } catch (e) {}
        if (errJson) throw errJson;
        throw new Error("Failed to record payment");
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
      const localRecord = await db.offline_customer_payments.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_customer_payments.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });
      
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'CUSTOMER_PAYMENT' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Editing existing online payments offline is not supported.");
    }
    
    const res = await fetch(`/api/customer-payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update payment");
    }
    
    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_customer_payments.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_customer_payments.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'CUSTOMER_PAYMENT' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Deleting online payments offline is not supported.");
    }

    const res = await fetch(`/api/customer-payments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to delete payment");
    }
    return { success: true, offline: false };
  }
};
