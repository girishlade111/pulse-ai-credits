import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  HelpCircle,
  RotateCcw,
  Save,
  Type,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const FONT_SIZE_KEY = "pulseai-font-size";

const SIZES = [
  { value: "small", label: "Small", sample: "Compact reading size" },
  { value: "medium", label: "Medium", sample: "The default reading size" },
  { value: "large", label: "Large", sample: "Comfortable on long sessions" },
  { value: "extra-large", label: "Extra large", sample: "Maximum legibility" },
];

const Settings = () => {
  const { credits, subscription, reset } = useWorkspace();
  const navigate = useNavigate();

  const [fontSize, setFontSize] = useState("medium");

  // Load persisted preferences
  React.useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved && SIZES.some((size) => size.value === saved)) {
      setFontSize(saved);
    }
  }, []);

  // Reading size applies live so the choice is legible before saving
  React.useEffect(() => {
    document.body.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
      "font-extra-large"
    );
    document.body.classList.add(`font-${fontSize}`);
    return () => {
      document.body.classList.remove(
        "font-small",
        "font-medium",
        "font-large",
        "font-extra-large"
      );
    };
  }, [fontSize]);

  const handleSavePreferences = () => {
    try {
      localStorage.setItem(FONT_SIZE_KEY, fontSize);
      toast.success("Reading size saved");
    } catch {
      toast.error("Failed to save preferences");
    }
  };

  const handleResetWorkspace = () => {
    reset();
    toast.success("Local workspace reset to ten credits");
  };

  return (
    <main>
      <section className="section-tight">
        <div className="page max-w-3xl">
          <div className="mb-12 flex items-start gap-4 border-b border-hairline pb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft />
            </Button>
            <div>
              <p className="section-label mb-3">Settings</p>
              <h1 className="display-md">Workspace settings</h1>
            </div>
          </div>

          {/* credits */}
          <section className="card p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <CreditCard className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Credits</h2>
                <p className="body-sm text-muted">
                  Your balance and plan, stored in this browser.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <dt className="section-label">Available</dt>
                <dd className="display-sm mt-2">{credits.current_credits}</dd>
              </div>
              <div>
                <dt className="section-label">Plan</dt>
                <dd className="display-sm mt-2">{subscription.name}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={() => navigate("/plans")}>
                <CreditCard />
                Change plan
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleResetWorkspace}>
                <RotateCcw />
                Reset local workspace
              </Button>
            </div>
          </section>

          {/* reading size */}
          <section className="card mt-6 p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <Type className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Reading size</h2>
                <p className="body-sm text-muted">Scales running text across the workspace.</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fontSize">Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger id="fontSize">
                    <SelectValue placeholder="Select a size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border border-hairline bg-canvas-soft p-4">
                <p className="section-label mb-2">Preview</p>
                <p className="body-sm text-muted">
                  {SIZES.find((size) => size.value === fontSize)?.sample}.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="mt-6" onClick={handleSavePreferences}>
              <Save />
              Save preference
            </Button>
          </section>

          {/* support */}
          <section className="card mt-6 p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <HelpCircle className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Support</h2>
                <p className="body-sm text-muted">Reach a human, or read the credit system.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open("mailto:support@pulseai.com", "_blank")}
              >
                <HelpCircle />
                Contact support
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/plans")}>
                <CreditCard />
                How credits work
              </Button>
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Settings;
