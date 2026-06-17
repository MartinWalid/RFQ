import { useState } from "react";
import LoginUser from "./components/LoginPage";
import RequestDashboard from "./components/RequestsDashboard";
import RequestDetails from "./components/DetailedRequest";
import NewRequest from "./components/NewRequest";
import OperationsCostingPage from "./components/OperationCostingFields";
import FinancePricingPage from "./components/FinancePricingPage";

function App() {
  // ── Auth ────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // ── Navigation state ────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [salesOrder, setSalesOrder] = useState(null);
  const [showFinance, setShowFinance] = useState(false);
  const [costingData, setCostingData] = useState(null);

  // ── Auth handlers ───────────────────────────────────────────
  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSelectedRequest(null);
    setIsCreating(false);
    setSalesOrder(null);
    setShowFinance(false);
    setCostingData(null);
  };

  // ── Navigation helpers ──────────────────────────────────────

  /**
   * Called by RequestDetails when an Operations user clicks
   * "Add / Edit Costing" on a pending_ops request.
   * Maps the DB request shape → the salesOrder shape that
   * OperationsCostingPage already understands.
   */
  const handleOpenCosting = (request) => {
    setSelectedRequest(null);
    setSalesOrder(mapRequestToSalesOrder(request));
    setShowFinance(false);
    setCostingData(null);
  };

  /**
   * Called by RequestDetails when a Finance user clicks
   * "Configure Pricing" on a pending_finance request.
   * FinancePricingPage will load its own data from the API
   * on mount, so we just need to navigate there.
   */
  const handleOpenFinance = (request) => {
    setSelectedRequest(null);
    setSalesOrder(mapRequestToSalesOrder(request));
    setShowFinance(true);
    // costingData will be fetched inside FinancePricingPage via GET /api/requests/:id/finance
    setCostingData(null);
  };

  /**
   * Maps the backend request object to the salesOrder shape
   * that Ops and Finance pages already use internally.
   * Add/remove fields here if your backend returns different keys.
   */
  const mapRequestToSalesOrder = (request) => ({
    // Keep the original DB id so Ops/Finance can call /api/requests/:id/*
    id: request.id,
    clientName: request.client?.name ?? request.clientName ?? "",
    projectTitle: request.project_title ?? request.projectTitle ?? "",
    quotationDeadline: request.quotation_deadline ?? request.quotationDeadline ?? "",
    deliveryDate: request.delivery_date ?? request.deliveryDate ?? "",
    clientBudget: request.client_budget ?? request.clientBudget ?? null,
    attachmentName: request.attachmentName ?? null,
    // items array — backend may return them nested or flat
    items: request.items ?? [],
  });

  // ── Guard: show login if not authenticated ──────────────────
  if (!user) {
    return <LoginUser onLogin={handleLogin} />;
  }

  // ── State-machine renderer ──────────────────────────────────
  const renderContent = () => {

    // Finance page (must come before Ops check)
    if (salesOrder && showFinance) {
      return (
        <FinancePricingPage
          salesOrder={salesOrder}
          costingItems={costingData}       // null when opened from dashboard; page fetches its own data
          requestId={salesOrder.id}        // ← NEW: used for API calls inside the page
          onBack={() => setShowFinance(false)}
          onDone={() => {
            // After locking pricing, go back to the dashboard and refresh
            setSalesOrder(null);
            setShowFinance(false);
            setCostingData(null);
          }}
        />
      );
    }

    // Operations costing page
    if (salesOrder) {
      return (
        <OperationsCostingPage
          salesOrder={salesOrder}
          requestId={salesOrder.id}        // ← NEW: used for API calls inside the page
          onBack={() => {
            setSalesOrder(null);
            // If we came from dashboard detail view, go back there
            setIsCreating(false);
          }}
          onSubmitToFinance={(data) => {
            setCostingData(data);
            setShowFinance(true);
          }}
          onDone={() => {
            // After submitting to finance, go back to dashboard
            setSalesOrder(null);
            setShowFinance(false);
            setCostingData(null);
          }}
        />
      );
    }

    // New request form (Sales)
    if (isCreating) {
      return (
        <NewRequest
          onBack={() => setIsCreating(false)}
          onSubmit={(order) => {
            setIsCreating(false);
            setSalesOrder(order);
          }}
        />
      );
    }

    // Request detail view
    if (selectedRequest) {
      return (
        <RequestDetails
          requestData={selectedRequest}
          currentUser={user}                        // ← NEW: role-aware buttons
          onBack={() => setSelectedRequest(null)}
          onOpenCosting={handleOpenCosting}         // ← NEW: Ops CTA
          onOpenFinance={handleOpenFinance}         // ← NEW: Finance CTA
        />
      );
    }

    // Default: dashboard
    return (
      <RequestDashboard
        currentUser={user}
        onSelectRequest={(req) => setSelectedRequest(req)}
        onCreateRequest={() => setIsCreating(true)}
        onLogout={handleLogout}
      />
    );
  };

  return <main>{renderContent()}</main>;
}

export default App;