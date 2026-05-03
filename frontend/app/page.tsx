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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Grid3X3,
  Hash,
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
import {
  DEFAULT_THEME,
  getThemeCssVars,
  isThemeName,
  THEME_CONFIG,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "./lib/uiThemes";
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
      ? "var(--ci-score-neutral)"
      : score >= 75
        ? "var(--ci-accent)"
        : score >= 55
          ? "var(--ci-score-mid)"
          : "var(--ci-score-bad)";

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="var(--ci-ring-track)"
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
        <span
          className="text-3xl text-[var(--ci-text-primary)]"
          style={{ fontWeight: 700 }}
        >
          {typeof score === "number" ? score : "--"}
        </span>
        <span className="text-xs text-[var(--ci-text-subtle)]">/ 100</span>
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
    <div className="rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[0_8px_24px_-18px_rgba(0,0,0,0.75)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-6 py-5 flex items-center gap-4 text-left cursor-pointer hover:bg-[var(--ci-surface-hover)] transition-colors"
      >
        <div className="w-12 h-12 rounded-2xl bg-[var(--ci-surface-accent-soft)] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[var(--ci-accent-soft)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[22px] leading-[1.1] text-[var(--ci-text-primary)]"
            style={{ fontWeight: 600 }}
          >
            {title}
          </p>
          <p className="text-[16px] leading-[1.35] text-[var(--ci-text-muted)] mt-1">
            {summary}
          </p>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <span
            className="text-[22px] text-[var(--ci-warning)]"
            style={{ fontWeight: 600 }}
          >
            {typeof score === "number" ? score : "--"}
          </span>
          {open ? (
            <ChevronUp className="w-6 h-6 text-[var(--ci-icon-muted-2)]" />
          ) : (
            <ChevronDown className="w-6 h-6 text-[var(--ci-icon-muted-2)]" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-[var(--ci-border)] bg-[var(--ci-surface-raised)]">
          <p className="text-[15px] leading-relaxed text-[var(--ci-text-soft)] mt-4">
            {details}
          </p>
          <div className="mt-4 space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--ci-accent)] mt-1 flex-shrink-0" />
                <p className="text-[14px] leading-relaxed text-[var(--ci-text-soft)]">
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
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
  const [savingTheme, setSavingTheme] = useState(false);

  const historySections = useMemo(
    () => groupHistory(recentItems),
    [recentItems]
  );
  const themeVars = useMemo(() => getThemeCssVars(themeName), [themeName]);

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

  useEffect(() => {
    if (!user) {
      setThemeName(DEFAULT_THEME);
      return;
    }

    let preferred: ThemeName = DEFAULT_THEME;
    const metadataTheme = user.user_metadata?.ui_theme;

    if (isThemeName(metadataTheme)) {
      preferred = metadataTheme;
    } else if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(
        `${THEME_STORAGE_KEY}:${user.id}`
      );
      if (isThemeName(stored)) {
        preferred = stored;
      }
    }

    setThemeName(preferred);
  }, [user]);

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

  const handleThemeChange = async (nextTheme: ThemeName) => {
    setThemeName(nextTheme);

    if (!user) {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${THEME_STORAGE_KEY}:${user.id}`, nextTheme);
    }

    setSavingTheme(true);
    await supabase.auth.updateUser({
      data: {
        ui_theme: nextTheme,
      },
    });
    setSavingTheme(false);
  };

  const isAnalyzeReady = form.title.trim().length > 0 && !!thumbnailFile;

  return (
    <div
      className="min-h-screen bg-[var(--ci-app-bg)] text-[var(--ci-text-main)]"
      style={themeVars}
    >
      <div className="h-screen flex overflow-hidden">
        <aside
          className={`fixed z-40 inset-y-0 left-0 w-[320px] overflow-hidden bg-[var(--ci-app-bg)] text-[var(--ci-text-main)] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarExpanded ? "lg:w-[320px]" : "lg:w-[76px]"}`}
        >
          <div className="h-full flex flex-col border-r border-[var(--ci-divider)]">
            <div
              className={`relative py-4 border-b border-[var(--ci-divider)] flex items-center transition-all duration-300 ${
                sidebarExpanded ? "px-4 gap-2" : "px-2 gap-0 lg:justify-center"
              }`}
            >
              <div
                className={`flex items-center gap-3 min-w-0 transition-all duration-200 ${
                  sidebarExpanded
                    ? "flex-1 opacity-100 translate-x-0"
                    : "flex-1 lg:absolute lg:left-2 lg:right-2 lg:opacity-0 lg:translate-x-2 lg:pointer-events-none"
                }`}
              >
                <p
                  className="text-xl leading-none transition-opacity duration-200"
                  style={{ fontWeight: 600 }}
                >
                  Content Insights
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                className="hidden lg:flex w-9 h-9 rounded-xl border border-[var(--ci-control-border)] items-center justify-center cursor-pointer hover:bg-[var(--ci-control-hover)] transition-colors"
                aria-label="Toggle sidebar width"
              >
                <PanelLeftClose
                  className={`w-4 h-4 transition-transform duration-300 ${
                    sidebarExpanded ? "" : "rotate-180"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="lg:hidden w-9 h-9 rounded-xl border border-[var(--ci-control-border)] flex items-center justify-center cursor-pointer hover:bg-[var(--ci-control-hover)] transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`${sidebarExpanded ? "px-4 pt-4" : "px-2 pt-4 flex justify-center"}`}
            >
              <button
                type="button"
                onClick={resetForNewAnalysis}
                className={`overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer ${
                  sidebarExpanded
                    ? "w-full h-12 rounded-2xl bg-[var(--ci-accent-button)] hover:bg-[var(--ci-accent-button-hover)] gap-2"
                    : "w-9 h-9 rounded-xl border border-[var(--ci-control-border)] hover:bg-[var(--ci-control-hover)]"
                }`}
              >
                <Plus
                  className={`${sidebarExpanded ? "w-5 h-5" : "w-4 h-4"}`}
                />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                    sidebarExpanded
                      ? "max-w-[160px] opacity-100 ml-1"
                      : "max-w-0 opacity-0 ml-0"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  New Analysis
                </span>
              </button>
            </div>

            <div
              className={`px-4 pt-5 flex-1 overflow-y-auto transition-all duration-200 ${
                sidebarExpanded
                  ? "lg:opacity-100 lg:translate-x-0"
                  : "lg:opacity-0 lg:translate-x-2 lg:pointer-events-none"
              }`}
            >
              {userLoading ? (
                <p className="text-sm text-[var(--ci-text-muted)]">
                  Checking session...
                </p>
              ) : !user ? (
                <p className="text-sm text-[var(--ci-text-muted)] leading-relaxed">
                  Sign in to save analyses and revisit them in your sidebar
                  history.
                </p>
              ) : loadingHistory ? (
                <p className="text-sm text-[var(--ci-text-muted)]">
                  Loading your analyses...
                </p>
              ) : historyError ? (
                <p className="text-sm text-[var(--ci-error-text)]">
                  {historyError}
                </p>
              ) : historySections.length === 0 ? (
                <p className="text-sm text-[var(--ci-text-muted)]">
                  No analyses yet. Create your first one.
                </p>
              ) : (
                historySections.map((section) => (
                  <div key={section.label} className="mb-6">
                    <p
                      className="text-xs text-[var(--ci-text-soft)] mb-3 tracking-widest"
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
                              ? "bg-[var(--ci-history-active-bg)] text-[var(--ci-text-strong)]"
                              : "text-[var(--ci-text-main)] hover:bg-[var(--ci-history-hover-bg)]"
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
              className={`border-t px-4 py-4 transition-all duration-200 ${
                sidebarExpanded
                  ? "border-[var(--ci-divider)] lg:opacity-100 lg:translate-x-0"
                  : "border-transparent lg:opacity-0 lg:translate-x-2 lg:pointer-events-none"
              }`}
            >
              {user ? (
                <div className="rounded-2xl border border-[var(--ci-control-border)] bg-[var(--ci-surface-sidebar-card)] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--ci-accent)] text-[var(--ci-contrast-on-accent)] flex items-center justify-center">
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
                      <p className="text-xs text-[var(--ci-text-soft)] truncate">
                        {user.email || "Signed in"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p
                      className="block text-xs text-[var(--ci-text-soft)] mb-1"
                      style={{ fontWeight: 600 }}
                    >
                      Theme
                    </p>
                    <div className="flex items-center gap-2.5">
                      {(
                        Object.entries(THEME_CONFIG) as Array<
                          [
                            ThemeName,
                            { label: string; colors: Record<string, string> },
                          ]
                        >
                      ).map(([key, value]) => {
                        const isActive = themeName === key;
                        const swatchColor = value.colors["ci-accent"];

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => void handleThemeChange(key)}
                            className={`relative w-8 h-8 rounded-full border transition-all cursor-pointer ${
                              isActive
                                ? "border-[var(--ci-text-strong)] ring-2 ring-[var(--ci-control-border-soft)]"
                                : "border-[var(--ci-control-border)] hover:border-[var(--ci-text-soft)]"
                            }`}
                            style={{ backgroundColor: swatchColor }}
                            aria-label={`Use ${value.label} theme`}
                            title={value.label}
                          >
                            {isActive && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ci-text-strong)]/85" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {savingTheme && (
                      <p className="text-[11px] text-[var(--ci-text-subtle)] mt-1">
                        Saving theme...
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="mt-3 w-full h-10 rounded-xl border border-[var(--ci-control-border-strong)] text-sm flex items-center justify-center gap-2 hover:bg-[var(--ci-surface-sidebar-card-hover)] transition-colors cursor-pointer"
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
                  className="w-full rounded-2xl border border-[var(--ci-control-border)] bg-[var(--ci-surface-sidebar-card)] px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--ci-surface-sidebar-card-hover)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border border-[var(--ci-control-border-soft)] flex items-center justify-center">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p
                      className="text-base leading-none"
                      style={{ fontWeight: 600 }}
                    >
                      Log in
                    </p>
                    <p className="text-xs text-[var(--ci-text-soft)] mt-1">
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
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 lg:hidden w-10 h-10 rounded-xl border border-[var(--ci-control-border)] bg-[var(--ci-surface-deep)] flex items-center justify-center text-[var(--ci-text-soft-strong)] cursor-pointer hover:bg-[var(--ci-control-hover)] transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex min-h-0">
            <main className="flex-1 overflow-y-auto px-4 sm:px-8 pt-16 sm:pt-10 pb-8">
              {workspaceMode === "compose" ? (
                <section className="max-w-5xl mx-auto">
                  <div className="text-center mb-8">
                    <h1
                      className="text-[42px] leading-[1.08] text-[var(--ci-text-primary)]"
                      style={{ fontWeight: 700 }}
                    >
                      What content would you like to analyze?
                    </h1>
                    <p className="text-[15px] text-[var(--ci-text-soft-strong)] mt-3">
                      Get AI-powered feedback on your thumbnail, title, and tags
                      to grow faster.
                    </p>
                  </div>

                  <form onSubmit={handleAnalyzeSubmit} className="space-y-6">
                    <div>
                      <p
                        className="text-[13px] tracking-[0.1em] text-[var(--ci-text-soft-2)] mb-3 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Upload className="w-5 h-5" />
                        THUMBNAIL{" "}
                        <span className="text-[var(--ci-text-subtle-2)]">
                          (optional preview, required for analyze)
                        </span>
                      </p>
                      {thumbnailPreview ? (
                        <div className="relative rounded-3xl overflow-hidden border border-[var(--ci-border)] bg-[var(--ci-surface)]">
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
                          className={`w-full border-2 border-dashed rounded-3xl px-5 py-12 bg-[var(--ci-surface)] transition-colors cursor-pointer ${
                            dragOver
                              ? "border-[var(--ci-accent)] bg-[var(--ci-dropzone-active)]"
                              : "border-[var(--ci-border)] hover:border-[var(--ci-accent)] hover:bg-[var(--ci-dropzone-hover)]"
                          }`}
                        >
                          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--ci-upload-icon-bg)] flex items-center justify-center">
                            <Upload className="w-6 h-6 text-[var(--ci-upload-icon-color)]" />
                          </div>
                          <p
                            className="text-[18px] text-[var(--ci-text-heading-soft)] mt-4"
                            style={{ fontWeight: 500 }}
                          >
                            Upload thumbnail
                          </p>
                          <p className="text-[14px] text-[var(--ci-text-subtle-3)]">
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
                        className="text-[13px] tracking-[0.1em] text-[var(--ci-text-soft-2)] flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Type className="w-5 h-5" />
                        VIDEO TITLE{" "}
                        <span className="text-[var(--ci-required)]">*</span>
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
                        className="mt-3 w-full h-[74px] rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-6 text-[18px] text-[var(--ci-input-text)] placeholder:text-[var(--ci-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                        required
                      />
                      <p className="text-[13px] text-[var(--ci-text-subtle)] mt-2">
                        {form.title.length} / 100 recommended characters
                      </p>
                    </div>

                    <div>
                      <label
                        className="text-[13px] tracking-[0.1em] text-[var(--ci-text-soft-2)] flex items-center gap-2"
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
                        className="mt-3 w-full h-[74px] rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-6 text-[18px] text-[var(--ci-input-text)] placeholder:text-[var(--ci-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                      />
                      <p className="text-[13px] text-[var(--ci-text-subtle)] mt-2">
                        Separate with commas - Aim for 12-15 tags
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="text-[13px] tracking-[0.1em] text-[var(--ci-text-soft-2)] flex items-center gap-2"
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
                          className="mt-3 w-full h-[74px] rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-6 text-[18px] text-[var(--ci-input-text)] placeholder:text-[var(--ci-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                        />
                      </div>
                      <div>
                        <label
                          className="text-[13px] tracking-[0.1em] text-[var(--ci-text-soft-2)] flex items-center gap-2"
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
                          className="mt-3 w-full h-[74px] rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-6 text-[18px] text-[var(--ci-input-text)] placeholder:text-[var(--ci-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={analyzing || !isAnalyzeReady}
                      className="w-full h-[78px] rounded-3xl bg-[var(--ci-accent-strong)] text-[var(--ci-accent-strong-text)] text-[19px] hover:bg-[var(--ci-accent-strong-hover)] disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                      <p
                        className="text-[14px] text-[var(--ci-error)]"
                        role="alert"
                      >
                        {analyzeError}
                      </p>
                    )}
                  </form>
                </section>
              ) : (
                <section className="max-w-[1120px] mx-auto">
                  <div className="mb-6">
                    <p className="text-[30px] text-[var(--ci-heading-title)]">
                      Analyzing:{" "}
                      <span
                        className="text-[var(--ci-text-strong)]"
                        style={{ fontWeight: 600 }}
                      >
                        {displayedTitle}
                      </span>
                    </p>
                  </div>

                  <div className="border-b border-[var(--ci-divider)] mb-4">
                    <div className="flex gap-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab("feedback")}
                        className={`pb-3 text-[18px] border-b-2 transition-colors cursor-pointer ${
                          activeTab === "feedback"
                            ? "text-[var(--ci-accent-soft-strong)] border-[var(--ci-accent)]"
                            : "text-[var(--ci-text-muted)] border-transparent hover:text-[var(--ci-tab-hover-text)]"
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
                            ? "text-[var(--ci-accent-soft-strong)] border-[var(--ci-accent)]"
                            : "text-[var(--ci-text-muted)] border-transparent hover:text-[var(--ci-tab-hover-text)]"
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
                      <div className="flex items-center gap-2 text-[14px] text-[var(--ci-text-muted)]">
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

                      <div className="rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[0_8px_24px_-18px_rgba(0,0,0,0.75)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setTitleSuggestionsOpen((prev) => !prev)
                          }
                          className="w-full px-6 py-5 flex items-center gap-4 text-left cursor-pointer hover:bg-[var(--ci-surface-hover)] transition-colors"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[var(--ci-surface-accent-soft)] flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[var(--ci-accent-soft)]" />
                          </div>
                          <div className="flex-1">
                            <p
                              className="text-[22px] text-[var(--ci-text-primary)]"
                              style={{ fontWeight: 600 }}
                            >
                              Title Suggestions
                            </p>
                            <p className="text-[15px] text-[var(--ci-text-muted)] mt-1">
                              AI-generated optimized alternatives
                            </p>
                          </div>
                          <span className="rounded-2xl border border-[var(--ci-control-border-alt)] px-4 py-2 text-[14px] text-[var(--ci-text-soft)] flex items-center gap-2">
                            {titleSuggestionsOpen ? "Hide" : "Show"}
                            {titleSuggestionsOpen ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </span>
                        </button>

                        {titleSuggestionsOpen && (
                          <div className="px-6 pb-5 border-t border-[var(--ci-border)] bg-[var(--ci-surface-raised)] space-y-3">
                            {mockPhrases.slice(0, 4).map((phrase) => (
                              <div
                                key={phrase.id}
                                className="rounded-2xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3"
                              >
                                <p
                                  className="text-[14px] text-[var(--ci-text-soft)]"
                                  style={{ fontWeight: 500 }}
                                >
                                  {phrase.phrase}
                                </p>
                                <p className="text-[13px] text-[var(--ci-text-subtle)] mt-1">
                                  Score {phrase.score} - {phrase.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-8">
                        <div className="w-[320px] max-w-full rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 py-4 shadow-[0_18px_35px_-30px_rgba(0,0,0,0.75)]">
                          <div className="flex items-center gap-4">
                            <ScoreRing score={displayedScore} />
                            <div>
                              <p className="text-[19px] text-[var(--ci-text-soft)]">
                                Overall Score
                              </p>
                              <p
                                className="text-[16px] text-[var(--ci-warning)]"
                                style={{ fontWeight: 600 }}
                              >
                                {getScoreLabel(displayedScore)}
                              </p>
                              <p className="text-[15px] text-[var(--ci-text-subtle)]">
                                All aspects
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <ImageIcon className="w-5 h-5 text-[var(--ci-text-muted)]" />
                          <p
                            className="text-[17px] text-[var(--ci-text-heading-soft)]"
                            style={{ fontWeight: 600 }}
                          >
                            Thumbnail
                          </p>
                        </div>
                        {displayedThumbnail ? (
                          <div className="rounded-2xl overflow-hidden border border-[var(--ci-border)] aspect-video">
                            <img
                              src={displayedThumbnail}
                              alt="Analyzed thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border-2 border-dashed border-[var(--ci-border)] aspect-video flex items-center justify-center text-[var(--ci-text-subtle)]">
                            No thumbnail available
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p
                            className="text-[17px] text-[var(--ci-text-heading-soft)]"
                            style={{ fontWeight: 600 }}
                          >
                            Generated thumbnail ideas
                          </p>
                          <div className="flex bg-[var(--ci-toggle-bg)] rounded-xl p-1 border border-[var(--ci-border)]">
                            <button
                              type="button"
                              onClick={() => setThumbnailView("grid")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                                thumbnailView === "grid"
                                  ? "bg-[var(--ci-toggle-active-bg)] text-[var(--ci-accent-soft-strong)] shadow-sm"
                                  : "text-[var(--ci-icon-muted)]"
                              }`}
                            >
                              <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setThumbnailView("list")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                                thumbnailView === "list"
                                  ? "bg-[var(--ci-toggle-active-bg)] text-[var(--ci-accent-soft-strong)] shadow-sm"
                                  : "text-[var(--ci-icon-muted)]"
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
                                  className="rounded-xl overflow-hidden border border-[var(--ci-border)] aspect-video"
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
                                  className="flex gap-3 rounded-xl border border-[var(--ci-border)] p-3"
                                >
                                  <div className="w-36 rounded-lg overflow-hidden border border-[var(--ci-border)] aspect-video flex-shrink-0">
                                    <img
                                      src={source}
                                      alt={`Generated thumbnail ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p
                                      className="text-[15px] text-[var(--ci-text-heading-soft)]"
                                      style={{ fontWeight: 500 }}
                                    >
                                      Variant {index + 1}
                                    </p>
                                    <p className="text-[13px] text-[var(--ci-text-subtle)]">
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
                className={`absolute right-0 top-0 bottom-0 z-20 w-[360px] max-w-[95vw] border-l border-[var(--ci-divider)] bg-[var(--ci-app-bg)] transition-all duration-300 lg:static lg:top-0 lg:bottom-auto lg:max-w-none relative ${
                  drawerOpen
                    ? "translate-x-0 lg:translate-x-0 lg:w-[360px] lg:border-l"
                    : "translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen((prev) => !prev)}
                  className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-40 h-24 w-10 rounded-l-xl border border-r-0 border-[var(--ci-tab-border)] bg-[var(--ci-tab-bg)] text-[var(--ci-tab-text)] flex items-center justify-center shadow-[0_8px_22px_-14px_rgba(0,0,0,0.7)] hover:bg-[var(--ci-tab-hover)] transition-colors cursor-pointer"
                  aria-label={
                    drawerOpen ? "Hide input sidebar" : "Show input sidebar"
                  }
                >
                  <Menu className="w-5 h-5 rotate-90" />
                </button>
                <div className="h-full flex flex-col">
                  <div className="h-[74px] border-b border-[var(--ci-divider)] px-5 flex items-center justify-between">
                    <p
                      className="text-[22px] text-[var(--ci-text-strong)]"
                      style={{ fontWeight: 600 }}
                    >
                      Your Input
                    </p>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="w-9 h-9 rounded-xl border border-[var(--ci-control-border-icon)] flex items-center justify-center text-[var(--ci-text-soft)] cursor-pointer hover:bg-[var(--ci-control-hover-2)] transition-colors"
                      aria-label="Close input drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[var(--ci-input-label)] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <ImageIcon className="w-4 h-4" />
                        THUMBNAIL
                      </p>
                      {displayedThumbnail ? (
                        <div className="rounded-2xl overflow-hidden border border-[var(--ci-border)] bg-[var(--ci-surface)]">
                          <img
                            src={displayedThumbnail}
                            alt="Submitted thumbnail"
                            className="w-full h-[180px] object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface)] h-[140px] flex items-center justify-center text-[var(--ci-text-subtle)]">
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[var(--ci-input-label)] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Type className="w-4 h-4" />
                        TITLE
                      </p>
                      <div className="rounded-2xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[16px] text-[var(--ci-input-field-text)]">
                        {displayedTitle}
                      </div>
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[var(--ci-input-label)] mb-2 flex items-center gap-2"
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
                              className="rounded-full border border-[var(--ci-chip-border)] bg-[var(--ci-chip-bg)] px-3 py-1 text-[13px] text-[var(--ci-chip-text)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[14px] text-[var(--ci-text-subtle)]">
                          No tags provided.
                        </p>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[var(--ci-input-label)] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Hash className="w-4 h-4" />
                        TOPIC / NICHE
                      </p>
                      <div className="rounded-2xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[16px] text-[var(--ci-input-field-text)]">
                        {displayedTopic}
                      </div>
                    </div>

                    <div>
                      <p
                        className="text-[13px] tracking-[0.12em] text-[var(--ci-input-label)] mb-2 flex items-center gap-2"
                        style={{ fontWeight: 600 }}
                      >
                        <Users className="w-4 h-4" />
                        SUBSCRIBERS
                      </p>
                      <div className="rounded-2xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[16px] text-[var(--ci-input-field-text)]">
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
          <div className="w-full max-w-xl rounded-3xl border border-[var(--ci-modal-border)] bg-[var(--ci-modal-bg)] text-[var(--ci-modal-text)] p-6 sm:p-8 shadow-2xl">
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
                <p className="text-[15px] text-[var(--ci-modal-subtext)] mt-2">
                  {authModalMode === "login"
                    ? "Save analyses, revisit feedback, and keep your workspace synced."
                    : "Start saving analyses in your personal sidebar history."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="w-10 h-10 rounded-xl border border-[var(--ci-modal-border)] flex items-center justify-center text-[var(--ci-modal-icon)] hover:bg-[var(--ci-modal-hover)] transition-colors cursor-pointer"
                aria-label="Close auth modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authNotice && (
              <p className="mb-4 rounded-2xl border border-[var(--ci-notice-border)] bg-[var(--ci-notice-bg)] px-4 py-3 text-[13px] text-[var(--ci-notice-text)]">
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
                  className="w-full h-[70px] rounded-2xl border border-[var(--ci-modal-input-border)] bg-[var(--ci-modal-input-bg)] px-5 text-[17px] text-[var(--ci-modal-text)] placeholder:text-[var(--ci-modal-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                  required
                />
                <div className="relative">
                  <input
                    type={loginShowPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full h-[70px] rounded-2xl border border-[var(--ci-modal-input-border)] bg-[var(--ci-modal-input-bg)] px-5 pr-14 text-[17px] text-[var(--ci-modal-text)] placeholder:text-[var(--ci-modal-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setLoginShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ci-icon-secondary)] cursor-pointer"
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
                  className="w-full h-[70px] rounded-2xl bg-[var(--ci-accent)] text-[var(--ci-contrast-on-accent)] text-[18px] hover:bg-[var(--ci-accent-hover)] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                  className="w-full h-[62px] rounded-2xl border border-[var(--ci-modal-input-border)] text-[15px] text-[var(--ci-modal-secondary-text)] hover:bg-[var(--ci-modal-hover)] transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                  className="w-full h-[70px] rounded-2xl border border-[var(--ci-modal-input-border)] bg-[var(--ci-modal-input-bg)] px-5 text-[17px] text-[var(--ci-modal-text)] placeholder:text-[var(--ci-modal-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                  required
                />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full h-[70px] rounded-2xl border border-[var(--ci-modal-input-border)] bg-[var(--ci-modal-input-bg)] px-5 text-[17px] text-[var(--ci-modal-text)] placeholder:text-[var(--ci-modal-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                  required
                />
                <div className="relative">
                  <input
                    type={signupShowPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="Password (8+ characters)"
                    className="w-full h-[70px] rounded-2xl border border-[var(--ci-modal-input-border)] bg-[var(--ci-modal-input-bg)] px-5 pr-14 text-[17px] text-[var(--ci-modal-text)] placeholder:text-[var(--ci-modal-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/30"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setSignupShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ci-icon-secondary)] cursor-pointer"
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
                  className="w-full h-[70px] rounded-2xl bg-[var(--ci-accent)] text-[var(--ci-contrast-on-accent)] text-[18px] hover:bg-[var(--ci-accent-hover)] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                  className="w-full h-[62px] rounded-2xl border border-[var(--ci-modal-input-border)] text-[15px] text-[var(--ci-modal-secondary-text)] hover:bg-[var(--ci-modal-hover)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Already have an account? Log in
                </button>
              </form>
            )}

            {authError && (
              <p
                className="mt-4 text-[14px] text-[var(--ci-error-soft)]"
                role="alert"
              >
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
        <div
          className="min-h-screen bg-[var(--ci-app-bg)] flex items-center justify-center text-[var(--ci-loading-text)]"
          style={getThemeCssVars(DEFAULT_THEME)}
        >
          Loading workspace...
        </div>
      }
    >
      <UnifiedWorkspacePage />
    </Suspense>
  );
}
