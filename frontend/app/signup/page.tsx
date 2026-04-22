"use client";
import { useState } from "react";
import { useRouteNavigator } from "../lib/routeState";
import { supabase } from "../lib/supabaseClient";
import { BarChart2, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const navigate = useRouteNavigator();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      navigate("/analyze");
      return;
    }

    setAuthNotice(
      "Your account was created in Supabase. Check your email to confirm it, then sign in."
    );
    setTimeout(() => navigate("/login?confirmed=1"), 1200);
  };

  const passwordStrength = (() => {
    const p = form.password;
    if (p.length === 0) return 0;
    if (p.length < 6) return 1;
    if (p.length < 10) return 2;
    return 3;
  })();

  const strengthColors = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

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
            <span className="font-semibold text-gray-900 tracking-tight">
              Content Insights
            </span>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            Log in
          </button>
        </div>
      </header>

      {/* Signup Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h1
                className="text-gray-900 mb-1"
                style={{ fontWeight: 700, fontSize: "1.5rem" }}
              >
                Create your account
              </h1>
              <p className="text-sm text-gray-500">
                Start analyzing your content for free
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {authNotice && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {authNotice}
                </p>
              )}

              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Full name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Alex Johnson"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            passwordStrength >= level
                              ? strengthColors[passwordStrength]
                              : "bg-gray-100"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-all mt-2 shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>

              {authError && (
                <p className="text-sm text-red-500" role="alert">
                  {authError}
                </p>
              )}
            </form>

            <div className="mt-4 flex flex-col gap-1.5">
              {[
                "100 free analysis credits to start",
                "No credit card required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Log in
              </button>
            </p>

            <p className="mt-4 text-center text-xs text-gray-400">
              By signing up, you agree to our{" "}
              <span className="underline cursor-pointer">Terms</span> and{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
