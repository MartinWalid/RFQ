import React, { useEffect, useState } from "react";
import axios from "axios";

const FinancePricingPage = ({ requestId, onDone }) => {
    const [markups, setMarkups] = useState({});
    const [vatSettings, setVatSettings] = useState({});
    const [operationCosts, setOperationCosts] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState("");

    const mapFinanceResponseToState = (responseData) => {
        const data = responseData?.data || responseData;

        return {
            savedMarkups: data?.markups || data?.pricing_markups || {},
            savedVatSettings: data?.vatSettings || data?.vat_settings || {},
        };
    };

    useEffect(() => {
        if (!requestId) return;

        let isMounted = true;

        const fetchFinanceData = async () => {
            try {
                setLoading(true);
                setError("");

                const [financeResponse, opsResponse] = await Promise.allSettled([
                    axios.get(`/requests/${requestId}/finance`),
                    axios.get(`/requests/${requestId}/ops`),
                ]);

                if (!isMounted) return;

                if (financeResponse.status === "fulfilled") {
                    const { savedMarkups, savedVatSettings } =
                        mapFinanceResponseToState(financeResponse.value.data);

                    if (savedMarkups && Object.keys(savedMarkups).length > 0) {
                        setMarkups(savedMarkups);
                    }

                    if (savedVatSettings && Object.keys(savedVatSettings).length > 0) {
                        setVatSettings(savedVatSettings);
                    }
                }

                if (opsResponse.status === "fulfilled") {
                    const opsData = opsResponse.value.data?.data || opsResponse.value.data;
                    setOperationCosts(opsData);
                }
            } catch (err) {
                console.error("Failed to fetch finance pricing data:", err);
                setError("Could not load finance pricing data.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchFinanceData();

        return () => {
            isMounted = false;
        };
    }, [requestId]);

    const buildFinancePayload = (saveAsDraft) => ({
        markups,
        vat_settings: vatSettings,
        save_as_draft: saveAsDraft,
    });

    const handleSaveDraft = async () => {
        if (!requestId) return;

        try {
            setSaving(true);
            setError("");

            await axios.post(
                `/requests/${requestId}/finance`,
                buildFinancePayload(true)
            );

            // Optional: show toast/success message here
        } catch (err) {
            console.error("Failed to save pricing draft:", err);
            setError("Could not save pricing draft.");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmPricing = async () => {
        if (!requestId) return;

        try {
            setSaving(true);
            setError("");

            await axios.post(
                `/requests/${requestId}/finance`,
                buildFinancePayload(false)
            );

            setConfirmed(true);
        } catch (err) {
            console.error("Failed to confirm pricing:", err);
            setError("Could not confirm and lock pricing.");
        } finally {
            setSaving(false);
        }
    };

    if (confirmed) {
        return (
            <div>
                <h2>Pricing Confirmed</h2>
                <p>The pricing has been locked successfully.</p>

                <button onClick={() => onDone?.()}>
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div>
            {loading && <p>Loading costing and pricing data...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {/* Keep your existing finance pricing UI here */}

            <button onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
            </button>

            <button onClick={handleConfirmPricing} disabled={saving}>
                {saving ? "Confirming..." : "Confirm & Lock Pricing"}
            </button>
        </div>
    );
};

export default FinancePricingPage;