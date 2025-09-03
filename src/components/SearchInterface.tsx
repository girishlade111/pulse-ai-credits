import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MinimalisticIcons } from '@/components/ui/minimalistic-icons';
import { 
  Loader2, 
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Send,
  Copy,
  Check,
  RotateCcw,
  Download,
  Menu,
  X,
  Home,
  History,
  MessageSquarePlus,
  User,
  Crown,
  Settings,
  UserCircle,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Code,
  FileType,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string; // For text files
  url?: string; // For preview
}

interface SearchResult {
  id: string;
  query: string;
  result: string;
  request_type: 'quick_search' | 'deep_research' | 'image_generation' | 'pro_search' | 'task' | 'deep_research_8x' | 'find_all';
  credits_used: number;
  created_at: string;
  attachments?: AttachedFile[];
}

interface SearchInterfaceProps {
  onResultsChange?: (hasResults: boolean) => void;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onResultsChange }) => {
  const { user, credits, subscription, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedMode, setSelectedMode] = useState('quick_search');
  const [hasResults, setHasResults] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [copiedResults, setCopiedResults] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<SearchResult[]>([]);
  const [resultCounter, setResultCounter] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const searchOptions = [
    {
      id: 'quick_search',
      name: 'Quick Search',
      icon: MinimalisticIcons.Search,
      credits: 1,
      description: 'Fast AI-powered search',
      placeholder: 'Ask a quick question...'
    },
    {
      id: 'deep_research',
      name: 'Deep Research',
      icon: MinimalisticIcons.Research,
      credits: 2,
      description: 'Comprehensive research analysis',
      placeholder: 'Topic for deep research...'
    },
    {
      id: 'image_generation',
      name: 'Generate Image',
      icon: MinimalisticIcons.Image,
      credits: 1,
      description: 'AI image generation',
      placeholder: 'Describe the image you want...'
    },
    {
      id: 'pro_search',
      name: 'Pro Search',
      icon: MinimalisticIcons.Pro,
      credits: 3,
      description: 'Advanced search with multiple sources',
      placeholder: 'Professional search query...'
    },
    {
      id: 'task',
      name: 'Task',
      icon: MinimalisticIcons.Check,
      credits: 10,
      description: 'AI task execution and planning',
      placeholder: 'Describe the task...'
    },
    {
      id: 'deep_research_8x',
      name: '8x Deep Research',
      icon: MinimalisticIcons.Research,
      credits: 40,
      description: 'Ultra-comprehensive research',
      placeholder: 'Complex research topic...'
    },
    {
      id: 'find_all',
      name: 'Find All',
      icon: MinimalisticIcons.Search,
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

  const copyToClipboard = async (text: string, resultId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResults(prev => new Set([...prev, resultId]));
      toast.success('Response copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedResults(prev => {
          const newSet = new Set(prev);
          newSet.delete(resultId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const exportToTxt = (content: string, query: string, requestType: string) => {
    // Convert formatted content to plain text with proper formatting
    const formattedContent = content
      .split('\n')
      .map(line => {
        // Headers
        if (line.startsWith('# ')) {
          return `\n${'='.repeat(50)}\n${line.substring(2).toUpperCase()}\n${'='.repeat(50)}\n`;
        }
        if (line.startsWith('## ')) {
          return `\n${line.substring(3).toUpperCase()}:\n${'-'.repeat(line.length + 1)}`;
        }
        
        // Bullet points
        if (line.startsWith('• ')) {
          const content = line.substring(2);
          // Remove markdown bold formatting for plain text
          const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1');
          return `  • ${cleanContent}`;
        }
        
        // Regular text
        return line;
      })
      .join('\n');

    const timestamp = new Date().toLocaleString();
    const filename = `${requestType.replace('_', '-')}-${query.substring(0, 30).replace(/[^a-z0-9]/gi, '-')}.txt`;
    
    const fileContent = `AI ASSISTANT RESPONSE\n${'='.repeat(50)}\n\nQuery: ${query}\nRequest Type: ${requestType.replace('_', ' ').toUpperCase()}\nGenerated: ${timestamp}\n\n${formattedContent}\n\n${'='.repeat(50)}\nExported from Pulse AI Assistant\nCopyright © ${new Date().getFullYear()}`;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Response exported successfully!');
  };

  const retrySearch = (query: string, requestType: string) => {
    setQuery(query);
    setSelectedMode(requestType);
    handleSearch(requestType as any);
  };

  // File handling functions
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileType;
    if (fileType.includes('text') || fileType.includes('txt')) return FileText;
    if (fileType.includes('javascript') || fileType.includes('typescript') || 
        fileType.includes('python') || fileType.includes('java') || 
        fileType.includes('cpp') || fileType.includes('c++') || 
        fileType.includes('html') || fileType.includes('css') || 
        fileType.includes('json') || fileType.includes('xml')) return Code;
    return FileText;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('text') || fileType.includes('txt')) return 'Text';
    if (fileType.includes('javascript')) return 'JavaScript';
    if (fileType.includes('typescript')) return 'TypeScript';
    if (fileType.includes('python')) return 'Python';
    if (fileType.includes('java')) return 'Java';
    if (fileType.includes('cpp') || fileType.includes('c++')) return 'C++';
    if (fileType.includes('html')) return 'HTML';
    if (fileType.includes('css')) return 'CSS';
    if (fileType.includes('json')) return 'JSON';
    if (fileType.includes('xml')) return 'XML';
    return 'File';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
      'application/pdf', 'application/json', 'application/xml',
      'application/javascript', 'application/typescript',
      'text/x-python', 'text/x-java-source', 'text/x-c++src'
    ];

    if (file.size > maxSize) {
      toast.error(`File size too large. Maximum size is 10MB.`);
      return false;
    }

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|js|ts|py|java|cpp|html|css|json|xml|md)$/i)) {
      toast.error('File type not supported. Supported: images, text, PDF, and code files.');
      return false;
    }

    return true;
  };

  const processFile = async (file: File): Promise<AttachedFile> => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const attachedFile: AttachedFile = {
      id: fileId,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    };

    // For text files, read content
    if (file.type.startsWith('text/') || file.name.match(/\.(txt|js|ts|py|java|cpp|html|css|json|xml|md)$/i)) {
      try {
        const content = await file.text();
        attachedFile.content = content;
      } catch (error) {
        console.error('Error reading file content:', error);
      }
    }

    // For images, create preview URL
    if (file.type.startsWith('image/')) {
      attachedFile.url = URL.createObjectURL(file);
    }

    return attachedFile;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      if (!validateFile(file)) continue;
      
      if (attachedFiles.length >= 5) {
        toast.error('Maximum 5 files allowed per message');
        break;
      }

      try {
        const processedFile = await processFile(file);
        setAttachedFiles(prev => [...prev, processedFile]);
        toast.success(`${file.name} attached successfully`);
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      if (!validateFile(file)) continue;
      
      if (attachedFiles.length >= 5) {
        toast.error('Maximum 5 files allowed per message');
        break;
      }

      try {
        const processedFile = await processFile(file);
        setAttachedFiles(prev => [...prev, processedFile]);
        toast.success(`${file.name} attached successfully`);
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachedFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId);
      const removedFile = prev.find(file => file.id === fileId);
      if (removedFile?.url) {
        URL.revokeObjectURL(removedFile.url);
      }
      return updated;
    });
    toast.success('File removed');
  };

  const openAttachmentDialog = () => {
    fileInputRef.current?.click();
  };

  const startNewChat = () => {
    // Save current conversation to history if there are results
    if (results.length > 0) {
      setChatHistory(prev => [...results, ...prev]);
    }
    
    // Reset chat state but keep in chat mode
    setResults([]);
    setQuery('');
    
    // Clear attachments and revoke URLs
    attachedFiles.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    setAttachedFiles([]);
    
    // Keep hasResults as true to maintain full-screen chat mode
    // Don't call onResultsChange(false) to avoid reverting to landing page
    
    // Close sidebar on mobile
    setIsSidebarOpen(false);
    
    toast.success('New chat started!');
  };

  const navigateToHome = () => {
    // Save current conversation to history if there are results
    if (results.length > 0) {
      setChatHistory(prev => [...results, ...prev]);
    }
    
    // Reset to home state
    setResults([]);
    setHasResults(false);
    setQuery('');
    onResultsChange?.(false);
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Scroll to bottom when new results are added to show latest message
  React.useEffect(() => {
    if (results.length > 0 && scrollRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [results.length]);

  // Handle scroll detection to improve UX
  React.useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
        
        // Update auto-scroll behavior based on user position
        if (!isAtBottom) {
          // User has scrolled up to view older messages
          // We could add logic here to disable auto-scroll if needed
        }
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [hasResults]);

  // Handle clipboard paste for images
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste when chat input is focused or no specific element is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      
      if (!isInputFocused && activeElement?.tagName !== 'BODY') {
        return; // Don't handle paste if another input is focused
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if the item is an image
        if (item.type.startsWith('image/')) {
          e.preventDefault(); // Prevent default paste behavior
          setIsPasting(true); // Show paste feedback
          
          const file = item.getAsFile();
          if (!file) {
            setIsPasting(false);
            continue;
          }

          // Check if we already have maximum files
          if (attachedFiles.length >= 5) {
            toast.error('Maximum 5 files allowed per message');
            setIsPasting(false);
            return;
          }

          // Validate the image file
          if (!validateFile(file)) {
            setIsPasting(false);
            return;
          }

          try {
            // Create a new filename for pasted image
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = file.type.split('/')[1] || 'png';
            const pastedFileName = `pasted-image-${timestamp}.${extension}`;
            
            // Create a new File object with the custom name
            const renamedFile = new File([file], pastedFileName, { type: file.type });
            
            const processedFile = await processFile(renamedFile);
            setAttachedFiles(prev => [...prev, processedFile]);
            toast.success(`Image pasted successfully!`);
          } catch (error) {
            console.error('Error processing pasted image:', error);
            toast.error('Failed to process pasted image');
          } finally {
            setIsPasting(false);
          }
          
          break; // Only process the first image found
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Show a helpful message when user presses Ctrl+V but has no image in clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Brief visual feedback to indicate paste functionality is available
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputFocused && activeElement?.tagName !== 'BODY') {
          return;
        }
        
        // Check if there's any image data in clipboard (this will be handled by paste event)
        // This is just for providing feedback about the functionality
        setTimeout(() => {
          if (!isPasting) {
            // No image was pasted, show helpful message
            toast.info('Copy an image and paste it here (Ctrl+V) to attach it to your message');
          }
        }, 100);
      }
    };

    // Add event listeners to document
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attachedFiles, isPasting, validateFile, processFile]);

  const formatAIResponse = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Headers (lines starting with #)
        if (line.startsWith('# ')) {
          return <h2 key={index} className="text-lg font-bold text-foreground mb-3 mt-4 first:mt-0">{line.substring(2)}</h2>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={index} className="text-base font-semibold text-foreground mb-2 mt-3">{line.substring(3)}</h3>;
        }
        
        // Bullet points (lines starting with •)
        if (line.startsWith('• ')) {
          const content = line.substring(2);
          const boldMatch = content.match(/\*\*(.*?)\*\*(.*)/);
          if (boldMatch) {
            return (
              <li key={index} className="ml-4 mb-1 text-foreground text-sm leading-relaxed">
                <span className="font-semibold text-primary">{boldMatch[1]}</span>
                <span>{boldMatch[2]}</span>
              </li>
            );
          }
          return <li key={index} className="ml-4 mb-1 text-foreground text-sm leading-relaxed">{content}</li>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular text
        return <p key={index} className="text-foreground text-sm leading-relaxed mb-2">{line}</p>;
      })
      .filter(Boolean);
  };

  const handleSearch = React.useCallback(async (requestType: 'quick_search' | 'deep_research' | 'image_generation' | 'pro_search' | 'task' | 'deep_research_8x' | 'find_all') => {
    if (!user) {
      toast.error('Please sign in to use AI features');
      return;
    }

    // Check if user is on Business plan for premium features
    const premiumFeatures = ['deep_research_8x', 'find_all'];
    if (premiumFeatures.includes(requestType) && subscription?.plan_type !== 'business') {
      toast.error('8x Deep Research and Find All features are exclusive to Business plan users. Please upgrade to access these premium features.');
      return;
    }

    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    const creditsRequired = creditCosts[requestType];
    if (!credits || credits.current_credits < creditsRequired) {
      // Show appropriate popup based on user's subscription status
      if (!subscription || subscription.plan_type === 'free') {
        setShowUpgradeDialog(true);
      } else {
        setShowTopupDialog(true);
      }
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

      // Mock AI response based on request type with proper formatting
      let mockResult = '';
      
      // Analyze attached files if present
      let fileAnalysis = '';
      if (attachedFiles.length > 0) {
        fileAnalysis = '\n\n## 📎 Attached Files Analysis:\n';
        
        for (const file of attachedFiles) {
          fileAnalysis += `\n### ${file.name}\n`;
          fileAnalysis += `• **File Type**: ${getFileTypeLabel(file.type)}\n`;
          fileAnalysis += `• **Size**: ${formatFileSize(file.size)}\n`;
          
          // Analyze based on file type
          if (file.type.startsWith('image/')) {
            fileAnalysis += `• **Analysis**: Image file detected - visual content available for analysis\n`;
            fileAnalysis += `• **Format**: ${file.type.split('/')[1].toUpperCase()} image format\n`;
            fileAnalysis += `• **Usage**: This image can be analyzed for visual elements, text content (OCR), objects, colors, and composition\n`;
          } else if (file.content) {
            // Analyze text-based files
            const lines = file.content.split('\n').length;
            const chars = file.content.length;
            const words = file.content.trim().split(/\s+/).length;
            
            fileAnalysis += `• **Content Stats**: ${lines} lines, ${words} words, ${chars} characters\n`;
            
            if (file.type.includes('javascript') || file.name.endsWith('.js')) {
              fileAnalysis += `• **Code Analysis**: JavaScript file - functions, variables, and logic structure analyzed\n`;
              // Simple function detection
              const functions = (file.content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|\w+\s*=>|class\s+\w+/g) || []).length;
              fileAnalysis += `• **Functions/Classes Found**: ~${functions} code structures detected\n`;
            } else if (file.type.includes('python') || file.name.endsWith('.py')) {
              fileAnalysis += `• **Code Analysis**: Python file - classes, functions, and imports analyzed\n`;
              const functions = (file.content.match(/def\s+\w+|class\s+\w+/g) || []).length;
              const imports = (file.content.match(/^import\s|^from\s/gm) || []).length;
              fileAnalysis += `• **Functions/Classes**: ${functions} definitions found\n`;
              fileAnalysis += `• **Imports**: ${imports} import statements\n`;
            } else if (file.type.includes('html')) {
              fileAnalysis += `• **Markup Analysis**: HTML structure and elements analyzed\n`;
              const tags = (file.content.match(/<\w+/g) || []).length;
              fileAnalysis += `• **HTML Elements**: ~${tags} tags detected\n`;
            } else if (file.type.includes('css')) {
              fileAnalysis += `• **Style Analysis**: CSS rules and selectors analyzed\n`;
              const rules = (file.content.match(/\{[^}]*\}/g) || []).length;
              fileAnalysis += `• **CSS Rules**: ~${rules} style rules found\n`;
            } else if (file.type.includes('json')) {
              try {
                const parsed = JSON.parse(file.content);
                fileAnalysis += `• **JSON Analysis**: Valid JSON structure with ${Object.keys(parsed).length} top-level properties\n`;
              } catch {
                fileAnalysis += `• **JSON Analysis**: File appears to be JSON but may have syntax issues\n`;
              }
            } else {
              // Generic text file analysis
              if (file.content.length > 0) {
                const preview = file.content.substring(0, 150).replace(/\n/g, ' ');
                fileAnalysis += `• **Content Preview**: "${preview}${file.content.length > 150 ? '...' : ''}"\n`;
              }
            }
          } else if (file.type === 'application/pdf') {
            fileAnalysis += `• **Analysis**: PDF document - text content and structure can be analyzed\n`;
            fileAnalysis += `• **Content**: Document text, headings, and formatting available for review\n`;
          }
        }
        
        fileAnalysis += '\n**AI Integration**: All attached files have been processed and their content is available for analysis, questions, and discussion.\n';
      }
      switch (requestType) {
        case 'quick_search':
          mockResult = `# Quick Search Results for "${query}"

## Key Findings:
• **Direct Answer**: Fast AI-powered response with immediate insights
• **Relevant Information**: Key details and context about your query
• **Quick Facts**: Essential information you need to know

## Summary:
This is a comprehensive yet concise response that provides you with the most important information related to your search query.${fileAnalysis}`;
          break;
        case 'deep_research':
          mockResult = `# Deep Research Analysis: "${query}"

## Executive Summary:
• **Comprehensive Analysis**: In-depth examination with multiple perspectives
• **Source Verification**: Cross-referenced information from reliable sources
• **Detailed Insights**: Thorough analysis with supporting evidence

## Key Findings:
• **Primary Research**: Main discoveries and conclusions
• **Supporting Data**: Statistical information and trends
• **Expert Opinions**: Professional insights and recommendations
• **Related Topics**: Connected subjects for further exploration

## Conclusion:
Detailed research provides comprehensive understanding with actionable insights and recommendations for next steps.${fileAnalysis}`;
          break;
        case 'image_generation':
          mockResult = `# Image Generation Complete: "${query}"

## Generated Content:
• **High-Quality Image**: AI-generated visual based on your description
• **Style Applied**: Professional rendering with optimal resolution
• **Format Details**: PNG format, 1024x1024 resolution

## Image Specifications:
• **Prompt Used**: ${query}
• **Generation Time**: ~30 seconds
• **Quality**: High-definition output
• **Usage Rights**: Full commercial license included

## Next Steps:
• Download and use immediately
• Request variations if needed
• Generate additional images with modified prompts${fileAnalysis}`;
          break;
        case 'pro_search':
          mockResult = `# Pro Search Results: "${query}"

## Curated Sources:
• **Top-Ranked URLs**: Most relevant and authoritative sources
• **Expert Content**: Professional articles and research papers
• **Recent Updates**: Latest information and developments
• **Verified Sources**: Fact-checked and reliable references

## Search Analytics:
• **Sources Analyzed**: 50+ high-quality websites
• **Relevance Score**: 95% match to your query
• **Authority Rating**: Premium sources only
• **Freshness**: Content from last 30 days prioritized

## Recommended Actions:
• Review top sources for detailed information
• Follow up with specific questions
• Save important references for later use${fileAnalysis}`;
          break;
        case 'task':
          mockResult = `# Task Execution Plan: "${query}"

## Task Breakdown:
• **Step 1**: Initial analysis and requirement gathering
• **Step 2**: Resource identification and preparation
• **Step 3**: Implementation and execution phases
• **Step 4**: Quality assurance and testing
• **Step 5**: Final delivery and documentation

## Timeline & Resources:
• **Estimated Duration**: 2-4 hours
• **Required Tools**: Automated systems and databases
• **Success Metrics**: Completion rate, accuracy, efficiency
• **Deliverables**: Comprehensive results with documentation

## Next Steps:
• Monitor progress through dashboard
• Receive notifications at key milestones
• Review final output and provide feedback${fileAnalysis}`;
          break;
        case 'deep_research_8x':
          mockResult = `# 8x Deep Research Report: "${query}"

## Research Methodology:
• **Multi-Source Analysis**: 8 comprehensive research streams
• **Cross-Validation**: Information verified across multiple sources
• **Expert Review**: Professional analysis and interpretation
• **Structured Approach**: Systematic investigation methodology

## Detailed Findings:
• **Market Analysis**: Current trends and future projections
• **Competitive Landscape**: Key players and market positioning
• **Technical Specifications**: Detailed technical documentation
• **Case Studies**: Real-world examples and success stories
• **Risk Assessment**: Potential challenges and mitigation strategies
• **Opportunities**: Emerging trends and growth areas
• **Recommendations**: Strategic advice and action items
• **Implementation Guide**: Step-by-step execution plan

## Comprehensive Insights:
Ultra-detailed analysis providing enterprise-level research with actionable intelligence and strategic recommendations for informed decision-making.${fileAnalysis}`;
          break;
        case 'find_all':
          mockResult = `# Find All - Complete Dataset: "${query}"

## Dataset Overview:
• **Total Records**: 10,000+ comprehensive entries
• **Data Sources**: Multiple databases and repositories
• **Coverage**: Global scope with regional breakdowns
• **Accuracy**: 99.5% verified information

## Data Categories:
• **Primary Data**: Core information and metrics
• **Secondary Data**: Supporting details and context
• **Metadata**: Source attribution and timestamps
• **Classifications**: Organized by relevance and type
• **Relationships**: Connected data points and patterns

## Export Options:
• **CSV Format**: Spreadsheet-compatible data
• **JSON Format**: Developer-friendly structure
• **PDF Report**: Executive summary with visualizations
• **API Access**: Real-time data integration

## Quality Assurance:
• **Data Validation**: Automated accuracy checks
• **Duplicate Removal**: Clean, unique records only
• **Regular Updates**: Refreshed every 24 hours
• **Source Tracking**: Full provenance documentation${fileAnalysis}`;
          break;
      }

      // Add result to local state
      const newResult: SearchResult = {
        id: `${Date.now()}-${resultCounter}`,
        query,
        result: mockResult,
        request_type: requestType,
        credits_used: creditsRequired,
        created_at: new Date().toISOString(),
        attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
      };

      setResultCounter(prev => prev + 1);
      setResults(prevResults => {
        const newResults = [...prevResults, newResult];
        return newResults;
      });
      setQuery('');
      
      // Clear attachments after sending
      attachedFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      setAttachedFiles([]);
      
      setHasResults(true);
      onResultsChange?.(true);
      toast.success(`${requestType.replace('_', ' ')} completed! ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''} used.`);

      // Refresh user data to update credits display
      await refreshUserData();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  }, [user, subscription, query, credits, selectedMode, resultCounter, refreshUserData, onResultsChange]);

  const currentOption = searchOptions.find(option => option.id === selectedMode);
  const CurrentIcon = currentOption?.icon || MinimalisticIcons.Search;

  return (
    <div className={`${hasResults ? 'chat-container h-screen flex flex-col' : 'w-full'}`}>
      {/* Sidebar - Only show when chat is active */}
      {hasResults && (
        <>
          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-xl border-r border-border/30 z-50 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center space-x-2">
                <MinimalisticIcons.Business className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">Pulse AI</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Top Navigation */}
            <div className="p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-primary/10 transition-colors"
                onClick={startNewChat}
              >
                <MessageSquarePlus className="h-4 w-4 mr-3" />
                New Chat
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-muted/50 transition-colors"
                onClick={navigateToHome}
              >
                <Home className="h-4 w-4 mr-3" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  // TODO: Implement history view
                  toast.info('History feature coming soon!');
                  setIsSidebarOpen(false);
                }}
              >
                <History className="h-4 w-4 mr-3" />
                History
              </Button>
            </div>
            
            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 border-t border-border/30">
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  navigate('/dashboard');
                  setIsSidebarOpen(false);
                }}
              >
                <User className="h-4 w-4 mr-3" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => {
                  navigate('/plans');
                  setIsSidebarOpen(false);
                }}
              >
                <Crown className="h-4 w-4 mr-3" />
                Upgrade Plan
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  navigate('/settings');
                  setIsSidebarOpen(false);
                }}
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  // TODO: Create Account page
                  toast.info('Account page coming soon!');
                  setIsSidebarOpen(false);
                }}
              >
                <UserCircle className="h-4 w-4 mr-3" />
                Account
              </Button>
            </div>
          </div>
        </>
      )}
      
      {/* Main Content Area */}
      <div className={`${hasResults ? 'flex-1 lg:ml-64' : 'w-full'}`}>
      {/* Results Area - Only show when there are results */}
      {hasResults && results.length > 0 && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto h-full chat-scroll-container" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Hamburger Menu Button */}
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 lg:hidden">
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium text-foreground">Chat</span>
              <div className="w-8" /> {/* Spacer */}
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-8">
            {results.map((result) => {
              const option = searchOptions.find(opt => opt.id === result.request_type);
              const Icon = option?.icon || MinimalisticIcons.Search;
              
              return (
                <div key={result.id} className="space-y-4">
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="max-w-2xl sm:max-w-xl md:max-w-2xl chat-bubble-user rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{option?.name}</span>
                        <Badge variant="secondary" className="text-xs credit-badge">
                          {result.credits_used} credits
                        </Badge>
                      </div>
                      <p className="text-foreground text-sm sm:text-base">{result.query}</p>
                      
                      {/* Display attachments if any */}
                      {result.attachments && result.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-primary/80 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            <span>{result.attachments.length} attachment{result.attachments.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {result.attachments.map((file) => {
                              const FileIcon = getFileIcon(file.type);
                              return (
                                <div key={file.id} className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/20">
                                  <div className="flex-shrink-0">
                                    {file.type.startsWith('image/') && file.url ? (
                                      <div className="w-6 h-6 rounded overflow-hidden">
                                        <img 
                                          src={file.url} 
                                          alt={file.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 flex items-center justify-center">
                                        <FileIcon className="h-3 w-3 text-primary" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-primary/70">
                                      <span>{getFileTypeLabel(file.type)}</span>
                                      <span>•</span>
                                      <span>{formatFileSize(file.size)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-3xl sm:max-w-2xl md:max-w-3xl w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 ai-avatar rounded-full flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">AI Assistant</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(result.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="chat-bubble-ai rounded-2xl p-4">
                        <div className="text-foreground leading-relaxed">
                          {formatAIResponse(result.result)}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-border/30">
                          {/* Try Again Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retrySearch(result.query, result.request_type)}
                            className="h-8 px-3 text-xs action-button-try"
                            disabled={loading}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Try Again
                          </Button>
                          
                          {/* Copy Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.result, result.id)}
                            className="h-8 px-3 text-xs action-button-copy"
                          >
                            {copiedResults.has(result.id) ? (
                              <>
                                <Check className="h-3 w-3 mr-1 text-green-500" />
                                <span className="text-green-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                          
                          {/* Export Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportToTxt(result.result, result.query, result.request_type)}
                            className="h-8 px-3 text-xs action-button-export"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Input - Compact when no results, full screen when has results */}
      <div className={`${hasResults ? 'fixed bottom-0 left-0 right-0 chat-input-fixed bg-background/95 backdrop-blur-xl border-t border-border/30' : 'w-full'}`}>
        <div className={`${hasResults ? 'max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6' : 'max-w-2xl mx-auto px-4'}`}>
          {/* Mode indicator - only show when has results */}
          {hasResults && (
            <div className="text-center mb-3">
              <p className="text-xs text-muted-foreground">
                {currentOption?.name} • {currentOption?.credits} credit{(currentOption?.credits || 0) > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.js,.ts,.py,.java,.cpp,.html,.css,.json,.xml,.md,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div 
              className={`relative flex items-center search-container rounded-2xl ${!hasResults ? 'compact-search' : ''} ${isDragOver || isPasting ? 'border-primary/50 bg-primary/5' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CurrentIcon className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <Input
                placeholder={currentOption?.placeholder || 'Ask anything...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`flex-1 pl-10 sm:pl-12 pr-32 sm:pr-36 ${hasResults ? 'h-11 sm:h-12' : 'h-12 sm:h-14'} text-sm sm:text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0`}
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && query.trim()) {
                    handleSearch(selectedMode as any);
                  }
                }}
                title="Type your message or paste images from clipboard (Ctrl+V)"
              />
              
              {/* Drag/Paste overlay */}
              {(isDragOver || isPasting) && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl border-2 border-dashed border-primary/50 z-10">
                  <div className="text-center">
                    <Paperclip className={`h-6 w-6 text-primary mx-auto mb-2 ${isPasting ? 'animate-pulse' : ''}`} />
                    {isPasting ? (
                      <>
                        <p className="text-sm text-primary font-medium">Processing image...</p>
                        <p className="text-xs text-primary/70">Please wait</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-primary font-medium">Drop files here</p>
                        <p className="text-xs text-primary/70">or paste images (Ctrl+V)</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Attachment Button and Controls */}
              <div className="absolute right-1 sm:right-2 flex items-center gap-1 sm:gap-2">
                {/* Attachment Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openAttachmentDialog}
                  className={`${hasResults ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8 sm:h-10 sm:w-10'} p-0 rounded-lg hover:bg-muted/50 transition-colors`}
                  disabled={loading}
                  title="Attach files (click) or paste images (Ctrl+V)"
                >
                  <Paperclip className={`${hasResults ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'} text-muted-foreground hover:text-foreground transition-colors`} />
                </Button>
                
                {/* Mode Selector */}
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger className={`${hasResults ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-10 sm:h-10'} mode-selector rounded-lg p-0 border-0`}>
                    <CurrentIcon className={`${hasResults ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'} text-muted-foreground`} />
                  </SelectTrigger>
                  <SelectContent className="w-64 dropdown-content rounded-xl">
                    {searchOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem 
                          key={option.id} 
                          value={option.id}
                          className="dropdown-item rounded-lg m-1"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate">{option.name}</span>
                                <Badge variant="secondary" className="text-xs ml-2 credit-badge">
                                  {option.credits}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {/* Send Button */}
                <Button
                  onClick={() => handleSearch(selectedMode as any)}
                  disabled={loading || !user || !query.trim()}
                  size="sm"
                  className={`${hasResults ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8 sm:h-10 sm:w-10'} p-0 send-button rounded-lg`}
                >
                  {loading ? (
                    <Loader2 className={`${hasResults ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'} animate-spin`} />
                  ) : (
                    <Send className={`${hasResults ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Attachments Preview */}
            {attachedFiles.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} attached</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {attachedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/30 group hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                          {file.type.startsWith('image/') && file.url ? (
                            <div className="w-8 h-8 rounded overflow-hidden">
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded border border-primary/20">
                              <FileIcon className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getFileTypeLabel(file.type)}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(file.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          title="Remove file"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground text-center opacity-60 paste-hint">
                    💡 Tip: Paste images from clipboard (Ctrl+V) or drag & drop files
                  </p>
                </div>
              )
            )}
          </div>

          {/* Credits Check - only show when chat is active */}
          {hasResults && user && credits && credits.current_credits < (currentOption?.credits || 0) && (
            <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl max-w-sm sm:max-w-md mx-auto mt-3 sm:mt-4">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive text-center">
                Need {currentOption?.credits} credits • Have {credits.current_credits}
              </span>
            </div>
          )}

          {/* General Credits Warning - only show when chat is active */}
          {hasResults && user && credits && credits.current_credits < 5 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-xl max-w-sm sm:max-w-md mx-auto mt-3 sm:mt-4">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="text-xs text-warning text-center">
                Low credits: {credits.current_credits} remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Plan Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinimalisticIcons.Credits className="h-5 w-5 text-primary" />
              Credits Exhausted
            </DialogTitle>
            <DialogDescription>
              You've run out of credits! Upgrade to a paid plan to continue using AI features with more credits and exclusive benefits.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { navigate('/plans'); setShowUpgradeDialog(false); }} className="btn-hero">
              <MinimalisticIcons.Pro className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top-up Credits Dialog */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinimalisticIcons.Credits className="h-5 w-5 text-primary" />
              Need More Credits?
            </DialogTitle>
            <DialogDescription>
              You've used all your credits! Purchase additional credits to continue using AI features at discounted rates for your plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { navigate('/plans'); setShowTopupDialog(false); }} className="btn-hero">
              <MinimalisticIcons.Credits className="mr-2 h-4 w-4" />
              Buy More Credits
            </Button>
            <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
              Not Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};