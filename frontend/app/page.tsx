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
  Check,
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
import { mockGeneratedThumbnails } from "./lib/mockData";
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

type FeedbackSection = {
  headline: string;
  details: string;
  tips: [string, string, string];
};

type AnalysisFeedback = {
  thumbnail: FeedbackSection;
  title: FeedbackSection;
  tags: FeedbackSection;
};

type RecentAnalysisItem = {
  id: string;
  title: string;
  tags: string[];
  topic: string;
  subscriberCount: number | null;
  createdAt: string;
  score: number | null;
  feedback: AnalysisFeedback;
  thumbnailUrl: string | null;
};

type Tab = "feedback" | "visual";
type ThumbnailView = "list" | "grid";
type AuthMode = "login" | "signup";

type HistorySection = {
  label: string;
  items: RecentAnalysisItem[];
};

type YoutubePreviewVideo = {
  id: string;
  title: string;
  channel: string;
  views: string;
  postedAt: string;
  duration: string;
  description: string;
  thumbnail: string;
  isUser?: boolean;
};

function getMockThumbnail(index: number): string {
  if (mockGeneratedThumbnails.length === 0) {
    return "";
  }
  const safeIndex =
    ((index % mockGeneratedThumbnails.length) +
      mockGeneratedThumbnails.length) %
    mockGeneratedThumbnails.length;
  return mockGeneratedThumbnails[safeIndex];
}

const YOUTUBE_PREVIEW_POOL: YoutubePreviewVideo[] = [
  {
    id: "sample-1",
    title: "How to Beat Tough Opponents in Low Stakes Poker",
    channel: "River Theory",
    views: "951K views",
    postedAt: "6 months ago",
    duration: "32:13",
    description:
      "Every key hand from the session with decisions broken down street by street.",
    thumbnail: getMockThumbnail(0),
  },
  {
    id: "sample-2",
    title: "From Broke to Bankroll: $150,000 Challenge",
    channel: "Wolfgang Poker",
    views: "49K views",
    postedAt: "2 days ago",
    duration: "18:49",
    description:
      "A full poker vlog covering high-pressure spots and bankroll risk management.",
    thumbnail: getMockThumbnail(1),
  },
  {
    id: "sample-3",
    title: "Why Your Cards Matter Less Than You Think",
    channel: "NorCalPoker",
    views: "39K views",
    postedAt: "2 weeks ago",
    duration: "27:33",
    description:
      "Table dynamics and positioning concepts explained with practical hand examples.",
    thumbnail: getMockThumbnail(2),
  },
  {
    id: "sample-4",
    title: "Cash Game Invitational Highlights",
    channel: "Triton Poker",
    views: "2.1M views",
    postedAt: "4 weeks ago",
    duration: "14:36",
    description:
      "Big pots, player reads, and momentum shifts from a stacked cash game lineup.",
    thumbnail: getMockThumbnail(3),
  },
  {
    id: "sample-5",
    title: "Every Play with a Nickname!",
    channel: "NFL Throwback",
    views: "7.1M views",
    postedAt: "3 years ago",
    duration: "30:33",
    description:
      "Iconic moments revisited with commentary and behind-the-play context.",
    thumbnail: getMockThumbnail(4),
  },
  {
    id: "sample-6",
    title: "No Game No Life OP - Piano Arrangement",
    channel: "Luminote",
    views: "966K views",
    postedAt: "5 years ago",
    duration: "5:05",
    description:
      "A cinematic piano performance with layered visuals and synchronized highlights.",
    thumbnail: getMockThumbnail(5),
  },
];

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647;
  }
  return Math.abs(hash);
}

function rotateVideos<T>(items: T[], offset: number): T[] {
  if (items.length === 0) {
    return [];
  }
  const safeOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

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

function isFeedbackSection(value: unknown): value is FeedbackSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const headline = (value as { headline?: unknown }).headline;
  const details = (value as { details?: unknown }).details;
  const tips = (value as { tips?: unknown }).tips;
  return (
    typeof headline === "string" &&
    typeof details === "string" &&
    Array.isArray(tips) &&
    tips.length === 3 &&
    tips.every((tip) => typeof tip === "string")
  );
}

function isAnalysisFeedback(value: unknown): value is AnalysisFeedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const root = value as {
    thumbnail?: unknown;
    title?: unknown;
    tags?: unknown;
  };
  return (
    isFeedbackSection(root.thumbnail) &&
    isFeedbackSection(root.title) &&
    isFeedbackSection(root.tags)
  );
}

const FALLBACK_FEEDBACK: AnalysisFeedback = {
  thumbnail: {
    headline: "No feedback available yet",
    details: "Run an analysis to generate thumbnail feedback.",
    tips: [
      "Use stronger contrast around key elements.",
      "Keep text short and easy to read.",
      "Highlight one clear focal point.",
    ],
  },
  title: {
    headline: "No feedback available yet",
    details: "Run an analysis to generate title feedback.",
    tips: [
      "Lead with the clearest audience outcome.",
      "Use stronger emotional framing.",
      "Reduce filler words for clarity.",
    ],
  },
  tags: {
    headline: "No feedback available yet",
    details: "Run an analysis to generate tags feedback.",
    tips: [
      "Add long-tail intent-driven phrases.",
      "Align tags with title wording.",
      "Include niche and audience keywords.",
    ],
  },
};

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

function ScoreRing({
  score,
  size = 80,
}: {
  score: number | null;
  size?: number;
}) {
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

  const scoreFontSize = Math.round(size * 0.35);
  const labelFontSize = Math.round(size * 0.14);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        className="-rotate-90"
        style={{ width: size, height: size }}
        viewBox="0 0 100 100"
      >
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
          className="text-[var(--ci-text-primary)]"
          style={{ fontWeight: 700, fontSize: scoreFontSize }}
        >
          {typeof score === "number" ? score : "--"}
        </span>
        <span
          className="text-[var(--ci-text-subtle)]"
          style={{ fontSize: labelFontSize }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

function FeedbackCard({
  icon: Icon,
  title,
  summary,
  details,
  tips,
  thumbnailMode,
  generatedThumbnail,
  onGenerate,
  showGenerateButton,
  generateDisabled,
  generateBusy,
  generateLabel = "Generate Suggestion",
  onThumbnailClick,
}: {
  icon: ElementType;
  title: string;
  summary: string;
  details: string;
  tips?: string[];
  thumbnailMode?: boolean;
  generatedThumbnail?: string | null;
  onGenerate?: () => void;
  showGenerateButton?: boolean;
  generateDisabled?: boolean;
  generateBusy?: boolean;
  generateLabel?: string;
  onThumbnailClick?: () => void;
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
          {open ? (
            <ChevronUp className="w-6 h-6 text-[var(--ci-icon-muted-2)]" />
          ) : (
            <ChevronDown className="w-6 h-6 text-[var(--ci-icon-muted-2)]" />
          )}
        </div>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5 border-t border-[var(--ci-border)] bg-[var(--ci-surface-raised)]">
            {thumbnailMode ? (
              <div
                className="mt-4"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                <div className="min-w-0">
                  <p className="text-[15px] leading-relaxed text-[var(--ci-text-soft)]">
                    {details}
                  </p>
                  {tips && tips.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {tips.map((tip, index) => (
                        <li
                          key={`${title}-tip-${index}`}
                          className="flex items-start gap-2 text-[14px] leading-relaxed text-[var(--ci-text-soft)]"
                        >
                          <Check className="w-4 h-4 text-[var(--ci-accent-soft)] mt-[2px] flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className="rounded-xl border-2 border-dashed border-[var(--ci-border)] overflow-hidden w-full"
                    style={{ aspectRatio: "16/9" }}
                  >
                    {generatedThumbnail ? (
                      <button
                        type="button"
                        onClick={onThumbnailClick}
                        className="w-full h-full cursor-pointer"
                      >
                        <img
                          src={generatedThumbnail}
                          alt="Generated thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onGenerate}
                        disabled={generateDisabled ?? !onGenerate}
                        className={`w-full h-full flex items-center justify-center gap-2 transition-colors ${
                          (generateDisabled ?? !onGenerate)
                            ? "text-[var(--ci-text-subtle)] cursor-not-allowed opacity-60"
                            : "text-[var(--ci-text-soft)] hover:bg-[var(--ci-surface-hover)] cursor-pointer"
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        {generateBusy ? (
                          <LoaderCircle className="w-4 h-4 animate-spin text-[var(--ci-accent-soft)]" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[var(--ci-accent-soft)]" />
                        )}
                        <span className="text-[14px]">{generateLabel}</span>
                      </button>
                    )}
                  </div>
                  {generatedThumbnail && (
                    <p className="text-[11px] text-center text-[var(--ci-text-subtle)]">
                      Click to enlarge
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`mt-4 ${
                  showGenerateButton
                    ? "sm:flex sm:items-stretch sm:justify-between sm:gap-4"
                    : ""
                }`}
              >
                <div className={showGenerateButton ? "min-w-0 flex-1" : ""}>
                  <p className="text-[15px] leading-relaxed text-[var(--ci-text-soft)]">
                    {details}
                  </p>
                  {tips && tips.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {tips.map((tip, index) => (
                        <li
                          key={`${title}-tip-${index}`}
                          className="flex items-start gap-2 text-[14px] leading-relaxed text-[var(--ci-text-soft)]"
                        >
                          <Check className="w-4 h-4 text-[var(--ci-accent-soft)] mt-[2px] flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {showGenerateButton && (
                  <div className="mt-4 sm:mt-0 sm:ml-2 sm:flex sm:flex-col sm:justify-end sm:flex-shrink-0">
                    <button
                      type="button"
                      onClick={onGenerate}
                      disabled={generateDisabled ?? !onGenerate}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--ci-border)] text-[14px] transition-colors ${
                        (generateDisabled ?? !onGenerate)
                          ? "opacity-60 cursor-not-allowed text-[var(--ci-text-subtle)]"
                          : "text-[var(--ci-text-soft)] hover:bg-[var(--ci-surface-hover)] cursor-pointer"
                      }`}
                      style={{ fontWeight: 500 }}
                    >
                      {generateBusy ? (
                        <LoaderCircle className="w-4 h-4 animate-spin text-[var(--ci-accent-soft)]" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[var(--ci-accent-soft)]" />
                      )}
                      {generateLabel}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      style={{ backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: "50vw", maxHeight: "50vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="block object-contain"
          style={{ maxWidth: "50vw", maxHeight: "50vh" }}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
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
  const [imageModal, setImageModal] = useState<{
    src: string;
    alt: string;
  } | null>(null);

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
  const displayedFeedback =
    workspaceMode === "analysis"
      ? (selectedAnalysis?.feedback ?? FALLBACK_FEEDBACK)
      : FALLBACK_FEEDBACK;
  const userChannelName = user?.email?.split("@")[0]?.trim() || "Your Channel";
  const previewVideos = useMemo(() => {
    const seedSource = `${selectedAnalysis?.id ?? "new"}:${displayedTitle}:${displayedTopic}`;
    const rotatedPool = rotateVideos(
      YOUTUBE_PREVIEW_POOL,
      hashText(seedSource) % YOUTUBE_PREVIEW_POOL.length
    );
    const userVideo: YoutubePreviewVideo = {
      id: "user-video",
      title: displayedTitle,
      channel: userChannelName,
      views: "0 views",
      postedAt: "Not posted",
      duration: "10:00",
      description:
        displayedTopic !== "Not provided"
          ? `Niche: ${displayedTopic}`
          : "Your draft video preview appears here before publishing.",
      thumbnail: displayedThumbnail ?? getMockThumbnail(0),
      isUser: true,
    };

    return [
      rotatedPool[0],
      userVideo,
      rotatedPool[1],
      rotatedPool[2],
      rotatedPool[3],
      rotatedPool[4],
    ].filter(Boolean) as YoutubePreviewVideo[];
  }, [
    displayedThumbnail,
    displayedTitle,
    displayedTopic,
    selectedAnalysis?.id,
    userChannelName,
  ]);
  const listPreviewVideos = useMemo(() => {
    if (previewVideos.length < 6) {
      return previewVideos;
    }
    return [
      previewVideos[3],
      previewVideos[1],
      previewVideos[4],
      previewVideos[0],
      previewVideos[5],
    ];
  }, [previewVideos]);

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
        feedback?: unknown;
        error?: string;
      };

      if (!response.ok || typeof data.score !== "number") {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }
      const feedback = isAnalysisFeedback(data.feedback)
        ? data.feedback
        : FALLBACK_FEEDBACK;

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
        feedback,
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
                        Visualize
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
                        summary={displayedFeedback.thumbnail.headline}
                        details={displayedFeedback.thumbnail.details}
                        tips={displayedFeedback.thumbnail.tips}
                        thumbnailMode
                        generateDisabled
                      />
                      <FeedbackCard
                        icon={Type}
                        title="Title Feedback"
                        summary={displayedFeedback.title.headline}
                        details={displayedFeedback.title.details}
                        tips={displayedFeedback.title.tips}
                        showGenerateButton
                        generateDisabled
                      />
                      <FeedbackCard
                        icon={Tag}
                        title="Tags Feedback"
                        summary={displayedFeedback.tags.headline}
                        details={displayedFeedback.tags.details}
                        tips={displayedFeedback.tags.tips}
                        showGenerateButton
                        generateDisabled
                      />

                      <div className="pt-8">
                        <div className="w-[400px] max-w-full rounded-3xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-6 py-5 shadow-[0_18px_35px_-30px_rgba(0,0,0,0.75)]">
                          <div className="flex items-center gap-5">
                            <ScoreRing score={displayedScore} size={100} />
                            <div>
                              <p className="text-[24px] text-[var(--ci-text-soft)]">
                                Overall Score
                              </p>
                              <p
                                className="text-[20px] text-[var(--ci-warning)]"
                                style={{ fontWeight: 600 }}
                              >
                                {getScoreLabel(displayedScore)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-0 sm:p-0">
                      <div className="flex justify-end mb-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {previewVideos.map((video, index) => (
                            <article
                              key={`${video.id}-${index}`}
                              className="relative"
                            >
                              <button
                                type="button"
                                className="relative w-full rounded-2xl overflow-hidden aspect-video block cursor-zoom-in"
                                onClick={() =>
                                  setImageModal({
                                    src: video.thumbnail,
                                    alt: video.title,
                                  })
                                }
                              >
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] text-white">
                                  {video.duration}
                                </span>
                              </button>

                              <div className="mt-2 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#262626] text-[#e7e7e7] flex items-center justify-center text-[12px]">
                                  {video.channel.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-[16px] leading-[1.25] text-[#f1f1f1] truncate"
                                    style={{ fontWeight: 500 }}
                                  >
                                    {video.title}
                                  </p>
                                  <p className="text-[13px] text-[#a8a8a8] mt-0.5 truncate">
                                    {video.channel}
                                  </p>
                                  <p className="text-[13px] text-[#a8a8a8] mt-0.5 truncate">
                                    {video.views} • {video.postedAt}
                                  </p>
                                </div>
                                <span className="text-[#9a9a9a] text-[18px] leading-none">
                                  ⋮
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {listPreviewVideos.map((video, index) => (
                            <article
                              key={`${video.id}-list-${index}`}
                              className="relative flex gap-2 rounded-xl p-1"
                            >
                              <button
                                type="button"
                                className="relative w-[34%] max-w-[220px] rounded-lg overflow-hidden aspect-video flex-shrink-0 cursor-zoom-in block"
                                onClick={() =>
                                  setImageModal({
                                    src: video.thumbnail,
                                    alt: video.title,
                                  })
                                }
                              >
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] text-white">
                                  {video.duration}
                                </span>
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className="text-[18px] leading-[1.2] text-[#f1f1f1] truncate"
                                    style={{ fontWeight: 500 }}
                                  >
                                    {video.title}
                                  </p>
                                  <span className="text-[#9a9a9a] text-[16px] leading-none">
                                    ⋮
                                  </span>
                                </div>
                                <p className="text-[12px] text-[#a8a8a8] mt-0.5">
                                  {video.views} • {video.postedAt}
                                </p>
                                <p className="text-[12px] text-[#a8a8a8] mt-0.5 truncate">
                                  {video.channel}
                                </p>
                                <p className="text-[11px] text-[#8c8c8c] mt-0.5 leading-relaxed truncate">
                                  {video.description}
                                </p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
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
                        <button
                          type="button"
                          className="w-full rounded-2xl overflow-hidden border border-[var(--ci-border)] bg-[var(--ci-surface)] block cursor-zoom-in"
                          onClick={() =>
                            setImageModal({
                              src: displayedThumbnail,
                              alt: "Submitted thumbnail",
                            })
                          }
                        >
                          <img
                            src={displayedThumbnail}
                            alt="Submitted thumbnail"
                            className="w-full h-[180px] object-cover"
                          />
                        </button>
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

      {imageModal && (
        <ImageModal
          src={imageModal.src}
          alt={imageModal.alt}
          onClose={() => setImageModal(null)}
        />
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
