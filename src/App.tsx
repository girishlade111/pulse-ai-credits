import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProviderProvider } from "@/contexts/ProviderContext";
import { Navbar } from "@/components/layout/Navbar";
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Plans from "./pages/Plans";
import Dashboard from "./pages/Dashboard";
import Features from "./pages/Features";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isChatMode, setIsChatMode] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WorkspaceProvider>
          <ProviderProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-canvas">
              {!isChatMode && <Navbar />}
              <Routes>
                <Route
                  path="/"
                  element={<Index onChatModeChange={setIsChatMode} />}
                />
                <Route
                  path="/workspace"
                  element={<Workspace onChatModeChange={setIsChatMode} />}
                />
                <Route path="/plans" element={<Plans />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/features" element={<Features />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
          </ProviderProvider>
        </WorkspaceProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
