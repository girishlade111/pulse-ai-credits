import React from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "./Navbar";

/** 5-column link list on the cream canvas, 14px body, 64×48px padding. */
const COLUMNS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Pricing", to: "/plans" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    heading: "Capabilities",
    links: [
      { label: "Quick Search", to: "/features" },
      { label: "Deep Research", to: "/features" },
      { label: "Image Generation", to: "/features" },
      { label: "Task Automation", to: "/features" },
    ],
  },
  {
    heading: "Workspace",
    links: [
      { label: "Open workspace", to: "/workspace" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Settings", to: "/settings" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", to: "/features" },
      { label: "Credit system", to: "/plans" },
      { label: "Status", to: "/features" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Contact", to: "/settings" },
      { label: "Privacy", to: "/settings" },
      { label: "Terms", to: "/settings" },
    ],
  },
];

export const Footer: React.FC = () => (
  <footer className="mt-16 border-t border-hairline py-16">
    <div className="page">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">
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
          Credit-based AI workspace. Built for people who read the docs.
        </p>
      </div>
    </div>
  </footer>
);
