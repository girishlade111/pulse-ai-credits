/**
 * Chat session store.
 *
 * Transcripts are persisted to IndexedDB (see `chat-db.ts`) rather than
 * `localStorage`: a chat history is the one thing here that grows without
 * bound, and once it passes the ~5MB string quota the *entire* history write
 * fails and the chat looks like it lost everything. Small UI preferences still
 * use `localStorage`, where a synchronous read at first render is worth more
 * than the extra storage.
 *
 * State updates go through a single set of helpers so a streaming token edits
 * exactly one message, and writes are debounced — a streamed answer mutates
 * state on every chunk, and persisting the whole transcript that often would
 * jank the stream.
 *
 * The initial state is empty and filled in asynchronously, because IndexedDB
 * cannot be read synchronously during render. Consumers get `ready` so they can
 * hold off on a "no chats yet" empty state until the real history is in.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SESSION_GROUPS,
  uid,
  type ChatMessage,
  type ChatSession,
  type SessionGroup,
} from "./chat-types";
import {
  ACTIVE_SESSION_KEY,
  clearStoredSessions,
  deleteStoredSession,
  loadMeta,
  loadSessions,
  saveMeta,
  saveSessions,
} from "./chat-db";

const VIEW_KEY = "pulseai-chat-view-v1";
const PERSIST_DEBOUNCE_MS = 400;
/** Keeps storage bounded without the user noticing. */
const MAX_SESSIONS = 200;
const TITLE_MAX = 60;

/** The pre-IndexedDB key, so an existing history is carried over once. */
const LEGACY_KEY = "pulseai-chat-sessions-v1";

interface PersistedShape {
  sessions: ChatSession[];
  activeId: string | null;
}

const EMPTY: PersistedShape = { sessions: [], activeId: null };

/**
 * One read, shared by every consumer and every mount.
 *
 * Module-level on purpose. React's StrictMode mounts an effect, tears it down,
 * and mounts it again — so a per-effect "only hydrate once" guard plus a
 * per-effect cancellation flag means the *only* run gets cancelled and the
 * history never appears at all. Caching the promise at module scope makes the
 * read idempotent instead, which is what it actually is.
 */
let hydration: Promise<PersistedShape> | null = null;

const hydrate = (): Promise<PersistedShape> => {
  if (hydration) return hydration;

  hydration = (async () => {
    const sessions = (await loadSessions()).filter(isSession);

    // Carry over a history written by the previous localStorage version, so
    // upgrading does not look like every chat was deleted.
    const legacy = readLegacy();
    if (!sessions.length && legacy.sessions.length) {
      await saveSessions(legacy.sessions);
      try {
        window.localStorage.removeItem(LEGACY_KEY);
      } catch {
        // The copy is already in IndexedDB; leaving the old key is harmless.
      }
      return { sessions: legacy.sessions, activeId: legacy.activeId };
    }

    const storedActiveId = await loadMeta(ACTIVE_SESSION_KEY);
    const activeId =
      typeof storedActiveId === "string" && sessions.some((s) => s.id === storedActiveId)
        ? storedActiveId
        : legacy.activeId;

    return { sessions, activeId: activeId ?? null };
  })();

  return hydration;
};

const isSession = (value: unknown): value is ChatSession => {
  const session = value as ChatSession | null;
  return !!session && typeof session.id === "string" && Array.isArray(session.messages);
};

/**
 * One-time migration from the `localStorage` era. The old payload is only
 * removed after IndexedDB has accepted it, so an interrupted upgrade cannot
 * lose the history.
 */
const readLegacy = (): PersistedShape => {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.filter(isSession) : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
    };
  } catch {
    return EMPTY;
  }
};

/**
 * Whether the user left the workspace in the chat view. Reloading mid-chat
 * should not drop them back on the empty landing.
 */
export const readChatView = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VIEW_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeChatView = (inChat: boolean): void => {
  try {
    if (inChat) window.localStorage.setItem(VIEW_KEY, "1");
    else window.localStorage.removeItem(VIEW_KEY);
  } catch {
    // Storage blocked — the flag is a nicety, not a requirement.
  }
};

/* ------------------------------------------------------------------ sidebar */

/** Resize bounds. Below the minimum the history titles stop being readable. */
export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 520;
export const SIDEBAR_DEFAULT = 256;
const WIDTH_KEY = "pulseai-chat-sidebar-width";

export const clampSidebarWidth = (width: number): number =>
  Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(width)));

export const readSidebarWidth = (): number => {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  try {
    const raw = Number(window.localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(raw) && raw > 0 ? clampSidebarWidth(raw) : SIDEBAR_DEFAULT;
  } catch {
    return SIDEBAR_DEFAULT;
  }
};

export const writeSidebarWidth = (width: number): void => {
  try {
    window.localStorage.setItem(WIDTH_KEY, String(clampSidebarWidth(width)));
  } catch {
    // Storage blocked — the drag still works for this session.
  }
};

export const deriveTitle = (text: string): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "New chat";
  return flat.length > TITLE_MAX ? `${flat.slice(0, TITLE_MAX - 1).trimEnd()}…` : flat;
};

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const DAY_MS = 86_400_000;

const groupFor = (session: ChatSession, now: number): SessionGroup => {
  if (session.pinned) return "Pinned";
  const age = now - startOfDay(new Date(session.updatedAt));
  if (age < DAY_MS) return "Today";
  if (age < 2 * DAY_MS) return "Yesterday";
  if (age < 7 * DAY_MS) return "Previous 7 days";
  if (age < 30 * DAY_MS) return "Previous 30 days";
  return "Older";
};

export interface ChatStore {
  sessions: ChatSession[];
  /** Most recently updated first, pinned chats hoisted to the top. */
  ordered: ChatSession[];
  grouped: { group: SessionGroup; sessions: ChatSession[] }[];
  activeId: string | null;
  active: ChatSession | null;
  /** False until IndexedDB has answered; an empty list before then is not "no chats". */
  ready: boolean;
  createSession: () => string;
  selectSession: (id: string | null) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  clearAll: () => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage>
  ) => void;
  removeMessagesFrom: (sessionId: string, index: number) => void;
  clearMessages: (sessionId: string) => void;
}

export const useChatSessions = (): ChatStore => {
  const [state, setState] = useState<PersistedShape>(EMPTY);
  const [ready, setReady] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout>>();
  /**
   * Set as soon as anything local happens, so a slow hydration read cannot
   * overwrite work the user did in the meantime.
   */
  const touched = useRef(false);

  /*
   * Hydrate once. IndexedDB is asynchronous, so the first render has no
   * history; `ready` tells consumers to wait rather than flash an empty state.
   *
   * There is no cancellation flag here on purpose — see the note on
   * `hydrate()` above. React 18 dropped the "setState on unmounted component"
   * warning, and StrictMode's simulated unmount must not be able to cancel the
   * one real read. The `touched` ref, not a cancellation flag, is what stops
   * stale data from clobbering newer work.
   */
  useEffect(() => {
    void hydrate().then((loaded) => {
      setState((prev) => (touched.current || prev.sessions.length ? prev : loaded));
      setReady(true);
    });
  }, []);

  // Debounced persistence. `sessions` identity changes on every streamed chunk.
  useEffect(() => {
    if (!ready) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      void saveSessions(state.sessions);
      void saveMeta(ACTIVE_SESSION_KEY, state.activeId);
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [ready, state]);

  const mutate = useCallback(
    (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
      touched.current = true;
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id === sessionId ? updater(session) : session
        ),
      }));
    },
    []
  );

  const touch = (session: ChatSession): ChatSession => ({
    ...session,
    updatedAt: new Date().toISOString(),
  });

  const createSession = useCallback(() => {
    touched.current = true;
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: uid("chat"),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setState((prev) => ({
      activeId: session.id,
      sessions: [session, ...prev.sessions].slice(0, MAX_SESSIONS),
    }));
    return session.id;
  }, []);

  const selectSession = useCallback((id: string | null) => {
    touched.current = true;
    setState((prev) => {
      // Selecting an empty session is a no-op: "new chat" is explicit.
      if (id && !prev.sessions.some((session) => session.id === id)) return prev;
      return { ...prev, activeId: id };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    touched.current = true;
    // Remove from IndexedDB immediately; the debounced writer would otherwise
    // rewrite the whole set, including the session being deleted.
    void deleteStoredSession(id);
    setState((prev) => {
      const sessions = prev.sessions.filter((session) => session.id !== id);
      return {
        sessions,
        activeId: prev.activeId === id ? (sessions[0]?.id ?? null) : prev.activeId,
      };
    });
  }, []);

  const renameSession = useCallback(
    (id: string, title: string) => {
      const next = deriveTitle(title);
      mutate(id, (session) => ({ ...session, title: next || "Untitled chat" }));
    },
    [mutate]
  );

  const togglePin = useCallback(
    (id: string) => {
      mutate(id, (session) => touch({ ...session, pinned: !session.pinned }));
    },
    [mutate]
  );

  const clearAll = useCallback(() => {
    touched.current = true;
    void clearStoredSessions();
    setState({ sessions: [], activeId: null });
  }, []);

  const appendMessage = useCallback(
    (sessionId: string, message: ChatMessage) => {
      mutate(sessionId, (session) => {
        const isFirstUserTurn = message.role === "user" && session.messages.length === 0;
        return touch({
          ...session,
          // The title follows the opening prompt until the user renames it.
          title: isFirstUserTurn ? deriveTitle(message.text) : session.title,
          messages: [...session.messages, message],
        });
      });
    },
    [mutate]
  );

  const patchMessage = useCallback(
    (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => {
      mutate(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId ? { ...message, ...patch } : message
        ),
      }));
    },
    [mutate]
  );

  const removeMessagesFrom = useCallback(
    (sessionId: string, index: number) => {
      mutate(sessionId, (session) => ({
        ...session,
        messages: session.messages.slice(0, Math.max(0, index)),
      }));
    },
    [mutate]
  );

  const clearMessages = useCallback(
    (sessionId: string) => {
      mutate(sessionId, (session) => ({ ...session, messages: [], title: "New chat" }));
    },
    [mutate]
  );

  const ordered = useMemo(
    () =>
      [...state.sessions].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [state.sessions]
  );

  const grouped = useMemo(() => {
    const now = Date.now();
    const buckets = new Map<SessionGroup, ChatSession[]>();
    for (const session of ordered) {
      const group = groupFor(session, now);
      const list = buckets.get(group);
      if (list) list.push(session);
      else buckets.set(group, [session]);
    }
    return SESSION_GROUPS.map((group) => ({ group, sessions: buckets.get(group) ?? [] })).filter(
      (entry) => entry.sessions.length > 0
    );
  }, [ordered]);

  const active = useMemo(
    () => state.sessions.find((session) => session.id === state.activeId) ?? null,
    [state.sessions, state.activeId]
  );

  return {
    sessions: state.sessions,
    ordered,
    grouped,
    activeId: state.activeId,
    active,
    ready,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    togglePin,
    clearAll,
    appendMessage,
    patchMessage,
    removeMessagesFrom,
    clearMessages,
  };
};
