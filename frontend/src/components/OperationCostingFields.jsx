// ─────────────────────────────────────────────────────────────
//  OperationCostingFields.jsx
//
//  New in this version:
//  • On mount: GET /api/requests/:id/ops to restore any
//    previously saved supplier data
//  • Save Draft: POST /api/requests/:id/ops  { submit: false }
//  • Submit to Finance: POST /api/requests/:id/ops { submit: true }
//    then calls onSubmitToFinance(costingData) to navigate
//
//  Props:
//    salesOrder        — request object (shape from App.jsx)
//    requestId         — DB id used for API calls
//    onBack            — go back handler
//    onSubmitToFinance — (costingData) => void
//    onDone            — go back to dashboard after submit
//
//  📁 Replace: frontend/src/components/OperationCostingFields.jsx
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import api from "../api/axios";

const PAYMENT_TERMS = [
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
  "50% advance, 50% on delivery",
  "100% advance",
  "COD",
];

let _uid = 1;
const newSupplier = () => ({
  id: _uid++,
  supplierName: "",
  unitCost: "",
  discount: "",
  paymentTerms: "",
  productionTime: "",
  deliveryDate: "",
});

export default function OperationsCostingPage({
  salesOrder,
  requestId,
  onBack,
  onSubmitToFinance,
  onDone,
}) {
  const order = salesOrder;
  const effectiveRequestId = requestId || order?.id || order?.requestId || order?.request_id;

  // ── Local state ───────────────────────────────────────────
  const [itemSuppliers, setItemSuppliers] = useState(() => {
    const init = {};
    (order?.items || []).forEach((item) => { init[item.id] = [newSupplier()]; });
    return init;
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const today = new Date().toISOString().slice(0, 16);

  // ── Load existing draft from backend on mount ─────────────
  useEffect(() => {
    if (!effectiveRequestId) {
      setLoadingData(false);
      return;
    }

    const fetchOpsData = async () => {
      setLoadingData(true);
      try {
        // api/axios already has baseURL ending with /api, so do NOT add /api here.
        const { data } = await api.get(`/requests/${effectiveRequestId}/ops`);

        const savedRows = Array.isArray(data)
          ? data
          : Array.isArray(data?.suppliers)
            ? data.suppliers
            : Array.isArray(data?.items)
              ? data.items.flatMap((backendItem) =>
                (backendItem.suppliers || []).map((supplier) => ({
                  ...supplier,
                  item_id: backendItem.item_id || backendItem.itemId || backendItem.id,
                }))
              )
              : [];

        if (savedRows.length) {
          const hydrated = {};

          savedRows.forEach((supplier) => {
            const itemId = supplier.item_id || supplier.itemId || supplier.request_item_id;
            if (!itemId) return;

            if (!hydrated[itemId]) hydrated[itemId] = [];

            hydrated[itemId].push({
              id: _uid++,
              supplierName: supplier.supplier_name ?? supplier.supplierName ?? "",
              unitCost: supplier.unit_cost ?? supplier.unitCost ?? "",
              discount: supplier.discount_percentage ?? supplier.discount ?? "",
              paymentTerms: supplier.payment_terms ?? supplier.paymentTerms ?? "",
              productionTime: supplier.production_time ?? supplier.productionTime ?? "",
              deliveryDate: supplier.delivery_time || supplier.deliveryDate
                ? (supplier.delivery_time || supplier.deliveryDate).slice(0, 16)
                : "",
            });
          });

          setItemSuppliers((prev) => ({ ...prev, ...hydrated }));
        }
      } catch (err) {
        // 404 means no draft saved yet — that is fine, start fresh
        if (err.response?.status !== 404) {
          console.error("Failed to load ops draft:", err);
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchOpsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRequestId]);

  // ── Supplier helpers ──────────────────────────────────────
  const addSupplier = (itemId) =>
    setItemSuppliers((p) => ({ ...p, [itemId]: [...p[itemId], newSupplier()] }));

  const removeSupplier = (itemId, sid) =>
    setItemSuppliers((p) => ({
      ...p,
      [itemId]: (p[itemId] || []).filter((s) => s.id !== sid),
    }));

  const updateSupplier = (itemId, sid, field, value) => {
    setItemSuppliers((p) => ({
      ...p,
      [itemId]: (p[itemId] || []).map((s) => (s.id === sid ? { ...s, [field]: value } : s)),
    }));
    setErrors((e) => {
      const n = { ...e };
      delete n[`${itemId}-${sid}-${field}`];
      return n;
    });
  };

  const hasError = (itemId, sid, field) => !!errors[`${itemId}-${sid}-${field}`];

  const getDiscountedCost = (unitCost, discount) => {
    const cost = parseFloat(unitCost) || 0;
    const disc = parseFloat(discount) || 0;
    return cost - (cost * disc) / 100;
  };

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    (order?.items || []).forEach((item) =>
      (itemSuppliers[item.id] || []).forEach((s) =>
        ["supplierName", "unitCost", "paymentTerms", "productionTime", "deliveryDate"].forEach((f) => {
          if (!s[f]?.toString().trim()) errs[`${item.id}-${s.id}-${f}`] = true;
        })
      )
    );
    return errs;
  };

  // ── Build payload for backend ─────────────────────────────
  const buildPayload = (saveAsDraft) => ({
    save_as_draft: saveAsDraft,
    items: (order?.items || []).map((item) => ({
      item_id: item.id,
      suppliers: (itemSuppliers[item.id] || []).map((s) => ({
        supplier_name: s.supplierName,
        unit_cost: parseFloat(s.unitCost) || 0,
        discount_percentage: parseFloat(s.discount) || 0,
        payment_terms: s.paymentTerms,
        production_time: s.productionTime,
        delivery_time: s.deliveryDate,
        notes: s.notes || null,
      })),
    })),
  });

  // ── Save Draft ────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!effectiveRequestId) {
      setDraftError("Missing request ID. Open costing from the request details page.");
      return;
    }

    setDraftError(null);
    setLoading(true);
    try {
      await api.post(`/requests/${effectiveRequestId}/ops`, buildPayload(true));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) {
      console.error("Save draft failed:", err);
      setDraftError("Failed to save draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit to Finance ─────────────────────────────────────
  const handleSubmit = async () => {
    if (!effectiveRequestId) {
      setDraftError("Missing request ID. Open costing from the request details page.");
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setDraftError(null);
    try {
      await api.post(`/requests/${effectiveRequestId}/ops`, buildPayload(false));

      // Build the costingData shape that the old mock FinancePricingPage expected.
      // This keeps backward compatibility if App.jsx still uses onSubmitToFinance.
      const costingData = (order?.items || []).map((item) => {
        const suppliers = (itemSuppliers[item.id] || []).map((s) => ({
          id: s.id,
          supplierName: s.supplierName,
          unitCost: parseFloat(s.unitCost) || 0,
          discount: parseFloat(s.discount) || 0,
          discountedUnitCost: getDiscountedCost(s.unitCost, s.discount),
          paymentTerms: s.paymentTerms,
          productionTime: s.productionTime,
          deliveryDate: s.deliveryDate,
        }));
        const cog = (suppliers[0]?.discountedUnitCost || 0) * item.quantity;
        return { id: item.id, description: item.description, quantity: item.quantity, cog, suppliers };
      });

      if (onDone) {
        onDone();
      } else if (onSubmitToFinance) {
        onSubmitToFinance(costingData);
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Submit to Finance failed:", err);
      setDraftError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen (fallback when no onSubmitToFinance) ───
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-black/30 p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500 dark:bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Submitted to Finance</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 leading-relaxed">
            Costing for <span className="font-semibold text-slate-700 dark:text-slate-300">{order.clientName}</span> —{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{order.projectTitle}</span> has been forwarded.
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Pending Finance Review
          </span>
          <br />
          {onDone ? (
            <button
              onClick={onDone}
              className="mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
            >
              ← Back to Dashboard
            </button>
          ) : (
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
            >
              ← Back to Costing
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Loading costing data…
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 py-10 px-4">

      {onBack && (
        <div className="max-w-5xl mx-auto mb-3">
          <button onClick={onBack} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            ← Back to Sales Request
          </button>
        </div>
      )}

      <h1 className="text-center text-3xl font-semibold text-slate-700 dark:text-slate-300 mb-8">
        Operations Costing Page
      </h1>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Sales Order Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Client Name:</span>{" "}
              <span className="text-slate-400 dark:text-slate-500">{order.clientName}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Project Title:</span>{" "}
              <span className="text-slate-400 dark:text-slate-500">{order.projectTitle}</span>
            </p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-28">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {order.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 text-slate-400 dark:text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            {order?.attachmentName && (
              <>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{order?.attachmentName}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
              </>
            )}
            <span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Quotation Deadline:</span>{" "}
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{order.quotationDeadline}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Client Budget:</span>{" "}
              <span className={`font-semibold ${order.clientBudget ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                {order.clientBudget || "Not Available"}
              </span>
            </span>
          </div>
        </div>

        {/* Operations Costing */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Operations Costing <span className="text-red-500 dark:text-red-400">*</span>
            </h2>
            <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-3 py-1.5 rounded-full">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {order.items.map((item, index) => (
              <div key={item.id} className="px-6 py-5">

                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.description}</span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    Qty: {item.quantity}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-left">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-10">#</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Supplier Name <span className="text-red-400 dark:text-red-400">*</span></th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unit Cost / Item <span className="text-red-400 dark:text-red-400">*</span></th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Discount (%)</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Net Unit Cost</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Payment Terms <span className="text-red-400 dark:text-red-400">*</span></th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Production Time <span className="text-red-400 dark:text-red-400">*</span></th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Delivery Date <span className="text-red-400 dark:text-red-400">*</span></th>
                        <th className="px-4 py-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {itemSuppliers[item.id].map((s, idx) => {
                        const netCost = getDiscountedCost(s.unitCost, s.discount);
                        const hasDiscount = parseFloat(s.discount) > 0 && parseFloat(s.unitCost) > 0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">

                            <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-center text-xs font-medium">{idx + 1}</td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="e.g. Supplier A"
                                value={s.supplierName}
                                onChange={(e) => updateSupplier(item.id, s.id, "supplierName", e.target.value)}
                                className={`w-full min-w-[130px] border rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "supplierName") ? "border-red-400 bg-red-50 dark:bg-red-900/30" : "border-slate-200 dark:border-slate-700"}`}
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={s.unitCost}
                                  onChange={(e) => updateSupplier(item.id, s.id, "unitCost", e.target.value)}
                                  className={`w-24 border rounded-lg px-3 py-2 text-sm placeholder-slate-300 dark:placeholder-slate-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "unitCost") ? "border-red-400 bg-red-50 dark:bg-red-900/30" : "border-slate-200 dark:border-slate-700"}`}
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="0"
                                  value={s.discount}
                                  onChange={(e) => updateSupplier(item.id, s.id, "discount", e.target.value)}
                                  className="w-20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-300 dark:placeholder-slate-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                />
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">%</span>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {hasDiscount ? (
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${netCost.toFixed(2)}</span>
                              ) : (
                                <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={s.paymentTerms}
                                onChange={(e) => updateSupplier(item.id, s.id, "paymentTerms", e.target.value)}
                                className={`w-full min-w-[160px] border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition cursor-pointer ${hasError(item.id, s.id, "paymentTerms") ? "border-red-400 bg-red-50 dark:bg-red-900/30" : "border-slate-200 dark:border-slate-700"}`}
                              >
                                <option value="">Select…</option>
                                {PAYMENT_TERMS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="e.g. 7 days"
                                value={s.productionTime}
                                onChange={(e) => updateSupplier(item.id, s.id, "productionTime", e.target.value)}
                                className={`w-full min-w-[110px] border rounded-lg px-3 py-2 text-sm placeholder-slate-300 dark:placeholder-slate-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "productionTime") ? "border-red-400 bg-red-50 dark:bg-red-900/30" : "border-slate-200 dark:border-slate-700"}`}
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="datetime-local"
                                min={today}
                                value={s.deliveryDate}
                                onChange={(e) => updateSupplier(item.id, s.id, "deliveryDate", e.target.value)}
                                className={`w-full min-w-[185px] border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "deliveryDate") ? "border-red-400 bg-red-50 dark:bg-red-900/30" : "border-slate-200 dark:border-slate-700"}`}
                              />
                            </td>

                            <td className="px-4 py-3 text-center">
                              {itemSuppliers[item.id].length > 1 && (
                                <button
                                  onClick={() => removeSupplier(item.id, s.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors mx-auto"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => addSupplier(item.id)}
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg px-4 py-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Supplier
                </button>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Fields marked with * are mandatory.</p>

            <div className="flex items-center gap-3 flex-wrap">

              {/* Validation error notice */}
              {Object.keys(errors).length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Fill all required fields
                </span>
              )}

              {/* API error notice */}
              {draftError && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {draftError}
                </span>
              )}

              {/* Save Draft */}
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${draftSaved
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  }`}
              >
                {draftSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Draft
                  </>
                )}
              </button>

              {/* Submit to Finance */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 active:bg-blue-900 dark:active:bg-blue-800 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
                {loading ? "Submitting…" : "Submit to Finance"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}