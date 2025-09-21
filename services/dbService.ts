/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { HomepageMode } from '../HomepageImageManager';
import { HistoryItem } from '../App';

const DB_NAME = 'BananaFashionDB';
const DB_VERSION = 1;
const STORE_NAME = 'portfolio';

export type SupportedMode = HomepageMode | 'portrait' | 'composition' | 'outfitAnalysis' | 'asset';

export interface PortfolioItem {
    id: string; // Using timestamp string as ID
    timestamp: number;
    imageUrl: string;
    mode: SupportedMode;
    prompt: string; // A descriptive title/prompt
    settings: {
        // Core wizard state
        history?: HistoryItem[];
        // Composition state
        personImage?: string | null;
        itemImages?: string[];
        moodboardUrl?: string | null;
        // Other modules' state
        uploadedImage?: string | null;
        subMode?: string;
        [key: string]: any;
    };
}

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error:", (event.target as IDBRequest).error);
            reject("Database error");
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const getStorageLimitBytes = (): number => {
    const limitInMB = Number(localStorage.getItem('portfolio_storage_limit_mb') || 200);
    return limitInMB * 1024 * 1024;
};

// Estimates the size of a portfolio item in bytes.
const calculateItemSize = (item: PortfolioItem): number => {
    // A quick way to estimate size is by the length of the JSON string.
    // The base64 imageUrl is the vast majority of the data.
    return new TextEncoder().encode(JSON.stringify(item)).length;
};

export const addPortfolioItem = async (item: PortfolioItem): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const limit = getStorageLimitBytes();
    const newItemSize = calculateItemSize(item);

    const allItems: PortfolioItem[] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    let currentSize = allItems.reduce((acc, current) => acc + calculateItemSize(current), 0);
    let totalSize = currentSize + newItemSize;
    
    if (totalSize > limit) {
        // Sort oldest first to delete them
        allItems.sort((a, b) => a.timestamp - b.timestamp);
        
        for (const oldItem of allItems) {
            if (totalSize <= limit) break;
            
            const itemSize = calculateItemSize(oldItem);
            store.delete(oldItem.id); // No need to await inside loop, transaction handles it
            totalSize -= itemSize;
        }
    }
    
    return new Promise((resolve, reject) => {
        const request = store.put(item); // Use put to allow overwriting/updating
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
            console.error("Error adding item:", (event.target as IDBRequest).error);
            reject("Error adding item");
        };
    });
};

export const addMultiplePortfolioItems = async (items: PortfolioItem[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        items.forEach(item => {
            // Use put to add or update. This prevents errors if an item from backup already exists.
            store.put(item); 
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
            console.error("Error restoring items:", (event.target as IDBRequest).error);
            reject("Error restoring items");
        };
    });
};


export const getAllPortfolioItems = async (): Promise<PortfolioItem[]> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            // Sort by timestamp descending (newest first)
            resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = (event) => {
            console.error("Error fetching items:", (event.target as IDBRequest).error);
            reject("Error fetching items");
        };
    });
};

export const deletePortfolioItem = async (id: string): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("Error deleting item:", (event.target as IDBRequest).error);
            reject("Error deleting item");
        };
    });
};

export const deletePortfolioItems = async (ids: string[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        ids.forEach(id => store.delete(id));
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
            console.error("Error deleting items:", (event.target as IDBRequest).error);
            reject("Error deleting items");
        };
    });
};

export const clearAllPortfolioItems = async (): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("Error clearing store:", (event.target as IDBRequest).error);
            reject("Error clearing store");
        };
    });
};

export const getPortfolioSize = async (): Promise<number> => {
    const items = await getAllPortfolioItems();
    return items.reduce((acc, item) => acc + calculateItemSize(item), 0);
};