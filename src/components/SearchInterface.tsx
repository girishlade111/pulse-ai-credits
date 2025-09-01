import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Zap, 
  ImageIcon, 
  Loader2, 
  AlertTriangle,
  Sparkles,
  Target,
  CheckSquare,
  Layers,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  query: string;
  result: string;
  request_type: 'quick_search' | 'deep_research' | 'image_generation' | 'pro_search' | 'task' | 'deep_research_8x' | 'find_all';
  credits_used: number;
  created_at: string;
}

export const SearchInterface: React.FC = () => {
  const { user, credits, refreshUserData } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('quick_search');

  const searchOptions = [
    {
      id: 'quick_search',
      name: 'Quick Search',
      icon: Search,
      credits: 1,
      description: 'Fast AI-powered search',
      placeholder: 'Ask a quick question...'
    },
    {
      id: 'deep_research',
      name: 'Deep Research',
      icon: Zap,
      credits: 2,
      description: 'Comprehensive research analysis',
      placeholder: 'Topic for deep research...'
    },
    {
      id: 'image_generation',
      name: 'Generate Image',
      icon: ImageIcon,
      credits: 1,
      description: 'AI image generation',
      placeholder: 'Describe the image you want...'
    },
    {
      id: 'pro_search',
      name: 'Pro Search',
      icon: Target,
      credits: 3,
      description: 'Advanced search with multiple sources',
      placeholder: 'Professional search query...'
    },
    {
      id: 'task',
      name: 'Task',
      icon: CheckSquare,
      credits: 10,
      description: 'AI task execution and planning',
      placeholder: 'Describe the task...'
    },
    {
      id: 'deep_research_8x',
      name: '8x Deep Research',
      icon: Layers,
      credits: 40,
      description: 'Ultra-comprehensive research',
      placeholder: 'Complex research topic...'
    },
    {
      id: 'find_all',
      name: 'Find All',
      icon: Globe,
      credits: 40,
      description: 'Exhaustive search across all sources',
      placeholder: 'Search everything...'
    }
  ];

  const creditCosts = {
    quick_search: 1,
    deep_research: 2,
    image_generation: 1,
    pro_search: 3,
    task: 10,
    deep_research_8x: 40,
    find_all: 40,
  };

  const handleSearch = async (requestType: 'quick_search' | 'deep_research' | 'image_generation' | 'pro_search' | 'task' | 'deep_research_8x' | 'find_all') => {
    if (!user) {
      toast.error('Please sign in to use AI features');
      return;
    }

    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    const creditsRequired = creditCosts[requestType];
    if (!credits || credits.current_credits < creditsRequired) {
      toast.error(`Insufficient credits. You need ${creditsRequired} credits for this request.`);
      return;
    }

    setLoading(true);

    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({
          current_credits: credits.current_credits - creditsRequired,
          total_spent_credits: credits.total_spent_credits + creditsRequired
        })
        .eq('user_id', user.id);

      if (creditError) throw creditError;

      // Log transaction with mapped request type for database compatibility
      const dbRequestTypeMap: Record<string, 'normal_search' | 'deep_research' | 'image_generation'> = {
        'quick_search': 'normal_search',
        'deep_research': 'deep_research',
        'image_generation': 'image_generation',
        'pro_search': 'normal_search',
        'task': 'normal_search',
        'deep_research_8x': 'deep_research',
        'find_all': 'normal_search'
      };

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'deduction',
          request_type: dbRequestTypeMap[requestType],
          credits_amount: creditsRequired,
          description: `${requestType.replace('_', ' ')} request: ${query.substring(0, 50)}...`
        });

      // Mock AI response based on request type
      let mockResult = '';
      switch (requestType) {
        case 'quick_search':
          mockResult = `Quick search result for "${query}": This is a fast AI response with key information and direct answers.`;
          break;
        case 'deep_research':
          mockResult = `Deep research analysis for "${query}": Comprehensive analysis with multiple sources, detailed insights, and thorough examination.`;
          break;
        case 'image_generation':
          mockResult = `Image generated for prompt: "${query}". High-quality AI-generated image based on your detailed description.`;
          break;
        case 'pro_search':
          mockResult = `Pro search results for "${query}": Advanced search with curated sources, expert insights, and professional-grade analysis.`;
          break;
        case 'task':
          mockResult = `Task execution for "${query}": AI-powered task breakdown, planning, and step-by-step execution guidance.`;
          break;
        case 'deep_research_8x':
          mockResult = `8x Deep Research for "${query}": Ultra-comprehensive analysis with extensive sources, detailed methodologies, and expert-level insights.`;
          break;
        case 'find_all':
          mockResult = `Find All results for "${query}": Exhaustive search across all available sources, databases, and knowledge repositories.`;
          break;
      }

      // Add result to local state
      const newResult: SearchResult = {
        id: Date.now().toString(),
        query,
        result: mockResult,
        request_type: requestType,
        credits_used: creditsRequired,
        created_at: new Date().toISOString()
      };

      setResults(prev => [newResult, ...prev]);
      setQuery('');
      toast.success(`${requestType.replace('_', ' ')} completed! ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''} used.`);

      // Refresh user data to update credits display
      await refreshUserData();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  };

  const currentOption = searchOptions.find(option => option.id === activeTab);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Interface with Tabs */}
      <Card className="card-glass">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7 md:grid-cols-4 sm:grid-cols-2 bg-card/50 border border-border/30 p-2 gap-1 h-auto">
              {searchOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <TabsTrigger 
                    key={option.id} 
                    value={option.id}
                    className="flex flex-col items-center gap-2 p-4 h-auto min-h-[90px] data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 transition-all duration-200 hover:bg-muted/50 rounded-lg"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xs font-medium text-center leading-tight break-words">{option.name}</span>
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-1 credit-badge min-w-[40px] justify-center flex-shrink-0"
                    >
                      {option.credits}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab Content */}
            <div className="mt-8">
              {searchOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <TabsContent key={option.id} value={option.id} className="mt-0">
                    <div className="space-y-6">
                      {/* Option Header */}
                      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl">
                        <div className="p-3 bg-primary/20 rounded-xl">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{option.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        </div>
                        <Badge className="credit-badge text-base px-4 py-2">
                          {option.credits} credit{option.credits > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Icon className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder={option.placeholder}
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className="pl-12 h-14 text-base border-2 focus:border-primary/50"
                          disabled={loading}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !loading) {
                              handleSearch(option.id as any);
                            }
                          }}
                        />
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleSearch(option.id as any)}
                        disabled={loading || !user || !query.trim()}
                        className="w-full h-14 btn-hero text-lg font-medium"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin mr-3" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon className="h-6 w-6 mr-3" />
                            Start {option.name}
                          </>
                        )}
                      </Button>

                      {/* Credits Check */}
                      {user && credits && credits.current_credits < option.credits && (
                        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <span className="text-sm text-destructive">
                            Insufficient credits! You need {option.credits} credits but only have {credits.current_credits}.
                          </span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>

          {/* General Credits Warning */}
          {user && credits && credits.current_credits < 5 && (
            <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg mt-6">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">
                Low credits! You have {credits.current_credits} credits remaining.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recent Results
          </h3>
          
          {results.map((result) => {
            const option = searchOptions.find(opt => opt.id === result.request_type);
            const Icon = option?.icon || Search;
            
            return (
              <Card key={result.id} className="card-glass">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="font-medium text-foreground">{result.query}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(result.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge 
                        variant={result.credits_used >= 5 ? 'default' : 'secondary'}
                        className="credit-badge"
                      >
                        {result.request_type.replace('_', ' ')} • {result.credits_used} credits
                      </Badge>
                    </div>
                    
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-sm leading-relaxed">{result.result}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};