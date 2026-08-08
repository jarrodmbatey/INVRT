// STORAGE — the browser stand-in for Prisma + public/renders.
//
// Finished pieces live in IndexedDB (metadata + the PNG blobs themselves, which
// are far too big for localStorage). In-progress selections live in
// sessionStorage — the browser twin of lib/store/useInvrtStore.ts, which is
// in-memory zustand state in the Next.js app.
//
// Every persistence layer here is optional. Sandboxed iframes and private modes
// can refuse IndexedDB, sessionStorage or both; when that happens the ritual
// still has to run, so each falls back to memory and the gallery simply lasts
// as long as the tab does.

const DB_NAME = "invrt";
const DB_VERSION = 1;
const GENERATIONS = "generations";

/** Set once IndexedDB has proved unavailable; the Map is the whole fallback. */
let memoryOnly = false;
const memory = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
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
    request.onblocked = () => reject(new Error("IndexedDB is blocked"));
  });
  return dbPromise;
}

/**
 * Run one transaction, or fall back to the in-memory map. `onMemory` receives
 * the map so each operation stays a single definition of intent.
 */
async function tx(mode, run, onMemory) {
  if (!memoryOnly) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
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
      });
    } catch (e) {
      memoryOnly = true;
      console.warn("[invrt] IndexedDB unavailable — the gallery will last only for this tab.", e);
    }
  }
  return onMemory(memory);
}

/** True once storage has been found unavailable — the settings panel says so. */
export function isMemoryOnly() {
  return memoryOnly;
}

export function saveGeneration(record) {
  return tx(
    "readwrite",
    (store) => store.put(record),
    (map) => map.set(record.id, record),
  ).then(() => record);
}

export function getGeneration(id) {
  return tx(
    "readonly",
    (store) => store.get(id),
    (map) => map.get(id),
  );
}

/** Newest first — the gallery's order. */
export async function listGenerations() {
  const all = await tx(
    "readonly",
    (store) => store.getAll(),
    (map) => [...map.values()],
  );
  return (all ?? []).sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteGeneration(id) {
  return tx(
    "readwrite",
    (store) => store.delete(id),
    (map) => map.delete(id),
  );
}

export async function clearGenerations() {
  await tx(
    "readwrite",
    (store) => store.clear(),
    (map) => map.clear(),
  );
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

// Memory is authoritative; sessionStorage is the best-effort copy that lets the
// ritual survive a reload. Where sessionStorage is refused, only that survival
// is lost — the walk from baseline to result still works.
let sessionCache = { ...EMPTY };

function readSession() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) sessionCache = { ...EMPTY, ...JSON.parse(stored) };
  } catch {
    /* storage refused — keep using the in-memory copy */
  }
  return sessionCache;
}

function writeSession(next) {
  sessionCache = next;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    /* private mode or sandboxed frame — memory carries it instead */
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
