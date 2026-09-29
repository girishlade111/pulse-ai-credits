/**
 * The tool registry. Every mode carries its own cost, icon, timeline, prompt
 * and credit-accounting bucket, so the composer, the message list, the sidebar
 * and the credit maths all read from one source of truth.
 */

import type { ComponentType } from "react";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import type { TimelineStage } from "@/components/TimelinePill";
import type { LlmRequestType } from "./llm";

type IconType = ComponentType<{ className?: string; size?: number }>;

export interface ChatMode {
  id: LlmRequestType;
  name: string;
  shortName: string;
  description: string;
  placeholder: string;
  icon: IconType;
  credits: number;
  stages: TimelineStage[];
  /** Business-plan-only tools. */
  premium?: boolean;
  /**
   * How the run is recorded against the ledger. Several tools share a bucket
   * on purpose so the dashboard groups them.
   */
  ledgerType: "normal_search" | "deep_research" | "image_generation";
  /** Shown on the welcome screen as a one-click starter prompt. */
  suggestions: string[];
}

export const CHAT_MODES: ChatMode[] = [
  {
    id: "quick_search",
    name: "Quick Search",
    shortName: "Quick",
    description: "Fast AI-powered search",
    placeholder: "Ask anything…",
    icon: MinimalisticIcons.Search,
    credits: 1,
    stages: ["thinking", "grep", "read", "done"],
    ledgerType: "normal_search",
    suggestions: [
      "What is a vector database and when should I use one?",
      "Explain the difference between REST and GraphQL.",
    ],
  },
  {
    id: "deep_research",
    name: "Deep Research",
    shortName: "Deep",
    description: "Comprehensive research analysis",
    placeholder: "Topic for deep research…",
    icon: MinimalisticIcons.Research,
    credits: 2,
    stages: ["thinking", "grep", "read", "edit", "done"],
    ledgerType: "deep_research",
    suggestions: [
      "Research how retrieval-augmented generation changes enterprise search.",
      "Write a brief on the trade-offs of edge vs. serverless inference.",
    ],
  },
  {
    id: "pro_search",
    name: "Pro Search",
    shortName: "Pro",
    description: "Advanced search with multiple sources",
    placeholder: "Professional search query…",
    icon: MinimalisticIcons.Pro,
    credits: 3,
    stages: ["thinking", "grep", "read", "done"],
    ledgerType: "normal_search",
    suggestions: [
      "Compare Postgres and MySQL for a high-write analytics workload.",
      "Summarise the trade-offs of event sourcing for order systems.",
    ],
  },
  {
    id: "task",
    name: "Task",
    shortName: "Task",
    description: "AI task execution and planning",
    placeholder: "Describe the task…",
    icon: MinimalisticIcons.Check,
    credits: 10,
    stages: ["thinking", "read", "edit", "done"],
    ledgerType: "normal_search",
    suggestions: [
      "Draft a 2-week plan to migrate a monolith to a modular monolith.",
      "Break down adding end-to-end tests to an existing React app.",
    ],
  },
  {
    id: "image_generation",
    name: "Generate Image",
    shortName: "Image",
    description: "AI image generation",
    placeholder: "Describe the image you want…",
    icon: MinimalisticIcons.Image,
    credits: 1,
    stages: ["thinking", "edit", "done"],
    ledgerType: "image_generation",
    suggestions: [
      "An isometric illustration of a solar-powered data centre at dusk.",
      "Editorial cover art: a lone researcher surrounded by orbiting research papers.",
    ],
  },
  {
    id: "deep_research_8x",
    name: "8x Deep Research",
    shortName: "8x",
    description: "Ultra-comprehensive research",
    placeholder: "Complex research topic…",
    icon: MinimalisticIcons.Research,
    credits: 40,
    stages: ["thinking", "grep", "read", "edit", "done"],
    premium: true,
    ledgerType: "deep_research",
    suggestions: [
      "An exhaustive survey of agent memory architectures and their failure modes.",
      "A full methodology review of retrieval evaluation for enterprise RAG.",
    ],
  },
  {
    id: "find_all",
    name: "Find All",
    shortName: "Find All",
    description: "Exhaustive search across all sources",
    placeholder: "Search everything…",
    icon: MinimalisticIcons.Search,
    credits: 40,
    stages: ["thinking", "grep", "read", "edit", "done"],
    premium: true,
    ledgerType: "normal_search",
    suggestions: [
      "Map every open-source vector database with an active release in the last year.",
      "Build a collection plan for a public dataset on urban tree cover.",
    ],
  },
];

export const DEFAULT_MODE_ID: LlmRequestType = "quick_search";

const MODE_INDEX = new Map(CHAT_MODES.map((mode) => [mode.id, mode]));

export const getMode = (id?: LlmRequestType | string): ChatMode =>
  (id && MODE_INDEX.get(id as LlmRequestType)) ||
  MODE_INDEX.get(DEFAULT_MODE_ID)!;

export const getModeCost = (id?: LlmRequestType | string): number =>
  getMode(id).credits;
