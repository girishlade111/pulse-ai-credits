import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main className="section">
      <div className="page flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="code text-muted-soft">404</p>
        <h1 className="display-md mt-4">This page does not exist.</h1>
        <p className="body-md mt-3 max-w-md text-muted">
          The route{" "}
          <span className="code text-ink">{location.pathname}</span> was not
          found.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Back to the workspace</Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
