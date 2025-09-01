import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Zap, 
  ImageIcon, 
  Loader2, 
  AlertTriangle,
  Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  query: string;
  result: string;
  request_type: 'normal_search' | 'deep_research' | 'image_generation';
  credits_used: number;
  created_at: string;
}

export const SearchInterface: React.FC = () => {
  const { user, credits, refreshUserData } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const creditCosts = {
    normal_search: 1,
    deep_research: 5,
    image_generation: 1,
  };

  const handleSearch = async (requestType: 'normal_search' | 'deep_research' | 'image_generation') => {
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

      // Log transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'deduction',
          request_type: requestType,
          credits_amount: creditsRequired,
          description: `${requestType.replace('_', ' ')} request: ${query.substring(0, 50)}...`
        });

      // Mock AI response based on request type
      let mockResult = '';
      switch (requestType) {
        case 'normal_search':
          mockResult = `Quick search result for "${query}": This is a mock AI response demonstrating the search functionality. In a real implementation, this would connect to your AI service.`;
          break;
        case 'deep_research':
          mockResult = `Deep research analysis for "${query}": This comprehensive analysis would include multiple sources, detailed insights, and thorough examination of the topic. The AI would provide in-depth research with citations and detailed explanations.`;
          break;
        case 'image_generation':
          mockResult = `Image generated for prompt: "${query}". In a real implementation, this would return an actual generated image URL. The image would be created based on your detailed prompt.`;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Input */}
      <Card className="card-glass">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ask anything or describe what you want to generate..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-base"
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleSearch('normal_search')}
                disabled={loading || !user}
                className="flex items-center gap-2"
                variant="default"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Quick Search
                <Badge variant="secondary" className="ml-2">1 credit</Badge>
              </Button>

              <Button
                onClick={() => handleSearch('deep_research')}
                disabled={loading || !user}
                className="flex items-center gap-2"
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Deep Research
                <Badge variant="secondary" className="ml-2">5 credits</Badge>
              </Button>

              <Button
                onClick={() => handleSearch('image_generation')}
                disabled={loading || !user}
                className="flex items-center gap-2"
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                Generate Image
                <Badge variant="secondary" className="ml-2">1 credit</Badge>
              </Button>
            </div>

            {/* Credits warning */}
            {user && credits && credits.current_credits < 5 && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning">
                  Low credits! You have {credits.current_credits} credits remaining.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recent Results
          </h3>
          
          {results.map((result) => (
            <Card key={result.id} className="card-glass">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{result.query}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={result.request_type === 'deep_research' ? 'default' : 'secondary'}>
                      {result.request_type.replace('_', ' ')} • {result.credits_used} credits
                    </Badge>
                  </div>
                  
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-sm leading-relaxed">{result.result}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};