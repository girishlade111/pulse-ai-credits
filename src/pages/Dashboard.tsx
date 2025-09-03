import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MinimalisticIcons } from '@/components/ui/minimalistic-icons';
import { 
  CreditCard, 
  TrendingUp, 
  Activity, 
  Zap,
  ArrowUpRight,
  Calendar,
  Search,
  ImageIcon,
  Loader2
} from 'lucide-react';

interface CreditTransaction {
  id: string;
  transaction_type: string;
  request_type?: string;
  credits_amount: number;
  description: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, profile, credits, subscription, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchTransactions();
    }
  }, [user, loading, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getTransactionIcon = (requestType?: string, transactionType?: string) => {
    if (transactionType === 'topup' || transactionType === 'plan_credit') {
      return <MinimalisticIcons.Credits className="h-4 w-4 text-feature-green" />;
    }
    
    switch (requestType) {
      case 'image_generation': return <MinimalisticIcons.Image className="h-4 w-4 text-feature-green" />;
      case 'deep_research': return <MinimalisticIcons.Research className="h-4 w-4 text-feature-purple" />;
      case 'normal_search': return <MinimalisticIcons.Search className="h-4 w-4 text-feature-blue" />;
      default: return <MinimalisticIcons.Check className="h-4 w-4 text-feature-orange" />;
    }
  };

  const getTransactionColor = (transactionType: string) => {
    return transactionType === 'deduction' ? 'text-destructive' : 'text-success';
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            🎉 Welcome back, {profile?.full_name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your AI usage overview and account details
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Credits */}
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Credits</CardTitle>
              <CreditCard className="h-4 w-4 text-feature-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-feature-green">{credits?.current_credits || 0}</div>
              <p className="text-xs text-muted-foreground">
                Available for AI requests
              </p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-feature-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-feature-blue">{credits?.total_earned_credits || 0}</div>
              <p className="text-xs text-muted-foreground">
                Lifetime total earned
              </p>
            </CardContent>
          </Card>

          {/* Total Used */}
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <Activity className="h-4 w-4 text-feature-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-feature-purple">{credits?.total_spent_credits || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total AI requests made
              </p>
            </CardContent>
          </Card>

          {/* Current Plan */}
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Zap className="h-4 w-4 text-feature-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-feature-orange">{subscription?.name || 'Free Plan'}</div>
              <p className="text-xs text-muted-foreground">
                {subscription?.can_topup ? 'Top-ups available' : 'Upgrade for top-ups'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card className="card-glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">📊 Recent Activity</CardTitle>
                  <CardDescription>Your latest AI requests and credit transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchTransactions}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MinimalisticIcons.Check className="h-8 w-8 mx-auto mb-2 text-feature-blue opacity-50" />
                  <p>No activity yet</p>
                  <p className="text-sm">Start using <span className="text-feature-purple font-medium">AI features</span> to see your activity here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.request_type, transaction.transaction_type)}
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={transaction.transaction_type === 'deduction' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.transaction_type === 'deduction' ? '-' : '+'}
                        {transaction.credits_amount} credits
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Plan Management */}
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="text-foreground">📈 Plan Management</CardTitle>
                <CardDescription>Manage your subscription and credits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">{subscription?.name || 'Free Plan'}</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.can_topup ? 'Top-ups available' : 'Upgrade for more features'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/plans')}>
                    <ArrowUpRight className="h-4 w-4 mr-2 text-feature-blue" />
                    {subscription?.plan_type === 'free' ? 'Upgrade' : 'Manage'}
                  </Button>
                </div>
                
                {subscription?.can_topup && (
                  <Button 
                    className="w-full btn-hero" 
                    onClick={() => navigate('/plans')}
                  >
                    <MinimalisticIcons.Credits className="h-4 w-4 mr-2" />
                    <span className="font-medium">Buy More Credits 💳</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Usage Tips */}
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="text-foreground">💡 Usage Tips</CardTitle>
                <CardDescription>Maximize your AI experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 text-feature-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Quick Search</p>
                    <p className="text-xs text-muted-foreground">Use for simple questions - costs only 1 credit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-feature-purple mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Deep Research</p>
                    <p className="text-xs text-muted-foreground">For comprehensive analysis - 5 credits</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ImageIcon className="h-5 w-5 text-feature-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Image Generation</p>
                    <p className="text-xs text-muted-foreground">Create AI images - 1 credit each</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;