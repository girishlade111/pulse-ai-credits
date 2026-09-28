import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { TimelinePill, type TimelineStage } from "@/components/TimelinePill";
import { Wordmark } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileText,
  FileType,
  History,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquarePlus,
  Paperclip,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Code,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
  request_type:
    | "quick_search"
    | "deep_research"
    | "image_generation"
    | "pro_search"
    | "task"
    | "deep_research_8x"
    | "find_all";
  credits_used: number;
  created_at: string;
  attachments?: AttachedFile[];
}

interface SearchInterfaceProps {
  onResultsChange?: (hasResults: boolean) => void;
}

/** Timeline stages each tool walks through — mirrors the marketing surface. */
const STAGES_BY_MODE: Record<string, TimelineStage[]> = {
  quick_search: ["grep", "read", "done"],
  deep_research: ["thinking", "grep", "read", "edit", "done"],
  image_generation: ["thinking", "edit", "done"],
  pro_search: ["grep", "read", "done"],
  task: ["thinking", "read", "edit", "done"],
  deep_research_8x: ["thinking", "grep", "read", "edit", "done"],
  find_all: ["thinking", "grep", "read", "edit", "done"],
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  onResultsChange,
}) => {
  const { user, credits, subscription, refreshUserData, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedMode, setSelectedMode] = useState("quick_search");
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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const searchOptions = [
    {
      id: "quick_search",
      name: "Quick Search",
      icon: MinimalisticIcons.Search,
      credits: 1,
      description: "Fast AI-powered search",
      placeholder: "Ask a quick question...",
    },
    {
      id: "deep_research",
      name: "Deep Research",
      icon: MinimalisticIcons.Research,
      credits: 2,
      description: "Comprehensive research analysis",
      placeholder: "Topic for deep research...",
    },
    {
      id: "image_generation",
      name: "Generate Image",
      icon: MinimalisticIcons.Image,
      credits: 1,
      description: "AI image generation",
      placeholder: "Describe the image you want...",
    },
    {
      id: "pro_search",
      name: "Pro Search",
      icon: MinimalisticIcons.Pro,
      credits: 3,
      description: "Advanced search with multiple sources",
      placeholder: "Professional search query...",
    },
    {
      id: "task",
      name: "Task",
      icon: MinimalisticIcons.Check,
      credits: 10,
      description: "AI task execution and planning",
      placeholder: "Describe the task...",
    },
    {
      id: "deep_research_8x",
      name: "8x Deep Research",
      icon: MinimalisticIcons.Research,
      credits: 40,
      description: "Ultra-comprehensive research",
      placeholder: "Complex research topic...",
    },
    {
      id: "find_all",
      name: "Find All",
      icon: MinimalisticIcons.Search,
      credits: 40,
      description: "Exhaustive search across all sources",
      placeholder: "Search everything...",
    },
  ];

  const creditCosts: Record<string, number> = {
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
      setCopiedResults((prev) => new Set(prev).add(resultId));
      toast.success("Response copied to clipboard");
      setTimeout(() => {
        setCopiedResults((prev) => {
          const next = new Set(prev);
          next.delete(resultId);
          return next;
        });
      }, 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const exportToTxt = (
    content: string,
    query: string,
    requestType: string
  ) => {
    const plainText = content
      .replace(/^# (.*)$/gm, (match, title) => {
        const divider = "=".repeat(50);
        return `${divider}\n${title}\n${divider}`;
      })
      .replace(/^## (.*)$/gm, (match, title) => {
        const underline = "-".repeat(title.length);
        return `\n${title.toUpperCase()}\n${underline}`;
      })
      .replace(/• (.*)$/gm, "  • $1")
      .replace(/\*\*(.*?)\*\*/g, "$1");

    const fileName = `${requestType.replace("_", "-")}-${query
      .substring(0, 30)
      .replace(/[^a-z0-9]/gi, "-")}.txt`;
    const fileContent = `AI ASSISTANT RESPONSE\n${"=".repeat(50)}\n\nQuery: ${query}\nRequest Type: ${requestType}\nGenerated: ${new Date().toLocaleString()}\n\n${"=".repeat(50)}\n\n${plainText}\n\n${"=".repeat(50)}\nExported from Pulse AI Assistant\nCopyright © ${new Date().getFullYear()}`;

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Response exported");
  };

  const retrySearch = (query: string, requestType: SearchResult["request_type"]) => {
    setQuery(query);
    setSelectedMode(requestType);
    handleSearch(requestType);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.includes("pdf")) return FileType;
    if (fileType.includes("text") || fileType.includes("txt")) return FileText;
    if (
      fileType.includes("javascript") ||
      fileType.includes("typescript") ||
      fileType.includes("python") ||
      fileType.includes("java") ||
      fileType.includes("cpp") ||
      fileType.includes("c++") ||
      fileType.includes("html") ||
      fileType.includes("css") ||
      fileType.includes("json") ||
      fileType.includes("xml")
    )
      return Code;
    return FileText;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.startsWith("image/")) return "Image";
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("text") || fileType.includes("txt")) return "Text";
    if (fileType.includes("javascript")) return "JavaScript";
    if (fileType.includes("typescript")) return "TypeScript";
    if (fileType.includes("python")) return "Python";
    if (fileType.includes("java")) return "Java";
    if (fileType.includes("cpp") || fileType.includes("c++")) return "C++";
    if (fileType.includes("html")) return "HTML";
    if (fileType.includes("css")) return "CSS";
    if (fileType.includes("json")) return "JSON";
    if (fileType.includes("xml")) return "XML";
    return "File";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${
      sizes[i] || "Bytes"
    }`;
  };

  const validateFile = React.useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size too large. Maximum size is 10MB.");
      return false;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
      "text/csv",
      "text/html",
      "text/css",
      "text/javascript",
      "application/pdf",
      "application/json",
      "application/xml",
      "application/javascript",
      "application/typescript",
      "text/x-python",
      "text/x-java-source",
      "text/x-c++src",
    ];

    if (!allowedTypes.includes(file.type)) {
      const validExtension = /\.(txt|js|ts|py|java|cpp|html|css|json|xml|md)$/i.test(
        file.name
      );
      if (!validExtension) {
        toast.error(
          "File type not supported. Supported: images, text, PDF, and code files."
        );
        return false;
      }
    }
    return true;
  }, []);

  const processFile = React.useCallback(async (file: File): Promise<AttachedFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = file.type || "application/octet-stream";
    const isTextFile =
      type.startsWith("text/") ||
      type.includes("json") ||
      type.includes("xml") ||
      type.includes("javascript") ||
      type.includes("python") ||
      type.includes("java") ||
      /\.(txt|js|ts|py|java|cpp|html|css|json|xml|md)$/i.test(file.name);

    return {
      id,
      name: file.name,
      type,
      size: file.size,
      content: isTextFile ? await file.text() : undefined,
      url: type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    };
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (attachedFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed per message`);
        break;
      }
      if (!validateFile(file)) continue;
      try {
        const processedFile = await processFile(file);
        setAttachedFiles((prev) => [...prev, processedFile]);
        toast.success(`${file.name} attached`);
      } catch {
        toast.error(`Failed to process ${file.name}`);
      }
    }
    event.target.value = "";
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
      if (attachedFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed per message`);
        break;
      }
      if (!validateFile(file)) continue;
      try {
        const processedFile = await processFile(file);
        setAttachedFiles((prev) => [...prev, processedFile]);
        toast.success(`${file.name} attached`);
      } catch {
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.url) URL.revokeObjectURL(file.url);
      return prev.filter((f) => f.id !== fileId);
    });
    toast.success("File removed");
  };

  const openAttachmentDialog = () => {
    fileInputRef.current?.click();
  };

  const startNewChat = () => {
    if (results.length > 0) {
      setChatHistory((prev) => [...results, ...prev]);
    }
    setResults([]);
    setQuery("");
    attachedFiles.forEach((file) => {
      if (file.url) URL.revokeObjectURL(file.url);
    });
    setAttachedFiles([]);
    // Deliberately keeps hasResults true so the parent does not re-render the
    // landing content mid-session.
    setIsSidebarOpen(false);
    toast.success("New chat started");
  };

  const navigateToHome = () => {
    if (results.length > 0) {
      setChatHistory((prev) => [...results, ...prev]);
    }
    setResults([]);
    setHasResults(false);
    setQuery("");
    onResultsChange?.(false);
    navigate("/");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Auto-scroll to bottom when new results arrive
  React.useEffect(() => {
    if (results.length > 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [results.length]);

  // Scroll detection
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const handleScroll = () => {
      const element = scrollRef.current;
      if (!element) return;
      const isAtBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight < 50;
      // We could add logic here to disable auto-scroll
      void isAtBottom;
    };
    const element = scrollRef.current;
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [hasResults]);

  // Handle paste from clipboard
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "BODY"
      ) {
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          setIsPasting(true);

          const file = item.getAsFile();
          if (!file) {
            setIsPasting(false);
            continue;
          }

          if (attachedFiles.length >= MAX_FILES) {
            toast.error(`Maximum ${MAX_FILES} files allowed per message`);
            setIsPasting(false);
            return;
          }

          if (!validateFile(file)) {
            setIsPasting(false);
            return;
          }

          try {
            const pastedFileName = `pasted-image-${new Date()
              .toISOString()
              .replace(/[:.]/g, "-")}.${file.type.split("/")[1] || "png"}`;
            const pastedFile = new File([file], pastedFileName, {
              type: file.type,
            });
            const processedFile = await processFile(pastedFile);
            setAttachedFiles((prev) => [...prev, processedFile]);
            toast.success("Image pasted");
          } catch (error) {
            console.error("Error processing pasted image:", error);
            toast.error("Failed to process pasted image");
          } finally {
            setIsPasting(false);
          }
          break;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        setTimeout(() => {
          if (!isPasting) {
            toast.info(
              "Copy an image and paste it here (Ctrl+V) to attach it to your message"
            );
          }
        }, 100);
      }
    };

    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachedFiles, isPasting, validateFile, processFile]);

  const formatAIResponse = (text: string) => {
    const lines = text.split("\n");
    const elements = lines.map((line, index) => {
      if (line.startsWith("# ")) {
        return <h2 key={index} className="title-md mt-5 first:mt-0">{line.slice(2)}</h2>;
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} className="section-label mt-5 first:mt-0">
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("• ")) {
        const content = line.slice(2);
        const boldMatch = content.match(/^\*\*(.*?)\*\*\s*(.*)$/);
        if (boldMatch) {
          return (
            <li key={index} className="body-sm flex gap-2.5 text-body">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hairline-strong" />
              <span>
                <span className="title-sm">{boldMatch[1]}</span>
                {boldMatch[2] && ` — ${boldMatch[2]}`}
              </span>
            </li>
          );
        }
        return (
          <li key={index} className="body-sm flex gap-2.5 text-body">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hairline-strong" />
            {content}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={index} className="h-2" />;
      }
      return (
        <p key={index} className="body-sm text-body">
          {line}
        </p>
      );
    });
    return elements.filter(Boolean);
  };

  const handleSearch = React.useCallback(
    async (
      requestType:
        | "quick_search"
        | "deep_research"
        | "image_generation"
        | "pro_search"
        | "task"
        | "deep_research_8x"
        | "find_all"
    ) => {
      if (!user) {
        toast.error("Please sign in to use AI features");
        return;
      }

      // Premium feature gate
      const premiumFeatures = ["deep_research_8x", "find_all"];
      if (premiumFeatures.includes(requestType) && subscription?.plan_type !== "business") {
        toast.error(
          "8x Deep Research and Find All features are exclusive to Business plan users. Please upgrade to access these premium features."
        );
        return;
      }

      if (!query.trim()) {
        toast.error("Please enter a query");
        return;
      }

      const creditsRequired = creditCosts[requestType];
      if (!credits || credits.current_credits < creditsRequired) {
        if (!subscription || subscription.plan_type === "free") {
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
          .from("user_credits")
          .update({
            current_credits: credits.current_credits - creditsRequired,
            total_spent_credits: credits.total_spent_credits + creditsRequired,
          })
          .eq("user_id", user.id);

        if (creditError) throw creditError;

        // Record transaction
        const dbRequestTypeMap: Record<
          string,
          "normal_search" | "deep_research" | "image_generation"
        > = {
          quick_search: "normal_search",
          deep_research: "deep_research",
          image_generation: "image_generation",
          pro_search: "normal_search",
          task: "normal_search",
          deep_research_8x: "deep_research",
          find_all: "normal_search",
        };

        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          transaction_type: "deduction",
          request_type: dbRequestTypeMap[requestType],
          credits_amount: creditsRequired,
          description: `${requestType.replace("_", " ")} request: ${query.substring(
            0,
            50
          )}...`,
        });

        // Build attachment analysis block
        let fileAnalysis = "";
        if (attachedFiles.length > 0) {
          fileAnalysis = "\n\n## 📎 Attached Files Analysis:\n";
          attachedFiles.forEach((file) => {
            const fileLabel = getFileTypeLabel(file.type);
            fileAnalysis += `\n### ${file.name}\n`;
            fileAnalysis += `• **File Type**: ${fileLabel}\n`;
            fileAnalysis += `• **Size**: ${formatFileSize(file.size)}\n`;

            if (file.type.startsWith("image/")) {
              fileAnalysis += `• **Visual content**: Image file ready for visual analysis\n`;
              fileAnalysis += `• **Image format**: ${file.type}\n`;
            } else if (file.type.includes("javascript")) {
              fileAnalysis += `• **Code analysis**: JavaScript file detected\n`;
              fileAnalysis += `• **Lines of code**: ${file.content?.split("\n").length || "N/A"}\n`;
            } else if (file.type.includes("python")) {
              fileAnalysis += `• **Code analysis**: Python file detected\n`;
              fileAnalysis += `• **Lines of code**: ${file.content?.split("\n").length || "N/A"}\n`;
            } else if (file.type.includes("html")) {
              fileAnalysis += `• **Markup analysis**: HTML structure ready for review\n`;
            } else if (file.type.includes("css")) {
              fileAnalysis += `• **Style analysis**: CSS rules ready for review\n`;
            } else if (file.type.includes("json")) {
              fileAnalysis += `• **Data analysis**: JSON structure ready for parsing\n`;
            } else if (file.type.includes("pdf")) {
              fileAnalysis += `• **Document analysis**: PDF ready for text extraction\n`;
            } else if (file.content) {
              fileAnalysis += `• **Content preview**: ${file.content.substring(0, 200)}...\n`;
            }
          });
          fileAnalysis += `\n**AI Integration**: All attached files have been processed and their content is available for analysis, questions, and discussion.\n`;
        }

        // Generate mock result based on request type
        let mockResult = "";
        switch (requestType) {
          case "quick_search":
            mockResult = `# Quick Search Results for "${query}"\n\n## Key Findings:\n\n• **Direct Answer**: The information you requested is readily available and well-documented.\n• **Relevant Information**: Multiple authoritative sources provide consistent data on this topic.\n• **Quick Facts**: Key statistics and dates align with the most recent available records.\n\n## Summary:\n\nThis is a comprehensive yet concise response that provides you with the most important information related to your search query.${fileAnalysis}`;
            break;
          case "deep_research":
            mockResult = `# Deep Research Analysis: "${query}"\n\n## Executive Summary:\n\n• **Comprehensive Analysis**: Detailed investigation reveals a nuanced picture with several distinct perspectives.\n• **Source Verification**: All claims have been cross-referenced against primary sources.\n• **Detailed Insights**: Patterns emerge clearly when examining the data chronologically.\n\n## Key Findings:\n\n• **Primary Research**: Strong evidence supports the main hypothesis.\n• **Supporting Data**: Multiple datasets corroborate the findings.\n• **Expert Opinions**: Specialists broadly agree on the interpretation.\n• **Related Topics**: Adjacent areas provide useful context.\n\n## Conclusion:\n\nDetailed research provides comprehensive understanding with actionable insights and recommendations for next steps.${fileAnalysis}`;
            break;
          case "image_generation":
            mockResult = `# Image Generation Complete: "${query}"\n\n## Generated Content:\n\n• **High-Quality Image**: Generated at production resolution with attention to detail.\n• **Style Applied**: Artistic direction matched to your description.\n• **Format Details**: Optimized for both digital and print use.\n\n## Image Specifications:\n\n• **Prompt Used**: ${query}\n• **Generation Time**: ~30 seconds\n• **Quality**: High fidelity with sharp details\n• **Usage Rights**: Full commercial usage included\n\n## Next Steps:\n\n• Download and use immediately in your project\n• Request variations if you need alternative styles\n• Generate additional images with modified prompts${fileAnalysis}`;
            break;
          case "pro_search":
            mockResult = `# Pro Search Results: "${query}"\n\n## Curated Sources:\n\n• **Primary Sources**: Authoritative documentation and official publications.\n• **Academic References**: Peer-reviewed research relevant to the query.\n• **Industry Reports**: Market data and analysis from recognized institutions.\n• **Technical Sources**: Implementation details and specifications.\n\n## Search Analytics:\n\n• **Sources Analyzed**: 50+ relevant documents\n• **Relevance Score**: 95% precision\n• **Authority Rating**: High confidence sources\n• **Freshness**: Current within the last 12 months\n\n## Recommended Actions:\n\n• Review the primary sources first for authoritative information\n• Cross-reference technical specifications across multiple sources\n• Use academic references for theoretical context${fileAnalysis}`;
            break;
          case "task":
            mockResult = `# Task Execution Plan: "${query}"\n\n## Task Breakdown:\n\n• **Step 1**: Analyze input requirements and define success criteria\n• **Step 2**: Gather and validate source data from authoritative sources\n• **Step 3**: Process and enrich entities with quality checks\n• **Step 4**: Structure the output for direct use in your workflow\n• **Step 5**: Verify output quality and completeness\n\n## Timeline & Resources:\n\n• **Phase 1**: Planning and setup\n• **Phase 2**: Data collection and processing\n• **Phase 3**: Quality assurance\n• **Phase 4**: Final delivery\n\n## Next Steps:\n\n• Review the completed dataset\n• Integrate results into your existing systems\n• Schedule follow-up tasks as needed${fileAnalysis}`;
            break;
          case "deep_research_8x":
            mockResult = `# 8x Deep Research Report: "${query}"\n\n## Research Methodology:\n\n• **Approach**: Eight-phase exhaustive investigation\n• **Scope**: Comprehensive coverage across all relevant domains\n• **Verification**: Multi-source cross-validation at every stage\n• **Documentation**: Full methodology recorded for reproducibility\n\n## Detailed Findings:\n\n• **Finding 1**: Primary evidence strongly supports the initial hypothesis\n• **Finding 2**: Secondary data confirms patterns across regions\n• **Finding 3**: Historical context reveals important nuances\n• **Finding 4**: Comparative analysis highlights divergent outcomes\n• **Finding 5**: Stakeholder perspectives vary meaningfully\n• **Finding 6**: Quantitative data corroborates qualitative findings\n• **Finding 7**: Recent developments shift the interpretation\n• **Finding 8**: Remaining gaps documented for future research\n\n## Comprehensive Insights:\n\nThis report provides exhaustive analysis suitable for strategic decision-making, academic publication, or executive briefing.${fileAnalysis}`;
            break;
          case "find_all":
            mockResult = `# Find All - Complete Dataset: "${query}"\n\n## Dataset Overview:\n\n• **Total Records**: 10,000+ entities compiled\n• **Accuracy**: 99.5% verified accuracy rate\n• **Coverage**: Comprehensive web-wide gathering\n• **Structure**: Ready for direct import\n\n## Data Categories:\n\n• **Primary identifiers** and canonical names\n• **Contact and location data** where publicly available\n• **Classification and categorical attributes\n• **Temporal data** including creation and update timestamps\n• **Source attribution** for every record\n• **Quality scores** on a per-record basis\n• **Relationship mapping** between entities\n• **Confidence indicators** for ambiguous matches\n• **Deduplication results** and merge history\n• **Export-ready formatting** in multiple schemas\n\n## Export Options:\n\n• **CSV**: Comma-separated values for spreadsheets\n• **JSON**: Structured data for applications\n• **PDF**: Formatted report for presentation\n• **API**: Direct integration endpoint\n\n## Quality Assurance:\n\nEvery record has been validated against multiple sources with conflicts flagged rather than silently resolved.${fileAnalysis}`;
            break;
          default:
            mockResult = `# Results for "${query}"\n\n## Analysis\n\n• **Response**: Comprehensive analysis of your query\n• **Confidence**: High confidence in the findings\n• **Sources**: Multiple references consulted\n\n## Summary\n\nDetailed results with actionable insights and recommendations.${fileAnalysis}`;
        }

        const newResult: SearchResult = {
          id: `${Date.now()}-${resultCounter}`,
          query: query,
          result: mockResult,
          request_type: requestType,
          credits_used: creditsRequired,
          created_at: new Date().toISOString(),
          attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
        };

        setResultCounter((prev) => prev + 1);
        setResults((prev) => [...prev, newResult]);
        setQuery("");
        attachedFiles.forEach((file) => {
          if (file.url) URL.revokeObjectURL(file.url);
        });
        setAttachedFiles([]);
        setHasResults(true);
        onResultsChange?.(true);
        toast.success(
          `${requestType.replace("_", " ")} completed. ${creditsRequired} credit${
            creditsRequired > 1 ? "s" : ""
          } used.`
        );

        await refreshUserData();
      } catch (error) {
        console.error("Error processing request:", error);
        toast.error("An error occurred while processing your request");
      } finally {
        setLoading(false);
      }
    },
    [user, subscription, query, credits, selectedMode, resultCounter, refreshUserData, onResultsChange]
  );

  const currentOption = searchOptions.find((option) => option.id === selectedMode);
  const CurrentIcon = currentOption?.icon || MinimalisticIcons.Search;
  const activeStages = STAGES_BY_MODE[selectedMode] || STAGES_BY_MODE.quick_search;

  /* ------------------------------------------------------------------ composer */
  const composer = (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "composer-box px-3 py-2",
          hasResults && "sm:px-4",
          (isDragOver || isPasting) && "border-primary bg-canvas"
        )}
      >
        <CurrentIcon className="ml-1 hidden h-4 w-4 shrink-0 text-muted sm:block" />

        <Input
          ref={inputRef}
          placeholder={currentOption?.placeholder || "Ask anything..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="composer-input border-0"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && query.trim()) {
              handleSearch(selectedMode as SearchResult["request_type"]);
            }
          }}
          title="Type your message, or paste an image with Ctrl+V"
        />

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={openAttachmentDialog}
            disabled={loading}
            title="Attach files, or paste images with Ctrl+V"
            aria-label="Attach files"
          >
            <Paperclip />
          </Button>

          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger
              className={cn(
                "h-9 w-9 shrink-0 border border-hairline bg-canvas-soft p-0",
                "[&>span]:hidden"
              )}
              title={`${currentOption?.name} · ${currentOption?.credits} credit${
                (currentOption?.credits || 0) > 1 ? "s" : ""
              }`}
            >
              <CurrentIcon className="h-4 w-4 text-ink" />
            </SelectTrigger>
            <SelectContent className="w-72">
              {searchOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex w-full items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-ink" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm">{option.name}</span>
                          <span className="caption-upper shrink-0 text-muted-soft">
                            {option.credits}c
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            size="icon"
            onClick={() => handleSearch(selectedMode as SearchResult["request_type"])}
            disabled={loading || !user || !query.trim()}
            aria-label="Send"
            className="h-9 w-9 shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>

        {(isDragOver || isPasting) && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-canvas">
            <div className="text-center">
              <Paperclip className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="title-sm text-primary">
                {isPasting ? "Processing image" : "Drop files here"}
              </p>
              <p className="caption text-muted">
                {isPasting ? "Please wait" : "or paste with Ctrl+V"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* attachments */}
      {attachedFiles.length > 0 ? (
        <div className="mt-3">
          <p className="section-label mb-2">
            {attachedFiles.length} file{attachedFiles.length > 1 ? "s" : ""} attached
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {attachedFiles.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 rounded-md border border-hairline bg-card p-2"
                >
                  <div className="shrink-0">
                    {file.type.startsWith("image/") && file.url ? (
                      <div className="h-8 w-8 overflow-hidden rounded border border-hairline">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded border border-hairline bg-canvas-soft">
                        <FileIcon className="h-4 w-4 text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate body-sm" title={file.name}>
                      {file.name}
                    </p>
                    <p className="caption text-muted">
                      {getFileTypeLabel(file.type)} · {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(file.id)}
                    aria-label={`Remove ${file.name}`}
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
          <p className="mt-2.5 text-center caption text-muted-soft">
            Paste an image with Ctrl+V, or drop files anywhere on the composer.
          </p>
        )
      )}
    </div>
  );

  /* ------------------------------------------------------------------ embedded */
  if (!hasResults) {
    return (
      <div className="mx-auto max-w-2xl">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.pdf,.js,.ts,.py,.java,.cpp,.html,.css,.json,.xml,.md,image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="section-label">Runs</span>
          {activeStages.map((stage) => (
            <TimelinePill key={stage} stage={stage} />
          ))}
          <span className="section-label ml-1">
            {currentOption?.credits} credit
            {(currentOption?.credits || 0) > 1 ? "s" : ""}
          </span>
        </div>

        <div className="relative">{composer}</div>

        {/* empty state — pick a tool to get started */}
        <div className="mt-10">
          <p className="section-label mb-3 text-center">Pick a tool</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {searchOptions.map((option) => {
              const Icon = option.icon;
              const active = option.id === selectedMode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedMode(option.id);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-ink bg-card"
                      : "border-hairline bg-transparent hover:border-hairline-strong hover:bg-card"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-ink" : "text-muted"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="title-sm block truncate">
                      {option.name}
                    </span>
                    <span className="caption block truncate text-muted">
                      {option.description}
                    </span>
                  </span>
                  <span className="pill-badge shrink-0">
                    {option.credits}c
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Out of credits</DialogTitle>
              <DialogDescription>
                You have used every credit on this account. Upgrade to a paid plan
                for monthly credits, bonus credits and top-up discounts.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-3">
              <Button
                onClick={() => {
                  navigate("/plans");
                  setShowUpgradeDialog(false);
                }}
              >
                Upgrade plan
              </Button>
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                Maybe later
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Need more credits?</DialogTitle>
              <DialogDescription>
                Top up without changing plan. Your plan discount is applied
                automatically at settlement.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-3">
              <Button
                onClick={() => {
                  navigate("/plans");
                  setShowTopupDialog(false);
                }}
              >
                Buy credits
              </Button>
              <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ------------------------------------------------------------------ chat mode */
  const navItems = [
    { label: "New chat", icon: MessageSquarePlus, onClick: startNewChat, active: true },
    { label: "Home", icon: Home, onClick: navigateToHome },
    {
      label: "History",
      icon: History,
      onClick: () => toast.info("History is coming soon"),
    },
  ];

  const bottomItems = [
    { label: "Dashboard", icon: LayoutDashboard, onClick: () => navigate("/dashboard") },
    { label: "Upgrade plan", icon: MinimalisticIcons.Credits, onClick: () => navigate("/plans") },
    { label: "Settings", icon: Settings, onClick: () => navigate("/settings") },
  ];

  const SidebarBody: React.FC = () => (
    <>
      <div className="flex items-center justify-between border-b border-hairline p-4">
        <Wordmark className="flex items-center gap-2.5" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(false)}
          className="h-8 w-8 lg:hidden"
          aria-label="Close navigation"
        >
          <X />
        </Button>
      </div>

      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                item.active
                  ? "bg-card text-ink"
                  : "text-muted hover:bg-card hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-hairline p-3">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-card hover:text-ink"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-card hover:text-ink"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      {/* sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 -translate-x-full flex-col border-r border-hairline bg-canvas-soft transition-transform duration-200 lg:translate-x-0",
          isSidebarOpen && "translate-x-0"
        )}
      >
        <SidebarBody />
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <div
          ref={scrollRef}
          className="app-scroll scroll-quiet"
        >
          {/* mobile bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-canvas px-4 py-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
            <Wordmark className="flex items-center gap-2.5" />
            <span className="h-8 w-8" />
          </div>

          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
            {results.map((result) => {
              const option = searchOptions.find(
                (opt) => opt.id === result.request_type
              );
              const Icon = option?.icon || MinimalisticIcons.Search;
              const stages = STAGES_BY_MODE[result.request_type] || [];
              const isCopied = copiedResults.has(result.id);

              return (
                <article key={result.id} className="chat-turn">
                  {/* user turn */}
                  <div className="flex justify-end">
                    <div className="bubble-user">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-ink" />
                        <span className="title-sm">{option?.name}</span>
                        <span className="pill-badge">
                          {result.credits_used} credit
                          {result.credits_used > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="body-md whitespace-pre-wrap">{result.query}</p>

                      {result.attachments && result.attachments.length > 0 && (
                        <div className="mt-3 border-t border-hairline pt-3">
                          <p className="section-label mb-2">
                            {result.attachments.length} attachment
                            {result.attachments.length > 1 ? "s" : ""}
                          </p>
                          <ul className="space-y-1.5">
                            {result.attachments.map((file) => {
                              const FileIcon = getFileIcon(file.type);
                              return (
                                <li
                                  key={file.id}
                                  className="flex items-center gap-2"
                                >
                                  {file.type.startsWith("image/") && file.url ? (
                                    <div className="h-6 w-6 overflow-hidden rounded border border-hairline">
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                                  )}
                                  <span className="caption min-w-0 flex-1 truncate text-muted">
                                    {file.name}
                                  </span>
                                  <span className="caption shrink-0 text-muted-soft">
                                    {formatFileSize(file.size)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* agent turn */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="agent-avatar">
                        <Sparkles className="h-3.5 w-3.5 text-ink" />
                      </span>
                      <span className="title-sm">Pulse agent</span>
                      <span className="caption text-muted-soft">
                        {new Date(result.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* the signature timeline for this run */}
                    <ol className="mb-4 flex flex-wrap items-center gap-1.5">
                      {stages.map((stage) => (
                        <li key={stage}>
                          <TimelinePill stage={stage} />
                        </li>
                      ))}
                    </ol>

                    <div className="bubble-agent">
                      <div className="space-y-2">
                        {formatAIResponse(result.result)}
                      </div>
                      <div className="mt-5 flex flex-wrap justify-end gap-1 border-t border-hairline pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          onClick={() => retrySearch(result.query, result.request_type)}
                        >
                          <RotateCcw />
                          Try again
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(result.result, result.id)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="text-success" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            exportToTxt(result.result, result.query, result.request_type)
                          }
                        >
                          <Download />
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* composer */}
        <div className="composer">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.js,.ts,.py,.java,.cpp,.html,.css,.json,.xml,.md,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {credits && credits.current_credits < (currentOption?.credits || 0) && (
              <div className="mb-3 flex items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="body-sm text-destructive">
                  Needs {currentOption?.credits} credits · you have{" "}
                  {credits.current_credits}
                </span>
              </div>
            )}

            {credits &&
              credits.current_credits < 5 &&
              credits.current_credits >= (currentOption?.credits || 0) && (
                <div className="mb-3 flex items-center justify-center gap-2 rounded-md border border-hairline bg-card px-4 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-muted" />
                  <span className="body-sm text-muted">
                    Low balance — {credits.current_credits} credits left
                  </span>
                </div>
              )}

            {composer}
          </div>
        </div>
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Out of credits</DialogTitle>
            <DialogDescription>
              You have used every credit on this account. Upgrade to a paid plan
              for monthly credits, bonus credits and top-up discounts.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              onClick={() => {
                navigate("/plans");
                setShowUpgradeDialog(false);
              }}
            >
              Upgrade plan
            </Button>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Need more credits?</DialogTitle>
            <DialogDescription>
              Top up without changing plan. Your plan discount is applied
              automatically at settlement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              onClick={() => {
                navigate("/plans");
                setShowTopupDialog(false);
              }}
            >
              Buy credits
            </Button>
            <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
