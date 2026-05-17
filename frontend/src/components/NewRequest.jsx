import { useState } from "react";
import api from "../api/axios";


export default function NewRequest({ onBack, onSubmit }) {
  const [budget, setBudget] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("Uniforms");
  const [quotationDeadline, setQuotationDeadline] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [items, setItems] = useState([{ quantity: "", specification: "", file: null }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const today = new Date().toISOString().slice(0, 16);

  const handleAddItem = () => {
    setItems([...items, { quantity: "", specification: "", file: null }]);
  };

  const handleDeleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleFileChange = (index, file) => {
    const updated = [...items];
    updated[index].file = file;
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) return setError("Client name is required.");
    if (!projectTitle) return setError("Project title is required.");
    if (!quotationDeadline) return setError("Quotation deadline is required.");
    if (!deliveryDate) return setError("Delivery date is required.");
    if (deliveryDate <= quotationDeadline) return setError("Delivery date must be after the quotation deadline.");
    if (!paymentTerms) return setError("Payment terms are required.");

    const invalidItem = items.find((item) => !item.quantity || !item.specification.trim());
    if (invalidItem) return setError("All items must have a quantity and specification.");

    setError("");
    setLoading(true);

    try {
      const response = await api.post('/requests', {
        client_name: clientName,
        project_title: projectTitle,
        quotation_deadline: quotationDeadline,
        delivery_date: deliveryDate,
        payment_terms: paymentTerms,
        client_budget: budget ? parseFloat(budget) : null,
        items: items.map((item, idx) => ({
          item_name: item.specification,
          description: item.specification,
          quantity: parseInt(item.quantity),
          specifications: item.specification,
        })),
      });

      if (!onSubmit) return;

      const detailResponse = await api.get(`/requests/${response.data.request.id}`);
      const realItems = detailResponse.data.items;

      onSubmit({
        requestId: response.data.request.id,
        clientName,
        projectTitle,
        quotationDeadline,
        deliveryDate,
        paymentTerms,
        clientBudget: budget ? `$${budget}` : null,
        attachmentName: items.find((i) => i.file)?.file?.name ?? null,
        items: realItems.map((item) => ({
          id: item.id,
          item_id: item.id,
          quantity: item.quantity,
          description: item.item_name,
        })),
      });

    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-10 px-4">

      {onBack && (
        <div className="max-w-5xl mx-auto mb-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline font-medium">
            ← Back to Dashboard
          </button>
        </div>
      )}

      <h1 className="text-center text-3xl font-semibold text-slate-700 mb-8">
        Sales Request Page
      </h1>

      <div className="max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Request Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Request Details</h2>
          </div>

          <div className="px-6 py-5 grid md:grid-cols-2 gap-6">

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Company"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Project Title <span className="text-red-500">*</span>
              </label>
              <select
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition cursor-pointer"
              >
                <option>Uniforms</option>
                <option>Giveaways</option>
                <option>Equipment</option>
                <option>Event Organizing</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Quotation Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                min={today}
                value={quotationDeadline}
                onChange={(e) => setQuotationDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Request Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                min={quotationDeadline || today}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Payment Terms <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition cursor-pointer"
              >
                <option value="">Select payment terms</option>
                <option>Cash on Delivery</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 60</option>
                <option>Net 90</option>
                <option>50% Upfront / 50% on Delivery</option>
                <option>Full Payment Upfront</option>
              </select>
            </div>

          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">
              Items &amp; Quantities <span className="text-red-500">*</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">
                    Quantity <span className="text-red-400">*</span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Specifications <span className="text-red-400">*</span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/40 transition-colors">

                    <td className="px-5 py-3 text-slate-400 text-center text-xs font-medium">{index + 1}</td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) => handleChange(index, "quantity", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="e.g. Blue polo shirts, size M-XL"
                        value={item.specification}
                        onChange={(e) => handleChange(index, "specification", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition min-w-[160px]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 10a4 4 0 10-5.657-5.657L5.757 10.93a6 6 0 108.486 8.486L20 13" />
                        </svg>
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">
                          {item.file ? item.file.name : "Upload File"}
                        </span>
                        <input type="file" onChange={(e) => handleFileChange(index, e.target.files[0])} className="hidden" />
                      </label>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors mx-auto"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg px-4 py-2 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-medium">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  placeholder="Client Budget (optional)"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-52"
                  onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
              <p className="text-xs text-slate-400 italic">Fields marked with * are mandatory.</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-md shadow-blue-200 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              Submit Sales Request
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}