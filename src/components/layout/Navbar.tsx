import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { LayoutDashboard, LogOut, Settings, Sparkles } from "lucide-react";

/** Wordmark: Pulse Orange mark + warm ink text. Orange stays scarce. */
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={className}>
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
      <span className="h-2 w-2 rounded-full bg-on-primary" />
    </span>
    <span className="text-[15px] font-medium tracking-tight text-ink">
      Pulse<span className="text-primary">.</span>ai
    </span>
  </span>
);

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/plans", label: "Pricing" },
  { to: "/dashboard", label: "Dashboard" },
];

export const Navbar: React.FC = () => {
  const { user, profile, credits, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="topnav">
      <div className="page flex h-full items-center gap-8">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          aria-label="Pulse AI home"
        >
          <Wordmark className="flex items-center gap-2.5" />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="navlink">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {credits && (
                <Link
                  to="/plans"
                  className="pill-badge transition-colors hover:bg-hairline"
                  title="Available credits"
                >
                  <MinimalisticIcons.Credits className="h-3 w-3" />
                  {credits.current_credits}
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full p-0.5 transition-opacity hover:opacity-80"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="caption-upper bg-canvas-soft text-ink">
                        {profile?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="title-sm text-ink">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="caption text-muted">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-hairline" />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/features")}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Features
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/plans")}>
                    <MinimalisticIcons.Credits className="mr-2 h-4 w-4" />
                    Upgrade plan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-hairline" />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => navigate("/auth")}
              >
                Sign in
              </Button>
              <Button onClick={() => navigate("/auth")}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
