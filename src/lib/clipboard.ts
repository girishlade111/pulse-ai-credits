/**
 * Copying text, on any origin.
 *
 * `navigator.clipboard` is only available in a secure context, and this app is
 * routinely opened on a LAN address (the Vite server prints a
 * `Network: http://10.x.x.x:8080` URL). There `navigator.clipboard` is simply
 * undefined, so the API alone silently fails on every copy.
 *
 * So: try the async API, and fall back to a hidden textarea plus
 * `document.execCommand("copy")`, which is synchronous and origin-agnostic.
 * The textarea must be in the document and focused for the selection to be
 * copied, and it is restored and removed immediately afterwards.
 */

export const copyText = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // Preferred path: permission-aware, and the only one a screen reader trusts.
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied, or the document was not focused. Fall through.
  }

  if (typeof document === "undefined") return false;

  const active = document.activeElement as HTMLElement | null;
  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  // Off-screen rather than hidden: `display:none` elements cannot be selected.
  scratch.style.position = "fixed";
  scratch.style.top = "0";
  scratch.style.left = "-9999px";
  scratch.style.opacity = "0";

  document.body.appendChild(scratch);
  scratch.select();
  scratch.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(scratch);
  // Put focus back where the user left it.
  active?.focus?.();

  return copied;
};
