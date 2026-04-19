/**
 * IndexedDB-based file persistence for the upload form.
 * Stores the selected video file so it survives tab switches and refreshes.
 * Cleared only after a successful upload.
 */

const DB_NAME = 'SocialStudioDrafts';
const STORE_NAME = 'files';
const FILE_KEY = 'draft_video';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDraftFile(file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(
      { blob: file, name: file.name, type: file.type, lastModified: file.lastModified },
      FILE_KEY
    );
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getDraftFile(): Promise<File | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(FILE_KEY);
      req.onsuccess = () => {
        db.close();
        const data = req.result;
        if (!data) return resolve(null);
        const file = new File([data.blob], data.name, {
          type: data.type,
          lastModified: data.lastModified,
        });
        resolve(file);
      };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

export async function clearDraftFile(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(FILE_KEY);
    tx.oncomplete = () => db.close();
  } catch {
    // Silent fail — not critical
  }
}
