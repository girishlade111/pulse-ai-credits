/**
 * The artifact viewer: a code/preview split for one runnable block.
 *
 * The preview is a sandboxed iframe with `sandbox="allow-scripts"` and nothing
 * else. That single token is the whole security model: no `allow-same-origin`
 * means the frame is treated as a unique opaque origin, so the snippet cannot
 * read this app's cookies, `localStorage`, or DOM — only paint its own pixels.
 * Adding `allow-same-origin` (or `allow-popups`, `allow-top-navigation`) to make
 * a snippet "work better" would hand arbitrary model output the user's session,
 * so the attribute is fixed and the comment above it is the reason.
 *
 * `srcDoc` rather than a blob URL: with a blob URL the frame inherits our
 * origin, which is exactly what the sandbox flag is there to prevent.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import {
  artifactLabel,
  buildArtifactDocument,
  downloadArtifact,
  isRunnableArtifact,
  type ArtifactKind,
} from "@/lib/chat-artifacts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, Code2, Copy, Download, Maximize2, Minimize2, Play, X } from "lucide-react";

export interface ArtifactPayload {
  kind: ArtifactKind;
  /** Canonical language of the fence, used for the label and the copy/download. */
  language: string;
  code: string;
}

/**
 * Opens a block in the workspace's artifact panel.
 *
 * A context rather than a prop chain because the button lives inside
 * `markdown.tsx` — many renderers deep under the chat — and threading a
 * callback through every level would couple the renderer to the workspace
 * layout. The default is a no-op so `Markdown` still works standalone (the
 * export preview, a test): the button simply does nothing rather than throwing.
 */
const ArtifactContext = React.createContext<((payload: ArtifactPayload) => void) | null>(null);

export const ArtifactProvider: React.FC<{
  onOpen: (payload: ArtifactPayload) => void;
  children: React.ReactNode;
}> = ({ onOpen, children }) => (
  <ArtifactContext.Provider value={onOpen}>{children}</ArtifactContext.Provider>
);

/**
 * Opens an artifact, if the surrounding app has a viewer.
 *
 * Returns `null` when there is no provider, so callers can hide the button
 * entirely instead of rendering a control that does nothing.
 */
export const useOpenArtifact = (): ((payload: ArtifactPayload) => void) | null =>
  React.useContext(ArtifactContext);

interface ArtifactViewerProps {
  artifact: ArtifactPayload;
  /** Called when the viewer should close — a close button, or the modal layer. */
  onClose?: () => void;
  /** Hides the header's close affordance when the viewer is already fullscreen. */
  className?: string;
}

/**
 * The preview document.
 *
 * Memoised on the source, not rebuilt per render: a keystroke in the composer
 * would otherwise re-serialise the document and reset a running snippet's
 * scroll position on every frame.
 */
const useArtifactDoc = (artifact: ArtifactPayload): string =>
  React.useMemo(
    () => buildArtifactDocument(artifact.kind, artifact.code),
    [artifact.kind, artifact.code]
  );

const CopyButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void copyText(code).then((ok) => {
          if (ok) {
            setCopied(true);
            return;
          }
          toast.error("Could not copy the code.");
        });
      }}
      title="Copy code"
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

export const ChatArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onClose,
  className,
}) => {
  const doc = useArtifactDoc(artifact);
  const [tab, setTab] = React.useState<"preview" | "code">(isRunnableArtifact(artifact.language)
    ? "preview"
    : "code");
  const [fullscreen, setFullscreen] = React.useState(false);

  // Escape leaves fullscreen, so a fullscreen preview is never a dead end.
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const runnable = isRunnableArtifact(artifact.language);

  const header = (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-hairline bg-canvas-soft px-2 py-1.5">
      <div
        role="tablist"
        aria-label="Artifact view"
        className="flex shrink-0 items-center gap-0.5 rounded-md border border-hairline bg-card p-0.5"
      >
        {runnable && (
          <ArtifactTab
            active={tab === "preview"}
            onClick={() => setTab("preview")}
            icon={<Play className="h-3 w-3" aria-hidden />}
            label="Preview"
          />
        )}
        <ArtifactTab
          active={tab === "code"}
          onClick={() => setTab("code")}
          icon={<Code2 className="h-3 w-3" aria-hidden />}
          label="Code"
        />
      </div>

      <span className="min-w-0 flex-1 truncate caption text-muted-soft">
        {artifactLabel(artifact.language)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <CopyButton code={artifact.code} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const ok = downloadArtifact(artifact.kind, artifact.code);
            if (!ok) toast.error("The browser blocked the download.");
          }}
          title="Download this artifact"
        >
          <Download />
          <span className="hidden sm:inline">Download</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setFullscreen((value) => !value)}
          aria-label={fullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close artifact viewer"
            title="Close"
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );

  const stage = tab === "preview" && runnable ? (
    <iframe
      /*
       * The security boundary. `allow-scripts` only: no same-origin, so the
       * frame cannot touch this app's storage, cookies or DOM. Adding
       * `allow-same-origin` here would give model-authored code the user's
       * session — do not "fix" a snippet that needs it.
       */
      sandbox="allow-scripts"
      srcDoc={doc}
      title={`${artifactLabel(artifact.language)} — live preview`}
      className="h-full w-full border-0 bg-white"
    />
  ) : (
    <pre className="code scroll-quiet h-full overflow-auto p-4 text-ink">
      <code className="bg-transparent p-0">{artifact.code}</code>
    </pre>
  );

  if (fullscreen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Fullscreen artifact preview"
        className="fixed inset-0 z-50 flex flex-col bg-canvas"
      >
        {header}
        <div className="min-h-0 flex-1">{stage}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-canvas", className)}>
      {header}
      <div className="min-h-0 flex-1">{stage}</div>
    </div>
  );
};

const ArtifactTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
      active
        ? "bg-muted-surface font-medium text-ink"
        : "text-muted hover:bg-canvas-soft hover:text-ink"
    )}
  >
    {icon}
    {label}
  </button>
);

export default ChatArtifactViewer;