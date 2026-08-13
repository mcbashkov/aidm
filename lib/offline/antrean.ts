/**
 * Antrean catat offline (§7.2 prinsip #6): entri yang dibuat tanpa internet
 * disimpan di IndexedDB dan dikirim ulang ke POST /api/catat begitu online
 * (AC: tersinkron ≤ 30 detik setelah online).
 *
 * IndexedDB, bukan localStorage: tahan data lebih besar, tidak memblokir
 * main thread, dan tersedia di dalam service worker bila sinkronisasi nanti
 * pindah ke background sync.
 */

const DB_NAME = "aidm";
const STORE = "antrean-catat";

export interface AntreanItem {
  id: string;
  text: string;
  source: "chat" | "voice";
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onabort = () => db.close();
      }),
  );
}

export async function tambahAntrean(
  text: string,
  source: "chat" | "voice",
): Promise<AntreanItem | null> {
  const item: AntreanItem = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    source,
    createdAt: new Date().toISOString(),
  };
  try {
    await tx("readwrite", (s) => s.add(item));
    return item;
  } catch {
    return null; // mode privat / storage penuh — UI tetap jalan tanpa antrean
  }
}

export async function bacaAntrean(): Promise<AntreanItem[]> {
  try {
    const items = await tx<AntreanItem[]>("readonly", (s) => s.getAll());
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function hapusAntrean(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* diabaikan — item akan dicoba lagi di sinkron berikutnya */
  }
}
