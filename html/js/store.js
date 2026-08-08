// STORAGE — the browser stand-in for Prisma + public/renders.
//
// Finished pieces live in IndexedDB (metadata + the PNG blobs themselves, which
// are far too big for localStorage). In-progress selections live in
// sessionStorage — the browser twin of lib/store/useInvrtStore.ts, which is
// in-memory zustand state in the Next.js app.

const DB_NAME = "invrt";
const DB_VERSION = 1;
const GENERATIONS = "generations";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GENERATIONS)) {
        const store = db.createObjectStore(GENERATIONS, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("baselineSignature", "baselineSignature");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(GENERATIONS, mode);
        const store = transaction.objectStore(GENERATIONS);
        let result;
        try {
          result = run(store);
        } catch (e) {
          reject(e);
          return;
        }
        // A miss leaves request.result === undefined, so unwrap on the type
        // rather than on truthiness — otherwise "not found" resolves to the
        // IDBRequest itself and reads as a hit.
        transaction.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

export function saveGeneration(record) {
  return tx("readwrite", (store) => store.put(record)).then(() => record);
}

export function getGeneration(id) {
  return tx("readonly", (store) => store.get(id));
}

/** Newest first — the gallery's order. */
export async function listGenerations() {
  const all = await tx("readonly", (store) => store.getAll());
  return (all ?? []).sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteGeneration(id) {
  return tx("readwrite", (store) => store.delete(id));
}

export async function clearGenerations() {
  await tx("readwrite", (store) => store.clear());
}

/** Rough footprint of the gallery, for the settings panel. */
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}

// --- In-progress ritual state (zustand's job in the Next.js app) ---------------

const SESSION_KEY = "invrt.ritual";
const EMPTY = { baselinePathIds: [], statePathIds: [], baselineSignature: null, lastGenerationId: null };

function readSession() {
  try {
    return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}") };
  } catch {
    return { ...EMPTY };
  }
}

function writeSession(next) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    /* private mode — the ritual still works, it just will not survive a reload */
  }
  return next;
}

export const ritual = {
  get() {
    return readSession();
  },
  setBaselinePath(ids) {
    return writeSession({ ...readSession(), baselinePathIds: ids, baselineSignature: null });
  },
  setStatePath(ids) {
    return writeSession({ ...readSession(), statePathIds: ids });
  },
  setLastGenerationId(id) {
    return writeSession({ ...readSession(), lastGenerationId: id });
  },
  /** Keep an existing baseline, clear the state path — re-enter at #/state. */
  continueFromBaseline(baselinePathIds, baselineSignature) {
    return writeSession({ ...readSession(), baselinePathIds, baselineSignature, statePathIds: [] });
  },
  reset() {
    return writeSession({ ...EMPTY });
  },
};

// --- Settings -----------------------------------------------------------------

const SETTINGS_KEY = "invrt.settings";
const DEFAULT_SETTINGS = { provider: "local-render" };

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Stable id for a stored piece. crypto.randomUUID needs a secure context. */
export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  (globalThis.crypto ?? { getRandomValues: (b) => b.forEach((_, i) => (b[i] = (Math.random() * 256) | 0)) })
    .getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
