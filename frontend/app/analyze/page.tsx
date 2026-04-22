"use client";
import { useState, useRef } from "react";
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
} from "lucide-react";

export default function AnalyzePage() {
  const navigate = useRouteNavigator();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    tags: "",
    topic: "",
    subscriberCount: "",
  });
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalyzeError("Please upload a valid image file.");
      return;
    }

    setAnalyzeError(null);
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setThumbnail(e.target?.result as string);
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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

      navigate("/phrases", {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
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
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer">
            Learn More
          </button>
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
