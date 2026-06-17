import { useState } from "react";
import LoginUser from "./components/LoginPage";
import RequestDashboard from "./components/RequestsDashboard";
import RequestDetails from "./components/DetailedRequest";
import NewRequest from "./components/NewRequest";
import OperationsCostingPage from "./components/OperationCostingFields";
import FinancePricingPage from "./components/FinancePricingPage";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  // ── Auth ─────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // ── Navigation state ──────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [salesOrder, setSalesOrder] = useState(null);
  const [showFinance, setShowFinance] = useState(false);
  const [costingData, setCostingData] = useState(null);

  // ── Track where Ops page was opened from ─────────────────────
  // 'new'       → opened right after Sales created a request
  // 'dashboard' → opened from detail view by an Ops user
  const [costingOrigin, setCostingOrigin] = useState(null);

  // ── Auth handlers ─────────────────────────────────────────────
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
    setCostingOrigin(null);
  };

  // ── salesOrder mapper ─────────────────────────────────────────
  //
  // Handles both shapes that can arrive:
  //
  // Shape A — from NewRequest.jsx onSubmit():
  //   { requestId, clientName, projectTitle, quotationDeadline,
  //     deliveryDate, clientBudget, attachmentName, items[] }
  //   items: { id, item_id, quantity, description }
  //
  // Shape B — from DB via DetailedRequest onOpenCosting():
  //   { id, client_name, project_title, quotation_deadline,
  //     delivery_date, client_budget, items[] }
  //   items: { id, item_name, item_code, quantity, specifications }
  //
  const mapRequestToSalesOrder = (request) => ({
    // ID — NewRequest uses requestId, DB uses id
    id: request.id ?? request.requestId ?? null,

    // Client name — NewRequest passes camelCase, DB passes snake_case
    clientName: request.clientName ?? request.client_name ?? "",

    // Project title
    projectTitle: request.projectTitle ?? request.project_title ?? "",

    // Quotation deadline — format for display if it's a raw date string
    quotationDeadline: (() => {
      const raw = request.quotationDeadline ?? request.quotation_deadline ?? null;
      if (!raw) return "";
      // If already a human-readable string (from NewRequest), keep it
      if (isNaN(Date.parse(raw))) return raw;
      return new Date(raw).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });
    })(),

    // Delivery date
    deliveryDate: request.deliveryDate ?? request.delivery_date ?? "",

    // Client budget
    clientBudget: request.clientBudget ?? request.client_budget ?? null,

    // Attachment
    attachmentName: request.attachmentName ?? null,

    // Items — normalise to { id, description, quantity }
    // NewRequest already gives description; DB gives item_name
    items: (request.items ?? []).map((item) => ({
      id: item.id,
      description: item.description ?? item.item_name ?? "",
      quantity: item.quantity ?? 1,
      itemCode: item.item_code ?? item.itemCode ?? "",
      specs: item.specifications ?? item.specs ?? "",
    })),
  });

  // ── Navigation: open Ops costing from dashboard detail view ──
  const handleOpenCosting = (request) => {
    setSelectedRequest(null);
    setSalesOrder(mapRequestToSalesOrder(request));
    setShowFinance(false);
    setCostingData(null);
    setCostingOrigin("dashboard");
  };

  // ── Navigation: open Finance from dashboard detail view ───────
  const handleOpenFinance = (request) => {
    setSelectedRequest(null);
    setSalesOrder(mapRequestToSalesOrder(request));
    setShowFinance(true);
    setCostingData(null);
    setCostingOrigin("dashboard");
  };

  // ── Guard ─────────────────────────────────────────────────────
  if (!user) return (
    <>
      <LoginUser onLogin={handleLogin} />
      <ThemeToggle />
    </>
  );

  // ── State-machine renderer ────────────────────────────────────
  const renderContent = () => {

    // ── Finance page ────────────────────────────────────────────
    if (salesOrder && showFinance) {
      return (
        <FinancePricingPage
          salesOrder={salesOrder}
          costingItems={costingData}
          requestId={salesOrder.id}
          onBack={() => {
            setSalesOrder(null);
            setShowFinance(false);
            setCostingData(null);
            setCostingOrigin(null);
          }}
          onDone={() => {
            setSalesOrder(null);
            setShowFinance(false);
            setCostingData(null);
            setCostingOrigin(null);
          }}
        />
      );
    }

    // ── Operations costing page ─────────────────────────────────
    if (salesOrder) {
      return (
        <OperationsCostingPage
          salesOrder={salesOrder}
          requestId={salesOrder.id}
          onBack={() => {
            setSalesOrder(null);
            setCostingOrigin(null);
            // If we came from NewRequest, go back to the create form
            if (costingOrigin === "new") setIsCreating(true);
          }}
          // Always wire onSubmitToFinance so Finance page opens with data
          onSubmitToFinance={(data) => {
            setCostingData(data);
            setShowFinance(true);
          }}
          // onDone only when opened from dashboard — goes back to dashboard
          onDone={costingOrigin === "dashboard"
            ? () => {
              setSalesOrder(null);
              setShowFinance(false);
              setCostingData(null);
              setCostingOrigin(null);
            }
            : undefined
          }
        />
      );
    }

    // ── New request form ────────────────────────────────────────
    if (isCreating) {
      return (
        <NewRequest
          onBack={() => setIsCreating(false)}
          onSubmit={(order) => {
            setIsCreating(false);
            setSalesOrder(mapRequestToSalesOrder(order));
            setCostingOrigin("new");   // remember we came from NewRequest
          }}
        />
      );
    }

    // ── Request detail view ─────────────────────────────────────
    if (selectedRequest) {
      return (
        <RequestDetails
          requestData={selectedRequest}
          currentUser={user}
          onBack={() => setSelectedRequest(null)}
          onOpenCosting={handleOpenCosting}
          onOpenFinance={handleOpenFinance}
        />
      );
    }

    // ── Default: dashboard ──────────────────────────────────────
    return (
      <RequestDashboard
        currentUser={user}
        onSelectRequest={(req) => setSelectedRequest(req)}
        onCreateRequest={() => setIsCreating(true)}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <main>
      {renderContent()}
      <ThemeToggle />
    </main>
  );
}

export default App;