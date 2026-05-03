"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Grid3X3,
  Hash,
  History,
  ImageIcon,
  List,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  PanelLeftClose,
  Plus,
  Sparkles,
  Tag,
  Type,
  Upload,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  mockFeedback,
  mockGeneratedThumbnails,
  mockPhrases,
} from "./lib/mockData";
import { supabase } from "./lib/supabaseClient";
import { useAuthUser } from "./lib/useAuthUser";

type AnalyzeForm = {
  title: string;
  tags: string;
  topic: string;
  subscriberCount: string;
};

type RecentAnalysisItem = {
  id: string;
  title: string;
  tags: string[];
  topic: string;
  subscriberCount: number | null;
  createdAt: string;
  score: number | null;
  thumbnailUrl: string | null;
};

type Tab = "feedback" | "visual";
type ThumbnailView = "list" | "grid";
type AuthMode = "login" | "signup";

type HistorySection = {
  label: string;
  items: RecentAnalysisItem[];
};

function createEmptyForm(): AnalyzeForm {
  return {
    title: "",
    tags: "",
    topic: "",
    subscriberCount: "",
  };
}

function toTagArray(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getScoreLabel(score: number | null): string {
  if (typeof score !== "number") {
    return "No score yet";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 55) {
    return "Fair";
  }

  return "Needs Work";
}

function groupHistory(items: RecentAnalysisItem[]): HistorySection[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, RecentAnalysisItem[]>();
  buckets.set("TODAY", []);
  buckets.set("YESTERDAY", []);
  buckets.set("PREVIOUS 7 DAYS", []);
  buckets.set("EARLIER", []);

  for (const item of items) {
    const created = new Date(item.createdAt);
    created.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - created.getTime()) / 86400000
    );

    if (diffDays <= 0) {
      buckets.get("TODAY")?.push(item);
      continue;
    }

    if (diffDays === 1) {
      buckets.get("YESTERDAY")?.push(item);
      continue;
    }

    if (diffDays <= 7) {
      buckets.get("PREVIOUS 7 DAYS")?.push(item);
      continue;
    }

    buckets.get("EARLIER")?.push(item);
  }

  return Array.from(buckets.entries())
    .filter(([, bucketItems]) => bucketItems.length > 0)
    .map(([label, bucketItems]) => ({
      label,
      items: bucketItems,
    }));
}

function ScoreRing({ score }: { score: number | null }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = typeof score === "number" ? score : 0;
  const offset = circumference - (normalizedScore / 100) * circumference;
  const color =
    typeof score !== "number"
      ? "#8aa39e"
      : score >= 75
        ? "#4CB572"
        : score >= 55
          ? "#E59F2E"
          : "#CB4E4E";

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#d6e6e3"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl text-[#173730]" style={{ fontWeight: 700 }}>
          {typeof score === "number" ? score : "--"}
        </span>
        <span className="text-xs text-[#5f7b73]">/ 100</span>
      </div>
    </div>
  );
}

function FeedbackCard({
  icon: Icon,
  title,
  summary,
  score,
  details,
  suggestions,
}: {
  icon: ElementType;
  title: string;
  summary: string;
  score: number | null;
  details: string;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-[#c4d8d3] bg-white shadow-[0_8px_24px_-18px_rgba(19,94,75,0.45)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-6 py-5 flex items-center gap-4 text-left cursor-pointer hover:bg-[#f6fbf9] transition-colors"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#e7f4ee] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#135E4B]" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[22px] leading-[1.1] text-[#173730]"
            style={{ fontWeight: 600 }}
          >
            {title}
          </p>
          <p className="text-[16px] leading-[1.35] text-[#4c6b64] mt-1">
            {summary}
          </p>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <span
            className="text-[22px] text-[#d29d2d]"
            style={{ fontWeight: 600 }}
          >
            {typeof score === "number" ? score : "--"}
          </span>
          {open ? (
            <ChevronUp className="w-6 h-6 text-[#7c928d]" />
          ) : (
            <ChevronDown className="w-6 h-6 text-[#7c928d]" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-[#d9e7e3] bg-[#fbfefd]">
          <p className="text-[15px] leading-relaxed text-[#36544d] mt-4">
            {details}
          </p>
          <div className="mt-4 space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#4CB572] mt-1 flex-shrink-0" />
                <p className="text-[14px] leading-relaxed text-[#36544d]">
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UnifiedWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signUpSwitchTimerRef = useRef<number | null>(null);
  const { user, loading: userLoading } = useAuthUser();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState<"compose" | "analysis">(
    "compose"
  );
  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  const [thumbnailView, setThumbnailView] = useState<ThumbnailView>("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);

  const [form, setForm] = useState<AnalyzeForm>(createEmptyForm);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [recentItems, setRecentItems] = useState<RecentAnalysisItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null
  );

  const [authModalMode, setAuthModalMode] = useState<AuthMode | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"analyze" | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);

  const historySections = useMemo(
    () => groupHistory(recentItems),
    [recentItems]
  );

  const selectedAnalysis = useMemo(
    () => recentItems.find((item) => item.id === selectedAnalysisId) ?? null,
    [recentItems, selectedAnalysisId]
  );

  const displayedTitle =
    (workspaceMode === "analysis"
      ? selectedAnalysis?.title
      : form.title
    )?.trim() || "Untitled analysis";
  const displayedTags =
    workspaceMode === "analysis"
      ? (selectedAnalysis?.tags ?? [])
      : toTagArray(form.tags);
  const displayedTopic =
    (workspaceMode === "analysis"
      ? selectedAnalysis?.topic
      : form.topic
    )?.trim() || "Not provided";
  const displayedSubscribers =
    workspaceMode === "analysis"
      ? selectedAnalysis?.subscriberCount
      : form.subscriberCount
        ? Number.parseInt(form.subscriberCount, 10)
        : null;
  const displayedThumbnail =
    workspaceMode === "analysis"
      ? (selectedAnalysis?.thumbnailUrl ?? thumbnailPreview)
      : thumbnailPreview;
  const displayedScore =
    workspaceMode === "analysis" ? (selectedAnalysis?.score ?? null) : null;

  const closeAuthModal = () => {
    setAuthModalMode(null);
    setAuthError(null);
    setAuthNotice(null);
    setPendingAction(null);
  };

  const resetForNewAnalysis = () => {
    setWorkspaceMode("compose");
    setAnalyzeError(null);
    setActiveTab("feedback");
    setDrawerOpen(false);
    setTitleSuggestionsOpen(false);
    setForm(createEmptyForm());
    setThumbnailPreview(null);
    setThumbnailFile(null);
    setMobileSidebarOpen(false);
  };

  const loadRecentAnalyses = useCallback(
    async (preferredId?: string) => {
      if (!user) {
        setRecentItems([]);
        setSelectedAnalysisId(null);
        setLoadingHistory(false);
        setHistoryError(null);
        return;
      }

      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await fetch("/api/analyses/recent", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          items?: RecentAnalysisItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load analyses.");
        }

        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setRecentItems(nextItems);

        if (nextItems.length === 0) {
          setSelectedAnalysisId(null);
          return;
        }

        const nextSelected =
          preferredId && nextItems.some((item) => item.id === preferredId)
            ? preferredId
            : selectedAnalysisId &&
                nextItems.some((item) => item.id === selectedAnalysisId)
              ? selectedAnalysisId
              : nextItems[0].id;

        setSelectedAnalysisId(nextSelected);
      } catch (error) {
        setHistoryError(
          error instanceof Error ? error.message : "Failed to load analyses."
        );
      } finally {
        setLoadingHistory(false);
      }
    },
    [selectedAnalysisId, user]
  );

  useEffect(() => {
    void loadRecentAnalyses();
  }, [loadRecentAnalyses]);

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam === "login" || authParam === "signup") {
      setAuthModalMode(authParam);
    }

    const viewParam = searchParams.get("view");
    if (viewParam === "analysis" && user) {
      setWorkspaceMode("analysis");
      setDrawerOpen(true);
    }

    if (authParam || viewParam) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("auth");
      nextParams.delete("view");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
    }
  }, [router, searchParams, user]);

  useEffect(() => {
    if (!userLoading && !user) {
      setWorkspaceMode("compose");
      setDrawerOpen(false);
      setSelectedAnalysisId(null);
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (
      workspaceMode === "analysis" &&
      !selectedAnalysis &&
      recentItems.length > 0
    ) {
      setSelectedAnalysisId(recentItems[0].id);
    }
  }, [recentItems, selectedAnalysis, workspaceMode]);

  useEffect(() => {
    if (pendingAction === "analyze" && user) {
      setPendingAction(null);
      closeAuthModal();
      void runAnalysis();
    }
  }, [pendingAction, user]);

  useEffect(() => {
    return () => {
      if (signUpSwitchTimerRef.current !== null) {
        window.clearTimeout(signUpSwitchTimerRef.current);
      }
    };
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalyzeError("Please upload a valid image file.");
      return;
    }

    setAnalyzeError(null);
    setThumbnailFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      setThumbnailPreview(preview);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = useCallback(async () => {
    if (!user) {
      setAuthError("Please sign in to run an analysis.");
      setAuthModalMode("login");
      setPendingAction("analyze");
      return;
    }

    if (!thumbnailFile) {
      setAnalyzeError("Please upload a thumbnail before analyzing.");
      return;
    }

    if (form.title.trim().length === 0) {
      setAnalyzeError("Please provide a title before analyzing.");
      return;
    }

    setAnalyzeError(null);
    setAnalyzing(true);

    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("tags", form.tags);
      payload.append("topic", form.topic);
      payload.append("subscriberCount", form.subscriberCount);
      payload.append("thumbnail", thumbnailFile);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as {
        entryId?: string;
        score?: number;
        error?: string;
      };

      if (!response.ok || typeof data.score !== "number") {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }

      const parsedSubscriberCount = Number.parseInt(form.subscriberCount, 10);
      const temporaryItem: RecentAnalysisItem = {
        id: data.entryId ?? `analysis-${Date.now()}`,
        title: form.title,
        tags: toTagArray(form.tags),
        topic: form.topic || "",
        subscriberCount: Number.isFinite(parsedSubscriberCount)
          ? Math.max(0, parsedSubscriberCount)
          : null,
        createdAt: new Date().toISOString(),
        score: data.score,
        thumbnailUrl: thumbnailPreview,
      };

      setRecentItems((prev) => [
        temporaryItem,
        ...prev.filter((item) => item.id !== temporaryItem.id),
      ]);
      setSelectedAnalysisId(temporaryItem.id);
      setWorkspaceMode("analysis");
      setDrawerOpen(true);
      setActiveTab("feedback");
      await loadRecentAnalyses(temporaryItem.id);
    } catch (error) {
      setAnalyzeError(
        error instanceof Error
          ? error.message
          : "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  }, [form, loadRecentAnalyses, thumbnailFile, thumbnailPreview, user]);

  const handleAnalyzeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runAnalysis();
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthModalMode(null);
    await loadRecentAnalyses();
  };

  const handleSignupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupName,
        },
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      setAuthModalMode(null);
      await loadRecentAnalyses();
      return;
    }

    setAuthNotice("Account created. Confirm your email, then sign in.");
    if (signUpSwitchTimerRef.current !== null) {
      window.clearTimeout(signUpSwitchTimerRef.current);
    }
    signUpSwitchTimerRef.current = window.setTimeout(() => {
      setAuthModalMode("login");
      setAuthError(null);
      setAuthNotice("Your account is ready. Sign in to continue.");
    }, 1200);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setRecentItems([]);
    setSelectedAnalysisId(null);
    resetForNewAnalysis();
  };

  const isAnalyzeReady = form.title.trim().length > 0 && !!thumbnailFile;

  return (
    <div className="min-h-screen bg-[#edf4f2] text-[#173730]">
      <div className="h-screen flex overflow-hidden">
        <aside
          className={`fixed z-40 inset-y-0 left-0 w-[320px] bg-[#135E4B] text-[#e9f5f1] transition-transform duration-300 lg:static lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarExpanded ? "lg:w-[320px]" : "lg:w-[92px]"}`}
        >
          <div className="h-full flex flex-col border-r border-[#2f735f]">
            <div className="px-4 py-4 border-b border-[#2d705d] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                className="hidden lg:flex w-9 h-9 rounded-xl border border-[#2f7d67] items-center justify-center cursor-pointer hover:bg-[#1f735d] transition-colors"
                aria-label="Toggle sidebar width"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="lg:hidden w-9 h-9 rounded-xl border border-[#2f7d67] flex items-center justify-center cursor-pointer hover:bg-[#1f735d] transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                className={`flex items-center gap-3 flex-1 ${sidebarExpanded ? "" : "lg:hidden"}`}
              >
                <div className="w-10 h-10 rounded-2xl bg-[#4CB572] flex items-center justify-center shadow-[0_0_0_2px_rgba(255,255,255,0.12)]">
                  <BarChart3 className="w-5 h-5 text-[#114135]" />
                </div>
                <p className="text-xl leading-none" style={{ fontWeight: 600 }}>
                  Content Insights
                </p>
              </div>
            </div>

            <div className="px-4 pt-4">
              <button
                type="button"
                onClick={resetForNewAnalysis}
                className={`w-full h-12 rounded-2xl bg-[#1c745f] hover:bg-[#24866d] transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  sidebarExpanded ? "" : "lg:px-0"
                }`}
              >
                <Plus className="w-5 h-5" />
                <span
                  className={sidebarExpanded ? "" : "lg:hidden"}
                  style={{ fontWeight: 600 }}
                >
                  New Analysis
                </span>
              </button>
            </div>

            <div
              className={`px-4 pt-5 flex-1 overflow-y-auto ${sidebarExpanded ? "" : "lg:hidden"}`}
            >
              {userLoading ? (
                <p className="text-sm text-[#b6d8cf]">Checking session...</p>
              ) : !user ? (
                <p className="text-sm text-[#b6d8cf] leading-relaxed">
                  Sign in to save analyses and revisit them in your sidebar
                  history.
                </p>
              ) : loadingHistory ? (
                <p className="text-sm text-[#b6d8cf]">
                  Loading your analyses...
                </p>
              ) : historyError ? (
                <p className="text-sm text-[#ffd3d3]">{historyError}</p>
              ) : historySections.length === 0 ? (
                <p className="text-sm text-[#b6d8cf]">
                  No analyses yet. Create your first one.
                </p>
              ) : (
                historySections.map((section) => (
                  <div key={section.label} className="mb-6">
                    <p
                      className="text-xs text-[#90bfb2] mb-3 tracking-widest"
                      style={{ fontWeight: 600 }}
                    >
                      {section.label}
                    </p>
                    <div className="space-y-1.5">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedAnalysisId(item.id);
                            setWorkspaceMode("analysis");
                            setDrawerOpen(true);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors cursor-pointer ${
                            selectedAnalysisId === item.id &&
                            workspaceMode === "analysis"
                              ? "bg-[#2a7a65] text-white"
                              : "text-[#d8ece5] hover:bg-[#1e6d59]"
                          }`}
                        >
                          <span className="text-base leading-snug line-clamp-2">
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              className={`border-t border-[#2d705d] px-4 py-4 ${sidebarExpanded ? "" : "lg:hidden"}`}
            >
              {user ? (
                <div className="rounded-2xl border border-[#2f7d67] bg-[#1a6a56] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#4CB572] text-[#13382f] flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{ fontWeight: 600 }}
                      >
                        {user.user_metadata?.full_name ||
                          user.email ||
                          "Account"}
                      </p>
                      <p className="text-xs text-[#a5d2c5] truncate">
                        {user.email || "Signed in"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="mt-3 w-full h-10 rounded-xl border border-[#3a8f77] text-sm flex items-center justify-center gap-2 hover:bg-[#165846] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setAuthModalMode("login");
                  }}
                  className="w-full rounded-2xl border border-[#2f7d67] bg-[#1a6a56] px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#1d725c] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border border-[#3b8d76] flex items-center justify-center">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p
                      className="text-base leading-none"
                      style={{ fontWeight: 600 }}
                    >
                      Log in
                    </p>
                    <p className="text-xs text-[#a5d2c5] mt-1">
                      Save your analyses
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </aside>

        {mobileSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/35 z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col relative">
          <header className="h-[74px] border-b border-[#c4d8d3] bg-[#f7fbfa] px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl border border-[#c4d8d3] flex items-center justify-center text-[#2d6256] cursor-pointer hover:bg-[#ecf5f2] transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden lg:flex items-center gap-2 text-[#2d6256]">
                <History className="w-4 h-4" />
                <span className="text-sm">Workspace</span>
              </div>
            </div>
          </header>

          <div className="flex-1 flex min-h-0">
            <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
              {workspaceMode === "compose" ? (
                <section className="max-w-5xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="mx-auto w-20 h-20 rounded-3xl bg-[#135E4B] flex items-center justify-center shadow-[0_16px_32px_-20px_rgba(19,94,75,0.8)] mb-5">
                      <BarChart3 className="w-9 h-9 text-[#c7efda]" />
                    </div>
                    <h1
                      className="text-[42px] leading-[1.08] text-[#152e29]"
                      style={{ fontWeight: 700 }}
                    >
                      What content would you like to analyze?
                    </h1>
                    <p className="text-[15px] text-[#5f7b73] mt-3">
                      Get AI-powered feedback on your thumbnail, title, and tags
                      to grow faster.
                    </p>
                  </div>

                  <form onSubmit={handleAnalyzeSubmit} className="space-y-6">
                    <div>
                      <p
                        className="text-[13px] tracking-[0.1em] text-[#4c6b64] mb-3 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Upload className="w-5 h-5" />
                        THUMBNAIL{" "}
                        <span className="text-[#8ca59f]">
                          (optional preview, required for analyze)
                        </span>
                      </p>
                      {thumbnailPreview ? (
                        <div className="relative rounded-3xl overflow-hidden border border-[#c4d8d3] bg-white">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-full h-[280px] object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnailPreview(null);
                              setThumbnailFile(null);
                            }}
                            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragOver(false);
                            const droppedFile = event.dataTransfer.files[0];
                            if (droppedFile) {
                              handleFile(droppedFile);
                            }
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          className={`w-full border-2 border-dashed rounded-3xl px-5 py-12 bg-white transition-colors cursor-pointer ${
                            dragOver
                              ? "border-[#4CB572] bg-[#eef9f2]"
                              : "border-[#c4d8d3] hover:border-[#4CB572] hover:bg-[#f7fdf9]"
                          }`}
                        >
                          <div className="mx-auto w-14 h-14 rounded-full bg-[#e7f4ee] flex items-center justify-center">
                            <Upload className="w-6 h-6 text-[#135E4B]" />
                          </div>
                          <p
                            className="text-[18px] text-[#36544d] mt-4"
                            style={{ fontWeight: 500 }}
                          >
                            Upload thumbnail
                          </p>
                          <p className="text-[14px] text-[#718d86]">
                            PNG, JPG up to 10MB - Drag and drop or click
                          </p>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0];
                          if (selectedFile) {
                            handleFile(selectedFile);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="text-[13px] tracking-[0.1em] text-[#4c6b64] flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Type className="w-5 h-5" />
                        VIDEO TITLE <span className="text-[#bf6a58]">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            title: event.target.value,
                          }));
                        }}
                        placeholder="e.g. How I Gained 10K Subscribers in 30 Days"
                        className="mt-3 w-full h-[74px] rounded-3xl border border-[#c4d8d3] bg-white px-6 text-[18px] text-[#1f3d35] placeholder:text-[#a2b8b2] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                        required
                      />
                      <p className="text-[13px] text-[#7b9690] mt-2">
                        {form.title.length} / 100 recommended characters
                      </p>
                    </div>

                    <div>
                      <label
                        className="text-[13px] tracking-[0.1em] text-[#4c6b64] flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Tag className="w-5 h-5" />
                        TAGS
                      </label>
                      <input
                        type="text"
                        name="tags"
                        value={form.tags}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            tags: event.target.value,
                          }));
                        }}
                        placeholder="e.g. youtube growth, content creator, subscriber tips"
                        className="mt-3 w-full h-[74px] rounded-3xl border border-[#c4d8d3] bg-white px-6 text-[18px] text-[#1f3d35] placeholder:text-[#a2b8b2] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                      />
                      <p className="text-[13px] text-[#7b9690] mt-2">
                        Separate with commas - Aim for 12-15 tags
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="text-[13px] tracking-[0.1em] text-[#4c6b64] flex items-center gap-2"
                          style={{ fontWeight: 600 }}
                        >
                          <Hash className="w-5 h-5" />
                          TOPIC / NICHE
                        </label>
                        <input
                          type="text"
                          name="topic"
                          value={form.topic}
                          onChange={(event) => {
                            setForm((prev) => ({
                              ...prev,
                              topic: event.target.value,
                            }));
                          }}
                          placeholder="e.g. YouTube Growth"
                          className="mt-3 w-full h-[74px] rounded-3xl border border-[#c4d8d3] bg-white px-6 text-[18px] text-[#1f3d35] placeholder:text-[#a2b8b2] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                        />
                      </div>
                      <div>
                        <label
                          className="text-[13px] tracking-[0.1em] text-[#4c6b64] flex items-center gap-2"
                          style={{ fontWeight: 600 }}
                        >
                          <Users className="w-5 h-5" />
                          SUBSCRIBERS
                        </label>
                        <input
                          type="number"
                          name="subscriberCount"
                          min="0"
                          value={form.subscriberCount}
                          onChange={(event) => {
                            setForm((prev) => ({
                              ...prev,
                              subscriberCount: event.target.value,
                            }));
                          }}
                          placeholder="e.g. 5200"
                          className="mt-3 w-full h-[74px] rounded-3xl border border-[#c4d8d3] bg-white px-6 text-[18px] text-[#1f3d35] placeholder:text-[#a2b8b2] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={analyzing || !isAnalyzeReady}
                      className="w-full h-[78px] rounded-3xl bg-[#4CB572] text-[#13382f] text-[19px] hover:bg-[#3fa364] disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
                      style={{ fontWeight: 600 }}
                    >
                      {analyzing ? (
                        <>
                          <LoaderCircle className="w-6 h-6 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          Analyze Content
                        </>
                      )}
                    </button>

                    {analyzeError && (
                      <p className="text-[14px] text-[#b53d3d]" role="alert">
                        {analyzeError}
                      </p>
                    )}
                  </form>
                </section>
              ) : (
                <section className="max-w-[1120px] mx-auto">
                  <div className="mb-6">
                    <p className="text-[30px] text-[#415c56]">
                      Analyzing:{" "}
                      <span
                        className="text-[#173730]"
                        style={{ fontWeight: 600 }}
                      >
                        {displayedTitle}
                      </span>
                    </p>
                  </div>

                  <div className="border-b border-[#c4d8d3] mb-4">
                    <div className="flex gap-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab("feedback")}
                        className={`pb-3 text-[18px] border-b-2 transition-colors cursor-pointer ${
                          activeTab === "feedback"
                            ? "text-[#135E4B] border-[#4CB572]"
                            : "text-[#6e8882] border-transparent hover:text-[#2f6257]"
                        }`}
                        style={{
                          fontWeight: activeTab === "feedback" ? 600 : 500,
                        }}
                      >
                        Feedback
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("visual")}
                        className={`pb-3 text-[18px] border-b-2 transition-colors cursor-pointer ${
                          activeTab === "visual"
                            ? "text-[#135E4B] border-[#4CB572]"
                            : "text-[#6e8882] border-transparent hover:text-[#2f6257]"
                        }`}
                        style={{
                          fontWeight: activeTab === "visual" ? 600 : 500,
                        }}
                      >
                        Visual
                      </button>
                    </div>
                  </div>

                  {activeTab === "feedback" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[14px] text-[#6a857f]">
                        <AlertCircle className="w-5 h-5" />
                        Click each card to expand details
                      </div>

                      <FeedbackCard
                        icon={ImageIcon}
                        title="Thumbnail Feedback"
                        summary={mockFeedback.thumbnail.headline}
                        score={mockFeedback.thumbnail.score}
                        details={mockFeedback.thumbnail.details}
                        suggestions={mockFeedback.thumbnail.suggestions}
                      />
                      <FeedbackCard
                        icon={Type}
                        title="Title Feedback"
                        summary={mockFeedback.title.headline}
                        score={mockFeedback.title.score}
                        details={mockFeedback.title.details}
                        suggestions={mockFeedback.title.suggestions}
                      />
                      <FeedbackCard
                        icon={Tag}
                        title="Tags Feedback"
                        summary={mockFeedback.tags.headline}
                        score={mockFeedback.tags.score}
                        details={mockFeedback.tags.details}
                        suggestions={mockFeedback.tags.suggestions}
                      />

                      <div className="rounded-3xl border border-[#c4d8d3] bg-white shadow-[0_8px_24px_-18px_rgba(19,94,75,0.45)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setTitleSuggestionsOpen((prev) => !prev)
                          }
                          className="w-full px-6 py-5 flex items-center gap-4 text-left cursor-pointer hover:bg-[#f6fbf9] transition-colors"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#e7f4ee] flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#135E4B]" />
                          </div>
                          <div className="flex-1">
                            <p
                              className="text-[22px] text-[#173730]"
                              style={{ fontWeight: 600 }}
                            >
                              Title Suggestions
                            </p>
                            <p className="text-[15px] text-[#4c6b64] mt-1">
                              AI-generated optimized alternatives
                            </p>
                          </div>
                          <span className="rounded-2xl border border-[#9fcab9] px-4 py-2 text-[14px] text-[#135E4B] flex items-center gap-2">
                            {titleSuggestionsOpen ? "Hide" : "Show"}
                            {titleSuggestionsOpen ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </span>
                        </button>

                        {titleSuggestionsOpen && (
                          <div className="px-6 pb-5 border-t border-[#d9e7e3] bg-[#fbfefd] space-y-3">
                            {mockPhrases.slice(0, 4).map((phrase) => (
                              <div
                                key={phrase.id}
                                className="rounded-2xl border border-[#d3e4df] bg-white px-4 py-3"
                              >
                                <p
                                  className="text-[14px] text-[#284d44]"
                                  style={{ fontWeight: 500 }}
                                >
                                  {phrase.phrase}
                                </p>
                                <p className="text-[13px] text-[#6f8a84] mt-1">
                                  Score {phrase.score} - {phrase.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-8">
                        <div className="w-[320px] max-w-full rounded-3xl border border-[#c6dcd6] bg-white px-5 py-4 shadow-[0_18px_35px_-30px_rgba(19,94,75,0.8)]">
                          <div className="flex items-center gap-4">
                            <ScoreRing score={displayedScore} />
                            <div>
                              <p className="text-[19px] text-[#4f6e67]">
                                Overall Score
                              </p>
                              <p
                                className="text-[16px] text-[#d29d2d]"
                                style={{ fontWeight: 600 }}
                              >
                                {getScoreLabel(displayedScore)}
                              </p>
                              <p className="text-[15px] text-[#849b96]">
                                All aspects
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-[#c4d8d3] bg-white p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <ImageIcon className="w-5 h-5 text-[#4f6e67]" />
                          <p
                            className="text-[17px] text-[#284d44]"
                            style={{ fontWeight: 600 }}
                          >
                            Thumbnail
                          </p>
                        </div>
                        {displayedThumbnail ? (
                          <div className="rounded-2xl overflow-hidden border border-[#cde0db] aspect-video">
                            <img
                              src={displayedThumbnail}
                              alt="Analyzed thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border-2 border-dashed border-[#d3e4df] aspect-video flex items-center justify-center text-[#7b9690]">
                            No thumbnail available
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-[#c4d8d3] bg-white p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p
                            className="text-[17px] text-[#284d44]"
                            style={{ fontWeight: 600 }}
                          >
                            Generated thumbnail ideas
                          </p>
                          <div className="flex bg-[#eef5f2] rounded-xl p-1 border border-[#d8e7e2]">
                            <button
                              type="button"
                              onClick={() => setThumbnailView("grid")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                                thumbnailView === "grid"
                                  ? "bg-white text-[#135E4B] shadow-sm"
                                  : "text-[#79948d]"
                              }`}
                            >
                              <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setThumbnailView("list")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                                thumbnailView === "list"
                                  ? "bg-white text-[#135E4B] shadow-sm"
                                  : "text-[#79948d]"
                              }`}
                            >
                              <List className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {thumbnailView === "grid" ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {mockGeneratedThumbnails
                              .slice(0, 6)
                              .map((source, index) => (
                                <div
                                  key={`${source}-${index}`}
                                  className="rounded-xl overflow-hidden border border-[#d3e4df] aspect-video"
                                >
                                  <img
                                    src={source}
                                    alt={`Generated thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {mockGeneratedThumbnails
                              .slice(0, 4)
                              .map((source, index) => (
                                <div
                                  key={`${source}-${index}`}
                                  className="flex gap-3 rounded-xl border border-[#d3e4df] p-3"
                                >
                                  <div className="w-36 rounded-lg overflow-hidden border border-[#d3e4df] aspect-video flex-shrink-0">
                                    <img
                                      src={source}
                                      alt={`Generated thumbnail ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p
                                      className="text-[15px] text-[#284d44]"
                                      style={{ fontWeight: 500 }}
                                    >
                                      Variant {index + 1}
                                    </p>
                                    <p className="text-[13px] text-[#79948d]">
                                      Balanced contrast and readable text
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </main>

            {workspaceMode === "analysis" && (
              <aside
                className={`absolute right-0 top-[74px] bottom-0 z-20 w-[360px] max-w-[95vw] border-l border-[#c4d8d3] bg-[#f5faf8] transition-all duration-300 lg:static lg:top-0 lg:bottom-auto lg:max-w-none relative ${
                  drawerOpen
                    ? "translate-x-0 lg:translate-x-0 lg:w-[360px] lg:border-l"
                    : "translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen((prev) => !prev)}
                  className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-40 h-24 w-10 rounded-l-xl border border-r-0 border-[#9ebdb4] bg-[#f2f8f5] text-[#135E4B] flex items-center justify-center shadow-[0_8px_22px_-14px_rgba(19,94,75,0.65)] hover:bg-[#e6f3ed] transition-colors cursor-pointer"
                  aria-label={
                    drawerOpen ? "Hide input sidebar" : "Show input sidebar"
                  }
                >
                  <Menu className="w-5 h-5 rotate-90" />
                </button>
                <div className="h-full flex flex-col">
                  <div className="h-[74px] border-b border-[#c4d8d3] px-5 flex items-center justify-between">
                    <p
                      className="text-[22px] text-[#173730]"
                      style={{ fontWeight: 600 }}
                    >
                      Your Input
                    </p>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="w-9 h-9 rounded-xl border border-[#c4d8d3] flex items-center justify-center text-[#5e7872] cursor-pointer hover:bg-white transition-colors"
                      aria-label="Close input drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[#6b8680] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <ImageIcon className="w-4 h-4" />
                        THUMBNAIL
                      </p>
                      {displayedThumbnail ? (
                        <div className="rounded-2xl overflow-hidden border border-[#cde0db] bg-white">
                          <img
                            src={displayedThumbnail}
                            alt="Submitted thumbnail"
                            className="w-full h-[180px] object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[#cde0db] h-[140px] flex items-center justify-center text-[#79948d]">
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[#6b8680] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Type className="w-4 h-4" />
                        TITLE
                      </p>
                      <div className="rounded-2xl border border-[#cde0db] bg-white px-4 py-3 text-[16px] text-[#284d44]">
                        {displayedTitle}
                      </div>
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[#6b8680] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Tag className="w-4 h-4" />
                        TAGS
                      </p>
                      {displayedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {displayedTags.map((tag, index) => (
                            <span
                              key={`${tag}-${index}`}
                              className="rounded-full border border-[#b9d7cb] bg-[#eaf6f0] px-3 py-1 text-[13px] text-[#2d6256]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[14px] text-[#7b9690]">
                          No tags provided.
                        </p>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[#6b8680] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Hash className="w-4 h-4" />
                        TOPIC / NICHE
                      </p>
                      <div className="rounded-2xl border border-[#cde0db] bg-white px-4 py-3 text-[16px] text-[#284d44]">
                        {displayedTopic}
                      </div>
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[#6b8680] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Users className="w-4 h-4" />
                        SUBSCRIBERS
                      </p>
                      <div className="rounded-2xl border border-[#cde0db] bg-white px-4 py-3 text-[16px] text-[#284d44]">
                        {typeof displayedSubscribers === "number" &&
                        Number.isFinite(displayedSubscribers)
                          ? displayedSubscribers.toLocaleString()
                          : "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {authModalMode && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[#2f584d] bg-[#12241f] text-[#eaf3f0] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2
                  className="text-[38px] leading-[1.02]"
                  style={{ fontWeight: 650 }}
                >
                  {authModalMode === "login"
                    ? "Log in or sign up"
                    : "Create your account"}
                </h2>
                <p className="text-[15px] text-[#a9c2ba] mt-2">
                  {authModalMode === "login"
                    ? "Save analyses, revisit feedback, and keep your workspace synced."
                    : "Start saving analyses in your personal sidebar history."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="w-10 h-10 rounded-xl border border-[#2f584d] flex items-center justify-center text-[#bfd4cd] hover:bg-[#17312a] transition-colors cursor-pointer"
                aria-label="Close auth modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authNotice && (
              <p className="mb-4 rounded-2xl border border-[#3a8f77] bg-[#16362d] px-4 py-3 text-[13px] text-[#9dd5bf]">
                {authNotice}
              </p>
            )}

            {authModalMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full h-[70px] rounded-2xl border border-[#365e54] bg-[#1a2f29] px-5 text-[17px] text-white placeholder:text-[#86a39c] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                  required
                />
                <div className="relative">
                  <input
                    type={loginShowPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full h-[70px] rounded-2xl border border-[#365e54] bg-[#1a2f29] px-5 pr-14 text-[17px] text-white placeholder:text-[#86a39c] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setLoginShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9cb6af] cursor-pointer"
                  >
                    {loginShowPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-[70px] rounded-2xl bg-[#4CB572] text-[#13382f] text-[18px] hover:bg-[#3ea464] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  {authLoading ? (
                    <>
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setAuthModalMode("signup");
                  }}
                  className="w-full h-[62px] rounded-2xl border border-[#365e54] text-[15px] text-[#ccddd9] hover:bg-[#17312a] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Need an account? Sign up
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <input
                  type="text"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  placeholder="Full name"
                  className="w-full h-[70px] rounded-2xl border border-[#365e54] bg-[#1a2f29] px-5 text-[17px] text-white placeholder:text-[#86a39c] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                  required
                />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full h-[70px] rounded-2xl border border-[#365e54] bg-[#1a2f29] px-5 text-[17px] text-white placeholder:text-[#86a39c] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                  required
                />
                <div className="relative">
                  <input
                    type={signupShowPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="Password (8+ characters)"
                    className="w-full h-[70px] rounded-2xl border border-[#365e54] bg-[#1a2f29] px-5 pr-14 text-[17px] text-white placeholder:text-[#86a39c] focus:outline-none focus:ring-2 focus:ring-[#4CB572]/30"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setSignupShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9cb6af] cursor-pointer"
                  >
                    {signupShowPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-[70px] rounded-2xl bg-[#4CB572] text-[#13382f] text-[18px] hover:bg-[#3ea464] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  {authLoading ? (
                    <>
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setAuthModalMode("login");
                  }}
                  className="w-full h-[62px] rounded-2xl border border-[#365e54] text-[15px] text-[#ccddd9] hover:bg-[#17312a] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Already have an account? Log in
                </button>
              </form>
            )}

            {authError && (
              <p className="mt-4 text-[14px] text-[#f0a7a7]" role="alert">
                {authError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#edf4f2] flex items-center justify-center text-[#135E4B]">
          Loading workspace...
        </div>
      }
    >
      <UnifiedWorkspacePage />
    </Suspense>
  );
}
