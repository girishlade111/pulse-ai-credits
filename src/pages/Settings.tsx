import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { BackButton } from "@/components/layout/BackButton";
import { HelpCircle, Type } from "lucide-react";
import { READING_SIZES, usePreferences } from "@/contexts/PreferencesContext";

/**
 * Settings now holds only real preferences.
 *
 * The credits card used to live here, along with "Change plan" and "Reset local
 * workspace" — the app no longer meters anything, so all three went with it.
 * Reading size applies as you choose it and persists on its own, so there is
 * nothing left to save by hand.
 */
const Settings = () => {
  const { readingSize, setReadingSize } = usePreferences();

  return (
    <main>
      <section className="section-tight">
        <div className="page max-w-3xl">
          <div className="mb-12 flex items-start gap-4 border-b border-hairline pb-8">
            <BackButton className="-ml-2 mt-1" />
            <div>
              <p className="section-label mb-3">Settings</p>
              <h1 className="display-md">Workspace settings</h1>
            </div>
          </div>

          {/* reading size */}
          <section className="card p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <Type className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Reading size</h2>
                <p className="body-sm text-muted">
                  Scales running text across the workspace. Saved as you change it.
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fontSize">Size</Label>
                <Select
                  value={readingSize}
                  onValueChange={(value) => setReadingSize(value as typeof readingSize)}
                >
                  <SelectTrigger id="fontSize">
                    <SelectValue placeholder="Select a size" />
                  </SelectTrigger>
                  <SelectContent>
                    {READING_SIZES.map((size) => (
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
                  {READING_SIZES.find((size) => size.value === readingSize)?.sample}.
                </p>
              </div>
            </div>
          </section>

          {/* support */}
          <section className="card mt-6 p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <HelpCircle className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Support</h2>
                <p className="body-sm text-muted">
                  Something not working, or a reply that came out wrong?
                </p>
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
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Settings;
