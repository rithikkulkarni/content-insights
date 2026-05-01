"use client";
import { useEffect, useMemo, useState, type ElementType } from "react";
import { useRouteNavigator, useRouteState } from "../lib/routeState";
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  CheckCircle,
  ChevronDown,
  CreditCard,
  Grid3X3,
  ImageIcon,
  List,
  Sparkles,
  Tag,
  Type,
} from "lucide-react";
import { mockFeedback, mockGeneratedThumbnails } from "../lib/mockData";
import { useAuthUser } from "../lib/useAuthUser";
import UserAccountMenu from "../components/UserAccountMenu";

type AnalysisForm = {
  title: string;
  tags: string;
  topic: string;
  subscriberCount: string;
};

type ResultsState = {
  form?: AnalysisForm;
  thumbnail?: string | null;
  analysisScore?: number;
};

type Tab = "feedback" | "visual";
type ThumbnailView = "list" | "grid";

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

function ScoreRing({ score }: { score: number | null }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = typeof score === "number" ? score : 0;
  const offset = circumference - (normalizedScore / 100) * circumference;
  const color =
    typeof score !== "number"
      ? "#94a3b8"
      : score >= 75
        ? "#22c55e"
        : score >= 55
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#f1f5f9"
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
        <span className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
          {typeof score === "number" ? score : "--"}
        </span>
        <span className="text-xs text-gray-400" style={{ fontWeight: 400 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function FeedbackCard({
  icon: Icon,
  label,
  headline,
  details,
  suggestions,
  color,
  bg,
}: {
  icon: ElementType;
  label: string;
  headline: string;
  details: string;
  suggestions: string[];
  color: string;
  bg: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <div
          className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
            {label}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{headline}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <p className="text-sm text-gray-600 leading-relaxed mt-4">
            {details}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Suggestions
            </p>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const navigate = useRouteNavigator();
  const routeState = useRouteState<ResultsState>();
  const { form, thumbnail, analysisScore } = routeState ?? {};

  const fallbackItem = useMemo<RecentAnalysisItem | null>(() => {
    if (!form?.title) {
      return null;
    }

    const parsedTags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const parsedSubscriberCount = Number.parseInt(form.subscriberCount, 10);

    return {
      id: "current-analysis",
      title: form.title,
      tags: parsedTags,
      topic: form.topic || "",
      subscriberCount: Number.isFinite(parsedSubscriberCount)
        ? Math.max(0, parsedSubscriberCount)
        : null,
      createdAt: new Date().toISOString(),
      score: typeof analysisScore === "number" ? analysisScore : null,
      thumbnailUrl: thumbnail ?? null,
    };
  }, [analysisScore, form, thumbnail]);

  const [recentItems, setRecentItems] = useState<RecentAnalysisItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  const [thumbnailsGenerated, setThumbnailsGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [thumbnailView, setThumbnailView] = useState<ThumbnailView>("grid");
  const { user, loading } = useAuthUser();

  useEffect(() => {
    const loadRecentAnalyses = async () => {
      setLoadingRecent(true);
      setRecentError(null);
      try {
        const response = await fetch("/api/analyses/recent", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          items?: RecentAnalysisItem[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load recent analyses.");
        }
        setRecentItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        setRecentError(
          error instanceof Error
            ? error.message
            : "Failed to load recent analyses."
        );
      } finally {
        setLoadingRecent(false);
      }
    };

    void loadRecentAnalyses();
  }, []);

  const contentItems = useMemo(() => {
    if (recentItems.length > 0) {
      return recentItems;
    }
    return fallbackItem ? [fallbackItem] : [];
  }, [fallbackItem, recentItems]);

  useEffect(() => {
    if (!contentItems.length) {
      setSelectedItemId(null);
      return;
    }

    const hasSelection = contentItems.some(
      (item) => item.id === selectedItemId
    );
    if (!selectedItemId || !hasSelection) {
      setSelectedItemId(contentItems[0].id);
    }
  }, [contentItems, selectedItemId]);

  const selectedItem =
    contentItems.find((item) => item.id === selectedItemId) ?? contentItems[0];
  const displayedTitle = selectedItem?.title ?? "No title provided";
  const displayedTags = selectedItem?.tags ?? [];
  const subscriberCount = selectedItem?.subscriberCount ?? null;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setThumbnailsGenerated(true);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-4 py-3 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/analyze")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Analyze
          </button>

          <div className="flex items-center gap-4">
            {typeof subscriberCount === "number" && (
              <span className="text-xs text-gray-400 hidden sm:block">
                <span className="font-medium text-gray-600">
                  {subscriberCount.toLocaleString()}
                </span>{" "}
                subscribers
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 tracking-tight text-sm">
                Content Insights
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
              Get Credits
            </button>
            {loading ? (
              <span className="text-xs text-gray-400">Checking session...</span>
            ) : user ? (
              <UserAccountMenu user={user} />
            ) : (
              <button
                onClick={() => navigate("/login?next=/results")}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-screen-xl mx-auto w-full">
        <aside className="w-64 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col hidden md:flex">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Recently Analyzed Content
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
            {contentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selectedItem?.id === item.id
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
                style={{ fontWeight: selectedItem?.id === item.id ? 500 : 400 }}
              >
                <span className="line-clamp-2 leading-snug">{item.title}</span>
              </button>
            ))}
            {!loadingRecent && contentItems.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-1">
                No analyses yet.
              </p>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Overall Score
            </p>
            <ScoreRing score={selectedItem?.score ?? null} />
            <p className="text-xs text-gray-500 text-center">
              {typeof selectedItem?.score !== "number"
                ? "Score unavailable for this entry"
                : selectedItem.score >= 75
                  ? "Good. Minor improvements available."
                  : selectedItem.score >= 55
                    ? "Fair. Several improvements suggested."
                    : "Needs work. Key issues found."}
            </p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="md:hidden p-4 bg-white border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Analyzing</p>
            <p className="text-sm text-gray-800 font-medium line-clamp-1">
              {displayedTitle}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Overall score:{" "}
              {typeof selectedItem?.score === "number"
                ? selectedItem.score
                : "Unavailable"}
            </p>
          </div>

          <div className="bg-white border-b border-gray-100 px-6 pt-4">
            <div className="max-w-2xl">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full">
                <button
                  onClick={() => setActiveTab("feedback")}
                  className={`flex-1 px-5 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "feedback"
                      ? "bg-white text-gray-900 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700 cursor-pointer"
                  }`}
                >
                  Feedback
                </button>
                <button
                  onClick={() => setActiveTab("visual")}
                  className={`flex-1 px-5 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "visual"
                      ? "bg-white text-gray-900 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700 cursor-pointer"
                  }`}
                >
                  Visual
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {recentError && (
              <p className="max-w-2xl text-sm text-red-500 mb-4" role="alert">
                {recentError}
              </p>
            )}

            {activeTab === "feedback" && (
              <div className="max-w-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h2
                    className="text-base text-gray-900"
                    style={{ fontWeight: 600 }}
                  >
                    Content Feedback
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Click each card to expand
                  </div>
                </div>

                <FeedbackCard
                  icon={ImageIcon}
                  label="Thumbnail Feedback"
                  headline={mockFeedback.thumbnail.headline}
                  details={mockFeedback.thumbnail.details}
                  suggestions={mockFeedback.thumbnail.suggestions}
                  color="text-indigo-600"
                  bg="bg-indigo-50"
                />
                <FeedbackCard
                  icon={Type}
                  label="Title Feedback"
                  headline={mockFeedback.title.headline}
                  details={mockFeedback.title.details}
                  suggestions={mockFeedback.title.suggestions}
                  color="text-violet-600"
                  bg="bg-violet-50"
                />
                <FeedbackCard
                  icon={Tag}
                  label="Tags Feedback"
                  headline={mockFeedback.tags.headline}
                  details={mockFeedback.tags.details}
                  suggestions={mockFeedback.tags.suggestions}
                  color="text-emerald-600"
                  bg="bg-emerald-50"
                />
              </div>
            )}

            {activeTab === "visual" && (
              <div className="max-w-2xl flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    <span
                      className="text-sm text-gray-700"
                      style={{ fontWeight: 600 }}
                    >
                      Thumbnail
                    </span>
                  </div>

                  {selectedItem?.thumbnailUrl ? (
                    <div className="rounded-xl overflow-hidden border border-gray-100 aspect-video mb-4">
                      <img
                        src={selectedItem.thumbnailUrl}
                        alt="Analyzed thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-video mb-4 flex flex-col items-center justify-center gap-2 bg-gray-50">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                      <p className="text-xs text-gray-400">
                        No thumbnail uploaded
                      </p>
                    </div>
                  )}

                  {!thumbnailsGenerated ? (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {generating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating thumbnails...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Thumbnail
                        </>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-700 font-medium">
                          Generated thumbnails
                        </p>
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                          <button
                            onClick={() => setThumbnailView("list")}
                            className={`p-1.5 rounded-md transition-colors ${
                              thumbnailView === "list"
                                ? "bg-white shadow-sm"
                                : "text-gray-400 hover:text-gray-600 cursor-pointer"
                            }`}
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setThumbnailView("grid")}
                            className={`p-1.5 rounded-md transition-colors ${
                              thumbnailView === "grid"
                                ? "bg-white shadow-sm"
                                : "text-gray-400 hover:text-gray-600 cursor-pointer"
                            }`}
                          >
                            <Grid3X3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {thumbnailView === "grid" ? (
                        <div className="grid grid-cols-3 gap-2">
                          {mockGeneratedThumbnails.map((src, index) => (
                            <div
                              key={index}
                              className="rounded-lg overflow-hidden border border-gray-100 aspect-video"
                            >
                              <img
                                src={src}
                                alt={`Generated ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {mockGeneratedThumbnails.map((src, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-gray-50 cursor-pointer transition-all"
                            >
                              <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden aspect-video">
                                <img
                                  src={src}
                                  alt={`Generated ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">
                                  Variant {index + 1}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Click to use
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Type className="w-4 h-4 text-gray-400" />
                    <span
                      className="text-sm text-gray-700"
                      style={{ fontWeight: 600 }}
                    >
                      Title
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-800">{displayedTitle}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {displayedTitle.length} characters
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span
                      className="text-sm text-gray-700"
                      style={{ fontWeight: 600 }}
                    >
                      Tags
                    </span>
                  </div>
                  {displayedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {displayedTags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs border border-indigo-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No tags provided.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
