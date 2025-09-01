-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE subscription_plan_type AS ENUM ('free', 'starter', 'pro', 'business');
CREATE TYPE transaction_type AS ENUM ('deduction', 'addition', 'plan_credit', 'topup');
CREATE TYPE request_type AS ENUM ('image_generation', 'normal_search', 'deep_research');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_type subscription_plan_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_inr INTEGER NOT NULL DEFAULT 0, -- Price in paise (INR)
  credits INTEGER NOT NULL DEFAULT 0,
  can_topup BOOLEAN NOT NULL DEFAULT FALSE,
  topup_discount INTEGER NOT NULL DEFAULT 0, -- Percentage discount
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_type, name, price_inr, credits, can_topup, topup_discount) VALUES
('free', 'Free Plan', 0, 20, FALSE, 0),
('starter', 'Starter Plan', 49900, 30, TRUE, 0), -- ₹499 in paise
('pro', 'Pro Plan', 99900, 60, TRUE, 10), -- ₹999 in paise
('business', 'Business Plan', 300000, 200, TRUE, 20); -- ₹3000 in paise

-- Create user credits table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_credits INTEGER NOT NULL DEFAULT 20,
  total_earned_credits INTEGER NOT NULL DEFAULT 20,
  total_spent_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit transactions table for tracking usage
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  request_type request_type,
  credits_amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create topup packages table
CREATE TABLE public.topup_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credits INTEGER NOT NULL,
  price_inr INTEGER NOT NULL, -- Price in paise (INR)
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert topup packages
INSERT INTO public.topup_packages (credits, price_inr) VALUES
(10, 14900), -- ₹149 in paise
(20, 24900), -- ₹249 in paise
(30, 34900), -- ₹349 in paise
(50, 49900); -- ₹499 in paise

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_packages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_credits
CREATE POLICY "Users can view their own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON public.user_credits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" ON public.user_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for credit_transactions
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
  FOR SELECT USING (true);

-- Create RLS policies for topup_packages (public read)
CREATE POLICY "Anyone can view topup packages" ON public.topup_packages
  FOR SELECT USING (true);

-- Create function to handle new user registration
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
  
  -- Initialize user credits with free plan (20 credits)
  INSERT INTO public.user_credits (user_id, current_credits, total_earned_credits)
  VALUES (NEW.id, 20, 20);
  
  -- Assign free plan to user
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  SELECT NEW.id, id, 'active'
  FROM public.subscription_plans
  WHERE plan_type = 'free';
  
  -- Log initial credit transaction
  INSERT INTO public.credit_transactions (user_id, transaction_type, credits_amount, description)
  VALUES (NEW.id, 'plan_credit', 20, 'Welcome credits - Free Plan');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();