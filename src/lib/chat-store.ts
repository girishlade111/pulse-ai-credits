/**
 * Chat session store.
 *
 * Sessions live in `localStorage` — this app has no database, and a chat that
 * disappears on reload is not a chat history. Everything is written through a
 * single reducer-style set of helpers so a streaming token updates exactly one
 * message instead of rebuilding the whole transcript.
 *
 * Writes are debounced: a streamed answer mutates state on every chunk, and
 * serialising the full transcript to storage that often would jank the stream.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SESSION_GROUPS,
  uid,
  type ChatMessage,
  type ChatSession,
  type SessionGroup,
} from "./chat-types";

const STORAGE_KEY = "pulseai-chat-sessions-v1";
const ACTIVE_KEY = "pulseai-chat-active-v1";
const PERSIST_DEBOUNCE_MS = 300;
/** Keeps storage bounded without the user noticing. */
const MAX_SESSIONS = 100;
const TITLE_MAX = 60;

interface PersistedShape {
  sessions: ChatSession[];
  activeId: string | null;
}

const readStorage = (): PersistedShape => {
  if (typeof window === "undefined") return { sessions: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], activeId: null };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter(
          (session): session is ChatSession =>
            !!session && typeof session.id === "string" && Array.isArray(session.messages)
        )
      : [];
    const activeId =
      typeof parsed.activeId === "string" &&
      sessions.some((session) => session.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { sessions, activeId };
  } catch {
    return { sessions: [], activeId: null };
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
  const [state, setState] = useState<PersistedShape>(readStorage);
  const writeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced persistence. `sessions` identity changes on every streamed chunk.
  useEffect(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ sessions: state.sessions, activeId: state.activeId })
        );
        if (state.activeId) window.localStorage.setItem(ACTIVE_KEY, state.activeId);
        else window.localStorage.removeItem(ACTIVE_KEY);
      } catch {
        // Storage full or blocked — the in-memory chat still works.
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state]);

  const mutate = useCallback(
    (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
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
    setState((prev) => {
      // Selecting an empty session is a no-op: "new chat" is explicit.
      if (id && !prev.sessions.some((session) => session.id === id)) return prev;
      return { ...prev, activeId: id };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
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
