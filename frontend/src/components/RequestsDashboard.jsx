import { useState, useEffect } from "react";
import { Mail, Plus } from "lucide-react";
import api from "../api/axios";

const STATUS_STYLES = {
  "pending_ops": "bg-amber-50 text-amber-700 border border-amber-200",
  "pending_finance": "bg-orange-50 text-orange-700 border border-orange-200",
  "approved": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "revision": "bg-blue-50 text-blue-700 border border-blue-200",
  "rejected": "bg-red-50 text-red-600 border border-red-200",
  "draft": "bg-slate-50 text-slate-600 border border-slate-200",
};

const STATUS_LABELS = {
  "pending_ops": "Pending Ops Input",
  "pending_finance": "Due for Finance Review",
  "approved": "Approved",
  "revision": "Sales Input Required",
  "rejected": "Rejected",
  "draft": "Draft",
};

const inputClass = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition";

export default function RequestDashboard({ onSelectRequest, onCreateRequest, currentUser, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ done: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    id: "", client: "", status: "All", owner: "", aging: "", due: "All", rep: "",
  });

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/requests/dashboard');
        setRequests(response.data.requests);
        setStats({
          done: response.data.done,
          pending: response.data.pending,
          overdue: response.data.overdue,
        });
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const filtered = requests.filter((row) => {
    const agingText = `${Math.floor(row.aging_days || 0)} days`;
    return (
      (row.reference_number || '').toLowerCase().includes(filters.id.toLowerCase()) &&
      (row.client_name || '').toLowerCase().includes(filters.client.toLowerCase()) &&
      (filters.status === "All" || row.status === filters.status) &&
      (row.assignee_name || '').toLowerCase().includes(filters.owner.toLowerCase()) &&
      agingText.includes(filters.aging.toLowerCase()) &&
      (filters.due === "All" || (filters.due === "Yes" ? row.is_overdue : !row.is_overdue)) &&
      (row.created_by_name || '').toLowerCase().includes(filters.rep.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-10 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        <h1 className="text-center text-3xl font-semibold text-slate-700 mb-2">Requests Dashboard</h1>
        <p className="text-center text-sm text-slate-400 mb-6">
          Welcome back, <span className="font-semibold text-slate-600">{currentUser?.name || "User"}</span>
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Metrics + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Done</span>
                <span className="text-sm font-bold text-emerald-700 ml-1">{stats.done}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending</span>
                <span className="text-sm font-bold text-amber-700 ml-1">{stats.pending}</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Overdue</span>
                <span className="text-sm font-bold text-red-600 ml-1">{stats.overdue}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-all shadow-sm"
              >
                Sign Out
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                <Mail size={15} />
                Send Mail
              </button>
              {(currentUser?.role === "sales" || currentUser?.role === "admin") && (
                <button
                  onClick={onCreateRequest}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-md shadow-blue-200 transition-all"
                >
                  <Plus size={15} />
                  New Request
                </button>
              )}
            </div>
          </div>

          {/* Loading / Error states */}
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              Loading requests...
            </div>
          )}

          {error && (
            <div className="px-6 py-4 text-center text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Request ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Owner</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aging</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overdue?</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created By</th>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <th className="px-4 py-2">
                      <input type="text" placeholder="Search ID..." value={filters.id} onChange={(e) => setFilter("id", e.target.value)} className={inputClass} />
                    </th>
                    <th className="px-4 py-2">
                      <input type="text" placeholder="Search client..." value={filters.client} onChange={(e) => setFilter("client", e.target.value)} className={inputClass} />
                    </th>
                    <th className="px-4 py-2">
                      <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={inputClass}>
                        <option value="All">All</option>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-4 py-2">
                      <input type="text" placeholder="Search owner..." value={filters.owner} onChange={(e) => setFilter("owner", e.target.value)} className={inputClass} />
                    </th>
                    <th className="px-4 py-2">
                      <input type="text" placeholder="e.g. 5 days" value={filters.aging} onChange={(e) => setFilter("aging", e.target.value)} className={inputClass} />
                    </th>
                    <th className="px-4 py-2">
                      <select value={filters.due} onChange={(e) => setFilter("due", e.target.value)} className={inputClass}>
                        <option value="All">All</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </th>
                    <th className="px-4 py-2">
                      <input type="text" placeholder="Search rep..." value={filters.rep} onChange={(e) => setFilter("rep", e.target.value)} className={inputClass} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelectRequest(row)}
                      className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 text-blue-600 font-semibold hover:underline underline-offset-4">
                        {row.reference_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{row.client_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[row.status] || "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.assignee_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 italic">
                        {Math.floor(row.aging_days || 0)} days
                      </td>
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
                      <td className="px-4 py-3 text-slate-600">{row.created_by_name || '—'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400 italic">
                        {requests.length === 0 ? "No requests yet. Create your first one!" : "No requests match your filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic">Click on any request row to view its details.</p>
          </div>

        </div>
      </div>
    </div>
  );
}