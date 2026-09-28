import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { IdeMockup } from "@/components/IdeMockup";
import { TimelinePill, TIMELINE_STAGES } from "@/components/TimelinePill";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";

interface IndexProps {
  onChatModeChange?: (isChatMode: boolean) => void;
}

const CAPABILITIES = [
  {
    name: "Quick Search",
    credits: 1,
    icon: MinimalisticIcons.Search,
    line: "A question in, a sourced answer out, in seconds.",
  },
  {
    name: "Deep Research",
    credits: 2,
    icon: MinimalisticIcons.Research,
    line: "Multi-source analysis with cross-referenced findings.",
  },
  {
    name: "Image Generation",
    credits: 1,
    icon: MinimalisticIcons.Image,
    line: "Describe the image. Get the image. One credit.",
  },
  {
    name: "Pro Search",
    credits: 3,
    icon: MinimalisticIcons.Pro,
    line: "Ranked URLs with long-form content, built for agents.",
  },
  {
    name: "Task Automation",
    credits: 10,
    icon: MinimalisticIcons.Check,
    line: "Enrich entity lists with fresh, verified records.",
  },
  {
    name: "8x Research",
    credits: 40,
    icon: MinimalisticIcons.Research,
    line: "Exhaustive methodology for work that needs footnotes.",
  },
];

const STAGE_NOTES: Record<string, string> = {
  thinking: "Decomposes the request and picks a plan.",
  grep: "Sweeps the corpus for candidate sources.",
  read: "Opens and ranks what the sweep found.",
  edit: "Drafts the answer and writes the artifacts.",
  done: "Reserves credits, settles the run, returns the report.",
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
      "Credits instead of seats meant our research budget finally matched how people actually work.",
    name: "Daniel M.",
    role: "Head of research ops",
  },
  {
    quote:
      "We moved three internal tools onto it in a week. The cost per run is legible, which is rarer than it should be.",
    name: "Aisha K.",
    role: "Platform lead",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "Free",
    cadence: "10 credits, one time",
    points: ["All seven tools", "10 starting credits", "Trial only"],
    featured: false,
  },
  {
    name: "Starter",
    price: "₹499",
    cadence: "60 credits monthly",
    points: ["Top-ups enabled", "30 base + 30 bonus", "Monthly reset"],
    featured: true,
  },
  {
    name: "Pro",
    price: "₹999",
    cadence: "120 credits monthly",
    points: ["10% off top-ups", "8x Research included", "Priority queue"],
    featured: false,
  },
];

const Index: React.FC<IndexProps> = () => {
  const navigate = useNavigate();

  return (
    <main>
      {/* hero-band */}
      <section className="section">
        <div className="page">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill-badge">7 tools · 1 credit ledger</span>
            <h1 className="display-mega mt-6 text-balance">
              An AI workspace that shows its work.
            </h1>
            <p className="body-md mx-auto mt-6 max-w-2xl text-body text-balance">
              Quick search, deep research, image generation and task automation
              in one place — priced in credits you can actually audit. Every run
              opens a timeline you can read before you read a word of the answer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="ink" onClick={() => navigate("/workspace")}>
                Start with 10 free credits
                <ArrowRight />
              </Button>
              <Button variant="link" onClick={() => navigate("/plans")}>
                See pricing
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
            { k: "10", v: "Free credits on signup" },
            { k: "5s–60min", v: "Response time per tool" },
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
              Each tool has its own credit cost and its own timeline. You always
              know which one ran and what it spent.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.name} className="card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-6 w-6 text-ink" />
                    <span className="pill-badge">
                      {capability.credits} credit
                      {capability.credits > 1 ? "s" : ""}
                    </span>
                  </div>
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

      {/* credit system */}
      <section className="section">
        <div className="page grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="section-label mb-3">Credit system</p>
            <h2 className="display-lg">Costs you can reconcile.</h2>
            <p className="body-md mt-4 max-w-lg text-muted">
              Every run reserves its credit cost before the request starts and
              settles when the run finishes. A failed run refunds. A top-up
              writes a transaction row. Nothing is inferred.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Credits reserved up front, released on failure",
                "Every run writes a transaction you can export",
                "Top-up discounts applied at settlement",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="body-sm text-body">{point}</span>
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="mt-8" onClick={() => navigate("/plans")}>
              View plans
            </Button>
          </div>

          <div className="code-block card p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-hairline pb-3">
              <span className="code text-muted">settle.ts</span>
            </div>
            <pre className="code overflow-x-auto text-body">
              <code>
                <span className="text-primary">const</span>{" "}
                <span className="text-ink">run</span>{" "}
                <span className="text-muted-soft">=</span>{" "}
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">credits</span>
                <span className="text-muted-soft">.</span>
                <span className="text-primary">reserve</span>
                <span className="text-muted-soft">(&#123;</span>
                <span className="text-ink">cost</span>
                <span className="text-muted-soft">: </span>
                <span className="text-timeline-edit">40</span>
                <span className="text-muted-soft">,</span>
                <span className="text-ink">deposit</span>
                <span className="text-muted-soft">: </span>
                <span className="text-primary">false</span>
                <span className="text-muted-soft"> &#125;);{"\n\n"}</span>
                <span className="text-primary">try</span>{" "}
                <span className="text-muted-soft">&#123;</span>
                <span className="text-ink">report</span>{" "}
                <span className="text-muted-soft">=</span>{" "}
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">pulse</span>
                <span className="text-muted-soft">.</span>
                <span className="text-ink">research</span>
                <span className="text-muted-soft">(&#123;</span>
                <span className="text-ink">depth</span>
                <span className="text-muted-soft">: </span>
                <span className="text-timeline-edit">8</span>
                <span className="text-muted-soft"> &#125;);{"\n"}</span>
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">run</span>
                <span className="text-muted-soft">.</span>
                <span className="text-primary">settle</span>
                <span className="text-muted-soft">();{"\n"}</span>
                <span className="text-primary">catch</span>{" "}
                <span className="text-muted-soft">(&#123;</span>
                <span className="text-primary">await</span>{" "}
                <span className="text-ink">run</span>
                <span className="text-muted-soft">.</span>
                <span className="text-primary">refund</span>
                <span className="text-muted-soft">();</span>
                <span className="text-primary">throw</span>{" "}
                <span className="text-ink">err</span>
                <span className="text-muted-soft">;</span>
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

      {/* pricing teaser */}
      <section className="section">
        <div className="page">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="section-label mb-3">Pricing</p>
              <h2 className="display-lg">Three plans, one currency.</h2>
            </div>
            <Button variant="link" onClick={() => navigate("/plans")}>
              Compare all plans
              <ArrowRight />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <article
                key={tier.name}
                className={cn(
                  "rounded-lg border p-8",
                  tier.featured
                    ? "border-ink bg-ink text-canvas"
                    : "border-hairline bg-card text-ink"
                )}
              >
                <p className="caption-upper opacity-60">{tier.name}</p>
                <p className="display-md mt-4">{tier.price}</p>
                <p className="body-sm mt-1 opacity-70">{tier.cadence}</p>
                <ul
                  className={cn(
                    "mt-6 space-y-2.5 border-t pt-6",
                    tier.featured ? "border-white/20" : "border-hairline"
                  )}
                >
                  {tier.points.map((point) => (
                    <li key={point} className="body-sm flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.featured ? "secondary" : "ghost"}
                  className="mt-8 w-full"
                  onClick={() => navigate("/plans")}
                >
                  {tier.featured ? "Upgrade" : "Choose"}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* cta-band */}
      <section className="py-24">
        <div className="page text-center">
          <h2 className="display-lg mx-auto max-w-2xl text-balance">
            Ten credits. No card. Run something today.
          </h2>
          <Button className="mt-8" onClick={() => navigate("/workspace")}>
            Get started free
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
