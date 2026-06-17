// ─────────────────────────────────────────────────────────────
//  RequestsDashboard.jsx
//
//  Fix: DB returns flat columns — client_name, assignee_name,
//  created_by_name, is_overdue, aging_days — not nested objects.
//  All field references updated to match the actual SQL query.
//
//  📁 Replace: frontend/src/components/RequestsDashboard.jsx
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import api from "../api/axios";
import { Mail, Plus, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-slate-100  text-slate-600  border-slate-200",
  pending_ops: "bg-amber-50   text-amber-700  border-amber-200",
  pending_finance: "bg-blue-50    text-blue-700   border-blue-200",
  pending_approval: "bg-purple-50  text-purple-700 border-purple-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revision: "bg-red-50     text-red-600    border-red-200",
  rejected: "bg-red-100    text-red-700    border-red-300",
};

const STATUS_LABELS = {
  draft: "Draft",
  pending_ops: "Pending Ops Input",
  pending_finance: "Pending Finance Input",
  pending_approval: "Pending Approval",
  approved: "Approved",
  revision: "Returned for Revision",
  rejected: "Rejected",
};

export default function RequestsDashboard({
  currentUser,
  onSelectRequest,
  onCreateRequest,
  onLogout,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Derived counts using DB fields ────────────────────────
  const doneCount = requests.filter((r) => r.status === "approved").length;
  const pendingCount = requests.filter((r) => r.status !== "approved").length;
  const overdueCount = requests.filter((r) => r.is_overdue).length;

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/requests");
      setRequests(data);
    } catch {
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-10 px-4 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">

        <h1 className="text-center text-3xl font-semibold text-slate-700 dark:text-slate-200">Requests Dashboard</h1>
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          Welcome back,{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300 capitalize">
            {currentUser?.name ?? currentUser?.full_name ?? "User"}
          </span>
        </p>

        {/* ── Header card ──────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-700">

            {/* Metric pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Done</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 ml-1">{doneCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Pending</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 ml-1">{pendingCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Overdue</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-1">{overdueCount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchRequests}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm">
                <Mail size={15} /> Send Mail
              </button>
              {["sales", "admin"].includes(currentUser?.role) && (
                <button
                  onClick={onCreateRequest}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all"
                >
                  <Plus size={15} /> New Request
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────── */}
          <div className="overflow-x-auto">

            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm gap-2">
                <RefreshCw size={16} className="animate-spin" /> Loading requests…
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={fetchRequests} className="text-xs text-blue-600 hover:underline">Try again</button>
              </div>
            )}

            {!loading && !error && requests.length === 0 && (
              <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                No requests found.
              </div>
            )}

            {!loading && !error && requests.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-left">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Request ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Project</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Assignee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Aging</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Overdue?</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {requests.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelectRequest(row)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                    >
                      {/* reference_number from DB */}
                      <td className="px-5 py-3 text-blue-600 font-semibold hover:underline underline-offset-4">
                        {row.reference_number}
                      </td>

                      {/* client_name — flat DB column */}
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {row.client_name ?? "—"}
                      </td>

                      {/* project_title */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {row.project_title}
                      </td>

                      {/* status pill */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[row.status] ?? STATUS_STYLES.draft}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>

                      {/* assignee_name from JOIN */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.assignee_name ?? "—"}
                      </td>

                      {/* aging_days from EXTRACT in SQL */}
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 italic">
                        {row.aging_days != null
                          ? `${Math.floor(row.aging_days)} day${Math.floor(row.aging_days) !== 1 ? "s" : ""}`
                          : "—"}
                      </td>

                      {/* is_overdue from CASE in SQL */}
                      <td className="px-4 py-3">
                        {row.is_overdue ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No
                          </span>
                        )}
                      </td>

                      {/* created_by_name from JOIN */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.created_by_name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Click on any request to view its details.</p>
          </div>
        </div>
      </div>
    </div>
  );
}