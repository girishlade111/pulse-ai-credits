import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SearchInterface } from '@/components/SearchInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Zap, 
  Shield, 
  CreditCard, 
  ArrowRight,
  Search,
  ImageIcon,
  Sparkles
} from 'lucide-react';

const Index = () => {
  const { user, credits, subscription } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Search className="h-6 w-6 text-primary" />,
      title: "Quick Search",
      description: "Get instant AI-powered answers to your questions",
      cost: "1 credit"
    },
    {
      icon: <Zap className="h-6 w-6 text-warning" />,
      title: "Deep Research",
      description: "Comprehensive analysis with detailed insights",
      cost: "5 credits"
    },
    {
      icon: <ImageIcon className="h-6 w-6 text-primary" />,
      title: "Image Generation",
      description: "Create stunning AI-generated images from text",
      cost: "1 credit"
    },
    {
      icon: <Shield className="h-6 w-6 text-success" />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security",
      cost: "Free"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Bot className="h-16 w-16 text-primary" />
              <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl"></div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Supercharge Your Work with{' '}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Pulse AI
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get instant AI-powered answers, deep research insights, and generate stunning images. 
            All with a simple, credit-based system that scales with your needs.
          </p>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                {credits && (
                  <div className="credit-badge text-lg px-4 py-2">
                    <CreditCard className="h-5 w-5 mr-2" />
                    {credits.current_credits} credits available
                  </div>
                )}
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {subscription?.name || 'Free Plan'}
                </Badge>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="btn-hero" onClick={() => navigate('/dashboard')}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/plans')}>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Upgrade Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-hero" onClick={() => navigate('/auth')}>
                <Bot className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/plans')}>
                <CreditCard className="mr-2 h-5 w-5" />
                View Plans
              </Button>
            </div>
          )}
        </div>

        {/* Search Interface for authenticated users */}
        {user && (
          <div className="mb-16">
            <SearchInterface />
          </div>
        )}

        {/* Features Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful AI Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to boost your productivity with artificial intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="card-glass group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                  <Badge variant={feature.cost === "Free" ? "secondary" : "outline"}>
                    {feature.cost}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="text-center bg-gradient-card p-8 rounded-2xl border border-border/50">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of users already using Pulse AI to supercharge their productivity
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-hero" onClick={() => navigate('/auth')}>
                Start Free with 10 Credits
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/plans')}>
                View Pricing Plans
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No credit card required • Get started in seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
