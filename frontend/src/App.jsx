import { useState } from "react";
import LoginUser from "./components/LoginPage";
import RequestDashboard from "./components/RequestsDashboard";
import RequestDetails from "./components/DetailedRequest";
import NewRequest from "./components/NewRequest";
import OperationsCostingPage from "./components/OperationCostingFields";
import FinancePricingPage from "./components/FinancePricingPage";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [salesOrder, setSalesOrder] = useState(null);
  const [showFinance, setShowFinance] = useState(false);
  const [costingData, setCostingData] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSelectedRequest(null);
    setIsCreating(false);
    setSalesOrder(null);
    setShowFinance(false);
    setCostingData(null);
  };

  if (!user) {
    return <LoginUser onLogin={handleLogin} />;
  }

  const renderContent = () => {

    if (salesOrder && showFinance) {
      return (
        <FinancePricingPage
          salesOrder={salesOrder}
          costingItems={costingData}
          onBack={() => setShowFinance(false)}
        />
      );
    }

    if (salesOrder) {
      return (
        <OperationsCostingPage
          salesOrder={salesOrder}
          onBack={() => { setSalesOrder(null); setIsCreating(true); }}
          onSubmitToFinance={(data) => { setCostingData(data); setShowFinance(true); }}
        />
      );
    }

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

    if (selectedRequest) {
      return (
        <RequestDetails
          requestData={selectedRequest}
          onBack={() => setSelectedRequest(null)}
        />
      );
    }

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