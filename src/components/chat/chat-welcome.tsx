/**
 * The empty state. Shown when a session has no messages — either a brand-new
 * chat or a history entry the user cleared.
 *
 * Deliberately almost nothing. This used to be the tool picker: a row of pills
 * for all seven tools plus two starter-prompt cards. On a chat-first app that
 * is a menu in front of the textbox, and the tool can still be switched from
 * the composer — so the empty state is now just a line, and the composer stays
 * the only thing on screen that matters.
 */

import React from "react";

export const ChatWelcome: React.FC = () => (
  <div className="py-2 text-center">
    <h2 className="display-sm">Ask anything.</h2>
  </div>
);

export default ChatWelcome;
