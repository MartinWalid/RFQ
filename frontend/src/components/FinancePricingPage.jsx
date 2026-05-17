import { useState } from "react";

const fmt = (n) =>
    "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcSupplier = (s, quantity, markup, vatPct) => {
    const COGS = s.discountedUnitCost * quantity;
    const markupAmt = COGS * (markup / 100);
    const subtotal = COGS + markupAmt;
    const vatAmt = subtotal * (vatPct / 100);
    const totalBeforeDiscount = subtotal + vatAmt;
    const discountAmt = s.discount > 0 ? totalBeforeDiscount * (s.discount / 100) : 0;
    const total = totalBeforeDiscount - discountAmt;
    const priceBeforeDiscount = s.unitCost * quantity;
    const saving = priceBeforeDiscount - COGS;
    return { COGS, markupAmt, subtotal, vatAmt, totalBeforeDiscount, discountAmt, total, priceBeforeDiscount, saving };
};

export default function FinancePricingPage({ salesOrder, costingItems, onBack }) {
    const order = salesOrder;
    const items = costingItems;

    const [markups, setMarkups] = useState(() => {
        const init = {};
        items.forEach((item) => item.suppliers.forEach((s) => { init[s.id] = 25; }));
        return init;
    });

    const [vatSettings, setVatSettings] = useState(() => {
        const init = {};
        items.forEach((item) =>
            item.suppliers.forEach((s) => {
                init[s.id] = { enabled: false, preset: null, custom: "" };
            })
        );
        return init;
    });

    const [draftSaved, setDraftSaved] = useState(false);
    const [locked, setLocked] = useState(false);

    const getVatPct = (supplierId) => {
        const v = vatSettings[supplierId];
        if (!v.enabled) return 0;
        if (v.preset === "other") return parseFloat(v.custom) || 0;
        return parseFloat(v.preset) || 0;
    };

    const updateVat = (supplierId, changes) => {
        setVatSettings((p) => ({ ...p, [supplierId]: { ...p[supplierId], ...changes } }));
    };

    const allSupplierRows = items.flatMap((item) =>
        item.suppliers.map((s) => calcSupplier(s, item.quantity, parseFloat(markups[s.id]) || 0, getVatPct(s.id)))
    );

    const grandBeforeVat = allSupplierRows.reduce((acc, r) => acc + r.subtotal, 0);
    const grandVat = allSupplierRows.reduce((acc, r) => acc + r.vatAmt, 0);
    const grandDiscount = allSupplierRows.reduce((acc, r) => acc + r.discountAmt, 0);
    const grandTotal = allSupplierRows.reduce((acc, r) => acc + r.total, 0);

    const handleSaveDraft = () => {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2500);
    };

    if (locked) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Pricing Confirmed & Locked</h2>
                    <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                        The quotation for{" "}
                        <span className="font-semibold text-slate-700">{order.clientName}</span> —{" "}
                        <span className="font-semibold text-slate-700">{order.projectTitle}</span>{" "}
                        has been finalised.
                    </p>
                    {grandDiscount > 0 && (
                        <p className="text-slate-500 text-sm mb-3">
                            Total discount applied:{" "}
                            <span className="font-semibold text-rose-600">-{fmt(grandDiscount)}</span>
                        </p>
                    )}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Grand Total: {fmt(grandTotal)}
                    </div>
                    <br />
                    <button onClick={() => setLocked(false)} className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        ← Back to Pricing
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
                        ← Back to Operations Costing
                    </button>
                </div>
            )}

            <h1 className="text-center text-3xl font-semibold text-slate-700 mb-8">
                Finance Pricing Page
            </h1>

            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">Client Name:</span>{" "}
                            <span className="text-slate-400">{order.clientName}</span>
                        </p>
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">Project Title:</span>{" "}
                            <span className="inline-flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1 text-slate-600 text-sm bg-slate-50 ml-1">
                                {order.projectTitle}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Items */}
                {items.map((item) => (
                    <div key={item.id} className="space-y-3">

                        <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {item.id}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{item.description}</span>
                            <span className="ml-auto text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                Qty: {item.quantity}
                            </span>
                            <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                {item.suppliers.length} supplier{item.suppliers.length > 1 ? "s" : ""}
                            </span>
                        </div>

                        {item.suppliers.map((s, idx) => {
                            const markup = parseFloat(markups[s.id]) || 0;
                            const vatPct = getVatPct(s.id);
                            const calc = calcSupplier(s, item.quantity, markup, vatPct);
                            const hasDiscount = s.discount > 0;
                            const vat = vatSettings[s.id];

                            return (
                                <div
                                    key={s.id}
                                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasDiscount ? "border-rose-100" : "border-slate-200"}`}
                                >
                                    {/* Supplier header */}
                                    <div className={`px-5 py-3 border-b flex items-center justify-between ${hasDiscount ? "bg-rose-50/50 border-rose-100" : "bg-slate-50 border-slate-100"}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${hasDiscount ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-500"}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {s.supplierName || `Supplier ${idx + 1}`}
                                            </span>
                                        </div>
                                        {hasDiscount ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                                -{s.discount}% discount
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                                                No discount
                                            </span>
                                        )}
                                    </div>

                                    {/* Pricing breakdown */}
                                    <div className="grid grid-cols-2 divide-x divide-slate-100">

                                        {/* Left column */}
                                        <div className="divide-y divide-slate-100 text-sm">

                                            <div className="flex items-center justify-between px-5 py-3">
                                                <span className="text-slate-500">Cost of Goods Sold (COGS):</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="font-semibold text-slate-700">{fmt(calc.COGS)}</span>
                                                    {hasDiscount && (
                                                        <span className="text-xs text-slate-400 line-through">{fmt(calc.priceBeforeDiscount)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-5 py-3">
                                                <span className="text-slate-500">Markup / Margin %</span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number" min="0" max="999"
                                                        value={markups[s.id]}
                                                        onChange={(e) => setMarkups((p) => ({ ...p, [s.id]: e.target.value }))}
                                                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                                    />
                                                    <span className="text-slate-400 text-xs">%</span>
                                                </div>
                                            </div>

                                            {/* VAT row — checkbox + options */}
                                            <div className="px-5 py-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={vat.enabled}
                                                            onChange={(e) => updateVat(s.id, { enabled: e.target.checked, preset: null, custom: "" })}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                                                        />
                                                        <span className="text-slate-500">VAT applicable</span>
                                                    </label>
                                                    {vat.enabled && (
                                                        <span className="text-slate-600 font-medium">{fmt(calc.vatAmt)}</span>
                                                    )}
                                                </div>

                                                {vat.enabled && (
                                                    <div className="flex items-center gap-2 flex-wrap pl-6">
                                                        {["5", "14"].map((pct) => (
                                                            <button
                                                                key={pct}
                                                                onClick={() => updateVat(s.id, { preset: pct, custom: "" })}
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${vat.preset === pct
                                                                    ? "bg-blue-600 text-white border-blue-600"
                                                                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                                                                    }`}
                                                            >
                                                                {pct}%
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => updateVat(s.id, { preset: "other", custom: "" })}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${vat.preset === "other"
                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                                                                }`}
                                                        >
                                                            Other
                                                        </button>
                                                        {vat.preset === "other" && (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number" min="0" max="100"
                                                                    placeholder="0"
                                                                    value={vat.custom}
                                                                    onChange={(e) => updateVat(s.id, { custom: e.target.value })}
                                                                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                                                />
                                                                <span className="text-slate-400 text-xs">%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {hasDiscount && (
                                                <div className="flex items-center justify-between px-5 py-3 bg-rose-50/40">
                                                    <span className="text-rose-500 font-medium">Supplier Discount ({s.discount}%)</span>
                                                    <span className="font-semibold text-rose-600">-{fmt(calc.discountAmt)}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between px-5 py-3 bg-blue-50/40">
                                                <span className="font-semibold text-slate-700">Total Item Price</span>
                                                <span className="font-bold text-blue-700">{fmt(calc.total)}</span>
                                            </div>
                                        </div>

                                        {/* Right column */}
                                        <div className="divide-y divide-slate-100 text-sm">
                                            <div className="flex items-center justify-between px-5 py-3">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">COGS</span>
                                                <span className="font-semibold text-slate-700">{fmt(calc.COGS)}</span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-3">
                                                <span className="text-xs text-slate-400">Markup amt</span>
                                                <span className="font-medium text-slate-600">{fmt(calc.markupAmt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-3">
                                                <span className="text-slate-500 text-xs">Total before discount</span>
                                                <span className="font-medium text-slate-700">{fmt(calc.totalBeforeDiscount)}</span>
                                            </div>
                                            {hasDiscount && (
                                                <div className="flex items-center justify-between px-5 py-3 bg-rose-50/40">
                                                    <span className="text-xs text-rose-400 uppercase tracking-wide font-semibold">Discount</span>
                                                    <span className="font-semibold text-rose-600">-{fmt(calc.discountAmt)}</span>
                                                </div>
                                            )}
                                            {hasDiscount && (
                                                <div className="flex items-center justify-between px-5 py-3">
                                                    <span className="text-xs text-emerald-500 font-semibold">Saving</span>
                                                    <span className="font-semibold text-emerald-600">-{fmt(calc.saving)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-end px-5 py-3 bg-blue-50/40">
                                                <span className="font-bold text-blue-700">{fmt(calc.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Grand Total */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Grand Total Summary</span>
                        <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                            {items.reduce((acc, item) => acc + item.suppliers.length, 0)} suppliers across {items.length} items
                        </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 text-sm">
                        <div className="divide-y divide-slate-100">
                            <div className="flex items-center px-6 py-3">
                                <span className="text-slate-500">Total Before VAT</span>
                            </div>
                            <div className="flex items-center px-6 py-3">
                                <span className="text-slate-500">VAT</span>
                            </div>
                            {grandDiscount > 0 && (
                                <div className="flex items-center px-6 py-3 bg-rose-50/40">
                                    <span className="text-rose-500 font-medium">Total Supplier Discount</span>
                                </div>
                            )}
                            <div className="flex items-center px-6 py-3">
                                <span className="font-bold text-slate-800">Grand Total</span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-slate-400 text-xs">Sum of all subtotals</span>
                                <span className="font-semibold text-slate-700">{fmt(grandBeforeVat)}</span>
                            </div>
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-slate-400 text-xs">Sum of all VAT amounts</span>
                                <span className="font-semibold text-slate-700">{fmt(grandVat)}</span>
                            </div>
                            {grandDiscount > 0 && (
                                <div className="flex items-center justify-between px-6 py-3 bg-rose-50/40">
                                    <span className="text-xs text-rose-400 uppercase tracking-wide font-semibold">Sum of all discounts</span>
                                    <span className="font-semibold text-rose-600">-{fmt(grandDiscount)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-slate-400 text-xs">Sum of all final totals</span>
                                <span className="font-bold text-blue-700 text-base">{fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 italic">Fields marked with * are mandatory.</p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v4" />
                            </svg>
                            Generate Quotation PDF
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${draftSaved
                                ? "bg-emerald-50 border-emerald-400 text-emerald-600"
                                : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
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
                        <button
                            onClick={() => setLocked(true)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-md shadow-blue-200 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Confirm &amp; Lock Pricing
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}