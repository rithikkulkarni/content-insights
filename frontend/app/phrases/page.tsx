"use client";
import { useState } from "react";
import { useRouteNavigator, useRouteState } from "../lib/routeState";
import {
  BarChart2,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { mockPhrases } from "../lib/mockData";

type AnalysisForm = {
  title: string;
  tags: string;
  topic: string;
  subscriberCount: string;
};

type PhrasesState = {
  form?: AnalysisForm;
  thumbnail?: string | null;
  analysisScore?: number;
};

export default function PhrasesPage() {
  const navigate = useRouteNavigator();
  const routeState = useRouteState<PhrasesState>();
  const { form, thumbnail, analysisScore } = routeState ?? {};

  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    navigate("/results", {
      state: {
        form: selected
          ? {
              ...form,
              title: mockPhrases.find((p) => p.id === selected)?.phrase,
            }
          : form,
        thumbnail,
        analysisScore,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/analyze")}
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
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
            Learn More
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          {/* Heading */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span className="text-xs text-indigo-700 font-medium">
                AI-generated optimizations
              </span>
            </div>
            <h1
              className="text-2xl text-gray-900 mb-2"
              style={{ fontWeight: 700 }}
            >
              Different phrases
            </h1>
            <p className="text-sm text-gray-500">
              We analyzed your title and generated higher-performing
              alternatives. Select one to use, or keep your original.
            </p>

            {/* Original title chip */}
            {form?.title && (
              <div className="mt-4 p-3 bg-gray-100 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-400 mb-0.5">
                  Your original title
                </p>
                <p className="text-sm text-gray-700">{form.title}</p>
              </div>
            )}
          </div>

          {/* Phrase options */}
          <div className="flex flex-col gap-3 mb-8">
            {mockPhrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                onClick={() =>
                  setSelected(selected === phrase.id ? null : phrase.id)
                }
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected === phrase.id
                    ? "border-indigo-400 bg-indigo-50 shadow-sm cursor-pointer"
                    : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p
                      className="text-sm text-gray-900 mb-1.5"
                      style={{ fontWeight: selected === phrase.id ? 600 : 400 }}
                    >
                      {phrase.phrase}
                    </p>
                    <p className="text-xs text-gray-400">{phrase.reason}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span
                        className={`text-xs font-medium ${
                          phrase.score >= 85
                            ? "text-emerald-600"
                            : phrase.score >= 75
                              ? "text-amber-600"
                              : "text-gray-500"
                        }`}
                      >
                        {phrase.score}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected === phrase.id
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selected === phrase.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleContinue}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {selected
                ? "Use Selected Phrase & View Results"
                : "Continue with Original Title"}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/analyze")}
              className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Edit my content details
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Scores reflect predicted click-through rate improvement vs. your
            original title
          </p>
        </div>
      </main>
    </div>
  );
}
