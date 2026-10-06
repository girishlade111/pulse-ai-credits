import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ProviderProvider } from "@/contexts/ProviderContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar } from "@/components/layout/Navbar";
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Features from "./pages/Features";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";

/*
 * Dashboard and Plans are the only routes that reach for Supabase and Recharts.
 * They are reachable from the chat sidebar, so they have to be routed — but
 * eagerly importing them pulled ~150kB of charting and SDK code into the entry
 * chunk that every visit to the landing page and the workspace downloads. Split
 * them so the chat itself ships no code it does not use.
 */
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Plans = React.lazy(() => import("./pages/Plans"));

const RouteFallback: React.FC = () => (
  <div
    className="flex min-h-dvh items-center justify-center text-sm text-muted"
    role="status"
    aria-live="polite"
  >
    Loading…
  </div>
);

const queryClient = new QueryClient();

const CHAT_ROUTE = "/workspace";

/**
 * The routed tree.
 *
 * Two things here cannot live in `App`, because they need the router:
 *
 *  - The chat-mode flag. `isChatMode` is only ever reset to false by the landing
 *    page, so once a conversation opened, navigating to `/settings` or
 *    `/features` left the site navbar hidden on those pages with nothing to
 *    restore it. Deriving the navbar from the pathname makes the flag a
 *    per-route concern instead of a sticky one.
 *  - The error boundary. `App` does not re-render on a location change, so a
 *    boundary that caught an error kept showing its fallback after the user
 *    navigated to an unrelated page — with no link out of it. Keying it on the
 *    pathname remounts it per route, which resets the caught error.
 */
const AppRoutes: React.FC<{
  isChatMode: boolean;
  onChatModeChange: (value: boolean) => void;
}> = ({ isChatMode, onChatModeChange }) => {
  const { pathname } = useLocation();
  const isChatRoute = pathname === CHAT_ROUTE;

  // Leaving the workspace drops chat mode, so the navbar returns on every other
  // page — including the ones the chat sidebar links straight to.
  useEffect(() => {
    if (!isChatRoute) onChatModeChange(false);
  }, [isChatRoute, onChatModeChange]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hidden only while a conversation is actually open on the chat route.
          Landing on /workspace before sending anything still shows it. */}
      {(!isChatMode || !isChatRoute) && <Navbar />}
      <ErrorBoundary key={pathname}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* The landing page is the front door; the chat lives at /workspace
              and the "Start" buttons link there. */}
          <Route
            path="/"
            element={<Index onChatModeChange={onChatModeChange} />}
          />
          <Route
            path={CHAT_ROUTE}
            element={<Workspace onChatModeChange={onChatModeChange} />}
          />
          <Route path="/features" element={<Features />} />
          <Route path="/settings" element={<Settings />} />
          {/* Linked from the chat sidebar; without these both landed on the 404. */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/404" element={<NotFound />} />
          {/* Lets a failed gateway error deep-link somewhere real. */}
          <Route path="/error/:code" element={<ServerError />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

const App = () => {
  const [isChatMode, setIsChatMode] = useState(false);
  const handleChatModeChange = useCallback((value: boolean) => setIsChatMode(value), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesProvider>
          <ProviderProvider>
            <BrowserRouter>
              {/*
               * The chat owns the whole viewport and draws its own header, so
               * the site navbar is hidden while a conversation is open. Every
               * other page keeps it — see `AppRoutes`, which keys that off the
               * route rather than off a flag that could latch.
               */}
              <AppRoutes
                isChatMode={isChatMode}
                onChatModeChange={handleChatModeChange}
              />
            </BrowserRouter>
          </ProviderProvider>
        </PreferencesProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;