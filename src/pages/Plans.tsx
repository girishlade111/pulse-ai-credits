import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { Check, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  plan_type: string;
  name: string;
  price_inr: number;
  credits: number;
  can_topup: boolean;
  topup_discount: number;
  billing_period?: string;
}

interface TopupPackage {
  id: string;
  credits: number;
  price_inr: number;
}

const Plans: React.FC = () => {
  const { subscription, credits, setSubscription, topup } = useWorkspace();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [topupPackages, setTopupPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [switchingPeriod, setSwitchingPeriod] = useState(false);

  useEffect(() => {
    fetchPlansAndPackages();

    // Add keyboard shortcut for billing period toggle
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        handleBillingPeriodChange(
          billingPeriod === "monthly" ? "annual" : "monthly"
        );
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Enhanced billing period switching with smooth transition
  const handleBillingPeriodChange = (newPeriod: "monthly" | "annual") => {
    if (newPeriod === billingPeriod) return;

    setSwitchingPeriod(true);
    setTimeout(() => {
      setBillingPeriod(newPeriod);
      setSwitchingPeriod(false);
    }, 150);
  };

  const fetchPlansAndPackages = async () => {
    try {
      const [plansResponse, topupResponse] = await Promise.all([
        supabase.from("subscription_plans").select("*").order("price_inr"),
        supabase.from("topup_packages").select("*").order("credits"),
      ]);

      if (plansResponse.data) {
        setPlans(plansResponse.data);
      }
      if (topupResponse.data) setTopupPackages(topupResponse.data);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  // Filter plans by billing period with dynamic annual plan creation
  const getFilteredPlans = () => {
    if (billingPeriod === "annual") {
      const freePlan = plans.find((p) => p.plan_type === "free");
      const existingAnnualPlans = plans.filter(
        (p) => p.billing_period === "annual"
      );

      if (existingAnnualPlans.length > 0) {
        return freePlan ? [freePlan, ...existingAnnualPlans] : existingAnnualPlans;
      }

      const monthlyPlans = plans.filter(
        (p) =>
          p.plan_type !== "free" && (p.billing_period || "monthly") === "monthly"
      );

      const dynamicAnnualPlans = monthlyPlans.map((monthlyPlan) => {
        let annualPrice;
        switch (monthlyPlan.plan_type) {
          case "starter":
            annualPrice = 549900; // ₹5,499 per year (8.17% off)
            break;
          case "pro":
            annualPrice = 999900; // ₹9,999 per year (16.59% off)
            break;
          case "business":
            annualPrice = 2999900; // ₹29,999 per year (16.67% off)
            break;
          default:
            annualPrice = Math.round(monthlyPlan.price_inr * 12 * 0.84);
        }

        return {
          ...monthlyPlan,
          id: `${monthlyPlan.id}-annual`,
          name: `${monthlyPlan.plan_type.charAt(0).toUpperCase()}${monthlyPlan.plan_type.slice(1)} Plan (Annual)`,
          price_inr: annualPrice,
          billing_period: "annual" as const,
        };
      });

      return freePlan ? [freePlan, ...dynamicAnnualPlans] : dynamicAnnualPlans;
    }

    return plans.filter(
      (plan) =>
        plan.plan_type === "free" ||
        (plan.billing_period || "monthly") === "monthly"
    );
  };

  // Calculate annual savings with support for dynamic annual plans
  const calculateAnnualSavings = (planType: string) => {
    const monthlyPlan = plans.find(
      (p) =>
        p.plan_type === planType && (p.billing_period || "monthly") === "monthly"
    );
    let annualPlan = plans.find(
      (p) => p.plan_type === planType && p.billing_period === "annual"
    );

    if (!annualPlan && monthlyPlan) {
      let annualPrice;
      switch (planType) {
        case "starter":
          annualPrice = 549900;
          break;
        case "pro":
          annualPrice = 999900;
          break;
        case "business":
          annualPrice = 2999900;
          break;
        default:
          annualPrice = Math.round(monthlyPlan.price_inr * 12 * 0.84);
      }

      annualPlan = {
        ...monthlyPlan,
        price_inr: annualPrice,
        billing_period: "annual",
      } as SubscriptionPlan;
    }

    if (!monthlyPlan || !annualPlan) return { percentage: 0, amount: 0 };

    const monthlyTotal = monthlyPlan.price_inr * 12;
    const savings = monthlyTotal - annualPlan.price_inr;
    const percentage = (savings / monthlyTotal) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      amount: savings,
    };
  };

  // Get display price and period with better annual handling
  const getPriceDisplay = (plan: SubscriptionPlan) => {
    if (plan.price_inr === 0) return { price: "Free", period: "" };

    const basePrice = formatPrice(plan.price_inr);

    if (plan.billing_period === "annual") {
      // Round to whole rupees so the equivalent never shows stray paise.
      const monthlyEquivalent = formatPrice(
        Math.round(plan.price_inr / 12 / 100) * 100
      );
      return {
        price: basePrice,
        period: "/year",
        monthlyEquivalent: `${monthlyEquivalent} per month`,
      };
    }

    return { price: basePrice, period: "/month" };
  };

  const formatPrice = (priceInPaise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(priceInPaise / 100);
  };

  const getPlanIcon = (planType: string) => {
    const iconProps = { className: "h-5 w-5", size: 20 };
    switch (planType) {
      case "starter":
        return <MinimalisticIcons.Starter {...iconProps} />;
      case "pro":
        return <MinimalisticIcons.Pro {...iconProps} />;
      case "business":
        return <MinimalisticIcons.Business {...iconProps} />;
      default:
        return <MinimalisticIcons.Free {...iconProps} />;
    }
  };

  const isCurrentPlan = (planType: string) => {
    return subscription?.plan_type === planType;
  };

  // Calculate base and bonus credits for paid plans
  const getPlanCredits = (planType: string, totalCredits: number) => {
    if (planType === "free") {
      return { base: totalCredits, bonus: 0 };
    }
    const base = totalCredits / 2;
    const bonus = totalCredits / 2;
    return { base, bonus };
  };

  // Calculate discounted top-up price based on user's plan
  const calculateTopupPrice = (
    originalPrice: number,
    userPlan: string | undefined
  ) => {
    if (!userPlan || userPlan === "free") return originalPrice;

    const discountMap: Record<string, number> = {
      starter: 0,
      pro: 10,
      business: 20,
    };

    const discount = discountMap[userPlan] || 0;
    // Round to whole rupees so the displayed price never shows stray paise.
    return Math.round((originalPrice * (1 - discount / 100)) / 100) * 100;
  };

  const handlePlanUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (plan.plan_type === "free") {
      toast.info("You are already on the free plan");
      return;
    }

    setProcessingPlan(plan.id);

    try {
      // Mock Stripe checkout - In real app, this would create a Stripe session
      toast.success(`Redirecting to payment for ${plan.name}`);

      setTimeout(() => {
        toast.success("Payment successful! Your plan has been upgraded.");
        refreshUserData();
        setProcessingPlan(null);
      }, 2000);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast.error("Error processing payment");
      setProcessingPlan(null);
    }
  };

  const handleTopup = async (pkg: TopupPackage) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!subscription?.can_topup || subscription?.plan_type === "free") {
      toast.error(
        "Credit top-ups are only available for paid plans. Please upgrade to access top-ups."
      );
      return;
    }

    try {
      const discountedPrice = calculateTopupPrice(
        pkg.price_inr,
        subscription.plan_type
      );
      const discount = subscription.topup_discount || 0;

      toast.success(
        `Processing top-up of ${pkg.credits} credits for ${formatPrice(discountedPrice)}`
      );

      setTimeout(async () => {
        if (credits) {
          await supabase
            .from("user_credits")
            .update({
              current_credits: credits.current_credits + pkg.credits,
              total_earned_credits: credits.total_earned_credits + pkg.credits,
            })
            .eq("user_id", user.id);

          await supabase.from("credit_transactions").insert({
            user_id: user.id,
            transaction_type: "topup",
            credits_amount: pkg.credits,
            description: `Credit top-up: ${pkg.credits} credits${
              discount > 0 ? ` (${discount}% discount applied)` : ""
            }`,
          });

          toast.success(
            `Successfully added ${pkg.credits} credits to your account!`
          );
          refreshUserData();
        }
      }, 1500);
    } catch (error) {
      console.error("Error processing top-up:", error);
      toast.error("Error processing top-up");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-canvas">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  const userPlanType = subscription?.plan_type || "free";
  const isFreePlan = userPlanType === "free";
  const visiblePlans = getFilteredPlans();

  return (
    <main>
      <section className="section-tight">
        <div className="page">
          {/* header */}
          <div className="max-w-2xl border-b border-hairline pb-10">
            <p className="section-label mb-3">Pricing</p>
            <h1 className="display-lg">Credits, not seats.</h1>
            <p className="body-md mt-4 text-muted">
              Every plan is the same seven tools. What changes is how many credits
              land in your account each month and what a top-up costs you.
            </p>
          </div>

          {/* billing period toggle */}
          <div className="mt-10 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div
              className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-canvas-soft p-1"
              role="group"
              aria-label="Billing period"
            >
              {(["monthly", "annual"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  disabled={switchingPeriod}
                  onClick={() => handleBillingPeriodChange(period)}
                  className={cn(
                    "caption-upper inline-flex h-9 items-center gap-2 rounded-md px-4 transition-colors",
                    billingPeriod === period
                      ? "border border-hairline-strong bg-card text-ink"
                      : "border border-transparent text-muted hover:text-ink",
                    switchingPeriod && "opacity-50"
                  )}
                >
                  {switchingPeriod && billingPeriod !== period && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {period}
                </button>
              ))}
            </div>
            <p className="body-sm text-muted">
              {billingPeriod === "annual"
                ? "Annual billing is billed once and renews every year."
                : "Monthly billing renews each month and can be cancelled anytime."}{" "}
              Press <span className="kbd">Ctrl</span>{" "}
              <span className="kbd">B</span> to toggle.
            </p>
          </div>

          {/* plans */}
          {visiblePlans.length === 0 ? (
            <div className="card mt-10 flex flex-col items-center gap-3 p-12 text-center">
              <p className="title-md">Pricing is unavailable right now</p>
              <p className="body-sm max-w-sm text-muted">
                We could not load the plan catalogue. Check your connection and
                try again.
              </p>
              <Button variant="secondary" onClick={fetchPlansAndPackages}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {visiblePlans.map((plan) => {
              const { base, bonus } = getPlanCredits(
                plan.plan_type,
                plan.credits
              );
              const isPaidPlan = plan.plan_type !== "free";
              const priceInfo = getPriceDisplay(plan);
              const savings = calculateAnnualSavings(plan.plan_type);
              const showSavings =
                billingPeriod === "annual" && isPaidPlan && savings.percentage > 0;
              const current = isCurrentPlan(plan.plan_type);
              const featured = !current && plan.plan_type === "pro";
              const monthlyPrice =
                plans.find(
                  (p) =>
                    p.plan_type === plan.plan_type &&
                    (p.billing_period || "monthly") === "monthly"
                )?.price_inr ?? 0;
              const isAnnual = plan.billing_period === "annual";

              return (
                <article
                  key={`${plan.id}-${billingPeriod}`}
                  data-plan={plan.plan_type}
                  className={cn(
                    "flex flex-col rounded-lg border p-8 transition-colors",
                    featured
                      ? "border-ink bg-ink text-canvas"
                      : "border-hairline bg-card text-ink"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn(featured ? "text-canvas" : "text-ink")}>
                      {getPlanIcon(plan.plan_type)}
                    </span>
                    {current && (
                      <span
                        className={cn(
                          "pill-badge",
                          featured && "border border-white/25 bg-transparent text-canvas"
                        )}
                      >
                        Current plan
                      </span>
                    )}
                    {featured && !current && (
                      <span className="caption-upper rounded-full border border-white/25 px-2.5 py-1 text-canvas">
                        Most popular
                      </span>
                    )}
                  </div>

                  <h2 className="display-sm mt-6">
                    {plan.plan_type === "free"
                      ? plan.name
                      : `${plan.plan_type.charAt(0).toUpperCase()}${plan.plan_type.slice(1)} Plan${
                          isAnnual ? " (Annual)" : ""
                        }`}
                  </h2>

                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="display-md">{priceInfo.price}</span>
                    {priceInfo.period && (
                      <span
                        className={cn(
                          "body-sm",
                          featured ? "text-canvas/70" : "text-muted"
                        )}
                      >
                        {priceInfo.period}
                      </span>
                    )}
                  </p>
                  {priceInfo.monthlyEquivalent && (
                    <p
                      className={cn(
                        "body-sm mt-1",
                        featured ? "text-canvas/70" : "text-muted"
                      )}
                    >
                      {priceInfo.monthlyEquivalent}
                    </p>
                  )}

                  {showSavings && (
                    <div
                      className={cn(
                        "mt-4 rounded-md border p-3",
                        featured
                          ? "border-white/20"
                          : "border-hairline bg-canvas-soft"
                      )}
                    >
                      <p
                        className={cn(
                          "body-sm line-through",
                          featured ? "text-canvas/60" : "text-muted"
                        )}
                      >
                        {formatPrice(monthlyPrice * 12 || 0)} if paid monthly
                      </p>
                      <p
                        className={cn(
                          "body-sm mt-1",
                          featured ? "text-canvas" : "text-ink"
                        )}
                      >
                        Save {formatPrice(savings.amount)} ·{" "}
                        {savings.percentage}% off
                      </p>
                    </div>
                  )}

                  <ul
                    className={cn(
                      "mt-6 flex-1 space-y-3 border-t pt-6",
                      featured ? "border-white/20" : "border-hairline"
                    )}
                  >
                    <li className="body-sm flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      {isPaidPlan ? (
                        <span>
                          <span className="font-medium">{base} base</span> +{" "}
                          <span className="font-medium">{bonus} bonus</span>{" "}
                          credits
                          <span
                            className={cn(
                              "block",
                              featured ? "text-canvas/70" : "text-muted"
                            )}
                          >
                            {plan.credits} total credits
                            {isAnnual
                              ? " per month, renewed annually"
                              : " per month"}
                          </span>
                        </span>
                      ) : (
                        <span>
                          <span className="font-medium">
                            {plan.credits} credits
                          </span>
                          <span
                            className={cn(
                              "block",
                              featured ? "text-canvas/70" : "text-muted"
                            )}
                          >
                            One time only, no monthly reset
                          </span>
                        </span>
                      )}
                    </li>
                    <li className="body-sm flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      All seven AI tools
                    </li>
                    <li className="body-sm flex items-start gap-2.5">
                      {plan.can_topup ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border border-current" />
                      )}
                      {plan.can_topup ? (
                        <span>
                          Credit top-ups{" "}
                          {plan.topup_discount > 0
                            ? `at ${plan.topup_discount}% off`
                            : "at standard price"}
                        </span>
                      ) : (
                        "No top-ups available"
                      )}
                    </li>
                    {plan.plan_type === "free" ? (
                      <li className="body-sm flex items-start gap-2.5">
                        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border border-current" />
                        Trial use only
                      </li>
                    ) : (
                      <li className="body-sm flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                        {isAnnual ? "Annual subscription" : "Monthly subscription"}
                      </li>
                    )}
                  </ul>

                  <Button
                    onClick={() => handlePlanUpgrade(plan)}
                    disabled={current || processingPlan === plan.id}
                    variant={current ? "outline" : featured ? "secondary" : "default"}
                    className={cn("mt-8 w-full", !current && !featured && "bg-ink text-canvas hover:bg-ink/90")}
                  >
                    {processingPlan === plan.id && (
                      <Loader2 className="animate-spin" />
                    )}
                    {current
                      ? "Active plan"
                      : plan.price_inr === 0
                      ? "Current plan"
                      : "Upgrade now"}
                  </Button>
                </article>
                );
              })}
            </div>
          )}

          {/* top-ups */}
          {user && (
            <div className="mt-20">
              <div className="mb-10 max-w-2xl">
                <p className="section-label mb-3">Credit top-ups</p>
                <h2 className="display-md">Top up without changing plan.</h2>
                <p className="body-md mt-3 text-muted">
                  {isFreePlan
                    ? "You are viewing top-ups in preview mode. Upgrade to a paid plan to purchase credits."
                    : subscription?.topup_discount
                    ? `Your plan takes ${subscription.topup_discount}% off every top-up.`
                    : "Purchased at standard rates."}
                </p>
              </div>

              {topupPackages.length === 0 ? (
                <div className="card col-span-full flex flex-col items-center gap-3 p-12 text-center">
                  <p className="title-md">No top-up packages available</p>
                  <p className="body-sm max-w-sm text-muted">
                    Credit packages could not be loaded. Check your connection
                    and try again.
                  </p>
                  <Button variant="secondary" onClick={fetchPlansAndPackages}>
                    Retry
                  </Button>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {topupPackages.map((pkg) => {
                  const starterPrice = calculateTopupPrice(
                    pkg.price_inr,
                    "starter"
                  );
                  const proPrice = calculateTopupPrice(pkg.price_inr, "pro");
                  const businessPrice = calculateTopupPrice(
                    pkg.price_inr,
                    "business"
                  );
                  const currentPrice = isFreePlan
                    ? starterPrice
                    : calculateTopupPrice(pkg.price_inr, userPlanType);
                  const currentDiscount =
                    userPlanType === "business"
                      ? 20
                      : userPlanType === "pro"
                      ? 10
                      : 0;
                  const savings = pkg.price_inr - currentPrice;

                  return (
                    <article
                      key={pkg.id}
                      className="card p-8"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="display-sm">
                          {pkg.credits} credits
                        </p>
                        {isFreePlan ? (
                          <span className="pill-badge">Preview</span>
                        ) : currentDiscount > 0 ? (
                          <span className="pill-badge">
                            {currentDiscount}% off
                          </span>
                        ) : (
                          <span className="pill-badge">Available</span>
                        )}
                      </div>

                      <p className="display-md mt-6">{formatPrice(currentPrice)}</p>
                      {isFreePlan ? (
                        <p className="body-sm mt-1 text-muted">
                          Starter plan price
                        </p>
                      ) : currentDiscount > 0 ? (
                        <p className="body-sm mt-1 text-muted">
                          <span className="line-through">
                            {formatPrice(pkg.price_inr)}
                          </span>{" "}
                          · save {formatPrice(savings)}
                        </p>
                      ) : (
                        <p className="body-sm mt-1 text-muted">
                          Standard pricing
                        </p>
                      )}

                      {/* price per credit by plan */}
                      <dl className="mt-6 space-y-px overflow-hidden rounded-md border border-hairline bg-hairline">
                        {[
                          { key: "starter", label: "Starter", price: starterPrice },
                          { key: "pro", label: "Pro", price: proPrice },
                          { key: "business", label: "Business", price: businessPrice },
                        ].map((row) => {
                          const active = userPlanType === row.key;
                          return (
                            <div
                              key={row.key}
                              className={cn(
                                "flex items-center justify-between gap-3 px-4 py-2.5",
                                active ? "bg-ink text-canvas" : "bg-card"
                              )}
                            >
                              <dt className="body-sm">
                                {row.label}
                                {active && (
                                  <span className="caption-upper ml-2 opacity-60">
                                    Yours
                                  </span>
                                )}
                              </dt>
                              <dd className="code tabular-nums">
                                {formatPrice(row.price)}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>

                      <Button
                        onClick={() => handleTopup(pkg)}
                        disabled={isFreePlan}
                        variant={isFreePlan ? "outline" : "default"}
                        className="mt-6 w-full"
                      >
                        {isFreePlan ? (
                          <>
                            <Lock />
                            Upgrade to purchase
                          </>
                        ) : (
                          `Buy ${pkg.credits} credits`
                        )}
                      </Button>
                    </article>
                  );
                })}
              </div>
              )}

              {/* discount matrix */}
              <div className="mt-12">
                <p className="section-label mb-6">Top-up discounts by plan</p>
                <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      name: "Free Plan",
                      line: "No top-ups available",
                      badge: "Upgrade required",
                      active: userPlanType === "free",
                    },
                    {
                      name: "Starter Plan",
                      line: "Standard pricing",
                      badge: "0% discount",
                      active: userPlanType === "starter",
                    },
                    {
                      name: "Pro Plan",
                      line: "10% off all top-ups",
                      badge: "Good value",
                      active: userPlanType === "pro",
                    },
                    {
                      name: "Business Plan",
                      line: "20% off all top-ups",
                      badge: "Best savings",
                      active: userPlanType === "business",
                    },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className={cn(
                        "flex flex-col gap-2 p-6",
                        row.active ? "bg-ink text-canvas" : "bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="title-md">{row.name}</p>
                        {row.active && <Check className="h-4 w-4" />}
                      </div>
                      <p
                        className={cn(
                          "body-sm",
                          row.active ? "text-canvas/70" : "text-muted"
                        )}
                      >
                        {row.line}
                      </p>
                      <span
                        className={cn(
                          "caption-upper mt-2 self-start rounded-full px-2.5 py-1",
                          row.active
                            ? "border border-white/25"
                            : "bg-surface-strong text-ink"
                        )}
                      >
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* free-user savings calculator */}
              {isFreePlan && topupPackages.length > 0 && (
                <div className="card mt-12 p-8">
                  <p className="section-label mb-6">What upgrading would save</p>
                  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-hairline bg-hairline md:grid-cols-2">
                    {topupPackages.map((pkg) => {
                      const proSavings =
                        pkg.price_inr - calculateTopupPrice(pkg.price_inr, "pro");
                      const businessSavings =
                        pkg.price_inr -
                        calculateTopupPrice(pkg.price_inr, "business");
                      return (
                        <div key={pkg.id} className="bg-card p-5">
                          <p className="title-sm">
                            {pkg.credits} credit package
                          </p>
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="body-sm text-muted">Pro plan</span>
                              <span className="code text-success">
                                save {formatPrice(proSavings)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="body-sm text-muted">Business</span>
                              <span className="code text-success">
                                save {formatPrice(businessSavings)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="body-sm mt-5 text-muted-soft">
                    Compared with Starter plan pricing on the same package.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* free-user CTA */}
          {user && isFreePlan && (
            <section className="mt-20">
              <div className="card overflow-hidden">
                <div className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-3">
                  {[
                    {
                      title: "Free Plan",
                      lines: ["No credit purchases", "10 one-time credits"],
                    },
                    {
                      title: "Starter Plan",
                      lines: ["Credit top-ups enabled", "60 monthly credits"],
                    },
                    {
                      title: "Pro / Business",
                      lines: ["10–20% top-up discounts", "120–400 monthly credits"],
                    },
                  ].map((column) => (
                    <div key={column.title} className="bg-card p-8">
                      <p className="title-md">{column.title}</p>
                      <ul className="mt-4 space-y-2">
                        {column.lines.map((line) => (
                          <li key={line} className="body-sm text-muted">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-start gap-4 border-t border-hairline p-8 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="title-md">Unlock credit purchases</p>
                    <p className="body-sm mt-1 text-muted">
                      Paid plans renew monthly, include bonus credits, and
                      discount every top-up.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() =>
                        document
                          .querySelector('[data-plan="starter"]')
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      View Starter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        document
                          .querySelector('[data-plan="pro"]')
                          ?.scrollIntoView({ behavior: "smooth" })
                    }
                    >
                      See Pro benefits
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Plans;
