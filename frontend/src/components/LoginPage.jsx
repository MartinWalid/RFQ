import { useState } from "react";
import api from "../api/axios";

export default function LoginUser({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      const { user, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      onLogin(user);

    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 overflow-y-auto px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-10 w-full max-w-sm">

        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Company Logo"
            className="h-50 w-100 object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>

        <h1 className="text-2xl font-semibold text-center text-slate-700 mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-center text-slate-400 mb-7">
          Sign in to your account to continue
        </p>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              id="login-email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              id="login-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-md shadow-blue-200 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}