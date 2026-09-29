import { ErrorScreen } from "@/components/ErrorScreen";

/** 404 — the URL does not match anything this app serves. */
const NotFound = () => (
  <ErrorScreen
    code={404}
    title="This page does not exist."
    message="The link may be mistyped, or the page may have moved. Your chats are untouched — they live in this browser."
  />
);

export default NotFound;
