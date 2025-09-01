import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Zap, 
  ImageIcon, 
  Target, 
  CheckSquare, 
  Layers, 
  Globe,
  Clock,
  Sparkles,
  Star,
  Zap as Lightning,
  Timer
} from 'lucide-react';

// Import preview images for advanced features
import deepResearch8xPreview from '@/images/1.png';
import findAllPreview from '@/images/2.png';
import proSearchPreview from '@/images/3.png';
import taskPreview from '@/images/4.png';

const Features: React.FC = () => {
  const features = [
    {
      id: 'quick_search',
      name: 'Quick Search',
      icon: Search,
      credits: 1,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      description: 'Ask anything in your mind - instant AI-powered answers',
      detailedInfo: 'Perfect for when you need immediate answers to any question that comes to mind. Our Quick Search leverages advanced AI algorithms to provide accurate, contextual responses in seconds. Whether you\'re looking for facts, explanations, or quick solutions, this feature delivers reliable information instantly.',
      useCase: 'Best for: Quick answers, instant facts, immediate clarification',
      responseTime: '10-30 seconds',
      executionType: 'Synchronous',
      features: ['Instant AI responses', 'Natural language processing', 'Contextual understanding', 'Real-time results']
    },
    {
      id: 'deep_research',
      name: 'Deep Research',
      icon: Zap,
      credits: 2,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/20',
      description: 'Research on any topic with comprehensive analysis',
      detailedInfo: 'Dive deep into any subject with our comprehensive research engine. This feature conducts thorough investigations, cross-references multiple sources, and provides well-structured, in-depth analysis. Perfect for when you need more than just surface-level information and want detailed insights with proper context.',
      useCase: 'Best for: Quick and in-depth answers, topic exploration, comprehensive understanding',
      responseTime: '30 seconds - 1 minute',
      executionType: 'Synchronous',
      features: ['Multi-source analysis', 'Structured insights', 'Cross-referenced data', 'Comprehensive coverage']
    },
    {
      id: 'image_generation',
      name: 'Generate Image',
      icon: ImageIcon,
      credits: 1,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      description: 'Create any image from your imagination',
      detailedInfo: 'Transform your ideas into stunning visual content using cutting-edge AI image generation technology. Simply describe what you want to see, and our system will create unique, high-quality images tailored to your specifications. From artistic concepts to practical illustrations, bring your vision to life.',
      useCase: 'Best for: Generating images, creative visualization, concept art, marketing materials',
      responseTime: '10-30 seconds (complex images may take up to 1 minute)',
      executionType: 'Synchronous',
      features: ['Text-to-image generation', 'High-quality output', 'Creative flexibility', 'Multiple art styles']
    },
    {
      id: 'pro_search',
      name: 'Pro Search',
      icon: Target,
      credits: 3,
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      description: 'Ranked web URLs with long, relevant content',
      detailedInfo: 'Professional-grade web search that delivers ranked URLs with extensive, relevant content. This tool is specifically optimized for AI agents and provides high-quality, structured web results. Perfect for research that requires specific web sources and detailed content analysis from authoritative websites.',
      useCase: 'Best for: Web search tool calls for AI agents, source verification, professional research',
      responseTime: '< 5 seconds',
      executionType: 'Synchronous',
      features: ['Ranked URL results', 'Long-form content', 'AI agent optimized', 'Source credibility scoring']
    },
    {
      id: 'task',
      name: 'Task',
      icon: CheckSquare,
      credits: 10,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      description: 'Enrich entities with optimized quality & freshness',
      detailedInfo: 'Advanced task automation system designed to enrich lists of entities with the highest quality and most up-to-date information available. This powerful feature is perfect for database enhancement, workflow automation, and systematic data enrichment processes that require precision and reliability.',
      useCase: 'Best for: Database enrichment, repeated workflow automation, entity enhancement',
      responseTime: '10 seconds - 30 minutes',
      executionType: 'Asynchronous',
      features: ['Entity enrichment', 'Quality optimization', 'Fresh data sourcing', 'Workflow automation']
    },
    {
      id: 'deep_research_8x',
      name: '8x Deep Research',
      icon: Layers,
      credits: 40,
      color: 'text-red-400',
      bgColor: 'bg-red-400/20',
      description: 'Research anything deeply with structured outputs',
      detailedInfo: 'Our most comprehensive research solution that provides 8x the depth of standard research. This feature conducts exhaustive investigations with structured, professional-grade outputs. Perfect for academic research, market analysis, strategic planning, and any scenario requiring the highest level of research depth and documentation.',
      useCase: 'Best for: In-depth research on any question, academic papers, strategic analysis',
      responseTime: '4-30 minutes',
      executionType: 'Asynchronous',
      features: ['8x research depth', 'Structured outputs', 'Professional documentation', 'Comprehensive methodology']
    },
    {
      id: 'find_all',
      name: 'Find All',
      icon: Globe,
      credits: 40,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/20',
      description: 'Build comprehensive datasets from the web',
      detailedInfo: 'Create structured, comprehensive datasets by systematically gathering and organizing information from across the web. This powerful tool builds complete databases of entities, compiling relevant information into well-structured formats perfect for analysis, research, and business intelligence applications.',
      useCase: 'Best for: Creating structured datasets of entities, market research, data compilation',
      responseTime: '5-60 minutes',
      executionType: 'Asynchronous',
      features: ['Dataset creation', 'Web-wide data gathering', 'Structured compilation', 'Entity organization']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI-Powered Intelligence at Your Fingertips
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Discover our comprehensive suite of AI-driven tools designed to solve complex challenges 
            with varying levels of depth and sophistication. From instant answers to comprehensive research, 
            each feature is engineered for specific use cases and optimized for maximum efficiency.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lightning className="h-4 w-4 text-primary" />
              <span>7 Specialized AI Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Response Times: 5s to 60min</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span>Credit-Based Pricing</span>
            </div>
          </div>
        </div>

        {/* Basic Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Essential AI Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Perfect for everyday tasks and quick AI assistance. Start here to explore our core capabilities.
            </p>
          </div>

          {/* Basic Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.slice(0, 3).map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.id} className="card-glass hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className={`inline-flex p-4 rounded-full ${feature.bgColor} mb-4`}>
                      <Icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.name}</CardTitle>
                    <Badge className="credit-badge mx-auto">
                      {feature.credits} credit{feature.credits > 1 ? 's' : ''}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-center">
                      {feature.description}
                    </CardDescription>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className="font-medium">{feature.responseTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline" className="text-xs">
                          {feature.executionType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">{feature.useCase}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Advanced Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Advanced AI Solutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools for complex tasks, research, and data analysis. 
              Powered by cutting-edge AI technology.
            </p>
          </div>

          {/* Advanced Features Grid - Consistent Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.slice(3).map((feature, index) => {
              const Icon = feature.icon;
              // Map images to features based on correct assignment
              const imageMap = {
                'pro_search': proSearchPreview,
                'task': taskPreview, 
                'deep_research_8x': deepResearch8xPreview,
                'find_all': findAllPreview
              };
              
              return (
                <div key={feature.id} className="flex flex-col h-full">
                  <Card className="card-glass hover:shadow-lg transition-all duration-300 flex-grow flex flex-col">
                    <CardContent className="p-8 flex flex-col h-full">
                      {/* Feature Info Section - Consistent Height */}
                      <div className="flex flex-col space-y-6" style={{ minHeight: '420px' }}>
                        {/* Header with Icon and Title - Fixed Height */}
                        <div className="flex items-center gap-4 h-20">
                          <div className={`p-4 rounded-xl ${feature.bgColor} flex-shrink-0`}>
                            <Icon className={`h-8 w-8 ${feature.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-foreground leading-tight">{feature.name}</h3>
                            <Badge className="credit-badge mt-2">
                              {feature.credits} credit{feature.credits > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Description - Fixed Height */}
                        <div className="h-24">
                          <p className="text-muted-foreground leading-relaxed text-base line-clamp-4">
                            {feature.detailedInfo}
                          </p>
                        </div>
                        
                        {/* Specifications Grid - Fixed Height */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-32">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Response Time</p>
                                <p className="text-sm text-muted-foreground">{feature.responseTime}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Timer className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Execution Type</p>
                                <Badge variant={feature.executionType === 'Asynchronous' ? 'destructive' : 'default'} className="text-xs mt-1">
                                  {feature.executionType}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Star className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Best For</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{feature.useCase}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Key Features</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{feature.features[0]}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Preview Image Section - Consistent Position and Size for Perfect Alignment */}
                      <div className="mt-auto pt-6 border-t border-border/50">
                        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-primary" />
                          Interface Preview
                        </h4>
                        <div className="w-full h-80 bg-card border border-border/30 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group">
                          <img 
                            src={imageMap[feature.id as keyof typeof imageMap]} 
                            alt={`${feature.name} Interface Preview`}
                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-500 cursor-pointer group-hover:brightness-110 p-4"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.classList.remove('hidden');
                              }
                            }}
                          />
                          <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-muted/50">
                            <div className="text-center space-y-3">
                              <Icon className={`h-16 w-16 ${feature.color} mx-auto`} />
                              <p className="text-lg font-medium text-muted-foreground">
                                Preview Image
                              </p>
                              <p className="text-sm text-muted-foreground/70">
                                {feature.name} Interface
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-3">
                          {feature.name} Working Process Interface
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-16 p-8 bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl">
          <h3 className="text-2xl font-bold mb-4 text-foreground">
            Experience the Future of AI-Powered Solutions
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Begin your journey with our free plan offering 10 trial credits to explore all features. 
            Choose the perfect tool for each task - from lightning-fast queries to comprehensive research datasets. 
            Upgrade to paid plans for bonus credits, monthly resets, and exclusive top-up discounts designed for power users.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 bg-card/50 rounded-lg border border-border/30">
              <h4 className="font-semibold text-foreground mb-2">Free to Start</h4>
              <p className="text-sm text-muted-foreground">10 trial credits included - no setup required</p>
            </div>
            <div className="p-4 bg-card/50 rounded-lg border border-border/30">
              <h4 className="font-semibold text-foreground mb-2">Bonus Credits</h4>
              <p className="text-sm text-muted-foreground">Paid plans include 100% bonus credits monthly</p>
            </div>
            <div className="p-4 bg-card/50 rounded-lg border border-border/30">
              <h4 className="font-semibold text-foreground mb-2">Top-up Discounts</h4>
              <p className="text-sm text-muted-foreground">Pro gets 10% off, Business gets 20% off top-ups</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;