// ─────────────────────────────────────────────────────────────
//  DetailedRequest.jsx  —  role-aware request detail view
//
//  New in this version:
//  • Accepts currentUser, onOpenCosting, onOpenFinance props
//  • Shows a CTA banner based on role + request status:
//      operations + pending_ops      → "Add / Edit Costing"
//      finance    + pending_finance  → "Configure Pricing"
//      any role   + approved         → locked pricing summary
//  • Edit / Cancel buttons only visible to sales + admin
//
//  📁 Replace: frontend/src/components/DetailedRequest.jsx
// ─────────────────────────────────────────────────────────────

import React from "react";
import {
  ArrowLeft, Edit2, XSquare, Calendar, Clock, Package,
  CheckCircle2, Hourglass, ClipboardList, BadgeDollarSign,
  ThumbsUp, ThumbsDown, AlertCircle,
} from "lucide-react";

// ── Status display maps ───────────────────────────────────────
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

const ROLE_BADGE = {
  sales: "bg-blue-50   text-blue-700   border-blue-200",
  operations: "bg-amber-50  text-amber-700  border-amber-200",
  finance: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-slate-100 text-slate-700  border-slate-300",
};

const fmt = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────
const RequestDetails = ({
  requestData,
  currentUser,       // { id, name, role, ... }  from App.jsx
  onBack,
  onOpenCosting,     // (request) => void  — passed from App.jsx
  onOpenFinance,     // (request) => void  — passed from App.jsx
}) => {
  const data = requestData || {};
  const role = currentUser?.role ?? "sales";

  // ── Determine which CTA to show ───────────────────────────
  const showOpsCTA =
    (role === "operations" || role === "admin") &&
    data.status === "pending_ops";

  const showFinanceCTA =
    (role === "finance" || role === "admin") &&
    data.status === "pending_finance";

  const showApprovalCTAs =
    (role === "finance" || role === "admin") &&
    data.status === "pending_approval";

  const showApprovedSummary = data.status === "approved";

  const showRevisionCTA =
    role === "sales" && data.status === "revision";

  // Only sales / admin can edit or cancel non-terminal requests
  const canEditCancel =
    (role === "sales" || role === "admin") &&
    !["approved", "rejected"].includes(data.status);

  const hasCTA =
    showOpsCTA || showFinanceCTA || showApprovalCTAs || showRevisionCTA;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1.5"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <h1 className="text-center text-3xl font-semibold text-slate-700">
          Request Details
        </h1>

        {/* ── Header card ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Request ID: </span>
                <span className="text-blue-600 font-semibold">
                  {data.reference_number ?? data.id ?? "—"}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Client: </span>
                <span className="text-slate-500">
                  {data.client?.name ?? data.clientName ?? "—"}
                </span>
              </p>

              {/* Status pill */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[data.status] ?? STATUS_STYLES.draft}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {STATUS_LABELS[data.status] ?? data.status ?? "—"}
              </span>

              {/* Role badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${ROLE_BADGE[role]}`}>
                Viewing as: <span className="capitalize ml-0.5">{role}</span>
              </span>
            </div>

            {/* Edit / Cancel — sales or admin only */}
            {canEditCancel && (
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                  <Edit2 size={14} /> Edit
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm">
                  <XSquare size={14} /> Cancel Request
                </button>
              </div>
            )}
          </div>

          {/* Date timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-blue-50 text-blue-500 rounded-lg flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Starting Date</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(data.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Quotation Deadline</p>
                <p className="text-sm font-semibold text-amber-600">
                  {formatDate(data.quotation_deadline ?? data.quotationDeadline)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Delivery Date</p>
                <p className="text-sm font-semibold text-emerald-600">
                  {formatDate(data.delivery_date ?? data.deliveryDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Role-aware CTA banner ─────────────────────────── */}
        {hasCTA && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-500 flex-shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Action required</p>
                <p className="text-xs text-slate-400">
                  This request is waiting for{" "}
                  <span className="capitalize font-medium text-slate-600">{role}</span>{" "}
                  input to move forward.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">

              {/* Operations CTA */}
              {showOpsCTA && (
                <button
                  onClick={() => onOpenCosting(data)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-200 transition-all"
                >
                  <ClipboardList size={15} />
                  Add / Edit Costing
                </button>
              )}

              {/* Finance CTA */}
              {showFinanceCTA && (
                <button
                  onClick={() => onOpenFinance(data)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-md shadow-purple-200 transition-all"
                >
                  <BadgeDollarSign size={15} />
                  Configure Pricing
                </button>
              )}

              {/* Approval CTAs */}
              {showApprovalCTAs && (
                <>
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 transition-all">
                    <ThumbsUp size={15} /> Approve
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">
                    <ThumbsDown size={15} /> Return for Revision
                  </button>
                </>
              )}

              {/* Revision CTA — sales resubmit */}
              {showRevisionCTA && (
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {data.rejection_reason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2 text-xs text-red-600 max-w-sm">
                      <span className="font-semibold">Revision note: </span>
                      {data.rejection_reason}
                    </div>
                  )}
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100 transition-all">
                    <Edit2 size={15} /> Revise &amp; Resubmit
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Approved: locked pricing summary ─────────────── */}
        {showApprovedSummary && data.final_price && (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-emerald-700">Approved — Locked Pricing</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 text-sm">
              {[
                { label: "Supplier Cost", value: fmt(data.supplier_costs ?? 0) },
                { label: `Markup`, value: `${data.markup_percentage ?? 0}%` },
                { label: `VAT`, value: data.vat_applicable ? `${data.vat_percentage ?? 0}%` : "N/A" },
                { label: "Final Price", value: fmt(data.final_price ?? 0), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`font-bold ${highlight ? "text-emerald-600 text-base" : "text-slate-700"}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v4" />
                </svg>
                Generate Quotation PDF
              </button>
            </div>
          </div>
        )}

        {/* ── Request info card ─────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Request Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Project Title</p>
              <p className="text-sm text-slate-700 font-medium">
                {data.project_title ?? data.projectTitle ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client Budget</p>
              <p className="text-sm text-slate-700 font-medium">
                {data.client_budget ?? data.clientBudget
                  ? fmt(data.client_budget ?? data.clientBudget)
                  : "Not Available"}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Specs / Notes</p>
              <p className="text-sm text-slate-600">{data.specs ?? "—"}</p>
            </div>
          </div>

          {/* Items table (if available) */}
          {data.items?.length > 0 && (
            <>
              <div className="px-6 py-3 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((item, index) => (
                      <tr key={item.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 text-slate-400 text-xs">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{item.description ?? item.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quantity ?? "—"}</td>
                        <td className="px-4 py-3">
                          {item.isDone ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Hourglass size={11} /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic">All dates are shown in your local timezone.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RequestDetails;