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

    if (!subscription?.can_topup) {
      toast.error('Top-up is only available for paid plans. Please upgrade first.');
      return;
    }

    try {
      // Calculate discounted price
      const discount = subscription.topup_discount || 0;
      const discountedPrice = pkg.price_inr * (1 - discount / 100);
      
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
              description: `Credit top-up: ${pkg.credits} credits`
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of AI with our flexible credit system and powerful features
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`card-glass relative overflow-hidden ${
                isCurrentPlan(plan.plan_type) 
                  ? 'ring-2 ring-primary shadow-[var(--shadow-primary)]' 
                  : ''
              }`}
            >
              {isCurrentPlan(plan.plan_type) && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                  Current Plan
                </div>
              )}
              
              <CardHeader className={`text-center ${isCurrentPlan(plan.plan_type) ? 'pt-12' : 'pt-6'}`}>
                <div className="flex justify-center mb-4 text-primary">
                  {getPlanIcon(plan.plan_type)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-foreground">
                  {plan.price_inr === 0 ? 'Free' : formatPrice(plan.price_inr)}
                  {plan.price_inr > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm">{plan.credits} credits/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm">All AI features</span>
                  </div>
                  {plan.can_topup && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        Credit top-ups {plan.topup_discount > 0 && `(${plan.topup_discount}% off)`}
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
          ))}
        </div>

        {/* Credit Top-ups */}
        {user && subscription?.can_topup && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Credit Top-ups</h2>
              <p className="text-muted-foreground">
                Need more credits? Top up anytime with {subscription.topup_discount > 0 ? `${subscription.topup_discount}% discount` : 'our flexible packages'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topupPackages.map((pkg) => {
                const discount = subscription.topup_discount || 0;
                const originalPrice = pkg.price_inr;
                const discountedPrice = originalPrice * (1 - discount / 100);

                return (
                  <Card key={pkg.id} className="card-glass">
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-lg">{pkg.credits} Credits</CardTitle>
                      <CardDescription className="space-y-1">
                        {discount > 0 ? (
                          <>
                            <div className="text-lg font-bold text-foreground">
                              {formatPrice(discountedPrice)}
                            </div>
                            <div className="text-sm line-through text-muted-foreground">
                              {formatPrice(originalPrice)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {discount}% OFF
                            </Badge>
                          </>
                        ) : (
                          <div className="text-lg font-bold text-foreground">
                            {formatPrice(originalPrice)}
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleTopup(pkg)}
                        className="w-full btn-hero"
                        size="sm"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Buy Credits
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Call to action for free users */}
        {user && subscription?.plan_type === 'free' && (
          <div className="text-center mt-12 p-6 card-glass max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">Unlock More with Paid Plans</h3>
            <p className="text-muted-foreground mb-4">
              Upgrade to unlock credit top-ups, priority support, and more monthly credits
            </p>
            <Button onClick={() => document.getElementById('starter-plan')?.scrollIntoView()} className="btn-hero">
              View Plans
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;