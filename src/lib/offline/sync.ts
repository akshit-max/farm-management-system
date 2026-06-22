import { db } from './db';

export const processSyncQueue = async () => {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;
  if (!db) return;

  try {
    const pendingTasks = await db.sync_queue.where('status').equals('PENDING').toArray();

    for (const task of pendingTasks) {
      try {
        if (task.entity === 'EXPENSE' && task.action === 'CREATE') {
          const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task.payload),
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id) {
              await db.offline_expenses.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id) {
              await db.offline_expenses.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }
        
        if (task.entity === 'SALES' && task.action === 'CREATE') {
          const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task.payload),
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id) {
              await db.offline_sales.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id) {
              await db.offline_sales.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'ANIMAL_CATEGORY') {
          let response;
          let method = 'POST';
          let endpoint = '/api/animal-categories';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/animal-categories/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/animal-categories/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_animal_categories.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_animal_categories.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'SUPPLIER') {
          let response;
          let method = 'POST';
          let endpoint = '/api/suppliers';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/suppliers/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/suppliers/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_suppliers.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_suppliers.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'CUSTOMER') {
          let response;
          let method = 'POST';
          let endpoint = '/api/customers';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/customers/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/customers/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_customers.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_customers.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'CUSTOMER_PAYMENT') {
          let response;
          let method = 'POST';
          let endpoint = '/api/customer-payments';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/customer-payments/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/customer-payments/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id) {
              await db.offline_customer_payments.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id) {
              await db.offline_customer_payments.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'MORTALITY') {
          let response;
          let method = 'POST';
          let endpoint = '/api/mortalities';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/mortalities/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/mortalities/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_mortalities.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_mortalities.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }

        if (task.entity === 'FEED_CONSUMPTION') {
          let response;
          let method = 'POST';
          let endpoint = '/api/feed-consumption';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/feed-consumption/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/feed-consumption/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_feed_consumptions.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_feed_consumptions.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }
        
        if (task.entity === 'WATER_USAGE') {
          let response;
          let method = 'POST';
          let endpoint = '/api/water-usage';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/water-usage/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/water-usage/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_water_usages.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_water_usages.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }
        
        if (task.entity === 'ELECTRICITY_USAGE') {
          let response;
          let method = 'POST';
          let endpoint = '/api/electricity-usage';
          
          if (task.action === 'UPDATE') {
            method = 'PUT';
            endpoint = `/api/electricity-usage/${task.payload.id}`;
          } else if (task.action === 'DELETE') {
            method = 'DELETE';
            endpoint = `/api/electricity-usage/${task.payload.id}`;
          }

          response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: task.action !== 'DELETE' ? JSON.stringify(task.payload) : undefined,
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_electricity_usages.update(task.payload.id, { sync_status: 'SYNCED' });
            }
          } else {
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.id && task.action === 'CREATE') {
              await db.offline_electricity_usages.update(task.payload.id, { sync_status: 'FAILED' });
            }
          }
        }
      } catch (error) {
        console.error('Sync error for task', task.id, error);
        // Do not update status on network failure so it retries later
      }
    }
  } catch (err) {
    console.error('Error processing sync queue:', err);
  }
};
