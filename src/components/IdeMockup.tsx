import React from "react";
import { cn } from "@/lib/utils";
import { TimelinePill, type TimelineStage } from "./TimelinePill";

/**
 * ide-mockup-card — the only "elevated" element in the system: a white card on
 * the cream canvas containing a multi-pane editor mockup. Panes use
 * canvas-soft, code renders in JetBrains Mono. Collapses to a single primary
 * pane below `lg`; the file tree drops below `md`.
 */

const FILE_TREE = [
  { name: "pulse", depth: 0, kind: "dir" },
  { name: "credits.ts", depth: 1, kind: "file", active: true },
  { name: "research.ts", depth: 1, kind: "file" },
  { name: "search.ts", depth: 1, kind: "file" },
  { name: "agent", depth: 0, kind: "dir" },
  { name: "timeline.ts", depth: 1, kind: "file" },
  { name: "stages.ts", depth: 1, kind: "file" },
  { name: "pulse.config.ts", depth: 0, kind: "file" },
  { name: "README.md", depth: 0, kind: "file" },
];

const CODE_LINES: { tokens: React.ReactNode; gutter?: string }[] = [
  { tokens: <><span className="text-muted-soft">1</span> </> },
  {
    tokens: (
      <>
        <span className="text-primary">import</span>{" "}
        <span className="text-ink">&#123; Pulse &#125;</span>{" "}
        <span className="text-primary">from</span>{" "}
        <span className="text-ink">&quot;@pulse/client&quot;</span>
        <span className="text-muted-soft">;</span>
      </>
    ),
  },
  { tokens: <span className="text-muted-soft">2</span> },
  {
    tokens: (
      <>
        <span className="text-muted-soft">3</span>{" "}
        <span className="text-primary">const</span>{" "}
        <span className="text-ink">pulse</span>{" "}
        <span className="text-muted-soft">=</span>{" "}
        <span className="text-ink">new Pulse</span>
        <span className="text-muted-soft">(&#123;</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">4</span>{" "}
        <span className="text-ink">apiKey</span>
        <span className="text-muted-soft">: </span>
        <span className="text-ink">process.env.</span>
        <span className="text-timeline-done">PULSE_KEY</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">5</span>{" "}
        <span className="text-ink">mode</span>
        <span className="text-muted-soft">: </span>
        <span className="text-timeline-edit">&quot;deep_research&quot;</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">6</span>{" "}
        <span className="text-ink">timeline</span>
        <span className="text-muted-soft">: </span>
        <span className="text-primary">true</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
  },
  {
    tokens: <span className="text-muted-soft">7</span> },
  {
    tokens: (
      <>
        <span className="text-muted-soft">8</span>{" "}
        <span className="text-primary">const</span>{" "}
        <span className="text-ink">report</span>{" "}
        <span className="text-muted-soft">=</span>{" "}
        <span className="text-primary">await</span>{" "}
        <span className="text-ink">pulse.research</span>
        <span className="text-muted-soft">(&#123;</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">9</span>{" "}
        <span className="text-ink">query</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">10</span>{" "}
        <span className="text-ink">depth</span>
        <span className="text-muted-soft">: </span>
        <span className="text-timeline-edit">8</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">11</span>{" "}
        <span className="text-ink">sources</span>
        <span className="text-muted-soft">: </span>
        <span className="text-ink">50</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">12</span>{" "}
        <span className="text-ink">onStage</span>
        <span className="text-muted-soft">: (</span>
        <span className="text-ink">stage</span>
        <span className="text-muted-soft">) =&gt;</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">13</span>{" "}
        <span className="text-ink">timeline.</span>
        <span className="text-primary">mark</span>
        <span className="text-muted-soft">(</span>
        <span className="text-ink">stage</span>
        <span className="text-muted-soft">),</span>
      </>
    ),
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">14</span>{" "}
        <span className="text-ink">signal</span>
        <span className="text-muted-soft">:</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">15</span>{" "}
        <span className="text-ink">controller</span>
        <span className="text-muted-soft">.</span>
        <span className="text-primary">signal</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">16</span>{" "}
        <span className="text-ink">keepPartial</span>
        <span className="text-muted-soft">: </span>
        <span className="text-primary">true</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">17</span>{" "},
        <span className="text-ink">&#125;&#125;&#59;</span>
      </>
    ),
    gutter: "  }",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">18</span>{" "}
        <span className="text-ink">creditsUsed</span>
        <span className="text-muted-soft">:</span>
      </>
    ),
    gutter: "  {",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">19</span>{" "}
        <span className="text-ink">report</span>
        <span className="text-muted-soft">.</span>
        <span className="text-ink">credits</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
    gutter: "  }",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">20</span>{" "}
        <span className="text-ink">summary</span>
        <span className="text-muted-soft">:</span>
      </>
    ),
    gutter: "  }",
  },
  {
    tokens: (
      <>
        <span className="text-muted-soft">21</span>{" "}
        <span className="text-ink">report</span>
        <span className="text-muted-soft">.</span>
        <span className="text-ink">summary</span>
        <span className="text-muted-soft">,</span>
      </>
    ),
    gutter: "  }",
  },
  { tokens: <span className="text-muted-soft">22</span> },
];

const STAGES: { stage: TimelineStage; label: string; note: string; active?: boolean }[] = [
  { stage: "thinking", label: "Thinking", note: "Decomposing the question", active: true },
  { stage: "grep", label: "Grepping", note: "Swept 214 files, 12 matches" },
  { stage: "read", label: "Reading", note: "8 sources opened" },
  { stage: "edit", label: "Editing", note: "report.markdown drafted" },
  { stage: "done", label: "Done", note: "40 credits · 11.4s" },
];

export const IdeMockup: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("ide-card", className)}>
    {/* window chrome */}
    <div className="flex h-10 items-center gap-3 border-b border-hairline bg-card px-4">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-hairline-strong" />
        <span className="h-2 w-2 rounded-full bg-hairline-strong" />
        <span className="h-2 w-2 rounded-full bg-hairline-strong" />
      </span>
      <span className="code ml-2 truncate text-muted">
        pulse / research.ts
      </span>
      <span className="ml-auto hidden caption-upper text-muted-soft sm:inline">
        Deep Research
      </span>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* primary pane: file tree + editor */}
      <div className="flex min-w-0 flex-col md:flex-row">
        <div className="hidden w-48 shrink-0 border-b border-hairline bg-canvas-soft p-4 md:block md:border-b-0 md:border-r">
          <p className="section-label mb-3">Explorer</p>
          <ul className="code space-y-1.5">
            {FILE_TREE.map((file) => (
              <li
                key={file.name}
                style={{ paddingLeft: `${file.depth * 12}px` }}
                className={cn(
                  "flex items-center gap-2 truncate rounded px-1.5 py-0.5",
                  file.active
                    ? "bg-card text-ink"
                    : "text-muted"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    file.active ? "bg-primary" : "bg-hairline-strong"
                  )}
                />
                {file.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 flex-1 bg-card">
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-2">
            <span className="code text-ink">research.ts</span>
            <span className="h-1.5 w-1.5 rounded-full bg-hairline-strong" />
          </div>
          <pre className="code overflow-x-auto px-4 py-4 text-body">
            <code>
              {CODE_LINES.map((line, index) => (
                <span key={index} className="block whitespace-pre">
                  {line.tokens}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* agent pane: the signature timeline */}
      <aside className="border-t border-hairline bg-canvas-soft p-4 lg:border-l lg:border-t-0">
        <p className="section-label mb-4">Agent timeline</p>
        <ol className="space-y-3">
          {STAGES.map((item, index) => (
            <li
              key={item.stage}
              className="timeline-in flex flex-col gap-1.5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "code h-4 w-4 shrink-0 text-[10px]",
                    item.active ? "text-ink" : "text-muted-soft"
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TimelinePill stage={item.stage} label={item.label} />
                {item.active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                )}
              </div>
              <p className="code pl-6 text-[12px] text-muted">{item.note}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t border-hairline pt-4">
          <p className="section-label mb-2">Terminal</p>
          <pre className="code overflow-x-auto rounded-md border border-hairline bg-card p-3 text-[12px] text-body">
            <code>
              <span className="text-muted-soft">$</span> pulse run research.ts{"\n"}
              <span className="text-success">✓</span> report.md written{" "}
              <span className="text-muted-soft">· 40 credits</span>
            </code>
          </pre>
        </div>
      </aside>
    </div>
  </div>
);
