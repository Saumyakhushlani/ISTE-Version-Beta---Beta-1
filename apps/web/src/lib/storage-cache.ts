/**
 * Client-Side Storage & Cache Engine for Financial Decision Lab (FDL).
 *
 * Architecture:
 * 1. IndexedDB ('fdl_client_db'):
 *    - Dedicated non-blocking asynchronous object store for large transaction datasets ('transactions').
 *    - Bypasses localStorage 5MB quota limits and prevents main-thread JSON parsing lag.
 * 2. LocalStorage ('fdl_cache:*'):
 *    - Synchronous key-value storage for lightweight summary metrics, counters, and instant first-paint hints.
 * 3. Cache Invalidation & TTL:
 *    - Automatic expiration via TTL (Default: 10 mins).
 *    - Mutation triggers (statement upload, Gmail sync, recategorize) automatically purge relevant stores.
 */

const DB_NAME = 'fdl_client_db';
const DB_VERSION = 1;
const TXN_STORE = 'transactions';
const METRICS_STORE = 'metrics';

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheWrapper<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ---------------------------------------------------------------------------
// 1. Native IndexedDB Promise Wrapper
// ---------------------------------------------------------------------------

let _dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB unavailable in this environment'));
  }

  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TXN_STORE)) {
          db.createObjectStore(TXN_STORE);
        }
        if (!db.objectStoreNames.contains(METRICS_STORE)) {
          db.createObjectStore(METRICS_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked by older tab.');
      };
    } catch (err) {
      reject(err);
    }
  });

  return _dbPromise;
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry: CacheWrapper<T> = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        const isExpired = Date.now() - entry.timestamp > (entry.ttl || DEFAULT_TTL_MS);
        if (isExpired) {
          // Asynchronously delete expired entry
          idbDelete(storeName, key).catch(() => {});
          resolve(null);
        } else {
          resolve(entry.data);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(
  storeName: string,
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const entry: CacheWrapper<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };
      const request = store.put(entry, key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Gracefully handle any IndexedDB storage issues
  }
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {}
}

export async function idbClear(storeName: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// 2. Synchronous LocalStorage Wrapper (for Metrics & Instant First-Paint)
// ---------------------------------------------------------------------------

export const localCache = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`fdl_cache:${key}`);
      if (!raw) return null;
      const entry: CacheWrapper<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > (entry.ttl || DEFAULT_TTL_MS)) {
        localStorage.removeItem(`fdl_cache:${key}`);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (typeof window === 'undefined') return;
    try {
      const entry: CacheWrapper<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };
      localStorage.setItem(`fdl_cache:${key}`, JSON.stringify(entry));
    } catch (e: any) {
      // If quota exceeded, prune older fdl_cache keys
      if (e?.name === 'QuotaExceededError') {
        localCache.clearExpired();
      }
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`fdl_cache:${key}`);
    } catch {}
  },

  clearMatching(prefix: string): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`fdl_cache:${prefix}`)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  },

  clearExpired(): void {
    if (typeof window === 'undefined') return;
    try {
      const now = Date.now();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('fdl_cache:')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const entry: CacheWrapper<any> = JSON.parse(raw);
              if (now - entry.timestamp > (entry.ttl || DEFAULT_TTL_MS)) {
                localStorage.removeItem(k);
              }
            }
          } catch {
            localStorage.removeItem(k);
          }
        }
      }
    } catch {}
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('fdl_cache:')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  },
};

// ---------------------------------------------------------------------------
// 3. Unified Storage Cache API
// ---------------------------------------------------------------------------

export function serializeParams(params?: Record<string, any>): string {
  if (!params) return 'default';
  const keys = Object.keys(params).sort();
  const pairs = keys
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${k}=${params[k]}`);
  return pairs.length > 0 ? pairs.join('&') : 'default';
}

export const storageCache = {
  // --- Transactions Store (IndexedDB) ---
  async getTransactions(params?: Record<string, any>): Promise<any | null> {
    const key = `txns:${serializeParams(params)}`;
    return await idbGet(TXN_STORE, key);
  },

  async setTransactions(params: Record<string, any> | undefined, data: any, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    const key = `txns:${serializeParams(params)}`;
    await idbSet(TXN_STORE, key, data, ttlMs);
  },

  async clearTransactions(): Promise<void> {
    await idbClear(TXN_STORE);
  },

  // --- Metrics Store (Hybrid: Synchronous LocalStorage + IndexedDB) ---
  getMetricsSync<T>(endpointKey: string): T | null {
    return localCache.get<T>(endpointKey);
  },

  async getMetrics<T>(endpointKey: string): Promise<T | null> {
    // Check localCache first for immediate response
    const mem = localCache.get<T>(endpointKey);
    if (mem !== null) return mem;
    // Fallback to IndexedDB
    return await idbGet<T>(METRICS_STORE, endpointKey);
  },

  async setMetrics<T>(endpointKey: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    localCache.set(endpointKey, data, ttlMs);
    await idbSet(METRICS_STORE, endpointKey, data, ttlMs);
  },

  async clearMetrics(prefix?: string): Promise<void> {
    if (prefix) {
      localCache.clearMatching(prefix);
    } else {
      localCache.clearAll();
      await idbClear(METRICS_STORE);
    }
  },

  // --- Global Invalidation (On Statement Upload, Gmail Sync, etc.) ---
  async clearAll(): Promise<void> {
    localCache.clearAll();
    await Promise.all([
      idbClear(TXN_STORE),
      idbClear(METRICS_STORE),
    ]);
  },

  async invalidateDataStores(): Promise<void> {
    localCache.clearMatching('dashboard');
    localCache.clearMatching('recurring');
    localCache.clearMatching('anomalies');
    localCache.clearMatching('transactions');
    localCache.clearMatching('accounts');
    await Promise.all([
      idbClear(TXN_STORE),
      idbClear(METRICS_STORE),
    ]);
  },
};
