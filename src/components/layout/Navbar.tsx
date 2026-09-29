import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PulseLogo } from "@/components/ui/PulseLogo";

/** Re-export PulseLogo as Wordmark for seamless backward compatibility */
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <PulseLogo size="sm" className={className} animated />
);

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/workspace", label: "Workspace" },
];

export const Navbar: React.FC = () => (
  <nav className="topnav">
    <div className="page flex h-full items-center gap-8">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Pulse AI home">
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
        <Link to="/settings" className="navlink">
          Settings
        </Link>
        <Button asChild variant="outline">
          <Link to="/workspace">New chat</Link>
        </Button>
      </div>
    </div>
  </nav>
);
