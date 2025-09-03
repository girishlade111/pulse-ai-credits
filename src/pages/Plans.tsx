import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MinimalisticIcons } from '@/components/ui/minimalistic-icons';
import { 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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
  const { user, subscription, credits, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [topupPackages, setTopupPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [switchingPeriod, setSwitchingPeriod] = useState(false);

  useEffect(() => {
    fetchPlansAndPackages();
    
    // Add keyboard shortcut for billing period toggle
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handleBillingPeriodChange(billingPeriod === 'monthly' ? 'annual' : 'monthly');
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Enhanced billing period switching with smooth transition
  const handleBillingPeriodChange = (newPeriod: 'monthly' | 'annual') => {
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
        supabase.from('subscription_plans').select('*').order('price_inr'),
        supabase.from('topup_packages').select('*').order('credits')
      ]);

      if (plansResponse.data) {
        setPlans(plansResponse.data);
      }
      if (topupResponse.data) setTopupPackages(topupResponse.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error loading plans');
    } finally {
      setLoading(false);
    }
  };

  // Filter plans by billing period with dynamic annual plan creation
  const getFilteredPlans = () => {
    if (billingPeriod === 'annual') {
      // First, try to get annual plans from database
      const freePlan = plans.find(p => p.plan_type === 'free');
      const existingAnnualPlans = plans.filter(p => p.billing_period === 'annual');
      
      // If we have annual plans in the database, use them
      if (existingAnnualPlans.length > 0) {
        return freePlan ? [freePlan, ...existingAnnualPlans] : existingAnnualPlans;
      }
      
      // Otherwise, create annual plans dynamically from monthly plans
      const monthlyPlans = plans.filter(p => 
        p.plan_type !== 'free' && (p.billing_period || 'monthly') === 'monthly'
      );
      
      const dynamicAnnualPlans = monthlyPlans.map(monthlyPlan => {
        // Calculate annual pricing with specific pricing for each plan
        let annualPrice;
        switch(monthlyPlan.plan_type) {
          case 'starter':
            annualPrice = 549900; // ₹5,499 per year (8.17% off)
            break;
          case 'pro':
            annualPrice = 999900; // ₹9,999 per year (16.59% off)
            break;
          case 'business':
            annualPrice = 2999900; // ₹29,999 per year (16.67% off)
            break;
          default:
            annualPrice = Math.round(monthlyPlan.price_inr * 12 * 0.84);
        }
        
        return {
          ...monthlyPlan,
          id: `${monthlyPlan.id}-annual`,
          name: `${monthlyPlan.plan_type.charAt(0).toUpperCase() + monthlyPlan.plan_type.slice(1)} Plan (Annual)`,
          price_inr: annualPrice,
          billing_period: 'annual' as const
        };
      });
      
      return freePlan ? [freePlan, ...dynamicAnnualPlans] : dynamicAnnualPlans;
    } else {
      // For monthly, show free plan + monthly versions of paid plans
      return plans.filter(plan => 
        plan.plan_type === 'free' || 
        (plan.billing_period || 'monthly') === 'monthly'
      );
    }
  };

  // Calculate annual savings with support for dynamic annual plans
  const calculateAnnualSavings = (planType: string) => {
    const monthlyPlan = plans.find(p => p.plan_type === planType && (p.billing_period || 'monthly') === 'monthly');
    let annualPlan = plans.find(p => p.plan_type === planType && p.billing_period === 'annual');
    
    // If no annual plan exists in database, calculate using exact pricing
    if (!annualPlan && monthlyPlan) {
      let annualPrice;
      switch(planType) {
        case 'starter':
          annualPrice = 549900; // ₹5,499 per year
          break;
        case 'pro':
          annualPrice = 999900; // ₹9,999 per year
          break;
        case 'business':
          annualPrice = 2999900; // ₹29,999 per year
          break;
        default:
          annualPrice = Math.round(monthlyPlan.price_inr * 12 * 0.84);
      }
      
      annualPlan = {
        ...monthlyPlan,
        price_inr: annualPrice,
        billing_period: 'annual'
      } as any;
    }
    
    if (!monthlyPlan || !annualPlan) return { percentage: 0, amount: 0 };
    
    const monthlyTotal = monthlyPlan.price_inr * 12;
    const savings = monthlyTotal - annualPlan.price_inr;
    const percentage = (savings / monthlyTotal) * 100;
    
    return { percentage: Math.round(percentage * 100) / 100, amount: savings };
  };

  // Get display price and period with better annual handling
  const getPriceDisplay = (plan: SubscriptionPlan) => {
    if (plan.price_inr === 0) return { price: 'Free', period: '' };
    
    const basePrice = formatPrice(plan.price_inr);
    
    // For annual plans, show annual price and mention monthly equivalent
    if (plan.billing_period === 'annual') {
      const monthlyEquivalent = formatPrice(Math.round(plan.price_inr / 12));
      return { 
        price: basePrice, 
        period: `/year`,
        monthlyEquivalent: `(${monthlyEquivalent}/month)` 
      };
    }
    
    return { price: basePrice, period: '/month' };
  };

  const formatPrice = (priceInPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(priceInPaise / 100);
  };

  const getPlanIcon = (planType: string) => {
    const colorMap = {
      'free': 'text-muted-foreground',
      'starter': 'text-feature-blue',
      'pro': 'text-feature-purple', 
      'business': 'text-feature-orange'
    };
    
    const iconProps = { 
      className: `h-6 w-6 ${colorMap[planType] || 'text-muted-foreground'}`, 
      size: 24 
    };
    
    switch (planType) {
      case 'free': return <MinimalisticIcons.Free {...iconProps} />;
      case 'starter': return <MinimalisticIcons.Starter {...iconProps} />;
      case 'pro': return <MinimalisticIcons.Pro {...iconProps} />;
      case 'business': return <MinimalisticIcons.Business {...iconProps} />;
      default: return <MinimalisticIcons.Free {...iconProps} />;
    }
  };

  const isCurrentPlan = (planType: string) => {
    return subscription?.plan_type === planType;
  };

  // Calculate base and bonus credits for paid plans
  const getPlanCredits = (planType: string, totalCredits: number) => {
    if (planType === 'free') {
      return { base: totalCredits, bonus: 0 };
    }
    // For paid plans, credits are split 50/50 between base and bonus
    const base = totalCredits / 2;
    const bonus = totalCredits / 2;
    return { base, bonus };
  };

  // Calculate discounted top-up price based on user's plan
  const calculateTopupPrice = (originalPrice: number, userPlan: string | undefined) => {
    if (!userPlan || userPlan === 'free') return originalPrice;
    
    const discountMap: Record<string, number> = {
      'starter': 0,
      'pro': 10,
      'business': 20
    };
    
    const discount = discountMap[userPlan] || 0;
    return originalPrice * (1 - discount / 100);
  };

  const handlePlanUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (plan.plan_type === 'free') {
      toast.info('You are already on the free plan');
      return;
    }

    setProcessingPlan(plan.id);
    
    try {
      // Mock Stripe checkout - In real app, this would create a Stripe session
      toast.success(`Redirecting to payment for ${plan.name}...`);
      
      // Simulate payment flow
      setTimeout(() => {
        toast.success('Payment successful! Your plan has been upgraded.');
        refreshUserData();
        setProcessingPlan(null);
      }, 2000);
      
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast.error('Error processing payment');
      setProcessingPlan(null);
    }
  };

  const handleTopup = async (pkg: TopupPackage) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has a paid plan
    if (!subscription?.can_topup || subscription?.plan_type === 'free') {
      toast.error('Credit top-ups are only available for paid plans. Please upgrade to access top-ups.');
      return;
    }

    try {
      // Calculate discounted price based on user's plan
      const discountedPrice = calculateTopupPrice(pkg.price_inr, subscription.plan_type);
      const discount = subscription.topup_discount || 0;
      
      toast.success(`Processing top-up of ${pkg.credits} credits for ${formatPrice(discountedPrice)}...`);
      
      // Mock payment and credit addition
      setTimeout(async () => {
        if (credits) {
          await supabase
            .from('user_credits')
            .update({
              current_credits: credits.current_credits + pkg.credits,
              total_earned_credits: credits.total_earned_credits + pkg.credits
            })
            .eq('user_id', user.id);

          await supabase
            .from('credit_transactions')
            .insert({
              user_id: user.id,
              transaction_type: 'topup',
              credits_amount: pkg.credits,
              description: `Credit top-up: ${pkg.credits} credits${discount > 0 ? ` (${discount}% discount applied)` : ''}`
            });

          toast.success(`Successfully added ${pkg.credits} credits to your account!`);
          refreshUserData();
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error processing top-up:', error);
      toast.error('Error processing top-up');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gradient">
            Choose Your AI Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Unlock the full potential of AI with our flexible credit system and powerful features
          </p>
          
          {/* Billing Period Toggle - Enhanced Visibility */}
          <div className="flex flex-col items-center justify-center mb-12">
            <h3 className="text-lg font-semibold text-center mb-4">Choose Your Billing Period</h3>
            <div className="relative">
              <div className="inline-flex items-center bg-card border-2 border-primary/20 rounded-xl p-2 shadow-lg">
                <Button
                  variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
                  size="lg"
                  onClick={() => handleBillingPeriodChange('monthly')}
                  disabled={switchingPeriod}
                  className={`${
                    billingPeriod === 'monthly' 
                      ? 'bg-primary text-primary-foreground shadow-md border-primary/50' 
                      : 'text-foreground hover:text-primary hover:bg-primary/10'
                  } transition-all duration-300 px-6 py-3 font-medium min-w-[120px] ${switchingPeriod ? 'opacity-50' : ''}`}
                >
                  {switchingPeriod && billingPeriod !== 'monthly' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Monthly
                </Button>
                <Button
                  variant={billingPeriod === 'annual' ? 'default' : 'ghost'}
                  size="lg"
                  onClick={() => handleBillingPeriodChange('annual')}
                  disabled={switchingPeriod}
                  className={`${
                    billingPeriod === 'annual' 
                      ? 'bg-primary text-primary-foreground shadow-md border-primary/50' 
                      : 'text-foreground hover:text-primary hover:bg-primary/10'
                  } transition-all duration-300 px-6 py-3 font-medium min-w-[120px] relative ${switchingPeriod ? 'opacity-50' : ''}`}
                >
                  {switchingPeriod && billingPeriod !== 'annual' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Annual
                  <Badge className="ml-2 bg-feature-green text-white border-0 text-xs font-bold shadow-sm">
                    💰 Save up to 16.67%
                  </Badge>
                </Button>
              </div>
              {/* Visual indicator */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
              Switch between monthly and annual billing to see different pricing options.
              {billingPeriod === 'annual' && ' Annual plans offer significant savings!'}
              <br />
              <span className="text-xs text-muted-foreground/70 mt-1 inline-block">
                💡 Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+B</kbd> to toggle billing period
              </span>
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <MinimalisticIcons.Gift className="h-4 w-4 text-feature-pink" />
              <span>Paid plans include <span className="text-feature-pink font-medium">bonus credits</span></span>
            </div>
            <div className="flex items-center gap-2">
              <MinimalisticIcons.Warning className="h-4 w-4 text-feature-orange" />
              <span>Free users cannot purchase <span className="text-feature-orange font-medium">top-ups</span></span>
            </div>
            <div className="flex items-center gap-2">
              <MinimalisticIcons.Credits className="h-4 w-4 text-feature-blue" />
              <span>Top-up <span className="text-feature-blue font-medium">discounts</span> for Pro & Business</span>
            </div>
          </div>
          
          {/* Additional billing period info */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              billingPeriod === 'annual' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              {billingPeriod === 'annual' ? (
                <>
                  🎉 <span className="font-medium">Great choice!</span> Annual billing saves you money and provides uninterrupted service.
                </>
              ) : (
                <>
                  📅 <span className="font-medium">Monthly billing</span> - Cancel anytime with full flexibility.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 transition-all duration-500">
          {getFilteredPlans().map((plan, index) => {
            const { base, bonus } = getPlanCredits(plan.plan_type, plan.credits);
            const isPaidPlan = plan.plan_type !== 'free';
            const priceInfo = getPriceDisplay(plan);
            const savings = calculateAnnualSavings(plan.plan_type);
            const showSavings = billingPeriod === 'annual' && isPaidPlan && savings.percentage > 0;
            const isDynamicAnnual = plan.id.includes('-annual'); // Dynamic annual plan indicator
            
            return (
              <Card 
                key={`${plan.id}-${billingPeriod}`}
                className={`card-glass relative overflow-hidden transform transition-all duration-500 hover:scale-105 ${
                  isCurrentPlan(plan.plan_type) 
                    ? 'ring-2 ring-primary shadow-[var(--shadow-primary)] border-primary/50' 
                    : ''
                } ${showSavings ? 'border-green-500/50 shadow-green-500/20' : ''}`}
                data-plan={plan.plan_type}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isCurrentPlan(plan.plan_type) && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                    Current Plan
                  </div>
                )}
                
                {showSavings && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-green-400 text-white text-sm px-4 py-2 rounded-bl-lg font-bold shadow-lg border-2 border-green-300 animate-pulse">
                    💰 {savings.percentage}% OFF
                  </div>
                )}
                
                <CardHeader className={`text-center ${isCurrentPlan(plan.plan_type) ? 'pt-12' : showSavings ? 'pt-8' : 'pt-6'}`}>
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.plan_type)}
                  </div>
                  <CardTitle className="text-xl">
                    {plan.plan_type === 'free' 
                      ? plan.name 
                      : `${plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)} Plan${plan.billing_period === 'annual' ? ' (Annual)' : ''}`
                    }
                  </CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">
                      {priceInfo.price}
                      {priceInfo.period && <span className="text-sm text-muted-foreground">{priceInfo.period}</span>}
                    </div>
                    {priceInfo.monthlyEquivalent && (
                      <div className="text-xs text-muted-foreground">
                        {priceInfo.monthlyEquivalent}
                      </div>
                    )}
                    {showSavings && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          <span className="line-through">{formatPrice(plans.find(p => p.plan_type === plan.plan_type && (p.billing_period || 'monthly') === 'monthly')?.price_inr * 12 || 0)}</span>
                          <span className="ml-1 text-xs">if paid monthly</span>
                        </div>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Badge className="bg-feature-green/20 text-feature-green border-feature-green/30 font-medium text-xs">
                            💰 Save {formatPrice(savings.amount)}
                          </Badge>
                          <Badge className="bg-feature-purple/20 text-feature-purple border-feature-purple/30 font-medium text-xs">
                            🎉 {savings.percentage}% OFF
                          </Badge>
                        </div>
                        <div className="text-xs text-feature-green font-medium">
                          Annual savings compared to monthly billing
                        </div>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {/* Credits Display */}
                    <div className="flex items-center gap-2">
                      <MinimalisticIcons.Check className="h-4 w-4 text-feature-green" />
                      {isPaidPlan ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            <span className="text-feature-blue">{base} base</span> + <span className="text-feature-purple">{bonus} bonus</span> credits
                          </span>
                          <span className="text-xs text-muted-foreground">
                            = <span className="text-primary font-medium">{plan.credits} total credits</span>/{plan.billing_period === 'annual' ? 'month (renewed annually)' : 'month'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium"><span className="text-primary">{plan.credits} credits</span></span>
                          <span className="text-xs text-muted-foreground">One-time only, no monthly reset</span>
                        </div>
                      )}
                    </div>
                    
                    {/* All AI Features */}
                    <div className="flex items-center gap-2">
                      <MinimalisticIcons.Check className="h-4 w-4 text-feature-green" />
                      <span className="text-sm">All <span className="text-feature-purple font-medium">AI features</span> access</span>
                    </div>
                    
                    {/* Top-up availability */}
                    <div className="flex items-center gap-2">
                      {plan.can_topup ? (
                        <MinimalisticIcons.Check className="h-4 w-4 text-feature-green" />
                      ) : (
                        <MinimalisticIcons.Close className="h-4 w-4 text-feature-orange" />
                      )}
                      <span className="text-sm">
                        {plan.can_topup 
                          ? <>Credit <span className="text-feature-blue font-medium">top-ups</span> {plan.topup_discount > 0 ? `(${plan.topup_discount}% off)` : '(normal price)'}</> 
                          : <>No <span className="text-feature-orange font-medium">top-ups</span> available</>
                        }
                      </span>
                    </div>
                    
                    {/* Plan type indicators */}
                    {plan.plan_type === 'free' && (
                      <div className="flex items-center gap-2">
                        <MinimalisticIcons.Warning className="h-4 w-4 text-feature-yellow" />
                        <span className="text-sm"><span className="text-feature-yellow font-medium">Trial</span> use only</span>
                      </div>
                    )}
                    
                    {isPaidPlan && (
                      <div className="flex items-center gap-2">
                        <MinimalisticIcons.Gift className="h-4 w-4 text-feature-pink" />
                        <span className="text-sm">
                          <span className="text-feature-pink font-medium">
                            {plan.billing_period === 'annual' ? 'Annual subscription' : 'Monthly subscription'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handlePlanUpgrade(plan)}
                    disabled={isCurrentPlan(plan.plan_type) || processingPlan === plan.id}
                    className={`w-full ${isCurrentPlan(plan.plan_type) ? '' : 'btn-hero'}`}
                    variant={isCurrentPlan(plan.plan_type) ? 'outline' : 'default'}
                  >
                    {processingPlan === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrentPlan(plan.plan_type) 
                      ? 'Active Plan' 
                      : plan.price_inr === 0 
                        ? 'Current Plan' 
                        : 'Upgrade Now'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Credit Top-ups - Show for All Users with Plan-Specific Pricing */}
        {user && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                💳 Credit Top-ups Preview
              </h2>
              {subscription?.plan_type === 'free' ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Explore our flexible credit packages available with paid plans. 
                    See how much you can save with Pro and Business discounts!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-feature-orange/20 text-feature-orange border-feature-orange/30 text-sm px-3 py-1 font-semibold">
                      ⚠️ Upgrade Required to Purchase
                    </Badge>
                    <Badge className="bg-feature-blue/20 text-feature-blue border-feature-blue/30 text-sm px-3 py-1 font-semibold">
                      🎯 Preview Mode Active
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Add more credits to your account instantly. 
                    {subscription.topup_discount > 0 ? (
                      <>Enjoy your {subscription.topup_discount}% discount on all purchases!</>
                    ) : (
                      <>Purchase at standard rates.</>
                    )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-feature-green/20 text-feature-green border-feature-green/30 text-sm px-3 py-1 font-semibold">
                      ✅ Purchase Enabled
                    </Badge>
                    {subscription.topup_discount > 0 && (
                      <Badge className="bg-feature-purple/20 text-feature-purple border-feature-purple/30 text-sm px-3 py-1 font-semibold">
                        🎉 {subscription.topup_discount}% Discount Active
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Credit Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {topupPackages.map((pkg) => {
                const userPlanType = subscription?.plan_type || 'free';
                const isFreePlan = userPlanType === 'free';
                
                // Calculate prices for all plan types for comparison
                const starterPrice = calculateTopupPrice(pkg.price_inr, 'starter');
                const proPrice = calculateTopupPrice(pkg.price_inr, 'pro');
                const businessPrice = calculateTopupPrice(pkg.price_inr, 'business');
                
                const currentPrice = isFreePlan ? starterPrice : calculateTopupPrice(pkg.price_inr, userPlanType);
                const currentDiscount = isFreePlan ? 0 : (subscription?.topup_discount || 0);
                const savings = currentDiscount > 0 ? pkg.price_inr - currentPrice : 0;

                return (
                  <Card key={pkg.id} className={`card-glass hover:shadow-lg transition-all duration-300 ${isFreePlan ? 'border-feature-orange/50 shadow-feature-orange/20' : 'border-primary/30 shadow-primary/10'} relative overflow-hidden`}>
                    {/* Status Indicator */}
                    <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-semibold rounded-bl-lg ${
                      isFreePlan 
                        ? 'bg-gradient-to-r from-feature-orange to-feature-orange/80 text-white' 
                        : currentDiscount > 0 
                          ? 'bg-gradient-to-r from-feature-green to-feature-green/80 text-white' 
                          : 'bg-gradient-to-r from-primary to-primary/80 text-white'
                    }`}>
                      {isFreePlan ? '🔒 Preview' : currentDiscount > 0 ? `💰 ${currentDiscount}% OFF` : '💳 Available'}
                    </div>
                    
                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <MinimalisticIcons.Credits className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl font-bold"><span className="text-gradient">{pkg.credits} Credits</span></CardTitle>
                      </div>
                      
                      {/* Current Plan Pricing */}
                      <CardDescription className="space-y-3">
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-foreground">
                            {formatPrice(currentPrice)}
                          </div>
                          
                          {isFreePlan ? (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">
                                Starter plan price
                              </div>
                              <Badge className="bg-feature-orange/20 text-feature-orange border-feature-orange/30 text-xs font-semibold">
                                🔓 Upgrade to Purchase
                              </Badge>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {currentDiscount > 0 ? (
                                <>
                                  <div className="text-sm line-through text-muted-foreground">
                                    {formatPrice(pkg.price_inr)}
                                  </div>
                                  <Badge className="bg-feature-green/20 text-feature-green border-feature-green/30 text-xs font-semibold">
                                    💰 Save {formatPrice(savings)}
                                  </Badge>
                                </>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Standard pricing
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Price Comparison Table */}
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-2">
                          Pricing by Plan Type
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'starter' ? 'bg-feature-blue/20 border border-feature-blue/30 text-feature-blue' : 'bg-background/50'}`}>
                            <span className="text-feature-blue font-medium">Starter:</span>
                            <span className="font-semibold">{formatPrice(starterPrice)}</span>
                          </div>
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'pro' ? 'bg-feature-purple/20 border border-feature-purple/30 text-feature-purple' : 'bg-background/50'}`}>
                            <span className="text-feature-purple font-medium">Pro:</span>
                            <span className="font-semibold">{formatPrice(proPrice)}</span>
                          </div>
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'business' ? 'bg-feature-orange/20 border border-feature-orange/30 text-feature-orange' : 'bg-background/50'} col-span-2`}>
                            <span className="text-feature-orange font-medium">Business:</span>
                            <span className="font-semibold">{formatPrice(businessPrice)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button
                        onClick={() => isFreePlan ? null : handleTopup(pkg)}
                        disabled={isFreePlan}
                        className={`w-full ${
                          isFreePlan 
                            ? 'bg-feature-orange/20 hover:bg-feature-orange/30 text-feature-orange border-feature-orange/30 cursor-not-allowed' 
                            : 'btn-hero'
                        }`}
                      >
                        {isFreePlan ? (
                          <>
                            <MinimalisticIcons.Warning className="mr-2 h-4 w-4" />
                            Upgrade to Purchase
                          </>
                        ) : (
                          <>
                            <MinimalisticIcons.Credits className="mr-2 h-4 w-4" />
                            Buy {pkg.credits} Credits
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Enhanced Top-up Pricing Summary */}
            <div className="bg-card/50 p-8 rounded-xl border border-border/50 shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  🎯 Top-up Discounts by Plan
                </h3>
                <p className="text-muted-foreground">
                  See how much you can save with different subscription plans
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'free' 
                    ? 'border-feature-orange/50 bg-feature-orange/10 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-feature-orange/30'
                }`}>
                  {subscription?.plan_type === 'free' && (
                    <div className="absolute -top-2 -right-2 bg-feature-orange text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-feature-orange text-lg">Free Plan</div>
                    <div className="text-muted-foreground text-sm">No top-ups available</div>
                    <Badge className="bg-feature-orange/20 text-feature-orange border-feature-orange/30 text-xs font-semibold">
                      🔒 Upgrade Required
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'starter' 
                    ? 'border-feature-blue/50 bg-feature-blue/10 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-feature-blue/30'
                }`}>
                  {subscription?.plan_type === 'starter' && (
                    <div className="absolute -top-2 -right-2 bg-feature-blue text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-feature-blue text-lg">Starter Plan</div>
                    <div className="text-muted-foreground text-sm">Standard pricing</div>
                    <Badge className="bg-feature-blue/20 text-feature-blue border-feature-blue/30 text-xs font-semibold">
                      💳 0% Discount
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'pro' 
                    ? 'border-feature-purple/50 bg-feature-purple/10 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-feature-purple/30'
                }`}>
                  {subscription?.plan_type === 'pro' && (
                    <div className="absolute -top-2 -right-2 bg-feature-purple text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-feature-purple text-lg">Pro Plan</div>
                    <div className="text-feature-green font-semibold text-sm">💰 10% OFF all top-ups</div>
                    <Badge className="bg-feature-green/20 text-feature-green border-feature-green/30 text-xs font-semibold">
                      🎆 Great Value
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'business' 
                    ? 'border-feature-yellow/50 bg-feature-yellow/10 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-feature-yellow/30'
                }`}>
                  {subscription?.plan_type === 'business' && (
                    <div className="absolute -top-2 -right-2 bg-feature-yellow text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-feature-yellow text-lg">Business Plan</div>
                    <div className="text-feature-green font-semibold text-sm">🎉 20% OFF all top-ups</div>
                    <Badge className="bg-feature-green/20 text-feature-green border-feature-green/30 text-xs font-semibold">
                      🚀 Best Savings
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Savings Calculator for Free Users */}
              {subscription?.plan_type === 'free' && topupPackages.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-feature-purple/10 border border-primary/20 rounded-lg">
                  <h4 className="text-lg font-semibold mb-3 text-center text-gradient">💡 Potential Savings Calculator</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {topupPackages.map((pkg) => {
                      const starterPrice = calculateTopupPrice(pkg.price_inr, 'starter');
                      const proPrice = calculateTopupPrice(pkg.price_inr, 'pro');
                      const businessPrice = calculateTopupPrice(pkg.price_inr, 'business');
                      const proSavings = starterPrice - proPrice;
                      const businessSavings = starterPrice - businessPrice;
                      
                      return (
                        <div key={pkg.id} className="bg-background/50 p-3 rounded border border-border/30">
                          <div className="font-medium text-foreground mb-2">{pkg.credits} Credits Package</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pro Plan:</span>
                              <span className="text-feature-green font-medium">💰 Save {formatPrice(proSavings)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Business:</span>
                              <span className="text-feature-green font-medium">🎉 Save {formatPrice(businessSavings)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground">
                      * Savings compared to Starter plan pricing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced CTA for Free Users */}
        {user && subscription?.plan_type === 'free' && (
          <div className="max-w-4xl mx-auto mt-12">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-muted/50 rounded-full">
                    <MinimalisticIcons.Credits className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-4 text-foreground">
                  Unlock Premium Credit Features
                </h3>
                
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                  You're currently viewing top-ups in preview mode. Upgrade to any paid plan to unlock instant credit purchases, 
                  bonus credits, and exclusive discounts that can save you hundreds of rupees!
                </p>
                
                {/* Feature comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-muted/20 border border-border/30 rounded-lg">
                    <MinimalisticIcons.Close className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-semibold text-muted-foreground mb-1">Free Plan</h4>
                    <p className="text-sm text-muted-foreground">No credit purchases</p>
                    <p className="text-sm text-muted-foreground">10 one-time credits</p>
                  </div>
                  
                  <div className="p-4 bg-muted/20 border border-border/30 rounded-lg">
                    <MinimalisticIcons.Starter className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-semibold text-muted-foreground mb-1">Starter Plan</h4>
                    <p className="text-sm text-muted-foreground">Credit top-ups enabled</p>
                    <p className="text-sm text-muted-foreground">60 monthly credits</p>
                  </div>
                  
                  <div className="p-4 bg-muted/20 border border-border/30 rounded-lg">
                    <MinimalisticIcons.Pro className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-semibold text-muted-foreground mb-1">Pro/Business</h4>
                    <p className="text-sm text-muted-foreground">10-20% top-up discounts</p>
                    <p className="text-sm text-muted-foreground">120-400 monthly credits</p>
                  </div>
                </div>
                
                {/* Savings showcase */}
                {topupPackages.length > 0 && (
                  <div className="bg-muted/20 border border-border/30 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-muted-foreground mb-3">Example: What You Could Save</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {topupPackages.slice(0, 2).map((pkg) => {
                        const starterPrice = calculateTopupPrice(pkg.price_inr, 'starter');
                        const businessPrice = calculateTopupPrice(pkg.price_inr, 'business');
                        const maxSavings = starterPrice - businessPrice;
                        
                        return (
                          <div key={pkg.id} className="flex justify-between items-center bg-background/50 p-2 rounded">
                            <span className="text-muted-foreground">{pkg.credits} credits with Business:</span>
                            <span className="font-semibold text-muted-foreground">Save {formatPrice(maxSavings)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => document.querySelector('[data-plan="starter"]')?.scrollIntoView({ behavior: 'smooth' })} 
                    className="btn-hero text-lg px-8 py-3"
                  >
                    <MinimalisticIcons.Starter className="mr-2 h-5 w-5" />
                    View Starter Plan
                  </Button>
                  <Button 
                    onClick={() => document.querySelector('[data-plan="pro"]')?.scrollIntoView({ behavior: 'smooth' })} 
                    variant="outline"
                    className="border-border/50 hover:bg-muted/10 text-lg px-8 py-3"
                  >
                    <MinimalisticIcons.Pro className="mr-2 h-5 w-5" />
                    See Pro Benefits
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  All paid plans include bonus credits and monthly renewals
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;