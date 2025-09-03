import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SearchInterface } from '@/components/SearchInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { MinimalisticIcons } from '@/components/ui/minimalistic-icons';
import AnimatedBackground from '@/components/AnimatedBackground';
import FloatingShapes from '@/components/FloatingShapes';
import { 
  ArrowRight
} from 'lucide-react';

interface IndexProps {
  onChatModeChange?: (isChatMode: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ onChatModeChange }) => {
  const { user, credits, subscription } = useAuth();
  const navigate = useNavigate();
  const [showLandingContent, setShowLandingContent] = React.useState(true);

  const handleResultsChange = (hasResults: boolean) => {
    setShowLandingContent(!hasResults);
    onChatModeChange?.(hasResults);
  };

  const features = [
    {
      icon: <MinimalisticIcons.Search className="h-6 w-6 text-feature-blue" size={24} />,
      title: "Quick Search",
      description: "Get instant AI-powered answers to your questions",
      cost: "1 credit"
    },
    {
      icon: <MinimalisticIcons.Research className="h-6 w-6 text-feature-purple" size={24} />,
      title: "Deep Research",
      description: "Comprehensive analysis with detailed insights",
      cost: "2 credits"
    },
    {
      icon: <MinimalisticIcons.Image className="h-6 w-6 text-feature-green" size={24} />,
      title: "Image Generation",
      description: "Create stunning AI-generated images from text",
      cost: "1 credit"
    },
    {
      icon: <MinimalisticIcons.Check className="h-6 w-6 text-feature-orange" size={24} />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security",
      cost: "Free"
    }
  ];

  return (
    <div className={`${showLandingContent ? 'min-h-screen bg-gradient-hero relative overflow-hidden' : 'h-screen bg-background'}`}>
      {/* Animated Background - Only show on landing page */}
      {showLandingContent && (
        <>
          <AnimatedBackground particleCount={60} interactive={true} />
          <FloatingShapes count={10} />
        </>
      )}
      
      <div className={`${showLandingContent ? 'container mx-auto px-4 py-12 relative z-10' : ''}`}>
        {/* Hero Section */}
        {showLandingContent && (
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer">
                <MinimalisticIcons.Business 
                  className="h-16 w-16 text-gradient transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" 
                  size={64} 
                />
                <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 animate-ping bg-primary/10 rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-foreground animate-fade-in-up">
              Supercharge Your Work with{' '}
              <span className="text-gradient animate-shimmer bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] bg-clip-text text-transparent">
                Pulse AI
              </span>{' '}
              🚀
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
              Get instant AI-powered answers, deep research insights, and generate stunning images. 
              All with a simple, credit-based system that scales with your needs.
            </p>

            {user ? (
              <div className="space-y-4 animate-fade-in-up animation-delay-400">
                <div className="flex items-center justify-center gap-4 mb-6">
                  {credits && (
                    <div className="credit-badge text-lg px-4 py-2 animate-bounce-gentle hover:scale-105 transition-transform duration-300">
                      <MinimalisticIcons.Credits className="h-5 w-5 mr-2" size={20} />
                      {credits.current_credits} credits available
                    </div>
                  )}
                  <Badge variant="secondary" className="text-sm px-3 py-1 hover:scale-105 transition-transform duration-300">
                    {subscription?.name || 'Free Plan'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
                <Button 
                  size="lg" 
                  className="btn-hero group overflow-hidden relative" 
                  onClick={() => navigate('/auth')}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <MinimalisticIcons.Business className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" size={20} />
                  Get Started Free
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="hover:scale-105 transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                  onClick={() => navigate('/plans')}
                >
                  <MinimalisticIcons.Credits className="mr-2 h-5 w-5" size={20} />
                  View Plans
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search Interface for authenticated users */}
        {user && (
          <div className={`${showLandingContent ? 'mb-16' : 'h-screen'}`}>
            <SearchInterface onResultsChange={handleResultsChange} />
          </div>
        )}

        {/* Features Section */}
        {showLandingContent && (
          <div className="mb-16">
            <div className="text-center mb-12 animate-fade-in-up animation-delay-600">
              <h2 className="text-3xl font-bold mb-4 text-foreground">🔥 Powerful AI Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to boost your productivity with artificial intelligence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="card-glass group hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4 group-hover:animate-bounce-gentle">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                    <Badge 
                      variant={feature.cost === "Free" ? "secondary" : "outline"}
                      className="group-hover:scale-110 transition-transform duration-300"
                    >
                      {feature.cost}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        {!user && showLandingContent && (
          <div className="text-center bg-gradient-card p-8 rounded-2xl border border-border/50 animate-fade-in-up animation-delay-1200 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground">🎯 Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of users already using Pulse AI to supercharge their productivity
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="btn-hero group overflow-hidden relative" 
                onClick={() => navigate('/auth')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10">Start Free with 10 Credits</span>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="hover:scale-105 transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                onClick={() => navigate('/plans')}
              >
                View Pricing Plans
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 opacity-70 hover:opacity-100 transition-opacity duration-300">
              No credit card required • Get started in seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
