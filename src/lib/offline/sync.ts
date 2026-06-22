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
          const response = await fetch('/api/accounting/expenses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(task.payload),
          });

          if (response.ok) {
            await db.sync_queue.update(task.id, { status: 'SYNCED' });
            if (task.payload.local_id) {
              await db.offline_expenses.update(task.payload.local_id, { sync_status: 'SYNCED' });
            }
          } else {
            // Logically failed or validation error
            await db.sync_queue.update(task.id, { status: 'FAILED' });
            if (task.payload.local_id) {
              await db.offline_expenses.update(task.payload.local_id, { sync_status: 'FAILED' });
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
