import React from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "./Navbar";

/**
 * Only routes that actually exist.
 *
 * The Pricing/Dashboard/Credit-system entries used to point at /plans and
 * /dashboard. Those pages are no longer routed, so keeping the links would have
 * turned every one of them into a 404 — the footer is now three destinations,
 * which is what the app really offers.
 */
const COLUMNS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "New chat", to: "/" },
      { label: "Features", to: "/features" },
    ],
  },
  {
    heading: "Capabilities",
    links: [
      { label: "Quick Search", to: "/features" },
      { label: "Deep Research", to: "/features" },
      { label: "Image Generation", to: "/features" },
    ],
  },
  {
    heading: "Workspace",
    links: [
      { label: "Settings", to: "/settings" },
    ],
  },
];

export const Footer: React.FC = () => (
  <footer className="mt-16 border-t border-hairline py-16">
    <div className="page">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="section-label mb-4">{column.heading}</p>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="body-sm text-muted transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark className="flex items-center gap-2.5" />
        <p className="body-sm text-muted-soft">
          An AI workspace. Built for people who read the docs.
        </p>
      </div>
    </div>
  </footer>
);
