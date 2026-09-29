import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { Footer } from "@/components/layout/Footer";
import { BackButton } from "@/components/layout/BackButton";
import { TimelinePill, type TimelineStage } from "@/components/TimelinePill";

// Interface previews for the advanced tools
import deepResearch8xPreview from "@/images/1.png";
import findAllPreview from "@/images/2.png";
import proSearchPreview from "@/images/3.png";
import taskPreview from "@/images/4.png";

/**
 * Each tool carries the stage vocabulary it exercises in the agent timeline.
 * This is the only surface where the pastel pills appear outside a live run.
 */
interface Feature {
  id: string;
  name: string;
  icon: (props: { className?: string }) => React.ReactElement;
  summary: string;
  detail: string;
  useCase: string;
  responseTime: string;
  executionType: "Synchronous" | "Asynchronous";
  stages: TimelineStage[];
  bullets: string[];
  preview?: string;
}

const FEATURES: Feature[] = [
  {
    id: "quick_search",
    name: "Quick Search",
    icon: MinimalisticIcons.Search,
    summary: "Ask anything — instant, sourced answers.",
    detail:
      "Quick Search resolves straightforward questions in seconds. It reads your query, decides whether it needs retrieval, and returns a short answer with the sources it leaned on.",
    useCase: "Quick answers, facts, clarification",
    responseTime: "10–30 seconds",
    executionType: "Synchronous",
    stages: ["thinking", "grep", "read", "done"],
    bullets: [
      "Natural language queries",
      "Source-backed answers",
      "Contextual follow-ups",
    ],
  },
  {
    id: "deep_research",
    name: "Deep Research",
    icon: MinimalisticIcons.Research,
    summary: "Multi-source analysis with cross-referenced findings.",
    detail:
      "Deep Research runs a full sweep: it greps across the corpus, opens the most authoritative sources, checks claims against each other, and returns a structured report with the disagreements left in.",
    useCase: "Topic exploration, comprehensive answers",
    responseTime: "30 seconds – 1 minute",
    executionType: "Synchronous",
    stages: ["thinking", "grep", "read", "edit", "done"],
    bullets: ["Cross-referenced data", "Structured findings", "Disagreement preserved"],
  },
  {
    id: "image_generation",
    name: "Image Generation",
    icon: MinimalisticIcons.Image,
    summary: "Describe the image. Get the image.",
    detail:
      "Image generation takes a written description and returns finished artwork at production quality. Style, aspect and detail are all steerable from the prompt.",
    useCase: "Concept art, marketing visuals, diagrams",
    responseTime: "10–30 seconds",
    executionType: "Synchronous",
    stages: ["thinking", "edit", "done"],
    bullets: ["Text to image", "Multiple art directions", "Full usage rights"],
  },
  {
    id: "pro_search",
    name: "Pro Search",
    icon: MinimalisticIcons.Pro,
    summary: "Ranked URLs with long-form content, built for agents.",
    detail:
      "Pro Search is tuned for tool-calling agents. It returns ranked URLs alongside the relevant long-form content, so an agent can read the source instead of guessing from a snippet.",
    useCase: "Agent web search, source verification",
    responseTime: "< 5 seconds",
    executionType: "Synchronous",
    stages: ["grep", "read", "done"],
    bullets: ["Ranked URLs", "Long-form extraction", "Credibility scoring"],
    preview: proSearchPreview,
  },
  {
    id: "task",
    name: "Task Automation",
    icon: MinimalisticIcons.Check,
    summary: "Enrich entity lists with fresh, verified records.",
    detail:
      "Task automation takes a list of entities and returns an enriched dataset — fresh, quality-scored, structured for direct use in your database or spreadsheet.",
    useCase: "Database enrichment, workflow automation",
    responseTime: "10 seconds – 30 minutes",
    executionType: "Asynchronous",
    stages: ["thinking", "read", "edit", "done"],
    bullets: ["Entity enrichment", "Quality scoring", "Fresh data sourcing"],
    preview: taskPreview,
  },
  {
    id: "deep_research_8x",
    name: "8x Deep Research",
    icon: MinimalisticIcons.Research,
    summary: "Exhaustive research with professional-grade output.",
    detail:
      "Eight times the depth of standard research, with the methodology documented. This is the tool for work that will be reviewed by someone who asks where the numbers came from.",
    useCase: "Academic work, market analysis, strategy",
    responseTime: "4–30 minutes",
    executionType: "Asynchronous",
    stages: ["thinking", "grep", "read", "edit", "done"],
    bullets: ["8x research depth", "Documented methodology", "Publication-grade structure"],
    preview: deepResearch8xPreview,
  },
  {
    id: "find_all",
    name: "Find All",
    icon: MinimalisticIcons.Search,
    summary: "Build complete datasets from across the web.",
    detail:
      "Find All systematically gathers and organises information into a structured dataset, with quality assurance applied to every record it compiles.",
    useCase: "Dataset building, market mapping, compilation",
    responseTime: "5–60 minutes",
    executionType: "Asynchronous",
    stages: ["thinking", "grep", "read", "edit", "done"],
    bullets: ["Web-wide gathering", "Structured compilation", "Per-record QA"],
    preview: findAllPreview,
  },
];

const SPEC_LABELS = {
  responseTime: "Response time",
  executionType: "Execution",
  stages: "Timeline stages",
} as const;

const Features: React.FC = () => {
  const navigate = useNavigate();
  const essentials = FEATURES.slice(0, 3);
  const advanced = FEATURES.slice(3);

  return (
    <main>
      <section className="section-tight">
        <div className="page">
          <div className="mb-10">
            <BackButton className="-ml-2" />
          </div>
          <div className="max-w-3xl border-b border-hairline pb-10">
            <p className="section-label mb-3">Capabilities</p>
            <h1 className="display-lg">
              Seven tools. Every run traced.
            </h1>
            <p className="body-md mt-4 text-muted">
              Each tool declares its response window and the stages it walks
              through in the agent timeline. Nothing is approximate.
            </p>
          </div>

          {/* essentials — 3-up */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {essentials.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.id} className="card flex flex-col p-6">
                  <div className="flex items-center justify-between gap-4">
                    <Icon className="h-5 w-5 text-ink" />
                  </div>
                  <h2 className="title-md mt-6">{feature.name}</h2>
                  <p className="body-sm mt-2 min-h-[2.5rem] text-muted">
                    {feature.summary}
                  </p>

                  <dl className="mt-6 space-y-2 border-t border-hairline pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="body-sm text-muted">{SPEC_LABELS.responseTime}</dt>
                      <dd className="body-sm">{feature.responseTime}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="body-sm text-muted">{SPEC_LABELS.executionType}</dt>
                      <dd className="body-sm">{feature.executionType}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                    {feature.stages.map((stage) => (
                      <TimelinePill key={stage} stage={stage} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {/* advanced — 2-up with interface previews */}
          <div className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="section-label mb-3">Advanced</p>
              <h2 className="display-md">
                For work that needs more than an answer.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {advanced.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.id}
                    className="card flex flex-col overflow-hidden"
                  >
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-ink" />
                          <h3 className="display-sm">{feature.name}</h3>
                        </div>
                      </div>

                      <p className="body-md mt-5 text-muted">{feature.detail}</p>

                      <ul className="mt-6 space-y-2">
                        {feature.bullets.map((bullet) => (
                          <li key={bullet} className="body-sm flex gap-2.5">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hairline-strong" />
                            {bullet}
                          </li>
                        ))}
                      </ul>

                      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
                        <div>
                          <dt className="section-label mb-1.5">
                            {SPEC_LABELS.responseTime}
                          </dt>
                          <dd className="body-sm">{feature.responseTime}</dd>
                        </div>
                        <div>
                          <dt className="section-label mb-1.5">
                            {SPEC_LABELS.executionType}
                          </dt>
                          <dd className="body-sm">{feature.executionType}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="section-label mb-2">
                            {SPEC_LABELS.stages}
                          </dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {feature.stages.map((stage) => (
                              <TimelinePill key={stage} stage={stage} />
                            ))}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="section-label mb-1.5">Best for</dt>
                          <dd className="body-sm text-muted">{feature.useCase}</dd>
                        </div>
                      </dl>
                    </div>

                    {feature.preview && (
                      <figure className="border-t border-hairline">
                        <div className="ide-pane m-6 flex h-72 items-center justify-center overflow-hidden rounded-md">
                          <img
                            src={feature.preview}
                            alt={`${feature.name} interface preview`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <figcaption className="body-sm border-t border-hairline px-6 py-4 text-muted">
                          {feature.name} — working process interface
                        </figcaption>
                      </figure>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {/* comparison: standard vs 8x research */}
          <div className="mt-20">
            <div className="card overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 md:border-r md:border-hairline md:p-8">
                  <p className="section-label mb-3">Standard</p>
                  <h3 className="display-sm">Deep Research</h3>
                  <p className="body-sm mt-2 text-muted">
                    Synchronous · 30 seconds to a minute
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Grep, read, summarise",
                      "Cross-referenced sources",
                      "Returns in the same request",
                    ].map((line) => (
                      <li key={line} className="body-sm text-body">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-canvas-soft p-6 md:p-8">
                  <p className="section-label mb-3">Business</p>
                  <h3 className="display-sm">8x Deep Research</h3>
                  <p className="body-sm mt-2 text-muted">
                    Asynchronous · 4 to 30 minutes
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Full edit stage, draft and revise",
                      "Documented methodology",
                      "Dataset export alongside the report",
                    ].map((line) => (
                      <li key={line} className="body-sm text-body">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* cta-band */}
          <section className="py-24">
            <div className="text-center">
              <h2 className="display-lg mx-auto max-w-2xl text-balance">
                Pick a tool and run it.
              </h2>
              <Button className="mt-8" onClick={() => navigate("/workspace")}>
                Get started free
              </Button>
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Features;
