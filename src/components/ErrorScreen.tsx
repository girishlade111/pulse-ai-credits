import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  /** HTTP-style code shown to the user: 404, 502, 503… */
  code: number | string;
  title: string;
  message: string;
  /** Extra reassurance, e.g. "Your chats are safe in this browser." */
  note?: string;
}

/**
 * One shell for every "this did not work" state.
 *
 * Kept deliberately plain. An error page that tries to be charming is an error
 * page nobody trusts, so this is the same layout every time and the only
 * variation is the code, the line of copy, and which action is offered.
 */
export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  code,
  title,
  message,
  note,
}) => {
  const navigate = useNavigate();

  return (
    <main className="page flex min-h-dvh flex-col items-center justify-center py-16 text-center">
      <p className="display-lg text-muted-soft" aria-hidden="true">
        {code}
      </p>

      <h1 className="display-md mt-2">{title}</h1>
      <p className="body-md mt-3 max-w-md text-balance text-muted">{message}</p>

      {note ? <p className="caption mt-2 text-muted-soft">{note}</p> : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>

        {/*
         * `navigate(-1)` is a no-op on a fresh tab, so only offer "Go back"
         * when there is somewhere to go. Leaving it out beats a dead button.
         */}
        {window.history.length > 1 ? (
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        ) : null}

        <Button variant="ghost" asChild>
          <Link to="/settings">Settings</Link>
        </Button>
      </div>
    </main>
  );
};

export default ErrorScreen;
