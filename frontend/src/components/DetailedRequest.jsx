// ─────────────────────────────────────────────────────────────
//  DetailedRequest.jsx
//
//  Fixes included:
//  1) Edit button now opens an inline edit form and saves with PUT /api/requests/:id.
//  2) Cancel Request button now confirms and calls PATCH /api/requests/:id/cancel.
//     If that endpoint does not exist, it falls back to PATCH /api/requests/:id with status cancelled.
//  3) Configure Pricing now passes a normalized request payload to the parent,
//     including id, requestId, salesOrder, camelCase fields, and snake_case fields.
//  4) Cancelled status is supported in badges and edit/cancel permissions.
//  5) DB flat-column response shape remains supported.
// 
//  📁 Replace: frontend/src/components/DetailedRequest.jsx
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  ArrowLeft,
  Edit2,
  XSquare,
  Calendar,
  Clock,
  Package,
  CheckCircle2,
  ClipboardList,
  BadgeDollarSign,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Save,
  X,
} from "lucide-react";

// ── Status display maps ───────────────────────────────────────
const STATUS_STYLES = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  pending_ops: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  pending_finance: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  pending_approval: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  approved: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  revision: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  rejected: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
  cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600",
  canceled: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600",
};

const STATUS_LABELS = {
  draft: "Draft",
  pending_ops: "Pending Ops Input",
  pending_finance: "Pending Finance Input",
  pending_approval: "Pending Approval",
  approved: "Approved",
  revision: "Returned for Revision",
  rejected: "Rejected",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

const ROLE_BADGE = {
  sales: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  operations: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  finance: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  admin: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600",
};

const fmt = (value) => {
  const number = Number.parseFloat(value);
  const safeNumber = Number.isFinite(number) ? number : 0;

  return (
    "$" +
    safeNumber.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const toInputDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const normalizeRequestId = (request) =>
  request?.id ?? request?.request_id ?? request?.requestId ?? request?.rfq_id ?? null;

const normalizeRequestFromResponse = (payload, fallback) => {
  if (!payload) return fallback;
  if (payload.request) return payload.request;
  if (payload.data) return payload.data;
  return payload;
};

const buildFinancePayload = (request) => {
  const resolvedRequestId = normalizeRequestId(request);

  const clientName =
    request?.clientName ??
    request?.client_name ??
    request?.client?.name ??
    "N/A";

  const projectTitle =
    request?.projectTitle ??
    request?.project_title ??
    request?.title ??
    "N/A";

  return {
    ...request,

    // keep all likely formats available for parent/App.jsx
    id: resolvedRequestId,
    requestId: resolvedRequestId,
    request_id: resolvedRequestId,

    clientName,
    client_name: clientName,

    projectTitle,
    project_title: projectTitle,

    salesOrder: {
      clientName,
      projectTitle,
    },
  };
};

const buildEditForm = (request) => ({
  client_name: request?.client_name ?? request?.clientName ?? "",
  project_title: request?.project_title ?? request?.projectTitle ?? "",
  client_budget: request?.client_budget ?? request?.clientBudget ?? "",
  payment_terms: request?.payment_terms ?? request?.paymentTerms ?? "",
  quotation_deadline: toInputDate(request?.quotation_deadline ?? request?.quotationDeadline),
  delivery_date: toInputDate(request?.delivery_date ?? request?.deliveryDate),
});

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────
export default function RequestDetails({
  requestData,
  currentUser,
  onBack,
  onOpenCosting,
  onOpenFinance,
  onEditRequest,
}) {
  const role = currentUser?.role ?? "sales";

  const [data, setData] = useState(requestData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => buildEditForm(requestData));
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState(null);

  const resolvedRequestId = normalizeRequestId(data ?? requestData);

  // ── Fetch full request details from backend ───────────────
  useEffect(() => {
    const initialRequestId = normalizeRequestId(requestData);

    if (!initialRequestId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        // GET /api/requests/:id — expected to return { ...request, items: [...] }
        const response = await api.get(`/requests/${initialRequestId}`);
        const fullRequest = normalizeRequestFromResponse(response.data, requestData);

        if (!mounted) return;

        setData(fullRequest);
        setEditForm(buildEditForm(fullRequest));
      } catch (fetchError) {
        console.error("Failed to load request details:", fetchError);

        if (!mounted) return;

        setError("Failed to load request details. Please try again.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [requestData]);

  // ── CTA logic ─────────────────────────────────────────────
  const normalizedStatus = data?.status ?? "draft";

  const showOpsCTA =
    (role === "operations" || role === "admin") && normalizedStatus === "pending_ops";

  const showFinanceCTA =
    (role === "finance" || role === "admin") && normalizedStatus === "pending_finance";

  const showApprovalCTAs =
    (role === "finance" || role === "admin") && normalizedStatus === "pending_approval";

  const showRevisionCTA = role === "sales" && normalizedStatus === "revision";
  const showApprovedSummary = normalizedStatus === "approved";

  const canEditCancel =
    (role === "sales" || role === "admin") &&
    data &&
    !["approved", "rejected", "cancelled", "canceled"].includes(normalizedStatus);

  const hasCTA = showOpsCTA || showFinanceCTA || showApprovalCTAs || showRevisionCTA;

  const handleStartEdit = () => {
    setActionError(null);

    if (onEditRequest) {
      onEditRequest(data);
      return;
    }

    setEditForm(buildEditForm(data));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setActionError(null);
    setEditForm(buildEditForm(data));
    setIsEditing(false);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!resolvedRequestId) {
      setActionError("Missing request ID. Please go back to the dashboard and open the request again.");
      return;
    }

    setSavingEdit(true);
    setActionError(null);

    const payload = {
      client_name: editForm.client_name?.trim() || null,
      project_title: editForm.project_title?.trim() || null,
      client_budget: editForm.client_budget === "" ? null : Number(editForm.client_budget),
      payment_terms: editForm.payment_terms?.trim() || null,
      quotation_deadline: editForm.quotation_deadline || null,
      delivery_date: editForm.delivery_date || null,
    };

    try {
      const response = await api.put(`/requests/${resolvedRequestId}`, payload);
      const updatedRequest = normalizeRequestFromResponse(response.data, {
        ...data,
        ...payload,
      });

      setData((previous) => ({
        ...previous,
        ...updatedRequest,
        items: updatedRequest.items ?? previous?.items ?? [],
      }));

      setIsEditing(false);
    } catch (saveError) {
      console.error("Edit request failed:", saveError);
      setActionError("Failed to update request. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!resolvedRequestId) {
      setActionError("Missing request ID. Please go back to the dashboard and open the request again.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to cancel this request?");
    if (!confirmed) return;

    setCancelling(true);
    setActionError(null);

    try {
      let response;

      try {
        // Preferred endpoint
        response = await api.patch(`/requests/${resolvedRequestId}/cancel`);
      } catch (cancelEndpointError) {
        if (cancelEndpointError?.response?.status !== 404) {
          throw cancelEndpointError;
        }

        // Fallback endpoint if backend has no dedicated cancel route
        response = await api.patch(`/requests/${resolvedRequestId}`, {
          status: "cancelled",
        });
      }

      const cancelledRequest = normalizeRequestFromResponse(response.data, {
        ...data,
        status: "cancelled",
      });

      setData((previous) => ({
        ...previous,
        ...cancelledRequest,
        status: cancelledRequest.status ?? "cancelled",
        items: cancelledRequest.items ?? previous?.items ?? [],
      }));
    } catch (cancelError) {
      console.error("Cancel request failed:", cancelError);
      setActionError("Failed to cancel request. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenCosting = () => {
    if (!onOpenCosting) return;
    onOpenCosting(buildFinancePayload(data));
  };

  const handleOpenFinance = () => {
    if (!onOpenFinance) return;
    onOpenFinance(buildFinancePayload(data));
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Loading request details…
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex flex-col items-center justify-center gap-3">
        <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={onBack}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1.5"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>

        <h1 className="text-center text-3xl font-semibold text-slate-700 dark:text-slate-300">
          Request Details
        </h1>

        {actionError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400">
            {actionError}
          </div>
        )}

        {/* ── Header card ──────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Request ID: </span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {data.reference_number ?? resolvedRequestId}
                </span>
              </p>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Client: </span>
                <span className="text-slate-500 dark:text-slate-400">{data.client_name ?? data.clientName ?? "—"}</span>
              </p>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[normalizedStatus] ?? STATUS_STYLES.draft
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {STATUS_LABELS[normalizedStatus] ?? normalizedStatus}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${ROLE_BADGE[role] ?? ROLE_BADGE.sales
                  }`}
              >
                Viewing as: <span className="capitalize ml-0.5">{role}</span>
              </span>
            </div>

            {canEditCancel && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  disabled={savingEdit || cancelling}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm dark:shadow-black/20 disabled:opacity-50"
                >
                  <Edit2 size={14} /> Edit
                </button>

                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={savingEdit || cancelling}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 dark:hover:border-red-700 transition-all shadow-sm dark:shadow-black/20 disabled:opacity-50"
                >
                  <XSquare size={14} /> {cancelling ? "Cancelling..." : "Cancel Request"}
                </button>
              </div>
            )}
          </div>

          {/* Date timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-lg flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Created
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(data.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-lg flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Quotation Deadline
                </p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {formatDate(data.quotation_deadline)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Delivery Date
                </p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatDate(data.delivery_date)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Inline edit form ─────────────────────────────── */}
        {isEditing && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Edit Request
              </h2>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-6 py-5">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Client Name
                </span>
                <input
                  type="text"
                  value={editForm.client_name}
                  onChange={(event) => handleEditFieldChange("client_name", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Project Title
                </span>
                <input
                  type="text"
                  value={editForm.project_title}
                  onChange={(event) => handleEditFieldChange("project_title", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Client Budget
                </span>
                <input
                  type="number"
                  value={editForm.client_budget}
                  onChange={(event) => handleEditFieldChange("client_budget", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Payment Terms
                </span>
                <input
                  type="text"
                  value={editForm.payment_terms}
                  onChange={(event) => handleEditFieldChange("payment_terms", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Quotation Deadline
                </span>
                <input
                  type="date"
                  value={editForm.quotation_deadline}
                  onChange={(event) => handleEditFieldChange("quotation_deadline", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Delivery Date
                </span>
                <input
                  type="date"
                  value={editForm.delivery_date}
                  onChange={(event) => handleEditFieldChange("delivery_date", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all disabled:opacity-50"
              >
                <Save size={15} /> {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* ── Role-aware CTA banner ─────────────────────────── */}
        {hasCTA && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500 dark:text-blue-400 flex-shrink-0">
                <AlertCircle size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Action required</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  This request is waiting for{" "}
                  <span className="capitalize font-medium text-slate-600 dark:text-slate-400">{role}</span> input.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {showOpsCTA && (
                <button
                  type="button"
                  onClick={handleOpenCosting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all"
                >
                  <ClipboardList size={15} /> Add / Edit Costing
                </button>
              )}

              {showFinanceCTA && (
                <button
                  type="button"
                  onClick={handleOpenFinance}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-700 dark:bg-purple-600 hover:bg-purple-800 dark:hover:bg-purple-700 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30 transition-all"
                >
                  <BadgeDollarSign size={15} /> Configure Pricing
                </button>
              )}

              {showApprovalCTAs && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 dark:shadow-emerald-900/30 transition-all"
                  >
                    <ThumbsUp size={15} /> Approve
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                  >
                    <ThumbsDown size={15} /> Return for Revision
                  </button>
                </>
              )}

              {showRevisionCTA && (
                <div className="flex flex-col gap-2">
                  {data.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg px-4 py-2 text-xs text-red-600 dark:text-red-400 max-w-sm">
                      <span className="font-semibold">Revision note: </span>
                      {data.rejection_reason}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-white shadow-md shadow-amber-100 dark:shadow-amber-900/30 transition-all"
                  >
                    <Edit2 size={15} /> Revise &amp; Resubmit
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Approved: locked pricing summary ─────────────── */}
        {showApprovedSummary && data.final_price && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Approved — Locked Pricing
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-700 text-sm">
              {[
                { label: "Supplier Cost", value: fmt(data.supplier_costs ?? 0) },
                { label: "Markup", value: `${data.markup_percentage ?? 0}%` },
                {
                  label: "VAT",
                  value: data.vat_applicable ? `${data.vat_percentage ?? 0}%` : "N/A",
                },
                {
                  label: "Final Price",
                  value: fmt(data.final_price ?? 0),
                  highlight: true,
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  <p
                    className={`font-bold ${highlight ? "text-emerald-600 dark:text-emerald-400 text-base" : "text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Request info card ─────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Request Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Project Title
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {data.project_title ?? data.projectTitle ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Client Budget
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {data.client_budget ? fmt(data.client_budget) : "Not Available"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Payment Terms
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {data.payment_terms ?? data.paymentTerms ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Created By
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {data.created_by_name ?? data.createdByName ?? "—"}
              </p>
            </div>
          </div>

          {/* Items table — uses item_name and item_code from DB */}
          {data.items?.length > 0 && (
            <>
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Items</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  {data.items.length} item{data.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-left">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Code
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Specifications
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {data.items.map((item, index) => (
                      <tr
                        key={item.id ?? index}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs font-mono">
                          {item.item_code ?? item.code ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {item.item_name ?? item.name ?? item.description ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {item.quantity ?? item.qty ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">
                          {item.specifications ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              All dates are shown in your local timezone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
