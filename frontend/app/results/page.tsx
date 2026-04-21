"use client";
import { useState, useRef, useEffect } from "react";
import { useRouteNavigator, useRouteState } from "../lib/routeState";
import {
  BarChart2,
  Heart,
  Grid3X3,
  List,
  ChevronDown,
  User,
  Settings,
  History,
  LogOut,
  ImageIcon,
  Sparkles,
  Tag,
  Type,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import {
  mockContentItems,
  mockFeedback,
  mockGeneratedThumbnails,
} from "../lib/mockData";

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
type ContentItem = {
  id: string;
  title: string;
  score: number;
  thumbnail: string;
};

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";

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
          {score}
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
  score,
  headline,
  details,
  suggestions,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  score: number;
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
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`text-sm font-medium ${
              score >= 75
                ? "text-emerald-600"
                : score >= 55
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          >
            {score}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
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
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{s}</p>
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

  const analyzedItem: ContentItem | null = form?.title
    ? {
        id: "current-analysis",
        title: form.title,
        score:
          typeof analysisScore === "number" ? analysisScore : mockContentItems[0].score,
        thumbnail: thumbnail ?? mockContentItems[0].thumbnail,
      }
    : null;
  const contentItems: ContentItem[] = analyzedItem
    ? [analyzedItem, ...mockContentItems]
    : mockContentItems;

  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  const [selectedItem, setSelectedItem] = useState<ContentItem>(contentItems[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [thumbnailsGenerated, setThumbnailsGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [thumbnailView, setThumbnailView] = useState<ThumbnailView>("grid");
  const [savedTitle, setSavedTitle] = useState(false);
  const [savedTags, setSavedTags] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setThumbnailsGenerated(true);
    }, 1800);
  };

  const displayedTitle = selectedItem.title;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-4 py-3 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          {/* Left */}
          <button
            onClick={() => navigate("/analyze")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revise
          </button>

          {/* Center */}
          <div className="flex items-center gap-4">
            {form?.subscriberCount && (
              <span className="text-xs text-gray-400 hidden sm:block">
                <span className="font-medium text-gray-600">
                  {Number(form.subscriberCount).toLocaleString()}
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

          {/* Right */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
              Get Credits
            </button>

            {/* User avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30">
                  {[
                    { icon: User, label: "Profile" },
                    { icon: Settings, label: "Settings" },
                    { icon: History, label: "History" },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex max-w-screen-xl mx-auto w-full">
        {/* Left Panel */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col hidden md:flex">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Analyzed Content
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
            {contentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selectedItem.id === item.id
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
                style={{ fontWeight: selectedItem.id === item.id ? 500 : 400 }}
              >
                <span className="line-clamp-2 leading-snug">{item.title}</span>
              </button>
            ))}
          </div>

          {/* Score */}
          <div className="p-5 border-t border-gray-100 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Overall Score
            </p>
            <ScoreRing score={selectedItem.score} />
            <p className="text-xs text-gray-500 text-center">
              {selectedItem.score >= 75
                ? "Good · Minor improvements available"
                : selectedItem.score >= 55
                  ? "Fair · Several improvements suggested"
                  : "Needs work · Key issues found"}
            </p>
          </div>
        </aside>

        {/* Right Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile: selected title + score */}
          <div className="md:hidden p-4 bg-white border-b border-gray-100 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-0.5">Analyzing</p>
              <p className="text-sm text-gray-800 font-medium line-clamp-1">
                {selectedItem.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                {selectedItem.score}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-100 px-6 pt-4">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-5 py-2 rounded-lg text-sm transition-all ${
                  activeTab === "feedback"
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700 cursor-pointer"
                }`}
              >
                Feedback
              </button>
              <button
                onClick={() => setActiveTab("visual")}
                className={`px-5 py-2 rounded-lg text-sm transition-all ${
                  activeTab === "visual"
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700 cursor-pointer"
                }`}
              >
                Visual
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
                  score={mockFeedback.thumbnail.score}
                  headline={mockFeedback.thumbnail.headline}
                  details={mockFeedback.thumbnail.details}
                  suggestions={mockFeedback.thumbnail.suggestions}
                  color="text-indigo-600"
                  bg="bg-indigo-50"
                />
                <FeedbackCard
                  icon={Type}
                  label="Title Feedback"
                  score={mockFeedback.title.score}
                  headline={mockFeedback.title.headline}
                  details={mockFeedback.title.details}
                  suggestions={mockFeedback.title.suggestions}
                  color="text-violet-600"
                  bg="bg-violet-50"
                />
                <FeedbackCard
                  icon={Tag}
                  label="Tags Feedback"
                  score={mockFeedback.tags.score}
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
                {/* Thumbnail Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span
                        className="text-sm text-gray-700"
                        style={{ fontWeight: 600 }}
                      >
                        Thumbnail
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        /* save */
                      }}
                      className={`text-gray-300 hover:text-rose-400 transition-colors cursor-pointer`}
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preview */}
                  {thumbnail ? (
                    <div className="rounded-xl overflow-hidden border border-gray-100 aspect-video mb-4">
                      <img
                        src={thumbnail}
                        alt="Your thumbnail"
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

                  {/* Generate button */}
                  {!thumbnailsGenerated ? (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {generating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating thumbnails…
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
                            className={`p-1.5 rounded-md transition-colors ${thumbnailView === "list" ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setThumbnailView("grid")}
                            className={`p-1.5 rounded-md transition-colors ${thumbnailView === "grid" ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
                          >
                            <Grid3X3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {thumbnailView === "grid" ? (
                        <div className="grid grid-cols-3 gap-2">
                          {mockGeneratedThumbnails.map((src, i) => (
                            <div
                              key={i}
                              className="rounded-lg overflow-hidden border border-gray-100 aspect-video relative group cursor-pointer"
                            >
                              <img
                                src={src}
                                alt={`Generated ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-1.5">
                                <button className="opacity-0 group-hover:opacity-100 text-white transition-opacity cursor-pointer">
                                  <Heart className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {mockGeneratedThumbnails.map((src, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-gray-50 cursor-pointer transition-all group"
                            >
                              <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden aspect-video">
                                <img
                                  src={src}
                                  alt={`Generated ${i + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">
                                  Variant {i + 1}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Click to use
                                </p>
                              </div>
                              <button className="text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0 cursor-pointer">
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Title Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-gray-400" />
                      <span
                        className="text-sm text-gray-700"
                        style={{ fontWeight: 600 }}
                      >
                        Title
                      </span>
                    </div>
                    <button
                      onClick={() => setSavedTitle(!savedTitle)}
                      className={`transition-colors ${savedTitle ? "text-rose-400 cursor-pointer" : "text-gray-300 hover:text-rose-400 cursor-pointer"}`}
                    >
                      <Heart
                        className={`w-4 h-4 ${savedTitle ? "fill-rose-400" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-800">
                      {displayedTitle || "No title provided"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {(displayedTitle || "").length} characters
                  </p>
                </div>

                {/* Tags Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span
                        className="text-sm text-gray-700"
                        style={{ fontWeight: 600 }}
                      >
                        Tags
                      </span>
                    </div>
                    <button
                      onClick={() => setSavedTags(!savedTags)}
                      className={`transition-colors ${savedTags ? "text-rose-400 cursor-pointer" : "text-gray-300 hover:text-rose-400 cursor-pointer"}`}
                    >
                      <Heart
                        className={`w-4 h-4 ${savedTags ? "fill-rose-400" : ""}`}
                      />
                    </button>
                  </div>
                  {form?.tags ? (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.split(",").map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs border border-indigo-100"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {[
                        "youtube growth",
                        "content creator",
                        "subscriber tips",
                        "youtube 2024",
                        "creator strategy",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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
