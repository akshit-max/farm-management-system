import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const salesRepository = {
  getPendingReservations: async () => {
    if (typeof window === 'undefined' || !db) return {};
    const offlineSales = await db.offline_sales.toArray();
    const pendingSales = offlineSales.filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED');
    
    const reservations: Record<string, number> = {};
    pendingSales.forEach((sale: any) => {
      if (sale.payload && Array.isArray(sale.payload.items)) {
        sale.payload.items.forEach((item: any) => {
          if (item.batch_id && item.quantity) {
            reservations[item.batch_id] = (reservations[item.batch_id] || 0) + Number(item.quantity);
          }
        });
      }
    });
    return reservations;
  },

  getPendingCustomerReceivables: async (customerId: string) => {
    if (typeof window === 'undefined' || !db) return 0;
    const offlineSales = await db.offline_sales.toArray();
    const pendingSales = offlineSales.filter((s: any) => 
      (s.sync_status === 'PENDING' || s.sync_status === 'FAILED') && 
      s.payload.customer_id === customerId
    );
    
    let pendingReceivable = 0;
    pendingSales.forEach((sale: any) => {
      if (sale.payload) {
        let total = 0;
        if (Array.isArray(sale.payload.items)) {
          total = sale.payload.items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
        }
        let paid = 0;
        if (sale.payload.payment_received && sale.payload.amount_paid) {
          paid = Number(sale.payload.amount_paid);
        }
        pendingReceivable += Math.max(0, total - paid);
      }
    });
    return pendingReceivable;
  },

  getAll: async (showCancelled: boolean = false) => {
    if (typeof window === 'undefined') return [];
    
    let onlineData: any[] = [];
    try {
        const res = await fetch(`/api/sales?showCancelled=${showCancelled}`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          onlineData = json.data || [];
        }
      } catch (err) {
      console.warn('Online fetch failed, falling back to local DB', err);
    }
    
    let pendingOffline: any[] = [];
    if (db) {
      const offlineSales = await db.offline_sales.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineSales
        .filter((s: any) => s.sync_status === 'PENDING' || s.sync_status === 'FAILED')
        .map((s: any) => ({ ...s.payload, id: s.local_id, isOffline: true, sync_status: s.sync_status }));
        
      if (pendingOffline.length > 0) {
        const { customerRepository } = await import('./customerRepository');
        const customers = await customerRepository.getAll();
        
        pendingOffline = pendingOffline.map(s => ({
          ...s,
          customer: customers.find(c => c.id === s.customer_id)
        }));
      }
    }
    
    // Sort combined array by created_at or invoice_date if needed, but returning as is is fine.
    return [...pendingOffline, ...onlineData];
  },

  getById: async (id: string) => {
    if (typeof window === 'undefined') return null;

    if (db) {
      const offlineSale = await db.offline_sales.get(id);
      if (offlineSale) {
        const sale = { ...offlineSale.payload, id: offlineSale.local_id, isOffline: true, sync_status: offlineSale.sync_status };
        
        const { customerRepository } = await import('./customerRepository');
        const customers = await customerRepository.getAll();
        sale.customer = customers.find((c: any) => c.id === sale.customer_id);
        
        return sale;
      }
    }

    try {
        const res = await fetch(`/api/sales/${id}`, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (res.ok) {
          const json = await res.json();
          return json.data || null;
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
        try {
          await db.offline_sales.add({
            local_id: localId,
            payload: payload,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'PENDING'
          });
          
          await db.sync_queue.add({
            id: uuidv4(),
            entity: 'SALES',
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
      const res = await fetch("/api/sales", {
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
        throw new Error("Failed to create sale");
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
      const localRecord = await db.offline_sales.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      const payload = { ...data, id };
      await db!.offline_sales.update(id, { payload, updated_at: new Date(), sync_status: 'PENDING' });
      
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'SALES' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.update(queueTask.id, { payload, status: 'PENDING' });
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Editing existing online sales offline is not supported in this version.");
    }
    
    const res = await fetch(`/api/sales/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to update sale");
    }
    
    return { success: true, offline: false };
  },

  delete: async (id: string) => {
    let isLocal = false;
    if (db) {
      const localRecord = await db.offline_sales.get(id);
      if (localRecord) isLocal = true;
    }

    if (isLocal) {
      await db!.offline_sales.delete(id);
      const queueTask = await db!.sync_queue.filter((t: any) => t.entity === 'SALES' && t.action === 'CREATE' && t.payload.id === id).first();
      if (queueTask) {
        await db!.sync_queue.delete(queueTask.id);
      }
      return { success: true, offline: true };
    }

    if (!navigator.onLine) {
      throw new Error("Cancelling online sales offline is not supported.");
    }

    const res = await fetch(`/api/sales/${id}/cancel`, { method: "POST" });
    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch(e) {}
      if (errJson) throw errJson;
      throw new Error("Failed to cancel sale");
    }
    return { success: true, offline: false };
  }
};
