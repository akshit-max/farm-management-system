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

export class FarmOfflineDB extends Dexie {
  offline_expenses!: Table<OfflineExpense>;
  sync_queue!: Table<SyncQueueTask>;

  constructor() {
    super('FarmOfflineDB');
    this.version(1).stores({
      offline_expenses: 'local_id, created_at, sync_status',
      sync_queue: 'id, entity, action, status, created_at'
    });
  }
}

// We only want to instantiate Dexie on the client side
export const db = typeof window !== 'undefined' ? new FarmOfflineDB() : null as any;
