"use client";
import { useRouteNavigator } from "./lib/routeState";
import {
  BarChart2,
  Zap,
  Target,
  TrendingUp,
  Star,
  CheckCircle2,
} from "lucide-react";
import TestSupabaseButton from './test-supabase-button'

export default function LandingPage() {
  const navigate = useRouteNavigator();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">
              Content Insights
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-16 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: Headline */}
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                <Zap className="w-3 h-3 text-indigo-600" />
                <span className="text-xs text-indigo-700 font-medium">
                  AI-powered creator analytics
                </span>
              </div>
              <h1
                className="text-5xl lg:text-6xl text-gray-900 leading-tight mb-5"
                style={{ fontWeight: 700, lineHeight: 1.1 }}
              >
                Understand what makes your content{" "}
                <span className="text-indigo-600">perform</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Analyze your thumbnails, titles, and tags with AI. Get
                actionable feedback and optimized suggestions to grow your
                audience faster.
              </p>

              {/* Feature bullets */}
              <div className="flex flex-col gap-3 mb-8">
                {[
                  "AI feedback on thumbnails, titles & tags",
                  "Generate optimized title variations instantly",
                  "Thumbnail generation powered by AI",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Learn more ↓
              </button>
            </div>

            {/* Right: Auth buttons */}
            <div className="w-full max-w-xs flex flex-col gap-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 px-6 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 px-6 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-center shadow-sm cursor-pointer"
              >
                Don&apos;t have an account? Get started!
              </button>

              {/* Social proof */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Trusted by 12,000+ creators
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-gray-50 border-t border-gray-100 py-20 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl text-gray-900 mb-3"
              style={{ fontWeight: 700 }}
            >
              Everything you need to grow
            </h2>
            <p className="text-gray-500">
              One platform. Complete creator intelligence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Thumbnail Analysis",
                desc: "Get detailed feedback on contrast, text readability, and visual hierarchy. Know exactly why your thumbnail is — or isn't — getting clicks.",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                icon: TrendingUp,
                title: "Title Optimization",
                desc: "AI analyzes your titles against proven click-through patterns and suggests high-performing alternatives ranked by predicted impact.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: BarChart2,
                title: "Tag Strategy",
                desc: "Discover which tags are missing from your content and get recommended long-tail keywords that align with what your audience is searching for.",
                color: "text-violet-600",
                bg: "bg-violet-50",
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3
                  className="text-gray-900 mb-2"
                  style={{ fontWeight: 600, fontSize: "1rem" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl text-white mb-4" style={{ fontWeight: 700 }}>
            Ready to level up your content?
          </h2>
          <p className="text-indigo-200 mb-8">
            Join thousands of creators who use Content Insights to grow smarter.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="px-8 py-3 bg-white text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer"
          >
            Start for free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-gray-600 font-medium">
              Content Insights
            </span>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 Content Insights. All rights reserved.
          </p>
        </div>
      </footer>
      {/* <TestSupabaseButton /> */}
    </div>
  );
}