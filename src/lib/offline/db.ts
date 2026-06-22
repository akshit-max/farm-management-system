import Dexie, { Table } from 'dexie';

export interface OfflineExpense {
  local_id: string;
  payload: any;
  created_at: Date;
  updated_at: Date;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface SyncQueueTask {
  id: string;
  entity: string;
  action: string;
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
}

export interface OfflineSale {
  local_id: string;
  payload: any;
  created_at: Date;
  updated_at: Date;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export class FarmOfflineDB extends Dexie {
  offline_expenses!: Table<OfflineExpense>;
  offline_sales!: Table<OfflineSale>;
  sync_queue!: Table<SyncQueueTask>;

  constructor() {
    super('FarmOfflineDB');
    this.version(1).stores({
      offline_expenses: 'local_id, created_at, sync_status',
      sync_queue: 'id, entity, action, status, created_at'
    });
    this.version(2).stores({
      offline_sales: 'local_id, created_at, sync_status'
    });
  }
}

// We only want to instantiate Dexie on the client side
export const db = typeof window !== 'undefined' ? new FarmOfflineDB() : null as any;
