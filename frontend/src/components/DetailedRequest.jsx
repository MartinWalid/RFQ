import { useState, useEffect } from "react";
import { ArrowLeft, Edit2, XSquare, Calendar, Clock, Package, CheckCircle2, Hourglass } from 'lucide-react';
import api from "../api/axios";

const RequestDetails = ({ requestData, onBack }) => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/requests/${requestData.id}`);
        setRequest(response.data);
      } catch (err) {
        setError("Failed to load request details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestData.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

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

        {/* Header card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div className="flex flex-wrap gap-6">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Request ID:</span>{" "}
                <span className="text-blue-600 font-semibold">{request.reference_number}</span>
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Client:</span>{" "}
                <span className="text-slate-400">{request.client_name}</span>
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Project:</span>{" "}
                <span className="text-slate-400">{request.project_title}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                <Edit2 size={14} />
                Edit
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm">
                <XSquare size={14} />
                Cancel Request
              </button>
            </div>
          </div>

          {/* Date timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-blue-50 text-blue-500 rounded-lg flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Starting Date</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(request.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Quotation Deadline</p>
                <p className="text-sm font-semibold text-amber-600">{formatDate(request.quotation_deadline)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Delivery Date</p>
                <p className="text-sm font-semibold text-emerald-600">{formatDate(request.delivery_date)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Specifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {request.items && request.items.length > 0 ? request.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors align-top">
                    <td className="px-5 py-4 text-slate-400 text-xs font-medium">{index + 1}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-700">{item.item_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.item_code}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-4">
                      {item.status === "done" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Hourglass size={11} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-slate-500 max-w-xs">
                        {item.specifications || "—"}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400 italic">
                      No items found for this request.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic">Fields marked with * are mandatory.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RequestDetails;