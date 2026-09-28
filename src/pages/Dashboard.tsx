import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { Footer } from "@/components/layout/Footer";
import { TimelinePill, type TimelineStage } from "@/components/TimelinePill";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock, ImageIcon, Search, Zap } from "lucide-react";

/** Transaction rows map onto the same five-stage vocabulary as the agent. */
const STAGE_BY_REQUEST: Record<string, { stage: TimelineStage; label: string }> = {
  normal_search: { stage: "grep", label: "Search" },
  deep_research: { stage: "read", label: "Deep research" },
  image_generation: { stage: "edit", label: "Image" },
};

const TOOL_TIPS = [
  {
    icon: Search,
    title: "Quick Search",
    cost: "1 credit",
    line: "Simple questions and quick facts.",
  },
  {
    icon: Zap,
    title: "Deep Research",
    cost: "2 credits",
    line: "Multi-source analysis with citations.",
  },
  {
    icon: ImageIcon,
    title: "Image Generation",
    cost: "1 credit",
    line: "Text to image, one credit a time.",
  },
];

const Dashboard: React.FC = () => {
  const { user, profile, credits, subscription, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchTransactions();
  }, [user, loading, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-canvas">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  const stats = [
    {
      label: "Available credits",
      value: credits?.current_credits ?? 0,
      note: "Ready to spend on any tool",
    },
    {
      label: "Credits earned",
      value: credits?.total_earned_credits ?? 0,
      note: "Lifetime, from plans and top-ups",
    },
    {
      label: "Credits spent",
      value: credits?.total_spent_credits ?? 0,
      note: "Across every completed run",
    },
    {
      label: "Current plan",
      value: subscription?.name || "Free Plan",
      note: subscription?.can_topup
        ? "Top-ups available"
        : "Upgrade to enable top-ups",
    },
  ];

  return (
    <main>
      <section className="section-tight">
        <div className="page">
          <div className="mb-10 border-b border-hairline pb-8">
            <p className="section-label mb-3">Dashboard</p>
            <h1 className="display-md">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}.
            </h1>
            <p className="body-md mt-2 text-muted">
              Credit ledger and recent runs.
            </p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card p-6">
                <p className="section-label">{stat.label}</p>
                <p className="display-sm mt-4 truncate">{stat.value}</p>
                <p className="body-sm mt-2 text-muted">{stat.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* activity */}
            <section>
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="display-sm">Recent activity</h2>
                <Button variant="ghost" size="sm" onClick={fetchTransactions}>
                  Refresh
                </Button>
              </div>

              {loadingTransactions ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="card flex flex-col items-center gap-3 p-12 text-center">
                  <MinimalisticIcons.Check className="h-6 w-6 text-muted-soft" />
                  <p className="title-md">No activity yet</p>
                  <p className="body-sm max-w-xs text-muted">
                    Run a search or a research task and it will show up here with
                    the exact credit cost.
                  </p>
                  <Button variant="secondary" onClick={() => navigate("/")}>
                    Open the workspace
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {transactions.map((transaction) => {
                    const isDeduction = transaction.transaction_type === "deduction";
                    const meta = STAGE_BY_REQUEST[transaction.request_type ?? ""];
                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center gap-4 rounded-lg border border-hairline bg-card px-4 py-3"
                      >
                        {meta ? (
                          <TimelinePill stage={meta.stage} label={meta.label} />
                        ) : (
                          <span className="pill-badge">
                            {isDeduction ? "Run" : "Credit"}
                          </span>
                        )}
                        <p className="body-sm min-w-0 flex-1 truncate">
                          {transaction.description}
                        </p>
                        <span className="body-sm hidden shrink-0 text-muted sm:inline">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={cn(
                            "code shrink-0 tabular-nums",
                            isDeduction ? "text-body" : "text-success"
                          )}
                        >
                          {isDeduction ? "−" : "+"}
                          {transaction.credits_amount}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* side column */}
            <div className="space-y-8">
              <section className="card p-6">
                <h2 className="title-md">Plan</h2>
                <p className="display-sm mt-4">{subscription?.name || "Free Plan"}</p>
                <p className="body-sm mt-2 text-muted">
                  {subscription?.can_topup
                    ? `Top-ups at ${subscription.topup_discount}% off your plan rate.`
                    : "Free plans cannot purchase credit top-ups."}
                </p>
                <Button
                  className="mt-6 w-full"
                  onClick={() => navigate("/plans")}
                >
                  {subscription?.plan_type === "free" ? "Upgrade plan" : "Manage plan"}
                  <ArrowUpRight />
                </Button>
              </section>

              <section className="card p-6">
                <h2 className="title-md">Credit costs</h2>
                <ul className="mt-5 space-y-4">
                  {TOOL_TIPS.map((tip) => {
                    const Icon = tip.icon;
                    return (
                      <li key={tip.title} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="title-sm">{tip.title}</p>
                            <span className="pill-badge shrink-0">{tip.cost}</span>
                          </div>
                          <p className="body-sm mt-1 text-muted">{tip.line}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  onClick={() => navigate("/features")}
                >
                  <Clock />
                  See all seven tools
                </Button>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Dashboard;
