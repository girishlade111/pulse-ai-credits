import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  /** Where to land when there is no history to pop — normally the chat. */
  fallbackTo?: string;
  label?: string;
}

/**
 * "Back" for pages reached from the chat.
 *
 * Uses history when there is some, so it returns to the conversation the user
 * actually came from rather than guessing. On a cold load there is no history,
 * so it falls back to the home route instead of rendering a button that does
 * nothing.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  className,
  fallbackTo = "/",
  label = "Back",
}) => {
  const navigate = useNavigate();
  // Read once per mount: the history length is fixed for the life of this view,
  // and polling it would re-render the page for no reason.
  const canGoBack = React.useRef(window.history.length > 1).current;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("text-muted hover:text-ink", className)}
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallbackTo))}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default BackButton;
