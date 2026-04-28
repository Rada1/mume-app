/**
 * @file sessionDb.ts
 * @description Native IndexedDB wrapper for character session logs.
 * Provides high-capacity internal storage for MUME replays.
 */

import { SessionLog } from '../../hooks/useSessionRecorder';

const DB_NAME = 'MumeLogLibrary';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

export interface StoredSession extends SessionLog {
    id?: number;
    savedAt: string;
}

export const openDb = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('character', 'metadata.character', { unique: false });
                    store.createIndex('startTime', 'startTime', { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                const error = (event.target as IDBOpenDBRequest).error;
                console.error('[sessionDb] Failed to open database:', error);
                reject(error);
            };
            
            request.onblocked = () => {
                console.warn('[sessionDb] Database open blocked');
            };
        } catch (e) {
            console.error('[sessionDb] Critical error opening database:', e);
            reject(e);
        }
    });
};

/**
 * Hard reset for the database. 
 * Useful when the disk is full or the store is corrupted.
 */
export const deleteLibrary = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => {
            console.log(`[sessionDb] Database ${DB_NAME} deleted successfully`);
            resolve();
        };
        request.onerror = () => {
            console.error(`[sessionDb] Failed to delete database ${DB_NAME}`);
            reject(request.error);
        };
        request.onblocked = () => {
            console.warn(`[sessionDb] Delete database ${DB_NAME} blocked`);
        };
    });
};

export const getStorageUsage = async (): Promise<{ usage?: number, quota?: number } | null> => {
    if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
    }
    return null;
};

export const saveSessionToDb = async (log: SessionLog): Promise<number> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const record: StoredSession = {
                ...log,
                savedAt: new Date().toISOString()
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
            
            transaction.onabort = () => {
                console.error('[sessionDb] Transaction aborted:', transaction.error);
                reject(transaction.error);
            };
        } catch (e) {
            reject(e);
        }
    });
};

export const getAllSessionsFromDb = async (): Promise<StoredSession[]> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('startTime');
            
            const request = index.getAll();
            request.onsuccess = () => {
                // Return sorted by newest first
                const results = (request.result as StoredSession[]).sort((a, b) => 
                    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                );
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
};

export const getSessionById = async (id: number): Promise<StoredSession | null> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
};

export const deleteSessionFromDb = async (id: number): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
};

export const clearOldSessions = async (days: number): Promise<number> => {
    try {
        const db = await openDb();
        const sessions = await getAllSessionsFromDb();
        const now = new Date().getTime();
        const threshold = dayToMs(days);
        
        let deletedCount = 0;
        for (const session of sessions) {
            if (session.id && (now - new Date(session.startTime).getTime()) > threshold) {
                await deleteSessionFromDb(session.id);
                deletedCount++;
            }
        }
        return deletedCount;
    } catch (e) {
        console.error('[sessionDb] Failed to clear old sessions:', e);
        return 0;
    }
};

const dayToMs = (days: number) => days * 24 * 60 * 60 * 1000;
