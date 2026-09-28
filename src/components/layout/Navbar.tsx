import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PulseLogo, PulseMark } from "@/components/ui/PulseLogo";

/** Re-export PulseLogo as Wordmark for seamless backward compatibility */
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <PulseLogo size="sm" className={className} animated />
);

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/plans", label: "Pricing" },
  { to: "/dashboard", label: "Dashboard" },
];

export const Navbar: React.FC = () => {
  const { credits } = useWorkspace();

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
          <Link
            to="/plans"
            className="pill-badge transition-colors hover:bg-hairline"
            title="Available credits"
          >
            <MinimalisticIcons.Credits className="h-3 w-3" />
            {credits.current_credits}
          </Link>
          <Button asChild>
            <Link to="/workspace">Open workspace</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
