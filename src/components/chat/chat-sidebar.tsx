/**
 * The chat sidebar: new chat, searchable history grouped by age, and per-chat
 * rename / pin / delete.
 *
 * This is the part the old build stubbed out ("History is coming soon") — the
 * `chatHistory` state it collected was never rendered, so a session was
 * unreachable the moment you started a new one.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/Navbar";
import { useChatSessions } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import {
  Check,
  History,
  LayoutDashboard,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface ChatSidebarProps {
  open: boolean;
  collapsed: boolean;
  onOpenChange: (open: boolean) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate: (path: string) => void;
  activeSessionId: string | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  open,
  collapsed,
  onOpenChange,
  onCollapsedChange,
  onNavigate,
  activeSessionId,
}) => {
  const store = useChatSessions();
  const [query, setQuery] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return store.grouped;
    const matches = store.ordered.filter((session) =>
      session.title.toLowerCase().includes(needle)
    );
    if (!matches.length) return [];
    return [{ group: "Results" as const, sessions: matches }];
  }, [query, store.grouped, store.ordered]);

  const handleNewChat = () => {
    store.createSession();
    onOpenChange(false);
  };

  const commitRename = () => {
    if (renamingId && draftTitle.trim()) store.renameSession(renamingId, draftTitle);
    setRenamingId(null);
    setDraftTitle("");
  };

  const handleDelete = (id: string) => {
    store.deleteSession(id);
    if (renamingId === id) setRenamingId(null);
  };

  const go = (path: string) => {
    onNavigate(path);
    onOpenChange(false);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 lg:hidden"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "chat-sidebar",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:translate-x-0"
        )}
        aria-label="Chat history"
      >
        <div className="flex items-center gap-2 border-b border-hairline p-3">
          <Wordmark className="flex min-w-0 flex-1 items-center gap-2.5" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(false)}
            className="hidden h-8 w-8 lg:inline-flex"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 lg:hidden"
            aria-label="Close navigation"
          >
            <X />
          </Button>
        </div>

        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start"
            aria-label="Start a new chat"
          >
            <MessageSquarePlus />
            New chat
          </Button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="field h-9 py-0 pl-9 text-sm"
            />
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 scroll-quiet">
          {!filtered.length && (
            <p className="px-1 py-6 text-center caption text-muted-soft">
              {query ? "No chats match that search." : "No chats yet. Ask something to start."}
            </p>
          )}

          {filtered.map(({ group, sessions }) => (
            <div key={group} className="mb-4">
              <p className="section-label mb-1.5 px-1">{group}</p>
              <ul className="space-y-0.5">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isRenaming = renamingId === session.id;

                  return (
                    <li key={session.id} className="group/session relative">
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5 px-1">
                          <input
                            ref={renameInputRef}
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitRename();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setRenamingId(null);
                              }
                            }}
                            onBlur={commitRename}
                            aria-label="Chat title"
                            className="field h-8 py-0 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={commitRename}
                            className="h-8 w-8 shrink-0"
                            aria-label="Save title"
                          >
                            <Check className="text-success" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            store.selectSession(session.id);
                            onOpenChange(false);
                          }}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md py-2 pl-2 pr-14 text-left transition-colors",
                            isActive
                              ? "bg-card text-ink"
                              : "text-muted hover:bg-card hover:text-ink"
                          )}
                        >
                          {session.pinned && (
                            <Pin className="mt-1 h-3 w-3 shrink-0 fill-ink text-ink" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{session.title}</span>
                            <span className="block truncate caption text-muted-soft">
                              {session.messages.length} message
                              {session.messages.length === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                      )}

                      {!isRenaming && (
                        <div
                          className={cn(
                            "absolute right-1 top-1.5 flex items-center gap-0.5 rounded bg-canvas-soft opacity-0 transition-opacity focus-within:opacity-100 group-hover/session:opacity-100",
                            isActive && "opacity-100"
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setRenamingId(session.id);
                              setDraftTitle(session.title);
                            }}
                            aria-label={`Rename ${session.title}`}
                            title="Rename"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => store.togglePin(session.id)}
                            aria-label={session.pinned ? "Unpin chat" : "Pin chat"}
                            title={session.pinned ? "Unpin" : "Pin"}
                          >
                            {session.pinned ? (
                              <PinOff className="h-3 w-3" />
                            ) : (
                              <Pin className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(session.id)}
                            aria-label={`Delete ${session.title}`}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-hairline p-3">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" onClick={() => go("/dashboard")} />
          <SidebarLink
            icon={Sparkles}
            label="Upgrade plan"
            onClick={() => go("/plans")}
          />
          <SidebarLink icon={Settings} label="Settings" onClick={() => go("/settings")} />
          <SidebarLink icon={History} label="Back to site" onClick={() => go("/")} />
        </div>
      </aside>
    </>
  );
};

const SidebarLink: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-card hover:text-ink"
  >
    <Icon className="h-4 w-4 shrink-0" />
    {label}
  </button>
);

const PanelLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m16 9-3 3 3 3" />
  </svg>
);

export { MoreHorizontal };
export default ChatSidebar;
