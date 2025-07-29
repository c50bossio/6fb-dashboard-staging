/**
 * Background Sync Utilities
 * 
 * Handles queuing and syncing of offline actions using IndexedDB and Background Sync API
 */

// IndexedDB setup for storing queued actions
const DB_NAME = '6fb-ai-sync';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

let db = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('type', 'type', { unique: false });
      store.createIndex('status', 'status', { unique: false });
    };
  });
}

/**
 * Add action to sync queue
 */
export async function queueAction(action) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const queueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    await new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync-' + action.type);
    }

    console.log('[BackgroundSync] Action queued:', queueItem);
    return queueItem.id;
  } catch (error) {
    console.error('[BackgroundSync] Failed to queue action:', error);
    throw error;
  }
}

/**
 * Get all pending actions
 */
export async function getPendingActions(type = null) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = type 
      ? store.index('type').getAll(type)
      : store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const actions = request.result.filter(action => action.status === 'pending');
        resolve(actions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to get pending actions:', error);
    return [];
  }
}

/**
 * Mark action as completed
 */
export async function markActionCompleted(actionId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(actionId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.status = 'completed';
          action.completedAt = new Date().toISOString();
          
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve(action);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to mark action completed:', error);
  }
}

/**
 * Mark action as failed
 */
export async function markActionFailed(actionId, error) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(actionId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.status = 'failed';
          action.error = error;
          action.retryCount = (action.retryCount || 0) + 1;
          action.lastAttempt = new Date().toISOString();
          
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve(action);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to mark action failed:', error);
  }
}

/**
 * Remove completed actions older than specified time
 */
export async function cleanupCompletedActions(olderThanHours = 24) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const index = store.index('timestamp');
    const request = index.openCursor();

    const toDelete = [];

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const action = cursor.value;
          const actionTime = new Date(action.timestamp);
          
          if (action.status === 'completed' && actionTime < cutoffTime) {
            toDelete.push(action.id);
          }
          cursor.continue();
        } else {
          // Delete all marked actions
          const deletePromises = toDelete.map(id => {
            return new Promise((res, rej) => {
              const deleteRequest = store.delete(id);
              deleteRequest.onsuccess = () => res();
              deleteRequest.onerror = () => rej(deleteRequest.error);
            });
          });
          
          Promise.all(deletePromises)
            .then(() => resolve(toDelete.length))
            .catch(reject);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to cleanup actions:', error);
    return 0;
  }
}

/**
 * Sync specific action type
 */
export async function syncActions(type) {
  const actions = await getPendingActions(type);
  const results = [];

  for (const action of actions) {
    try {
      let response;
      
      // Execute the action based on type
      switch (action.type) {
        case 'form-submission':
          response = await fetch(action.url, {
            method: action.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...action.headers
            },
            body: JSON.stringify(action.data)
          });
          break;
          
        case 'data-update':
          response = await fetch(action.url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...action.headers
            },
            body: JSON.stringify(action.data)
          });
          break;
          
        case 'file-upload':
          const formData = new FormData();
          Object.entries(action.data).forEach(([key, value]) => {
            formData.append(key, value);
          });
          
          response = await fetch(action.url, {
            method: 'POST',
            headers: action.headers,
            body: formData
          });
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      if (response.ok) {
        await markActionCompleted(action.id);
        results.push({ id: action.id, status: 'success' });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      await markActionFailed(action.id, error.message);
      results.push({ id: action.id, status: 'failed', error: error.message });
    }
  }

  return results;
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const actions = request.result;
        const stats = {
          total: actions.length,
          pending: actions.filter(a => a.status === 'pending').length,
          completed: actions.filter(a => a.status === 'completed').length,
          failed: actions.filter(a => a.status === 'failed').length,
          byType: {}
        };

        // Group by type
        actions.forEach(action => {
          if (!stats.byType[action.type]) {
            stats.byType[action.type] = { total: 0, pending: 0, completed: 0, failed: 0 };
          }
          stats.byType[action.type].total++;
          stats.byType[action.type][action.status]++;
        });

        resolve(stats);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to get sync stats:', error);
    return { total: 0, pending: 0, completed: 0, failed: 0, byType: {} };
  }
}

/**
 * Initialize background sync (call this on app start)
 */
export async function initBackgroundSync() {
  try {
    await initDB();
    
    // Clean up old completed actions
    const cleaned = await cleanupCompletedActions(24);
    if (cleaned > 0) {
      console.log(`[BackgroundSync] Cleaned up ${cleaned} old actions`);
    }

    // Check for service worker support
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SYNC_COMPLETED') {
          markActionCompleted(event.data.actionId);
        } else if (event.data?.type === 'SYNC_FAILED') {
          markActionFailed(event.data.actionId, event.data.error);
        }
      });
    }

    console.log('[BackgroundSync] Initialized successfully');
  } catch (error) {
    console.error('[BackgroundSync] Failed to initialize:', error);
  }
}