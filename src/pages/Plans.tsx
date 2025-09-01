import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Star, 
  Zap, 
  Crown, 
  Building2, 
  CreditCard,
  Loader2,
  X,
  Gift,
  AlertTriangle
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

  useEffect(() => {
    fetchPlansAndPackages();
  }, []);

  const fetchPlansAndPackages = async () => {
    try {
      const [plansResponse, topupResponse] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('price_inr'),
        supabase.from('topup_packages').select('*').order('credits')
      ]);

      if (plansResponse.data) setPlans(plansResponse.data);
      if (topupResponse.data) setTopupPackages(topupResponse.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error loading plans');
    } finally {
      setLoading(false);
    }
  };

  // Filter plans by billing period
  const getFilteredPlans = () => {
    if (billingPeriod === 'annual') {
      // For annual, show free plan + annual versions of paid plans
      const freePlan = plans.find(p => p.plan_type === 'free');
      const annualPlans = plans.filter(p => p.billing_period === 'annual');
      return freePlan ? [freePlan, ...annualPlans] : annualPlans;
    } else {
      // For monthly, show free plan + monthly versions of paid plans
      return plans.filter(plan => 
        plan.plan_type === 'free' || 
        (plan.billing_period || 'monthly') === 'monthly'
      );
    }
  };

  // Calculate annual savings
  const calculateAnnualSavings = (planType: string) => {
    const monthlyPlan = plans.find(p => p.plan_type === planType && (p.billing_period || 'monthly') === 'monthly');
    const annualPlan = plans.find(p => p.plan_type === planType && p.billing_period === 'annual');
    
    if (!monthlyPlan || !annualPlan) return { percentage: 0, amount: 0 };
    
    const monthlyTotal = monthlyPlan.price_inr * 12;
    const savings = monthlyTotal - annualPlan.price_inr;
    const percentage = (savings / monthlyTotal) * 100;
    
    return { percentage: Math.round(percentage * 100) / 100, amount: savings };
  };

  // Get display price and period
  const getPriceDisplay = (plan: SubscriptionPlan) => {
    if (plan.price_inr === 0) return { price: 'Free', period: '' };
    
    const basePrice = formatPrice(plan.price_inr);
    if (billingPeriod === 'annual') {
      return { price: basePrice, period: '/year' };
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
    switch (planType) {
      case 'free': return <Star className="h-6 w-6" />;
      case 'starter': return <Zap className="h-6 w-6" />;
      case 'pro': return <Crown className="h-6 w-6" />;
      case 'business': return <Building2 className="h-6 w-6" />;
      default: return <Star className="h-6 w-6" />;
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
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Choose Your AI Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Unlock the full potential of AI with our flexible credit system and powerful features
          </p>
          
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center bg-card/50 border border-border/30 rounded-lg p-1">
              <Button
                variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingPeriod('monthly')}
                className={`${billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'} transition-all`}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === 'annual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingPeriod('annual')}
                className={`${billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'} transition-all relative`}
              >
                Annual
                <Badge className="ml-2 bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                  Save up to 16%
                </Badge>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span>Paid plans include bonus credits</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span>Free users cannot purchase top-ups</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Top-up discounts for Pro & Business</span>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {getFilteredPlans().map((plan) => {
            const { base, bonus } = getPlanCredits(plan.plan_type, plan.credits);
            const isPaidPlan = plan.plan_type !== 'free';
            const { price, period } = getPriceDisplay(plan);
            const savings = calculateAnnualSavings(plan.plan_type);
            const showSavings = billingPeriod === 'annual' && isPaidPlan && savings.percentage > 0;
            
            return (
              <Card 
                key={plan.id} 
                className={`card-glass relative overflow-hidden ${
                  isCurrentPlan(plan.plan_type) 
                    ? 'ring-2 ring-primary shadow-[var(--shadow-primary)]' 
                    : ''
                } ${showSavings ? 'border-green-500/50' : ''}`}
                data-plan={plan.plan_type}
              >
                {isCurrentPlan(plan.plan_type) && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                    Current Plan
                  </div>
                )}
                
                {showSavings && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1 rounded-bl-lg font-semibold shadow-lg">
                    💰 {savings.percentage}% OFF
                  </div>
                )}
                
                <CardHeader className={`text-center ${isCurrentPlan(plan.plan_type) ? 'pt-12' : showSavings ? 'pt-8' : 'pt-6'}`}>
                  <div className="flex justify-center mb-4 text-primary">
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
                      {price}
                      {period && <span className="text-sm text-muted-foreground">{period}</span>}
                    </div>
                    {showSavings && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          <span className="line-through">{formatPrice(plans.find(p => p.plan_type === plan.plan_type && (p.billing_period || 'monthly') === 'monthly')?.price_inr * 12 || 0)}</span>
                          <span className="ml-1 text-xs">if paid monthly</span>
                        </div>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Badge className="bg-green-500/20 text-green-700 border-green-500/30 font-semibold text-xs">
                            💰 Save {formatPrice(savings.amount)}
                          </Badge>
                          <Badge className="bg-green-600/20 text-green-800 border-green-600/30 font-semibold text-xs">
                            🎉 {savings.percentage}% OFF
                          </Badge>
                        </div>
                        <div className="text-xs text-green-600 font-medium">
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
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {isPaidPlan ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{base} base + {bonus} bonus credits</span>
                          <span className="text-xs text-muted-foreground">
                            = {plan.credits} total credits/{plan.billing_period === 'annual' ? 'month (renewed annually)' : 'month'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{plan.credits} credits</span>
                          <span className="text-xs text-muted-foreground">One-time only, no monthly reset</span>
                        </div>
                      )}
                    </div>
                    
                    {/* All AI Features */}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm">All AI features access</span>
                    </div>
                    
                    {/* Top-up availability */}
                    <div className="flex items-center gap-2">
                      {plan.can_topup ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        {plan.can_topup 
                          ? `Credit top-ups ${plan.topup_discount > 0 ? `(${plan.topup_discount}% off)` : '(normal price)'}` 
                          : 'No top-ups available'
                        }
                      </span>
                    </div>
                    
                    {/* Plan type indicators */}
                    {plan.plan_type === 'free' && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600">Trial use only</span>
                      </div>
                    )}
                    
                    {isPaidPlan && (
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">
                          {plan.billing_period === 'annual' ? 'Annual subscription' : 'Monthly subscription'}
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
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                💳 Credit Top-ups Preview
              </h2>
              {subscription?.plan_type === 'free' ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Explore our flexible credit packages available with paid plans. 
                    See how much you can save with Pro and Business discounts!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-sm px-3 py-1">
                      ⚠️ Upgrade Required to Purchase
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 text-sm px-3 py-1">
                      🎯 Preview Mode Active
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Add more credits to your account instantly. 
                    {subscription.topup_discount > 0 ? `Enjoy your ${subscription.topup_discount}% discount on all purchases!` : 'Purchase at standard rates.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-sm px-3 py-1">
                      ✅ Purchase Enabled
                    </Badge>
                    {subscription.topup_discount > 0 && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1">
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
                  <Card key={pkg.id} className={`card-glass hover:shadow-lg transition-all duration-300 ${isFreePlan ? 'border-orange-500/50 shadow-orange-500/20' : 'border-primary/30 shadow-primary/10'} relative overflow-hidden`}>
                    {/* Status Indicator */}
                    <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-semibold rounded-bl-lg ${
                      isFreePlan 
                        ? 'bg-orange-500 text-white' 
                        : currentDiscount > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 text-white'
                    }`}>
                      {isFreePlan ? '🔒 Preview' : currentDiscount > 0 ? `💰 ${currentDiscount}% OFF` : '💳 Available'}
                    </div>
                    
                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl font-bold">{pkg.credits} Credits</CardTitle>
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
                              <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-xs">
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
                                  <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
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
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'starter' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-background/50'}`}>
                            <span className="text-blue-400 font-medium">Starter:</span>
                            <span className="font-semibold">{formatPrice(starterPrice)}</span>
                          </div>
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'pro' ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-background/50'}`}>
                            <span className="text-purple-400 font-medium">Pro:</span>
                            <span className="font-semibold">{formatPrice(proPrice)}</span>
                          </div>
                          <div className={`flex justify-between p-2 rounded ${userPlanType === 'business' ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-background/50'} col-span-2`}>
                            <span className="text-orange-400 font-medium">Business:</span>
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
                            ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-700 border-orange-500/30 cursor-not-allowed' 
                            : 'btn-hero'
                        }`}
                      >
                        {isFreePlan ? (
                          <>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Upgrade to Purchase
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
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
            <div className="bg-gradient-to-br from-card/80 to-muted/50 p-8 rounded-xl border border-border/50 shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  🎯 Top-up Discounts by Plan
                </h3>
                <p className="text-muted-foreground">
                  See how much you can save with different subscription plans
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'free' 
                    ? 'border-orange-500/50 bg-orange-500/10 shadow-orange-500/20 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-orange-500/30'
                }`}>
                  {subscription?.plan_type === 'free' && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-orange-400 text-lg">Free Plan</div>
                    <div className="text-muted-foreground text-sm">No top-ups available</div>
                    <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-xs">
                      🔒 Upgrade Required
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'starter' 
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-blue-500/20 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-blue-500/30'
                }`}>
                  {subscription?.plan_type === 'starter' && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-blue-400 text-lg">Starter Plan</div>
                    <div className="text-muted-foreground text-sm">Standard pricing</div>
                    <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 text-xs">
                      💳 0% Discount
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'pro' 
                    ? 'border-purple-500/50 bg-purple-500/10 shadow-purple-500/20 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-purple-500/30'
                }`}>
                  {subscription?.plan_type === 'pro' && (
                    <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-purple-400 text-lg">Pro Plan</div>
                    <div className="text-green-600 font-semibold text-sm">10% OFF all top-ups</div>
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                      💰 Great Value
                    </Badge>
                  </div>
                </div>
                
                <div className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  subscription?.plan_type === 'business' 
                    ? 'border-amber-500/50 bg-amber-500/10 shadow-amber-500/20 shadow-lg transform scale-105' 
                    : 'border-border/30 bg-background/50 hover:border-amber-500/30'
                }`}>
                  {subscription?.plan_type === 'business' && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="font-bold text-amber-400 text-lg">Business Plan</div>
                    <div className="text-green-600 font-semibold text-sm">20% OFF all top-ups</div>
                    <Badge className="bg-green-600/20 text-green-800 border-green-600/30 text-xs">
                      🎉 Best Savings
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Savings Calculator for Free Users */}
              {subscription?.plan_type === 'free' && topupPackages.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-lg">
                  <h4 className="text-lg font-semibold mb-3 text-center">💡 Potential Savings Calculator</h4>
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
                              <span className="text-green-600 font-medium">Save {formatPrice(proSavings)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Business:</span>
                              <span className="text-green-600 font-medium">Save {formatPrice(businessSavings)}</span>
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
            <Card className="relative overflow-hidden border-gradient-to-r from-orange-500/30 to-amber-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5 shadow-xl">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              
              <CardContent className="relative p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full shadow-lg">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  🚀 Unlock Premium Credit Features
                </h3>
                
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                  You're currently viewing top-ups in preview mode. Upgrade to any paid plan to unlock instant credit purchases, 
                  bonus credits, and exclusive discounts that can save you hundreds of rupees!
                </p>
                
                {/* Feature comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <X className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <h4 className="font-semibold text-red-600 mb-1">Free Plan</h4>
                    <p className="text-sm text-muted-foreground">No credit purchases</p>
                    <p className="text-sm text-muted-foreground">10 one-time credits</p>
                  </div>
                  
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Zap className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-600 mb-1">Starter Plan</h4>
                    <p className="text-sm text-green-600">Credit top-ups enabled</p>
                    <p className="text-sm text-green-600">60 monthly credits</p>
                  </div>
                  
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <Crown className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <h4 className="font-semibold text-purple-600 mb-1">Pro/Business</h4>
                    <p className="text-sm text-green-600">10-20% top-up discounts</p>
                    <p className="text-sm text-green-600">120-400 monthly credits</p>
                  </div>
                </div>
                
                {/* Savings showcase */}
                {topupPackages.length > 0 && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-green-700 mb-3">💰 Example: What You Could Save</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {topupPackages.slice(0, 2).map((pkg) => {
                        const starterPrice = calculateTopupPrice(pkg.price_inr, 'starter');
                        const businessPrice = calculateTopupPrice(pkg.price_inr, 'business');
                        const maxSavings = starterPrice - businessPrice;
                        
                        return (
                          <div key={pkg.id} className="flex justify-between items-center bg-background/50 p-2 rounded">
                            <span className="text-muted-foreground">{pkg.credits} credits with Business:</span>
                            <span className="font-semibold text-green-600">Save {formatPrice(maxSavings)}</span>
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
                    <Zap className="mr-2 h-5 w-5" />
                    View Starter Plan
                  </Button>
                  <Button 
                    onClick={() => document.querySelector('[data-plan="pro"]')?.scrollIntoView({ behavior: 'smooth' })} 
                    variant="outline"
                    className="border-primary/50 hover:bg-primary/10 text-lg px-8 py-3"
                  >
                    <Crown className="mr-2 h-5 w-5" />
                    See Pro Benefits
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  ✨ All paid plans include bonus credits and monthly renewals
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