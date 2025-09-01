-- Update Pricing Plans Migration
-- This migration updates the pricing structure according to new specifications
-- Now includes both monthly and annual plans with discounts

-- Update existing subscription plans with new credit amounts and structure
UPDATE public.subscription_plans SET credits = 10 WHERE plan_type = 'free';
UPDATE public.subscription_plans SET credits = 60 WHERE plan_type = 'starter'; -- 30 base + 30 bonus
UPDATE public.subscription_plans SET credits = 120 WHERE plan_type = 'pro'; -- 60 base + 60 bonus  
UPDATE public.subscription_plans SET credits = 400 WHERE plan_type = 'business'; -- 200 base + 200 bonus

-- Add billing_period column to subscription_plans table
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- Insert annual plans with discounts
INSERT INTO public.subscription_plans (plan_type, name, price_inr, credits, can_topup, topup_discount, billing_period) VALUES
('starter', 'Starter Plan (Annual)', 549900, 60, TRUE, 0, 'annual'), -- ₹5,499 per year (8.17% off)
('pro', 'Pro Plan (Annual)', 999900, 120, TRUE, 10, 'annual'), -- ₹9,999 per year (16.59% off)
('business', 'Business Plan (Annual)', 2999900, 400, TRUE, 20, 'annual'); -- ₹29,999 per year (16.67% off)

-- Update monthly plans to specify billing period
UPDATE public.subscription_plans SET billing_period = 'monthly' WHERE billing_period IS NULL;

-- Update user_credits default to reflect new free plan (10 credits instead of 20)
ALTER TABLE public.user_credits ALTER COLUMN current_credits SET DEFAULT 10;
ALTER TABLE public.user_credits ALTER COLUMN total_earned_credits SET DEFAULT 10;

-- Update the handle_new_user function to give 10 credits instead of 20
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Initialize user credits with free plan (10 credits)
  INSERT INTO public.user_credits (user_id, current_credits, total_earned_credits)
  VALUES (NEW.id, 10, 10);
  
  -- Assign free plan to user
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  SELECT NEW.id, id, 'active'
  FROM public.subscription_plans
  WHERE plan_type = 'free';
  
  -- Add initial credit transaction record
  INSERT INTO public.credit_transactions (user_id, transaction_type, credits_amount, description)
  VALUES (NEW.id, 'plan_credit', 10, 'Welcome bonus - Free plan credits');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;