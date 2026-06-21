import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import api from "./api/axios";
import LoginUser from "./components/LoginPage";
import RequestDashboard from "./components/RequestsDashboard";
import RequestDetails from "./components/DetailedRequest";
import NewRequest from "./components/NewRequest";
import OperationsCostingPage from "./components/OperationCostingFields";
import FinancePricingPage from "./components/FinancePricingPage";
import ThemeToggle from "./components/ThemeToggle";

// ── salesOrder mapper ─────────────────────────────────────────
//
// Normalizes a request (DB snake_case, or the camelCase shape returned by
// NewRequest) into the single canonical shape the Ops/Finance pages consume.
//
const formatDeadline = (raw) => {
  if (!raw) return "";
  if (Number.isNaN(Date.parse(raw))) return raw;
  return new Date(raw).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const mapRequestToSalesOrder = (request) => ({
  id: request.id ?? request.requestId ?? null,
  clientName: request.clientName ?? request.client_name ?? "",
  projectTitle: request.projectTitle ?? request.project_title ?? "",
  quotationDeadline: formatDeadline(request.quotationDeadline ?? request.quotation_deadline),
  deliveryDate: request.deliveryDate ?? request.delivery_date ?? "",
  clientBudget: request.clientBudget ?? request.client_budget ?? null,
  attachmentName: request.attachmentName ?? null,
  items: (request.items ?? []).map((item) => ({
    id: item.id,
    description: item.description ?? item.item_name ?? "",
    quantity: item.quantity ?? 1,
    itemCode: item.item_code ?? item.itemCode ?? "",
    specs: item.specifications ?? item.specs ?? "",
  })),
});

// ── Load a request by id and expose it as a salesOrder ────────
// Used by the Ops/Finance routes so deep links / refreshes work without
// relying on in-memory navigation state.
function useSalesOrder(id) {
  const [salesOrder, setSalesOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!id) {
      setLoading(false);
      setError("Missing request ID.");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/requests/${id}`);
        const request = data?.request ?? data?.data ?? data;
        if (mounted) setSalesOrder(mapRequestToSalesOrder(request));
      } catch (err) {
        console.error("Failed to load request:", err);
        if (mounted) setError("Failed to load request. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  return { salesOrder, loading, error };
}

const CenteredMessage = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 flex items-center justify-center">
    <div className="text-slate-400 dark:text-slate-500 text-sm">{children}</div>
  </div>
);

// ── Route wrappers ────────────────────────────────────────────
function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function DashboardRoute({ user, onLogout }) {
  const navigate = useNavigate();
  return (
    <RequestDashboard
      currentUser={user}
      onSelectRequest={(req) => navigate(`/requests/${req.id}`)}
      onCreateRequest={() => navigate("/requests/new")}
      onLogout={() => {
        onLogout();
        navigate("/login", { replace: true });
      }}
    />
  );
}

function NewRequestRoute() {
  const navigate = useNavigate();
  return (
    <NewRequest
      onBack={() => navigate("/")}
      onSubmit={(order) => navigate(`/requests/${order.requestId ?? order.id}`)}
    />
  );
}

function DetailRoute({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  // Memoize so DetailedRequest's [requestData] effect doesn't refetch each render.
  const requestData = useMemo(() => ({ id }), [id]);

  return (
    <RequestDetails
      requestData={requestData}
      currentUser={user}
      onBack={() => navigate("/")}
      onOpenCosting={() => navigate(`/requests/${id}/costing`)}
      onOpenFinance={() => navigate(`/requests/${id}/finance`)}
    />
  );
}

function CostingRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { salesOrder, loading, error } = useSalesOrder(id);

  if (loading) return <CenteredMessage>Loading costing data…</CenteredMessage>;
  if (error || !salesOrder) return <CenteredMessage>{error ?? "Request not found."}</CenteredMessage>;

  return (
    <OperationsCostingPage
      salesOrder={salesOrder}
      requestId={id}
      onBack={() => navigate(`/requests/${id}`)}
      onDone={() => navigate("/")}
    />
  );
}

function FinanceRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { salesOrder, loading, error } = useSalesOrder(id);

  if (loading) return <CenteredMessage>Loading pricing data…</CenteredMessage>;
  if (error || !salesOrder) return <CenteredMessage>{error ?? "Request not found."}</CenteredMessage>;

  return (
    <FinancePricingPage
      salesOrder={salesOrder}
      requestId={id}
      costingItems={null}
      onBack={() => navigate(`/requests/${id}`)}
      onDone={() => navigate("/")}
    />
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <main>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginUser onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            <RequireAuth user={user}>
              <DashboardRoute user={user} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route
          path="/requests/new"
          element={
            <RequireAuth user={user}>
              <NewRequestRoute />
            </RequireAuth>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <RequireAuth user={user}>
              <DetailRoute user={user} />
            </RequireAuth>
          }
        />
        <Route
          path="/requests/:id/costing"
          element={
            <RequireAuth user={user}>
              <CostingRoute />
            </RequireAuth>
          }
        />
        <Route
          path="/requests/:id/finance"
          element={
            <RequireAuth user={user}>
              <FinanceRoute />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
      <ThemeToggle />
    </main>
  );
}

export default App;
