import React from "react";
import { cn } from "@/lib/utils";

/**
 * The AI-timeline pill palette — the brand's strongest visual signature.
 * Five pastel stage markers reserved exclusively for in-product agent
 * visualizations. Never use these as system action colours.
 */
export type TimelineStage = "thinking" | "grep" | "read" | "edit" | "done";

export const TIMELINE_STAGES: {
  stage: TimelineStage;
  label: string;
  className: string;
}[] = [
  { stage: "thinking", label: "Thinking", className: "pill-thinking" },
  { stage: "grep", label: "Grepping", className: "pill-grep" },
  { stage: "read", label: "Reading", className: "pill-read" },
  { stage: "edit", label: "Editing", className: "pill-edit" },
  { stage: "done", label: "Done", className: "pill-done" },
];

const STAGE_CLASS: Record<TimelineStage, string> = {
  thinking: "pill-thinking",
  grep: "pill-grep",
  read: "pill-read",
  edit: "pill-edit",
  done: "pill-done",
};

interface TimelinePillProps {
  stage: TimelineStage;
  label?: string;
  className?: string;
}

export const TimelinePill: React.FC<TimelinePillProps> = ({
  stage,
  label,
  className,
}) => (
  <span
    className={cn(
      "pill",
      STAGE_CLASS[stage],
      className
    )}
  >
    {label ?? stage}
  </span>
);
