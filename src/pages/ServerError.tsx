import { useParams } from "react-router-dom";
import { ErrorScreen } from "@/components/ErrorScreen";

/**
 * 5xx and other upstream failures.
 *
 * A gateway error is not something the user did, and it is usually temporary —
 * the copy says so and leads with a retry rather than an apology.
 */
const ServerError = () => {
  const { code } = useParams<{ code: string }>();
  const parsed = Number(code);
  const status = Number.isFinite(parsed) && parsed >= 400 && parsed <= 599 ? parsed : 502;

  const title =
    status === 502
      ? "The gateway did not answer."
      : status === 503
        ? "The service is busy."
        : status === 504
          ? "That took too long."
          : "The server ran into a problem.";

  return (
    <ErrorScreen
      code={status}
      title={title}
      message="The request never reached the model. This is usually temporary — waiting a moment and retrying is the right move. Your chat history is safe in this browser."
    />
  );
};

export default ServerError;
