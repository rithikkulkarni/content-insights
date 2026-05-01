"use client";
import { useEffect, useRef, useState } from "react";
import { useRouteNavigator } from "../lib/routeState";
import {
  BarChart2,
  ArrowLeft,
  Upload,
  X,
  Tag,
  Hash,
  Users,
  Type,
  Sparkles,
  History,
} from "lucide-react";
import { useAuthUser } from "../lib/useAuthUser";
import UserAccountMenu from "../components/UserAccountMenu";

type AnalyzeForm = {
  title: string;
  tags: string;
  topic: string;
  subscriberCount: string;
};

type AnalyzeDraft = {
  form: AnalyzeForm;
  thumbnailDataUrl: string | null;
};

type RecentAnalysisItem = {
  title: string;
  tags: string[];
  topic: string;
  subscriberCount: number | null;
  thumbnailUrl: string | null;
};

const ANALYZE_DRAFT_STORAGE_KEY = "__content_insights_analyze_draft_v1__";
const LAST_ANALYSIS_STORAGE_KEY =
  "__content_insights_last_analysis_inputs_v1__";

function createEmptyForm(): AnalyzeForm {
  return {
    title: "",
    tags: "",
    topic: "",
    subscriberCount: "",
  };
}

function hasAnyInput(form: AnalyzeForm): boolean {
  return (
    form.title.trim().length > 0 ||
    form.tags.trim().length > 0 ||
    form.topic.trim().length > 0 ||
    form.subscriberCount.trim().length > 0
  );
}

function hasDraftContent(draft: AnalyzeDraft): boolean {
  return hasAnyInput(draft.form) || Boolean(draft.thumbnailDataUrl);
}

function normalizeForm(input: Partial<AnalyzeForm>): AnalyzeForm {
  return {
    title: input.title ?? "",
    tags: input.tags ?? "",
    topic: input.topic ?? "",
    subscriberCount: input.subscriberCount ?? "",
  };
}

function formFromRecent(item: RecentAnalysisItem): AnalyzeForm {
  return normalizeForm({
    title: item.title,
    tags: (item.tags ?? []).join(", "),
    topic: item.topic ?? "",
    subscriberCount:
      typeof item.subscriberCount === "number"
        ? String(Math.max(0, item.subscriberCount))
        : "",
  });
}

function parseStoredDraft(raw: string | null): AnalyzeDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as
      | AnalyzeForm
      | AnalyzeDraft
      | { form?: Partial<AnalyzeForm>; thumbnailDataUrl?: string | null };
    const hasFormField =
      typeof parsed === "object" && parsed !== null && "form" in parsed;
    const formCandidate =
      hasFormField && parsed.form ? parsed.form : (parsed as AnalyzeForm);
    const normalizedForm = normalizeForm(formCandidate);
    const thumbnailDataUrl =
      hasFormField && typeof parsed.thumbnailDataUrl === "string"
        ? parsed.thumbnailDataUrl
        : null;

    const draft: AnalyzeDraft = {
      form: normalizedForm,
      thumbnailDataUrl,
    };

    return hasDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

async function dataUrlToFile(
  dataUrl: string,
  fileName: string
): Promise<File | null> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], fileName, {
      type: blob.type || "image/png",
    });
  } catch {
    return null;
  }
}

async function remoteImageToFile(
  imageUrl: string,
  fileName: string
): Promise<{ file: File; preview: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const file = new File([blob], fileName, {
      type: blob.type || "image/png",
    });

    const readerResult = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) ?? null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });

    if (!readerResult) {
      return null;
    }

    return {
      file,
      preview: readerResult,
    };
  } catch {
    return null;
  }
}

export default function AnalyzePage() {
  const navigate = useRouteNavigator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading } = useAuthUser();

  const [form, setForm] = useState<AnalyzeForm>(createEmptyForm);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [sessionDraft, setSessionDraft] = useState<AnalyzeDraft | null>(
    null
  );
  const [recentAnalysisForm, setRecentAnalysisForm] = useState<AnalyzeForm | null>(null);
  const [recentAnalysisThumbnailUrl, setRecentAnalysisThumbnailUrl] = useState<string | null>(null);
  const [loadingAutofill, setLoadingAutofill] = useState(true);
  const [autofilling, setAutofilling] = useState(false);

  const persistDraft = (
    nextForm: AnalyzeForm,
    nextThumbnailDataUrl: string | null = thumbnail
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextDraft: AnalyzeDraft = {
      form: nextForm,
      thumbnailDataUrl: nextThumbnailDataUrl,
    };

    if (!hasDraftContent(nextDraft)) {
      window.sessionStorage.removeItem(ANALYZE_DRAFT_STORAGE_KEY);
      setSessionDraft(null);
      return;
    }

    window.sessionStorage.setItem(
      ANALYZE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        form: nextDraft.form,
        thumbnailDataUrl: nextDraft.thumbnailDataUrl,
        updatedAt: new Date().toISOString(),
      })
    );
    setSessionDraft(nextDraft);
  };

  const updateForm = (nextForm: AnalyzeForm) => {
    setForm(nextForm);
    persistDraft(nextForm);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalyzeError("Please upload a valid image file.");
      return;
    }

    setAnalyzeError(null);
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setThumbnail(preview);
      persistDraft(form, preview);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const nextForm = {
        ...prev,
        [name]: value,
      };
      persistDraft(nextForm);
      return nextForm;
    });
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailFile) {
      setAnalyzeError("Please upload a thumbnail before analyzing.");
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
        score?: number;
        error?: string;
      };
      if (!response.ok || typeof data.score !== "number") {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(ANALYZE_DRAFT_STORAGE_KEY);
        setSessionDraft(null);
        window.localStorage.setItem(
          LAST_ANALYSIS_STORAGE_KEY,
          JSON.stringify(form)
        );
      }

      navigate("/results", {
        state: { form, thumbnail, analysisScore: data.score },
      });
    } catch (error) {
      setAnalyzeError(
        error instanceof Error
          ? error.message
          : "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const isReady = form.title.trim().length > 0;
  const hasAutofillSource =
    sessionDraft !== null || recentAnalysisForm !== null;

  const handleAutofill = async () => {
    const draftSource = sessionDraft;
    const formSource = draftSource?.form ?? recentAnalysisForm;
    if (!formSource) {
      setAnalyzeError("No previous inputs available to autofill yet.");
      return;
    }

    setAutofilling(true);
    setAnalyzeError(null);
    updateForm(formSource);

    // Priority: session draft thumbnail first, then most-recent analyzed thumbnail.
    const sessionThumbnail = draftSource?.thumbnailDataUrl ?? null;
    if (sessionThumbnail) {
      setThumbnail(sessionThumbnail);
      const restoredFile = await dataUrlToFile(
        sessionThumbnail,
        "autofill-thumbnail.png"
      );
      setThumbnailFile(restoredFile);
      setAutofilling(false);
      return;
    }

    if (recentAnalysisThumbnailUrl) {
      const restored = await remoteImageToFile(
        recentAnalysisThumbnailUrl,
        "recent-analysis-thumbnail.png"
      );
      if (restored) {
        setThumbnail(restored.preview);
        setThumbnailFile(restored.file);
        persistDraft(formSource, restored.preview);
      }
    }

    setAutofilling(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft = parseStoredDraft(
      window.sessionStorage.getItem(ANALYZE_DRAFT_STORAGE_KEY)
    );
    if (draft) {
      setSessionDraft(draft);
    }

    const localLastAnalysis = parseStoredDraft(
      window.localStorage.getItem(LAST_ANALYSIS_STORAGE_KEY)
    );
    if (localLastAnalysis) {
      setRecentAnalysisForm(localLastAnalysis.form);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    const loadMostRecentAnalysis = async () => {
      if (!user) {
        setLoadingAutofill(false);
        return;
      }

      try {
        const response = await fetch("/api/analyses/recent", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          items?: RecentAnalysisItem[];
        };
        const first = Array.isArray(data.items) ? data.items[0] : null;
        if (!first || !isMounted) {
          return;
        }

        const nextRecentForm = formFromRecent(first);
        setRecentAnalysisForm(nextRecentForm);
        setRecentAnalysisThumbnailUrl(first.thumbnailUrl ?? null);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            LAST_ANALYSIS_STORAGE_KEY,
            JSON.stringify(nextRecentForm)
          );
        }
      } finally {
        if (isMounted) {
          setLoadingAutofill(false);
        }
      }
    };

    void loadMostRecentAnalysis();

    return () => {
      isMounted = false;
    };
  }, [loading, user]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">
              Content Insights
            </span>
          </div>
          {loading ? (
            <span className="text-xs text-gray-400">Checking session...</span>
          ) : user ? (
            <UserAccountMenu user={user} />
          ) : (
            <button
              onClick={() => navigate("/login?next=/analyze")}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1
              className="text-2xl text-gray-900 mb-2"
              style={{ fontWeight: 700 }}
            >
              Analyze your content
            </h1>
            <p className="text-sm text-gray-500">
              Provide your content details and get AI-powered insights to
              improve performance.
            </p>
            {user ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/results")}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm text-indigo-700 font-medium hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Analyzed Videos
                </button>
              </div>
            ) : (
              !loading && (
                <button
                  type="button"
                  onClick={() => navigate("/login?next=/results")}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Sign in to view previous analyses
                </button>
              )
            )}
            <button
              type="button"
              onClick={handleAutofill}
              disabled={loadingAutofill || autofilling || !hasAutofillSource}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <History className="w-4 h-4" />
              {autofilling ? "Autofilling..." : "Autofill Last Inputs?"}
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col gap-5">
            {/* Thumbnail Upload */}
            <div>
              <label
                className="block text-sm text-gray-700 mb-2 flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                <Upload className="w-4 h-4 text-gray-400" />
                Thumbnail
              </label>
              {thumbnail ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video">
                  <img
                    src={thumbnail}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnail(null);
                      setThumbnailFile(null);
                      persistDraft(form, null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium">
                      Upload thumbnail
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PNG, JPG up to 10MB · Drag & drop or click
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFile(e.target.files[0])
                    }
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                className="block text-sm text-gray-700 mb-2 flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                <Type className="w-4 h-4 text-gray-400" />
                Title
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. How I Gained 10K Subscribers in 30 Days"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {form.title.length} / 100 characters recommended
              </p>
            </div>

            {/* Tags */}
            <div>
              <label
                className="block text-sm text-gray-700 mb-2 flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                <Tag className="w-4 h-4 text-gray-400" />
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g. youtube growth, content creator, subscriber tips"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Separate tags with commas · Aim for 12–15 tags
              </p>
            </div>

            {/* Topic */}
            <div>
              <label
                className="block text-sm text-gray-700 mb-2 flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                <Hash className="w-4 h-4 text-gray-400" />
                Topic / Niche
              </label>
              <input
                type="text"
                name="topic"
                value={form.topic}
                onChange={handleChange}
                placeholder="e.g. YouTube growth, Personal finance, Tech reviews"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Subscriber Count */}
            <div>
              <label
                className="block text-sm text-gray-700 mb-2 flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                <Users className="w-4 h-4 text-gray-400" />
                Subscriber Count
              </label>
              <input
                type="number"
                name="subscriberCount"
                value={form.subscriberCount}
                onChange={handleChange}
                placeholder="e.g. 5200"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Used to benchmark your content against channels of similar size
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isReady || analyzing}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing your content…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
            {analyzeError && (
              <p className="text-sm text-red-500" role="alert">
                {analyzeError}
              </p>
            )}
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Each analysis uses 1 credit · You have{" "}
            <span className="text-indigo-600 font-medium">200 credits</span>{" "}
            remaining
          </p>
        </div>
      </main>
    </div>
  );
}
