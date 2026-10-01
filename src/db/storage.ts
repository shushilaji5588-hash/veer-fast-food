/**
 * IndexedDB storage adapter for SQLite binary database file and WebAssembly binary
 * Ensures 100% offline persistence across app restarts, reloads, and device reboots.
 */

const DB_NAME = 'veer_pos_sqlite_store';
const DB_VERSION = 1;
const STORE_NAME = 'sqlite_binary';
const KEY = 'veer_fast_food_db';
const WASM_KEY = 'veer_sql_wasm_binary';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSqliteToDisk(binaryData: Uint8Array): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(binaryData, KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving SQLite to IndexedDB:', err);
  }
}

export async function loadSqliteFromDisk(): Promise<Uint8Array | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => {
        if (req.result && req.result instanceof Uint8Array) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('No existing SQLite DB found or error reading IndexedDB:', err);
    return null;
  }
}

export async function clearSqliteDisk(): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear SQLite storage:', err);
  }
}

/**
 * Cache sql-wasm.wasm binary directly into IndexedDB
 * Dual protection alongside Service Worker Cache Storage for offline startup
 */
export async function saveWasmBinaryToDisk(wasmBinary: ArrayBuffer): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(wasmBinary, WASM_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error caching WASM binary to IndexedDB:', err);
  }
}

export async function loadWasmBinaryFromDisk(): Promise<ArrayBuffer | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WASM_KEY);
      req.onsuccess = () => {
        if (req.result && (req.result instanceof ArrayBuffer || (req.result as ArrayBuffer).byteLength)) {
          resolve(req.result as ArrayBuffer);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('No cached WASM found in IndexedDB:', err);
    return null;
  }
}

export async function clearWasmBinaryDisk(): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(WASM_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear cached WASM binary from storage:', err);
  }
}
