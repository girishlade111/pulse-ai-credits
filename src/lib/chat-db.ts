/**
 * Chat history storage, on IndexedDB.
 *
 * Chat transcripts are the one thing in this app that genuinely grows: a long
 * research thread with a few code blocks is tens of kilobytes, and a user with a
 * few dozen sessions outgrows the ~5MB `localStorage` ceiling fast. When that
 * happens the *entire* history write fails silently and the chat looks empty.
 * IndexedDB has no such ceiling, stores structured values without a
 * `JSON.stringify` round trip, and persists across reloads.
 *
 * Only the transcript lives here. Small UI preferences — sidebar width, the
 * last view, the provider — stay in `localStorage`, where a synchronous read at
 * first render is worth more than the extra storage.
 *
 * If IndexedDB is unavailable (private windows, a hardened profile, an
 * embedded webview) the store degrades to memory for the session rather than
 * throwing: losing history on reload is much better than losing the chat.
 */

import type { ChatSession } from "./chat-types";

const DB_NAME = "pulseai-chat";
const DB_VERSION = 1;
const SESSIONS = "sessions";
const META = "meta";

/** Session id of the chat that was open when the app last closed. */
export const ACTIVE_SESSION_KEY = "activeSessionId";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, ChatSession>();
const memoryMeta = new Map<string, unknown>();
let usingMemory = false;

const isSupported = (): boolean =>
  typeof indexedDB !== "undefined" && indexedDB !== null;

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (!isSupported()) {
    usingMemory = true;
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      // Some privacy modes throw on open rather than failing the request.
      usingMemory = true;
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS)) {
        db.createObjectStore(SESSIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // A version change from another tab invalidates this handle; drop it so
      // the next call reopens rather than writing into a closed connection.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      usingMemory = true;
      resolve(null);
    };

    request.onblocked = () => {
      usingMemory = true;
      resolve(null);
    };
  });
};

const db = (): Promise<IDBDatabase | null> => {
  dbPromise ??= openDatabase();
  return dbPromise;
};

/** True when history is only being held for this page view. */
export const isEphemeral = (): boolean => usingMemory;

/* ------------------------------------------------------------- transaction */

const run = <T,>(
  store: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> =>
  db().then(
    (database) =>
      new Promise<T | undefined>((resolve) => {
        if (!database) {
          resolve(undefined);
          return;
        }
        let transaction: IDBTransaction;
        try {
          transaction = database.transaction(store, mode);
        } catch {
          resolve(undefined);
          return;
        }
        const request = work(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
        transaction.onabort = () => resolve(undefined);
      })
  );

/* ---------------------------------------------------------------- sessions */

export const loadSessions = async (): Promise<ChatSession[]> => {
  const rows = await run<ChatSession[]>(SESSIONS, "readonly", (store) => store.getAll());
  if (rows === undefined) {
    if (usingMemory) return [...memory.values()];
    return [];
  }
  return rows;
};

/** Ids of the last full write, so a subsequent write can prune what it dropped. */
let persistedIds: Set<string> | null = null;

/** Writes many sessions in one transaction — a single burst per render. */
export const saveSessions = async (sessions: ChatSession[]): Promise<void> => {
  if (usingMemory) {
    sessions.forEach((session) => memory.set(session.id, session));
    return;
  }

  const database = await db();
  if (!database) {
    sessions.forEach((session) => memory.set(session.id, session));
    return;
  }

  const nextIds = new Set(sessions.map((session) => session.id));
  /*
   * Anything the store no longer holds has to be deleted here. The store caps
   * the list at MAX_SESSIONS and drops the rest, but `put` alone never removes
   * a record — so a session evicted by the cap, or one already removed from the
   * in-memory list, stayed in the store and reappeared on the next load. The
   * history grew past the cap no matter how many chats were deleted.
   */
  const stale = persistedIds ? [...persistedIds].filter((id) => !nextIds.has(id)) : [];
  persistedIds = nextIds;

  await new Promise<void>((resolve) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(SESSIONS, "readwrite");
    } catch {
      resolve();
      return;
    }
    const store = transaction.objectStore(SESSIONS);
    sessions.forEach((session) => {
      try {
        store.put(session);
      } catch {
        // A single unserialisable session must not sink the whole write.
      }
    });
    stale.forEach((id) => {
      try {
        store.delete(id);
      } catch {
        // Same: one bad record must not block the rest of the prune.
      }
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const deleteStoredSession = async (id: string): Promise<void> => {
  memory.delete(id);
  await run(SESSIONS, "readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
};

export const clearStoredSessions = async (): Promise<void> => {
  memory.clear();
  await run(SESSIONS, "readwrite", (store) => store.clear() as IDBRequest<undefined>);
};

/* -------------------------------------------------------------------- meta */

export const loadMeta = async (key: string): Promise<unknown> => {
  const value = await run<unknown>(META, "readonly", (store) => store.get(key));
  if (value === undefined) return usingMemory ? memoryMeta.get(key) : undefined;
  return value;
};

export const saveMeta = async (key: string, value: unknown): Promise<void> => {
  // Mirrored in memory too, so a write that raced a close still resolves.
  memoryMeta.set(key, value);
  await run(META, "readwrite", (store) => store.put(value, key) as IDBRequest<IDBValidKey>);
};

/** Approximate on-disk size, for the settings screen. */
export const estimateUsage = async (): Promise<{ bytes: number; sessions: number } | null> => {
  if (!navigator.storage?.estimate || usingMemory) return null;
  try {
    const { usage } = await navigator.storage.estimate();
    const sessions = (await loadSessions()).length;
    return { bytes: usage ?? 0, sessions };
  } catch {
    return null;
  }
};
