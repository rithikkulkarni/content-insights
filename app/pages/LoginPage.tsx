"use client";
import { useState } from "react";
import { useNavigate } from "react-router";
import { BarChart2, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/analyze");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
            <span className="font-semibold text-gray-900 tracking-tight">Content Insights</span>
          </div>
          <button
            onClick={() => navigate("/signup")}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            Sign up
          </button>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Welcome back</h1>
              <p className="text-sm text-gray-500">Sign in to your Content Insights account</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-gray-700" style={{ fontWeight: 500 }}>Password</label>
                  <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-all mt-2 shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Google", "GitHub"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  {provider}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Sign up free
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
