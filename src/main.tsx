import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  // Nothing to render into: a build/config problem, not a runtime one. Say so
  // in the document itself rather than throwing into an empty page.
  document.body.innerHTML =
    '<main style="font:16px/1.5 system-ui;padding:3rem;max-width:34rem;margin:0 auto">' +
    "<h1>The app could not start.</h1>" +
    "<p>The root element is missing from index.html. This is a build problem, " +
    "not something you did.</p></main>";
} else {
  /*
   * The outer boundary sits above the router on purpose. The one inside App
   * catches render errors and keeps the navbar alive; this one is the last
   * resort for anything that throws above that — a provider, the router itself,
   * or a context read outside its tree.
   */
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
