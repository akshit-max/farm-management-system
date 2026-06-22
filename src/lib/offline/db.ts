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

export interface OfflineCustomerPayment {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineMortality {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export class FarmOfflineDB extends Dexie {
  offline_expenses!: Table<OfflineExpense>;
  offline_sales!: Table<OfflineSale>;
  offline_customer_payments!: Table<OfflineCustomerPayment>;
  offline_mortalities!: Table<OfflineMortality>;
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
    this.version(3).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(4).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
  }
}

// We only want to instantiate Dexie on the client side
export const db = typeof window !== 'undefined' ? new FarmOfflineDB() : null as any;
