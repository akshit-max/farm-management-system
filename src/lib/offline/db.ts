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

export interface OfflineFeedConsumption {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineWaterUsage {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineElectricityUsage {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineCustomer {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineSupplier {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineAnimalCategory {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineStageDefinition {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineRoom {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineInventoryItem {
  local_id: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineUtilityMeter {
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
  offline_feed_consumptions!: Table<OfflineFeedConsumption>;
  offline_water_usages!: Table<OfflineWaterUsage>;
  offline_electricity_usages!: Table<OfflineElectricityUsage>;
  offline_customers!: Table<OfflineCustomer>;
  offline_suppliers!: Table<OfflineSupplier>;
  offline_animal_categories!: Table<OfflineAnimalCategory, string>;
  offline_stage_definitions!: Table<OfflineStageDefinition, string>;
  offline_rooms!: Table<OfflineRoom, string>;
  offline_utility_meters!: Table<OfflineUtilityMeter, string>;
  offline_animal_batches!: Table<any, string>;
  offline_inventory_items!: Table<OfflineInventoryItem, string>;
  sync_queue!: Table<SyncQueueTask, string>;

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
    this.version(5).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(6).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(7).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(8).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(9).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(10).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(11).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      offline_stage_definitions: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(12).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      offline_stage_definitions: 'local_id, sync_status, created_at',
      offline_rooms: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(13).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      offline_stage_definitions: 'local_id, sync_status, created_at',
      offline_rooms: 'local_id, sync_status, created_at',
      offline_utility_meters: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(14).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      offline_stage_definitions: 'local_id, sync_status, created_at',
      offline_rooms: 'local_id, sync_status, created_at',
      offline_utility_meters: 'local_id, sync_status, created_at',
      offline_animal_batches: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
    this.version(15).stores({
      offline_expenses: 'local_id, sync_status, created_at',
      offline_sales: 'local_id, sync_status, created_at',
      offline_customer_payments: 'local_id, sync_status, created_at',
      offline_mortalities: 'local_id, sync_status, created_at',
      offline_feed_consumptions: 'local_id, sync_status, created_at',
      offline_water_usages: 'local_id, sync_status, created_at',
      offline_electricity_usages: 'local_id, sync_status, created_at',
      offline_customers: 'local_id, sync_status, created_at',
      offline_suppliers: 'local_id, sync_status, created_at',
      offline_animal_categories: 'local_id, sync_status, created_at',
      offline_stage_definitions: 'local_id, sync_status, created_at',
      offline_rooms: 'local_id, sync_status, created_at',
      offline_utility_meters: 'local_id, sync_status, created_at',
      offline_animal_batches: 'local_id, sync_status, created_at',
      offline_inventory_items: 'local_id, sync_status, created_at',
      sync_queue: 'id, entity, status, created_at'
    });
  }
}

// We only want to instantiate Dexie on the client side
export const db = typeof window !== 'undefined' ? new FarmOfflineDB() : null as any;
