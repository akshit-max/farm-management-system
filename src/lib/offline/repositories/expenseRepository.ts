import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const expenseRepository = {
  getAll: async () => {
    if (typeof window === 'undefined') return [];
    
    let onlineData: any[] = [];
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/expenses");
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
      const offlineExpenses = await db.offline_expenses.orderBy('created_at').reverse().toArray();
      pendingOffline = offlineExpenses
        .filter((e: any) => e.sync_status === 'PENDING' || e.sync_status === 'FAILED')
        .map((e: any) => ({ ...e.payload, id: e.local_id, isOffline: true, sync_status: e.sync_status }));
    }
    
    return [...pendingOffline, ...onlineData];
  },
  
  create: async (data: any) => {
    if (typeof window === 'undefined') throw new Error("Cannot create offline from server");
    
    console.log("create() called", { onLine: navigator.onLine, data });

    const saveOffline = async () => {
      const localId = uuidv4();
      const payload = { ...data, id: localId };
      if (db) {
        try {
          await db.offline_expenses.add({
            local_id: localId,
            payload: payload,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'PENDING'
          });
          console.log("saveToIndexedDB success");
          
          await db.sync_queue.add({
            id: uuidv4(),
            entity: 'EXPENSE',
            action: 'CREATE',
            payload: payload,
            status: 'PENDING',
            created_at: new Date()
          });
          console.log("queue insertion success");
        } catch (e) {
          console.error("Failed to write to IndexedDB", e);
          throw e;
        }
      }
      return { success: true, offline: true, data: payload };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }
    
    try {
      console.log("sync attempt started");
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        let errMsg = "Failed to save expense";
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch (e) {}
        console.log("sync attempt failed", res.status, errMsg);
        throw new Error(errMsg);
      }
      
      const result = await res.json();
      return { success: true, offline: false, data: result };
    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.message.includes("NetworkError") || err.name === "TypeError") {
        console.log("sync attempt failed (network error), falling back to offline", err.message);
        return saveOffline();
      }
      throw err;
    }
  },
  
  update: async (id: string, data: any) => {
    if (!navigator.onLine) {
      throw new Error("Editing existing online expenses offline is not supported in this version.");
    }
    
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update expense");
    }
    
    return { success: true, offline: false };
  }
};
