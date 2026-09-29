/**
 * The tool registry. Every mode carries its own icon, timeline and prompt, so
 * the composer, the message list and the sidebar all read from one source of
 * truth.
 *
 * Modes used to carry a `credits` cost and a `premium` flag. Runs are free
 * now, so there is no cost to compute and nothing to gate.
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
  stages: TimelineStage[];
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
    stages: ["thinking", "grep", "read", "done"],
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
    stages: ["thinking", "grep", "read", "edit", "done"],
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
    stages: ["thinking", "grep", "read", "done"],
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
    stages: ["thinking", "read", "edit", "done"],
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
    stages: ["thinking", "edit", "done"],
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
    stages: ["thinking", "grep", "read", "edit", "done"],
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
    stages: ["thinking", "grep", "read", "edit", "done"],
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
