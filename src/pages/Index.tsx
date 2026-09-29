import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { IdeMockup } from "@/components/IdeMockup";
import { TimelinePill, TIMELINE_STAGES } from "@/components/TimelinePill";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Check } from "lucide-react";

interface IndexProps {
  onChatModeChange?: (isChatMode: boolean) => void;
}

/**
 * The marketing landing page.
 *
 * This used to sell a credit ledger: per-tool price badges, a "Credit system"
 * section, a pricing table and a "10 free credits" hero. Runs are free now, so
 * the pricing is gone rather than hidden, and the page sells the one thing that
 * is still true — every run shows its work.
 */

const CAPABILITIES = [
  {
    name: "Quick Search",
    icon: MinimalisticIcons.Search,
    line: "A question in, a sourced answer out, in seconds.",
  },
  {
    name: "Deep Research",
    icon: MinimalisticIcons.Research,
    line: "Multi-source analysis with cross-referenced findings.",
  },
  {
    name: "Image Generation",
    icon: MinimalisticIcons.Image,
    line: "Describe the image. Get the image.",
  },
  {
    name: "Pro Search",
    icon: MinimalisticIcons.Pro,
    line: "Ranked URLs with long-form content, built for agents.",
  },
  {
    name: "Task Automation",
    icon: MinimalisticIcons.Check,
    line: "Enrich entity lists with fresh, verified records.",
  },
  {
    name: "8x Research",
    icon: MinimalisticIcons.Research,
    line: "Exhaustive methodology for work that needs footnotes.",
  },
];

const STAGE_NOTES: Record<string, string> = {
  thinking: "Decomposes the request and picks a plan.",
  grep: "Sweeps the corpus for candidate sources.",
  read: "Opens and ranks what the sweep found.",
  edit: "Drafts the answer and writes the artifacts.",
  done: "Streams the report back, stage by stage.",
};

const TESTIMONIALS = [
  {
    quote:
      "The timeline is the part that won me over. I can see what the model did before I read a word of it.",
    name: "Priya R.",
    role: "Staff engineer, fintech",
  },
  {
    quote:
      "Being able to stop a long run and keep what already streamed changed how I use it day to day.",
    name: "Daniel M.",
    role: "Head of research ops",
  },
  {
    quote:
      "We moved three internal tools onto it in a week. No per-seat maths, and no procurement conversation.",
    name: "Aisha K.",
    role: "Platform lead",
  },
];

const Index: React.FC<IndexProps> = ({ onChatModeChange }) => {
  const navigate = useNavigate();

  // The landing page always shows the site nav. Resetting the flag on the way in
  // means arriving here from an open conversation does not inherit the chat's
  // "hide the navbar" state.
  React.useEffect(() => {
    onChatModeChange?.(false);
  }, [onChatModeChange]);

  return (
    <main>
      {/* hero-band */}
      <section className="section">
        <div className="page">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill-badge">7 tools · one shared timeline</span>
            <h1 className="display-mega mt-6 text-balance">
              An AI workspace that shows its work.
            </h1>
            <p className="body-md mx-auto mt-6 max-w-2xl text-body text-balance">
              Quick search, deep research, image generation and task automation
              in one place. Every run opens a timeline you can read before you
              read a word of the answer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="ink" onClick={() => navigate("/workspace")}>
                Open the workspace
                <ArrowRight />
              </Button>
              <Button variant="link" onClick={() => navigate("/features")}>
                See every capability
              </Button>
            </div>
          </div>

          <IdeMockup className="mt-16 fade-in-up" />
        </div>
      </section>

      {/* trust strip */}
      <section className="border-y border-hairline">
        <div className="page grid grid-cols-1 divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { k: "5s–60min", v: "Response time per tool" },
            { k: "5", v: "Stages on every run" },
            { k: "0", v: "Seats to assign" },
          ].map((stat) => (
            <div key={stat.v} className="px-0 py-8 sm:px-8 sm:py-10 first:sm:pl-0">
              <p className="display-sm mono">{stat.k}</p>
              <p className="body-sm mt-1 text-muted">{stat.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* capabilities */}
      <section className="section">
        <div className="page">
          <div className="mb-12 max-w-2xl">
            <p className="section-label mb-3">Capabilities</p>
            <h2 className="display-lg">
              Pick the depth the question deserves.
            </h2>
            <p className="body-md mt-4 text-muted">
              Each tool has its own timeline. You always know which one ran, and
              what it did while it ran.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.name} className="card p-6">
                  <Icon className="h-6 w-6 text-ink" />
                  <h3 className="title-md mt-6">{capability.name}</h3>
                  <p className="body-sm mt-2 text-muted">{capability.line}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8">
            <Button variant="link" onClick={() => navigate("/features")}>
              Read the full capability list
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>

      {/* agent timeline — signature section */}
      <section className="section border-y border-hairline bg-canvas-soft">
        <div className="page">
          <div className="mb-12 max-w-2xl">
            <p className="section-label mb-3">Agent timeline</p>
            <h2 className="display-lg">Five stages, five colours, one run.</h2>
            <p className="body-md mt-4 text-muted">
              Every request moves through the same five stages. The pastel pills
              are reserved for this one surface — you will not see them used as
              decoration anywhere else.
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline md:grid-cols-5">
            {TIMELINE_STAGES.map((item, index) => (
              <li key={item.stage} className="flex flex-col gap-4 bg-card p-6">
                <span className="code text-muted-soft">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TimelinePill stage={item.stage} label={item.label} />
                <p className="body-sm text-muted">{STAGE_NOTES[item.stage]}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* how a run works */}
      <section className="section">
        <div className="page grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="section-label mb-3">How a run works</p>
            <h2 className="display-lg">Interruptible, and yours to keep.</h2>
            <p className="body-md mt-4 max-w-lg text-muted">
              Long research is not a spinner. You can watch each stage land, stop
              a run the moment it goes off track, and keep whatever had already
              streamed in.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Every stage is visible while the run is still going",
                "Stopping keeps the text that already arrived",
                "Transcripts are stored in this browser, not on a server",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="body-sm text-body">{point}</span>
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="mt-8" onClick={() => navigate("/workspace")}>
              Try a run
            </Button>
          </div>

          <div className="code-block card p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-hairline pb-3">
              <span className="code text-muted">run.ts</span>
            </div>
            <pre className="code overflow-x-auto text-body">
              <code>
                <span className="text-primary">const</span>{" "}
                <span className="text-ink">run</span>{" "}
                <span className="text-muted-soft">=</span>{" "}
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">pulse</span>
                <span className="text-muted-soft">.</span>
                <span className="text-ink">research</span>
                <span className="text-muted-soft">(&#123;</span>
                <span className="text-ink">depth</span>
                <span className="text-muted-soft">: </span>
                <span className="text-timeline-edit">8</span>
                <span className="text-muted-soft">,</span>
                <span className="text-ink">onStage</span>
                <span className="text-muted-soft">: (</span>
                <span className="text-ink">stage</span>
                <span className="text-muted-soft">) =&gt;</span>
                <span className="text-ink">timeline</span>
                <span className="text-muted-soft">.</span>
                <span className="text-ink">push</span>
                <span className="text-muted-soft">(</span>
                <span className="text-ink">stage</span>
                <span className="text-muted-soft">);{"\n\n"}</span>
                <span className="text-primary">try</span>{" "}
                <span className="text-muted-soft">&#123;</span>
                <span className="text-primary">return</span>{" "}
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">run</span>
                <span className="text-muted-soft">;</span>
                <span className="text-primary">catch</span>{" "}
                <span className="text-muted-soft">&#123;</span>
                <span className="text-ink">keep</span>
                <span className="text-muted-soft">(</span>
                <span className="text-ink">partial</span>
                <span className="text-muted-soft">);</span>
                <span className="text-primary">throw</span>{" "}
                <span className="text-ink">err</span>
                <span className="text-muted-soft">;</span>
                <span className="text-primary">finally</span>{" "}
                <span className="text-muted-soft">&#123;</span>
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">save</span>
                <span className="text-muted-soft">(</span>
                <span className="text-ink">transcript</span>
                <span className="text-muted-soft">);</span>
                <span className="text-primary">catch</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* testimonials */}
      <section className="section border-y border-hairline">
        <div className="page">
          <p className="section-label mb-10">In use</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className="card p-6">
                <blockquote className="body-md text-body">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6 border-t border-hairline pt-4">
                  <p className="title-sm">{item.name}</p>
                  <p className="body-sm text-muted">{item.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* cta-band */}
      <section className="py-24">
        <div className="page text-center">
          <h2 className="display-lg mx-auto max-w-2xl text-balance">
            No account. No card. Run something today.
          </h2>
          <Button className="mt-8" onClick={() => navigate("/workspace")}>
            Open the workspace
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
