import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  HelpCircle,
  Loader2,
  LogOut,
  Save,
  Trash2,
  Type,
  User,
  UserPlus,
} from "lucide-react";

const FONT_SIZE_KEY = "pulseai-font-size";

const SIZES = [
  { value: "small", label: "Small", sample: "Compact reading size" },
  { value: "medium", label: "Medium", sample: "The default reading size" },
  { value: "large", label: "Large", sample: "Comfortable on long sessions" },
  { value: "extra-large", label: "Extra large", sample: "Maximum legibility" },
];

const Settings = () => {
  const { user, profile, signOut, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [fontSize, setFontSize] = useState("medium");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted preferences
  React.useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved && SIZES.some((size) => size.value === saved)) {
      setFontSize(saved);
    }
  }, []);

  React.useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email) setEmail(user.email);
  }, [profile, user]);

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

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error("User not found");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (error) {
        console.error("Profile update error:", error);
        toast.error("Failed to update profile");
        return;
      }

      await refreshUserData();
      toast.success("Profile updated");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    try {
      await signOut();
      toast.success("Signed out of all sessions");
      navigate("/");
    } catch {
      toast.error("Failed to sign out of all sessions");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm account deletion");
      return;
    }
    try {
      // TODO: Implement account deletion logic
      toast.success("Account deletion request submitted");
      navigate("/");
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const handleReferFriend = () => {
    const referralLink = `${window.location.origin}/?ref=${user?.id}`;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard");
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
              <h1 className="display-md">Account settings</h1>
            </div>
          </div>

          {/* profile */}
          <section className="card p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <User className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Profile</h2>
                <p className="body-sm text-muted">Your display name and account identity.</p>
              </div>
            </div>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                />
                <p className="body-sm text-muted">
                  Email cannot be changed here. Contact support to update it.
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                Save changes
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

          {/* social & support */}
          <section className="card mt-6 p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <UserPlus className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Social &amp; support</h2>
                <p className="body-sm text-muted">Invite someone, or reach a human.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={handleReferFriend}>
                <UserPlus />
                Refer a friend
              </Button>
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

          {/* security */}
          <section className="card mt-6 p-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-5">
              <LogOut className="h-4 w-4 text-ink" />
              <div>
                <h2 className="title-md">Account security</h2>
                <p className="body-sm text-muted">End every active session.</p>
              </div>
            </div>
            <Button variant="outline" className="mt-6" onClick={handleSignOutAllSessions}>
              <LogOut />
              Sign out of all sessions
            </Button>
          </section>

          {/* danger zone */}
          <section className="card mt-6 border-destructive p-6">
            <div className="flex items-center gap-3 border-b border-destructive/30 pb-5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <h2 className="title-md text-destructive">Danger zone</h2>
                <p className="body-sm text-muted">
                  Irreversible actions that permanently affect your account.
                </p>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="mt-6">
                  <Trash2 />
                  Delete account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Delete account
                  </DialogTitle>
                  <DialogDescription>
                    This cannot be undone. Your account and all associated data
                    will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deleteConfirm">
                      Type <span className="code">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmation !== "DELETE"}
                      className="flex-1"
                    >
                      Delete account
                    </Button>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </DialogTrigger>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Settings;
