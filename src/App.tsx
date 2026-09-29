import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => {
  const [isChatMode, setIsChatMode] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesProvider>
          <ProviderProvider>
            <BrowserRouter>
              {/*
               * The chat owns the whole viewport and draws its own header, so
               * the site navbar is hidden while a conversation is open. Every
               * other page keeps it.
               */}
              <div className="min-h-screen bg-canvas">
                {!isChatMode && <Navbar />}
                <ErrorBoundary>
                  <Routes>
                    {/*
                     * The landing page is the front door; the chat lives at
                     * /workspace and the "Start" buttons link here.
                     */}
                    <Route
                      path="/"
                      element={<Index onChatModeChange={setIsChatMode} />}
                    />
                    <Route
                      path="/workspace"
                      element={<Workspace onChatModeChange={setIsChatMode} />}
                    />
                    <Route path="/features" element={<Features />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/404" element={<NotFound />} />
                    {/* Lets a failed gateway error deep-link somewhere real. */}
                    <Route path="/error/:code" element={<ServerError />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </div>
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
