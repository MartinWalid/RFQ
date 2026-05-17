import { useState } from "react";
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

export default function OperationsCostingPage({ salesOrder, onBack, onSubmitToFinance }) {
  const order = salesOrder;

  const [itemSuppliers, setItemSuppliers] = useState(() => {
    const init = {};
    order.items.forEach((item) => { init[item.id] = [newSupplier()]; });
    return init;
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 16);

  const addSupplier = (itemId) =>
    setItemSuppliers((p) => ({ ...p, [itemId]: [...p[itemId], newSupplier()] }));

  const removeSupplier = (itemId, sid) =>
    setItemSuppliers((p) => ({ ...p, [itemId]: p[itemId].filter((s) => s.id !== sid) }));

  const updateSupplier = (itemId, sid, field, value) => {
    setItemSuppliers((p) => ({
      ...p,
      [itemId]: p[itemId].map((s) => s.id === sid ? { ...s, [field]: value } : s),
    }));
    setErrors((e) => { const n = { ...e }; delete n[`${itemId}-${sid}-${field}`]; return n; });
  };

  const hasError = (itemId, sid, field) => !!errors[`${itemId}-${sid}-${field}`];

  const getDiscountedCost = (unitCost, discount) => {
    const cost = parseFloat(unitCost) || 0;
    const disc = parseFloat(discount) || 0;
    return cost - (cost * disc) / 100;
  };

  const validate = () => {
    const errs = {};
    order.items.forEach((item) =>
      itemSuppliers[item.id].forEach((s) =>
        ["supplierName", "unitCost", "paymentTerms", "productionTime", "deliveryDate"].forEach((f) => {
          if (!s[f]?.toString().trim()) errs[`${item.id}-${s.id}-${f}`] = true;
        })
      )
    );
    return errs;
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (onSubmitToFinance) {
      const costingData = order.items.map((item) => {
        const suppliers = itemSuppliers[item.id].map((s) => ({
          id: s.id,
          supplierName: s.supplierName,
          unitCost: parseFloat(s.unitCost) || 0,
          discount: parseFloat(s.discount) || 0,
          discountedUnitCost: getDiscountedCost(s.unitCost, s.discount),
          paymentTerms: s.paymentTerms,
          productionTime: s.productionTime,
          deliveryDate: s.deliveryDate,
        }));
        const cog = suppliers[0].discountedUnitCost * item.quantity;
        return { id: item.id, description: item.description, quantity: item.quantity, cog, suppliers };
      });
      onSubmitToFinance(costingData);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted to Finance</h2>
          <p className="text-slate-500 text-sm mb-5 leading-relaxed">
            Costing for <span className="font-semibold text-slate-700">{order.clientName}</span> —{" "}
            <span className="font-semibold text-slate-700">{order.projectTitle}</span> has been forwarded.
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Pending Finance Review
          </span>
          <br />
          <button onClick={() => setSubmitted(false)} className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            ← Back to Costing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-10 px-4">

      {onBack && (
        <div className="max-w-5xl mx-auto mb-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline font-medium">
            ← Back to Sales Request
          </button>
        </div>
      )}

      <h1 className="text-center text-3xl font-semibold text-slate-700 mb-8">
        Operations Costing Page
      </h1>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Sales Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Client Name:</span>{" "}
              <span className="text-slate-400">{order.clientName}</span>
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Project Title:</span>{" "}
              <span className="text-slate-400">{order.projectTitle}</span>
            </p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-slate-600 w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-28">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            {order.attachmentName && (
              <>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-blue-600 hover:underline cursor-pointer">{order.attachmentName}</span>
                </span>
                <span className="text-slate-300">|</span>
              </>
            )}
            <span>
              <span className="font-semibold text-slate-600">Quotation Deadline:</span>{" "}
              <span className="text-amber-600 font-semibold">{order.quotationDeadline}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <span className="font-semibold text-slate-600">Client Budget:</span>{" "}
              <span className={`font-semibold ${order.clientBudget ? "text-emerald-600" : "text-slate-400"}`}>
                {order.clientBudget || "Not Available"}
              </span>
            </span>
          </div>
        </div>

        {/* Operations Costing */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Operations Costing <span className="text-red-500">*</span>
            </h2>
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {order.items.map((item, index) => (
              <div key={item.id} className="px-6 py-5">

                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{item.description}</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Qty: {item.quantity}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-left">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Supplier Name <span className="text-red-400">*</span>
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Unit Cost / Item <span className="text-red-400">*</span>
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount (%)</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Unit Cost</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Payment Terms <span className="text-red-400">*</span>
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Production Time <span className="text-red-400">*</span>
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Delivery Date <span className="text-red-400">*</span>
                        </th>
                        <th className="px-4 py-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemSuppliers[item.id].map((s, idx) => {
                        const netCost = getDiscountedCost(s.unitCost, s.discount);
                        const hasDiscount = parseFloat(s.discount) > 0 && parseFloat(s.unitCost) > 0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">

                            <td className="px-4 py-3 text-slate-400 text-center text-xs font-medium">{idx + 1}</td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="e.g. Supplier A"
                                value={s.supplierName}
                                onChange={(e) => updateSupplier(item.id, s.id, "supplierName", e.target.value)}
                                className={`w-full min-w-[130px] border rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "supplierName") ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-sm font-medium">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={s.unitCost}
                                  onChange={(e) => updateSupplier(item.id, s.id, "unitCost", e.target.value)}
                                  className={`w-24 border rounded-lg px-3 py-2 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "unitCost") ? "border-red-400 bg-red-50" : "border-slate-200"}`}
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
                                  className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                />
                                <span className="text-slate-400 text-sm font-medium">%</span>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {hasDiscount ? (
                                <span className="text-sm font-semibold text-emerald-600">${netCost.toFixed(2)}</span>
                              ) : (
                                <span className="text-sm text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={s.paymentTerms}
                                onChange={(e) => updateSupplier(item.id, s.id, "paymentTerms", e.target.value)}
                                className={`w-full min-w-[160px] border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition cursor-pointer ${hasError(item.id, s.id, "paymentTerms") ? "border-red-400 bg-red-50" : "border-slate-200"}`}
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
                                className={`w-full min-w-[110px] border rounded-lg px-3 py-2 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "productionTime") ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="datetime-local"
                                min={today}
                                value={s.deliveryDate}
                                onChange={(e) => updateSupplier(item.id, s.id, "deliveryDate", e.target.value)}
                                className={`w-full min-w-[185px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${hasError(item.id, s.id, "deliveryDate") ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                              />
                            </td>

                            <td className="px-4 py-3 text-center">
                              {itemSuppliers[item.id].length > 1 && (
                                <button
                                  onClick={() => removeSupplier(item.id, s.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors mx-auto"
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
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg px-4 py-2 transition-all"
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
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-400 italic">Fields marked with * are mandatory.</p>

            <div className="flex items-center gap-3 flex-wrap">
              {Object.keys(errors).length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Fill all required fields
                </span>
              )}

              <button
                onClick={handleSaveDraft}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${draftSaved ? "bg-emerald-50 border-emerald-400 text-emerald-600" : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"}`}
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

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-md shadow-blue-200 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                Submit to Finance
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}