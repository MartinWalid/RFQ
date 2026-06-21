import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const DEFAULT_MARKUP = 25;
const DEFAULT_VAT = { enabled: false, preset: null, custom: "" };

const toNumber = (value, fallback = 0) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

const fmt = (value) => {
  const safeValue = toNumber(value, 0);

  return (
    "$" +
    safeValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const getArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.costingItems)) return payload.costingItems;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.suppliers)) return payload.suppliers;
  return [];
};

const calcSupplier = (supplier, quantity, markup, vatPct) => {
  const qty = toNumber(quantity, 1);
  const unitCost = toNumber(supplier?.unitCost, 0);
  const discountedUnitCost = toNumber(supplier?.discountedUnitCost, unitCost);
  const supplierDiscount = toNumber(supplier?.discount, 0);
  const markupPct = toNumber(markup, 0);
  const vatPercentage = toNumber(vatPct, 0);

  const COGS = discountedUnitCost * qty;
  const markupAmt = COGS * (markupPct / 100);
  const subtotal = COGS + markupAmt;
  const vatAmt = subtotal * (vatPercentage / 100);
  const totalBeforeDiscount = subtotal + vatAmt;
  const discountAmt =
    supplierDiscount > 0 ? totalBeforeDiscount * (supplierDiscount / 100) : 0;
  const total = totalBeforeDiscount - discountAmt;
  const priceBeforeDiscount = unitCost * qty;
  const saving = priceBeforeDiscount - COGS;

  return {
    COGS,
    markupAmt,
    subtotal,
    vatAmt,
    totalBeforeDiscount,
    discountAmt,
    total,
    priceBeforeDiscount,
    saving,
  };
};

const normalizeSupplier = (supplier, fallbackId) => {
  const supplierId =
    supplier?.supplier_id ??
    supplier?.supplierId ??
    supplier?.id ??
    supplier?.ops_supplier_id ??
    fallbackId;

  const unitCost = toNumber(
    supplier?.unitCost ??
    supplier?.unit_cost ??
    supplier?.cost ??
    supplier?.price ??
    supplier?.supplier_unit_cost,
    0
  );

  const discount = toNumber(
    supplier?.discount ??
    supplier?.discount_percentage ??
    supplier?.discountPercentage ??
    supplier?.supplier_discount,
    0
  );

  const rawNetUnitCost = Number.parseFloat(
    supplier?.discountedUnitCost ??
    supplier?.discounted_unit_cost ??
    supplier?.net_unit_cost ??
    supplier?.netUnitCost ??
    supplier?.final_unit_cost
  );

  const discountedUnitCost = Number.isFinite(rawNetUnitCost)
    ? rawNetUnitCost
    : unitCost - unitCost * (discount / 100);

  return {
    id: supplierId,
    supplierId,
    supplierName:
      supplier?.supplierName ??
      supplier?.supplier_name ??
      supplier?.supplier ??
      supplier?.vendor_name ??
      supplier?.name ??
      "",
    unitCost,
    discount,
    discountedUnitCost,
    paymentTerms: supplier?.paymentTerms ?? supplier?.payment_terms ?? "",
    productionTime: supplier?.productionTime ?? supplier?.production_time ?? "",
    deliveryDate:
      supplier?.deliveryDate ??
      supplier?.delivery_date ??
      supplier?.delivery_time ??
      supplier?.deliveryDateText ??
      "",
  };
};

const normalizeNestedItems = (payload) => {
  const sourceItems = getArray(payload);

  return sourceItems.map((item, itemIndex) => {
    const itemId =
      item?.item_id ??
      item?.itemId ??
      item?.request_item_id ??
      item?.requestItemId ??
      item?.id ??
      `item-${itemIndex + 1}`;

    const suppliers = getArray(item?.suppliers).map((supplier, supplierIndex) =>
      normalizeSupplier(supplier, `${itemId}-${supplierIndex + 1}`)
    );

    return {
      id: itemId,
      code: item?.code ?? item?.item_code ?? item?.itemCode ?? `ITEM-${itemIndex + 1}`,
      description:
        item?.description ??
        item?.item_name ??
        item?.itemName ??
        item?.name ??
        item?.title ??
        `Item ${itemIndex + 1}`,
      specifications:
        item?.specifications ?? item?.specification ?? item?.notes ?? item?.description ?? "",
      quantity: toNumber(item?.quantity ?? item?.qty, 1),
      suppliers,
    };
  });
};

const reshapeFlatOpsRowsToItems = (payload) => {
  const rows = getArray(payload);
  const grouped = {};

  rows.forEach((row, index) => {
    const itemId =
      row?.item_id ??
      row?.itemId ??
      row?.request_item_id ??
      row?.requestItemId ??
      row?.rfq_item_id ??
      `item-${index + 1}`;

    if (!grouped[itemId]) {
      grouped[itemId] = {
        id: itemId,
        code: row?.item_code ?? row?.code ?? `ITEM-${Object.keys(grouped).length + 1}`,
        description:
          row?.item_name ??
          row?.itemName ??
          row?.description ??
          row?.name ??
          `Item ${Object.keys(grouped).length + 1}`,
        specifications:
          row?.specifications ?? row?.specification ?? row?.item_specs ?? row?.notes ?? "",
        quantity: toNumber(row?.quantity ?? row?.qty, 1),
        suppliers: [],
      };
    }

    grouped[itemId].suppliers.push(
      normalizeSupplier(row, `${itemId}-${grouped[itemId].suppliers.length + 1}`)
    );
  });

  return Object.values(grouped);
};

const normalizeOpsPayload = (payload) => {
  const nestedItems = normalizeNestedItems(payload);

  const hasNestedSupplierRows = nestedItems.some(
    (item) => (item.suppliers ?? []).length > 0
  );

  if (hasNestedSupplierRows) return nestedItems;

  const flatRows = getArray(payload);
  const looksLikeFlatOpsRows = flatRows.some(
    (row) =>
      row?.supplier_id != null ||
      row?.supplier_name != null ||
      row?.unit_cost != null ||
      row?.net_unit_cost != null ||
      row?.discount_percentage != null
  );

  if (looksLikeFlatOpsRows) return reshapeFlatOpsRowsToItems(payload);

  return nestedItems;
};

const buildDefaultSettings = (itemsArray) => {
  const markups = {};
  const vat = {};

  itemsArray.forEach((item) => {
    (item.suppliers ?? []).forEach((supplier) => {
      markups[supplier.id] = DEFAULT_MARKUP;
      vat[supplier.id] = { ...DEFAULT_VAT };
    });
  });

  return { markups, vat };
};

const buildSettingsFromFinanceDraft = (itemsArray, financeData) => {
  const markups = {};
  const vat = {};

  itemsArray.forEach((item) => {
    (item.suppliers ?? []).forEach((supplier) => {
      const saved =
        financeData?.supplierSettings?.[supplier.id] ??
        financeData?.supplier_settings?.[supplier.id] ??
        financeData?.settings?.[supplier.id] ??
        null;

      markups[supplier.id] = toNumber(
        saved?.markup ?? saved?.markup_percentage ?? saved?.margin_percentage,
        DEFAULT_MARKUP
      );

      const vatPercentage = saved?.vat_percentage ?? saved?.vatPercentage;

      vat[supplier.id] = saved?.vat ?? {
        enabled: Boolean(saved?.vat_applicable ?? saved?.vatApplicable ?? false),
        preset: vatPercentage != null ? String(vatPercentage) : null,
        custom: "",
      };
    });
  });

  return { markups, vat };
};

export default function FinancePricingPage({
  salesOrder,
  costingItems,
  requestId,
  onBack,
  onDone,
}) {
  const resolvedRequestId =
    requestId ??
    salesOrder?.id ??
    salesOrder?.requestId ??
    salesOrder?.request_id ??
    null;

  const order = salesOrder ?? {
    clientName: "N/A",
    client_name: "N/A",
    projectTitle: "N/A",
    project_title: "N/A",
  };

  const clientName = order.clientName ?? order.client_name ?? "N/A";
  const projectTitle = order.projectTitle ?? order.project_title ?? "N/A";

  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [markups, setMarkups] = useState({});
  const [vatSettings, setVatSettings] = useState({});

  useEffect(() => {
    let isMounted = true;

    const applyItems = (nextItems, nextMarkups, nextVat) => {
      if (!isMounted) return;
      setItems(nextItems);
      setMarkups(nextMarkups);
      setVatSettings(nextVat);
    };

    const loadRequestItemsFallback = async () => {
      const { data } = await api.get(`/requests/${resolvedRequestId}`);
      const requestItems = normalizeNestedItems(data);
      const { markups: defaultMarkups, vat: defaultVat } = buildDefaultSettings(requestItems);
      applyItems(requestItems, defaultMarkups, defaultVat);
    };

    const loadOpsFallback = async () => {
      const { data: opsData } = await api.get(`/requests/${resolvedRequestId}/ops`);
      console.log("FinancePricingPage /ops response:", opsData);

      const opsItems = normalizeOpsPayload(opsData);

      if (opsItems.length > 0) {
        const { markups: defaultMarkups, vat: defaultVat } = buildDefaultSettings(opsItems);
        applyItems(opsItems, defaultMarkups, defaultVat);
        return;
      }

      await loadRequestItemsFallback();
    };

    const fetchData = async () => {
      setLoadingData(true);
      setDraftError(null);

      try {
        if (costingItems?.length) {
          const normalizedItems = normalizeOpsPayload(costingItems);
          const { markups: defaultMarkups, vat: defaultVat } =
            buildDefaultSettings(normalizedItems);
          applyItems(normalizedItems, defaultMarkups, defaultVat);
          return;
        }

        if (!resolvedRequestId) {
          applyItems([], {}, {});
          setDraftError("Missing request ID. Please open this request from the dashboard again.");
          return;
        }

        try {
          const { data: financeData } = await api.get(`/requests/${resolvedRequestId}/finance`);
          const financeItems = normalizeOpsPayload(financeData);

          if (financeItems.length > 0) {
            const { markups: restoredMarkups, vat: restoredVat } =
              buildSettingsFromFinanceDraft(financeItems, financeData);
            applyItems(financeItems, restoredMarkups, restoredVat);
            return;
          }

          await loadOpsFallback();
        } catch (financeErr) {
          if (financeErr?.response?.status === 404) {
            await loadOpsFallback();
            return;
          }

          throw financeErr;
        }
      } catch (err) {
        console.error("Failed to load pricing data:", err);
        applyItems([], {}, {});
        if (isMounted) {
          setDraftError("Failed to load pricing data. Please refresh and try again.");
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [costingItems, resolvedRequestId]);

  const getVatPct = (supplierId) => {
    const vat = vatSettings[supplierId];
    if (!vat?.enabled) return 0;
    if (vat.preset === "other") return toNumber(vat.custom, 0);
    return toNumber(vat.preset, 0);
  };

  const updateVat = (supplierId, changes) => {
    setVatSettings((previous) => ({
      ...previous,
      [supplierId]: {
        ...(previous[supplierId] ?? DEFAULT_VAT),
        ...changes,
      },
    }));
  };

  const supplierCount = useMemo(
    () => items.reduce((total, item) => total + (item.suppliers ?? []).length, 0),
    [items]
  );

  const totals = useMemo(() => {
    const allRows = items.flatMap((item) =>
      (item.suppliers ?? []).map((supplier) =>
        calcSupplier(
          supplier,
          item.quantity,
          toNumber(markups[supplier.id], DEFAULT_MARKUP),
          getVatPct(supplier.id)
        )
      )
    );

    return {
      grandBeforeVat: allRows.reduce((total, row) => total + row.subtotal, 0),
      grandVat: allRows.reduce((total, row) => total + row.vatAmt, 0),
      grandDiscount: allRows.reduce((total, row) => total + row.discountAmt, 0),
      grandTotal: allRows.reduce((total, row) => total + row.total, 0),
    };
  }, [items, markups, vatSettings]);

  const buildPayload = (saveAsDraft) => ({
    save_as_draft: saveAsDraft,
    suppliers: items.flatMap((item) =>
      (item.suppliers ?? []).map((supplier) => {
        const markup = toNumber(markups[supplier.id], DEFAULT_MARKUP);
        const vatPct = getVatPct(supplier.id);
        const calc = calcSupplier(supplier, item.quantity, markup, vatPct);

        return {
          item_id: item.id,
          supplier_id: supplier.supplierId ?? supplier.id,
          cog: Number(calc.COGS.toFixed(2)),
          markup_percentage: markup,
          vat_applicable: vatSettings[supplier.id]?.enabled ?? false,
          vat_percentage: vatPct,
          discount_percentage: toNumber(supplier.discount, 0),
          total_price: Number(calc.total.toFixed(2)),
        };
      })
    ),
  });

  const handleBack = () => {
    if (onBack) onBack();
  };

  const handleSaveDraft = async () => {
    if (!resolvedRequestId) {
      setDraftError("Missing request ID. Please open this request from the dashboard again.");
      return;
    }

    setDraftError(null);
    setLoading(true);

    try {
      await api.post(`/requests/${resolvedRequestId}/finance`, buildPayload(true));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) {
      console.error("Save draft failed:", err);
      setDraftError("Failed to save draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLockPricing = async () => {
    if (!resolvedRequestId) {
      setDraftError("Missing request ID. Please open this request from the dashboard again.");
      return;
    }

    setDraftError(null);
    setLoading(true);

    try {
      await api.post(`/requests/${resolvedRequestId}/finance`, buildPayload(false));
      setLocked(true);
    } catch (err) {
      console.error("Lock pricing failed:", err);
      setDraftError("Failed to lock pricing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!resolvedRequestId) {
      setDraftError("Missing request ID. Please open this request from the dashboard again.");
      return;
    }

    setDraftError(null);
    setLoading(true);

    try {
      // Persist the current pricing first so the server-rendered quotation
      // matches exactly what's on screen (the PDF is generated from saved data).
      await api.post(`/requests/${resolvedRequestId}/finance`, buildPayload(true));

      const response = await api.get(`/requests/${resolvedRequestId}/quotation`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotation-${resolvedRequestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Generate PDF failed:", err);
      setDraftError("Failed to generate the quotation PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex items-center justify-center">
        <div className="text-slate-400 dark:text-slate-500 text-sm">Loading pricing data…</div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-black/30 p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-blue-700 dark:bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <span className="text-white text-2xl font-bold">✓</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Pricing Confirmed &amp; Locked
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 leading-relaxed">
            The quotation for <span className="font-semibold text-slate-700 dark:text-slate-300">{clientName}</span> —{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{projectTitle}</span> has been finalised.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 mb-8">
            Grand Total: {fmt(totals.grandTotal)}
          </div>

          <br />

          <button
            type="button"
            onClick={onDone ?? onBack}
            className="mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 py-10 px-4">
      <div className="max-w-5xl mx-auto mb-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>

      <h1 className="text-center text-3xl font-semibold text-slate-700 dark:text-slate-300 mb-8">
        Finance Pricing Page
      </h1>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Client Name:</span>{" "}
              <span className="text-slate-400 dark:text-slate-500">{clientName}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Project Title:</span>{" "}
              <span className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-600 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-700/30 ml-1">
                {projectTitle}
              </span>
            </p>
          </div>
        </div>

        {draftError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400">
            {draftError}
          </div>
        )}

        {items.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 px-6 py-12 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">No items found for this request.</p>
            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
              Please check the request ID and the API response for /requests/:id/ops.
            </p>
          </div>
        )}

        {items.map((item, itemIndex) => (
          <div key={item.id ?? itemIndex} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {itemIndex + 1}
              </span>
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.description}</span>
                {item.specifications && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.specifications}</p>
                )}
              </div>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                Qty: {item.quantity}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                {(item.suppliers ?? []).length} supplier{(item.suppliers ?? []).length !== 1 ? "s" : ""}
              </span>
            </div>

            {(item.suppliers ?? []).length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm dark:shadow-black/20 px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
                This item was found, but no supplier costing rows were returned from Operations yet.
              </div>
            )}

            {(item.suppliers ?? []).map((supplier, supplierIndex) => {
              const markup = toNumber(markups[supplier.id], DEFAULT_MARKUP);
              const vatPct = getVatPct(supplier.id);
              const calc = calcSupplier(supplier, item.quantity, markup, vatPct);
              const hasDiscount = toNumber(supplier.discount, 0) > 0;
              const vat = vatSettings[supplier.id] ?? DEFAULT_VAT;

              return (
                <div
                  key={supplier.id ?? `${item.id}-${supplierIndex}`}
                  className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm dark:shadow-black/20 overflow-hidden ${hasDiscount ? "border-rose-100 dark:border-rose-800" : "border-slate-200 dark:border-slate-700"
                    }`}
                >
                  <div
                    className={`px-5 py-3 border-b flex items-center justify-between ${hasDiscount ? "bg-rose-50/50 border-rose-100 dark:border-rose-800" : "bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${hasDiscount ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400" : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                          }`}
                      >
                        {supplierIndex + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {supplier.supplierName || `Supplier ${supplierIndex + 1}`}
                      </span>
                    </div>
                    {hasDiscount ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        -{supplier.discount}% discount
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                        No discount
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-slate-500 dark:text-slate-400">Unit Cost:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(supplier.unitCost)}</span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-slate-500 dark:text-slate-400">Cost of Goods Sold (COGS):</span>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(calc.COGS)}</span>
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                              {fmt(calc.priceBeforeDiscount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-slate-500 dark:text-slate-400">Back Margin / Markup %</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={markups[supplier.id] ?? DEFAULT_MARKUP}
                            onChange={(event) =>
                              setMarkups((previous) => ({
                                ...previous,
                                [supplier.id]: event.target.value,
                              }))
                            }
                            className="w-16 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-300 text-right bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                          />
                          <span className="text-slate-400 dark:text-slate-500 text-xs">%</span>
                        </div>
                      </div>

                      <div className="px-5 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={vat.enabled}
                              onChange={(event) =>
                                updateVat(supplier.id, {
                                  enabled: event.target.checked,
                                  preset: null,
                                  custom: "",
                                })
                              }
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-400 cursor-pointer"
                            />
                            <span className="text-slate-500 dark:text-slate-400">VAT applicable</span>
                          </label>
                          {vat.enabled && (
                            <span className="text-slate-600 dark:text-slate-400 font-medium">{fmt(calc.vatAmt)}</span>
                          )}
                        </div>

                        {vat.enabled && (
                          <div className="flex items-center gap-2 flex-wrap pl-6">
                            {["5", "14"].map((percentage) => (
                              <button
                                key={percentage}
                                type="button"
                                onClick={() =>
                                  updateVat(supplier.id, { preset: percentage, custom: "" })
                                }
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${vat.preset === percentage
                                  ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600"
                                  }`}
                              >
                                {percentage}%
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() =>
                                updateVat(supplier.id, { preset: "other", custom: "" })
                              }
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${vat.preset === "other"
                                ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600"
                                }`}
                            >
                              Other
                            </button>

                            {vat.preset === "other" && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="0"
                                  value={vat.custom}
                                  onChange={(event) =>
                                    updateVat(supplier.id, { custom: event.target.value })
                                  }
                                  className="w-16 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-300 text-right bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                />
                                <span className="text-slate-400 dark:text-slate-500 text-xs">%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {hasDiscount && (
                        <div className="flex items-center justify-between px-5 py-3 bg-rose-50/40">
                          <span className="text-rose-500 dark:text-rose-400 font-medium">
                            Supplier Discount ({supplier.discount}%)
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">-{fmt(calc.discountAmt)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-5 py-3 bg-blue-50/40">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Total Item Price</span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">{fmt(calc.total)}</span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">COGS</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(calc.COGS)}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Markup amount</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">{fmt(calc.markupAmt)}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">VAT</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(calc.vatAmt)}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">Total before discount</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(calc.totalBeforeDiscount)}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center justify-between px-5 py-3 bg-rose-50/40">
                          <span className="text-xs text-rose-400 dark:text-rose-400 uppercase tracking-wide font-semibold">Discount</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">-{fmt(calc.discountAmt)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end px-5 py-3 bg-blue-50/40">
                        <span className="font-bold text-blue-700 dark:text-blue-400">{fmt(calc.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {items.length > 0 && supplierCount > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Grand Total Summary
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                {supplierCount} suppliers across {items.length} items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 text-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <div className="flex items-center px-6 py-3"><span className="text-slate-500 dark:text-slate-400">Total Before VAT</span></div>
                <div className="flex items-center px-6 py-3"><span className="text-slate-500 dark:text-slate-400">VAT</span></div>
                {totals.grandDiscount > 0 && (
                  <div className="flex items-center px-6 py-3 bg-rose-50/40">
                    <span className="text-rose-500 dark:text-rose-400 font-medium">Total Supplier Discount</span>
                  </div>
                )}
                <div className="flex items-center px-6 py-3"><span className="font-bold text-slate-800 dark:text-slate-200">Grand Total</span></div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-slate-400 dark:text-slate-500 text-xs">Sum of all subtotals</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(totals.grandBeforeVat)}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-slate-400 dark:text-slate-500 text-xs">Sum of all VAT amounts</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(totals.grandVat)}</span>
                </div>
                {totals.grandDiscount > 0 && (
                  <div className="flex items-center justify-between px-6 py-3 bg-rose-50/40">
                    <span className="text-xs text-rose-400 dark:text-rose-400 uppercase tracking-wide font-semibold">Sum of all discounts</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">-{fmt(totals.grandDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-slate-400 dark:text-slate-500 text-xs">Sum of all final totals</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400 text-base">{fmt(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-black/20 border border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">Review all figures carefully before locking.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={loading || items.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50"
            >
              Generate Quotation PDF
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading || supplierCount === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${draftSaved
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                }`}
            >
              {draftSaved ? "Saved!" : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleLockPricing}
              disabled={loading || supplierCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 active:bg-blue-900 dark:active:bg-blue-800 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all disabled:opacity-50"
            >
              {loading ? "Locking…" : "Confirm & Lock Pricing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}