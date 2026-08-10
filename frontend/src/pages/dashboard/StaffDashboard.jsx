import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartBar,
  FaClock,
  FaCreditCard,
  FaEye,
  FaEyeSlash,
  FaFileInvoice,
  FaMoneyBillWave,
  FaRupeeSign,
  FaTag,
} from "react-icons/fa";

import Sidebar from "../../components/layout/Sidebar";
import { getDashboardData } from "../../services/dashboardService";

// StaffDashboard shows a summary of today's business activity:
// gold deposited, gold returned, total sales, and payment breakdown.
function StaffDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [visibleValues, setVisibleValues] = useState({
    deposit: false,
    returned: false,
    sales: false,
    cash: false,
    online: false,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error(error);
        setDashboardError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const transactions = dashboardData?.recent_transactions || [];
  const toggleValue = (key) => {
    setVisibleValues((current) => ({ ...current, [key]: !current[key] }));
  };
  const maskedValue = "••••";

  const todayDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <h1>Welcome, {user?.username || "Staff"}</h1>
            <p>Nellore Die Cutting</p>
          </div>
          <div className="header-info">
            <div className="header-info-box">
              <FaCalendarAlt className="header-info-icon" />
              <span>{todayDate}</span>
            </div>
            <div className="header-info-box">
              <FaClock className="header-info-icon" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* STATS GRID */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon deposit-icon"><FaArrowDown /></div>
            <div className="stat-text">
              <span>Today's Gold Deposit</span>
              <div className="dashboard-value-row">
                <h2>{visibleValues.deposit ? Number(dashboardData?.today_gold_deposit || 0).toFixed(3) : maskedValue}</h2>
                <button type="button" className="dashboard-value-eye" onClick={() => toggleValue("deposit")} aria-label={visibleValues.deposit ? "Hide gold deposit" : "Show gold deposit"}>
                  {visibleValues.deposit ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              <p>grams</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon return-icon"><FaArrowUp /></div>
            <div className="stat-text">
              <span>Today's Gold Return</span>
              <div className="dashboard-value-row">
                <h2>{visibleValues.returned ? Number(dashboardData?.today_gold_return || 0).toFixed(3) : maskedValue}</h2>
                <button type="button" className="dashboard-value-eye" onClick={() => toggleValue("returned")} aria-label={visibleValues.returned ? "Hide gold return" : "Show gold return"}>
                  {visibleValues.returned ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              <p>grams</p>
            </div>
          </div>

          <div className="stat-card">
              <div className="stat-icon sales-icon"><FaRupeeSign /></div>
            <div className="stat-text">
              <span>Today's Sales (Total)</span>
              <div className="dashboard-value-row">
                <h2>{visibleValues.sales ? `₹${Number(dashboardData?.today_sales || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}` : maskedValue}</h2>
                <button type="button" className="dashboard-value-eye" onClick={() => toggleValue("sales")} aria-label={visibleValues.sales ? "Hide today's sales" : "Show today's sales"}>
                  {visibleValues.sales ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
          </div>

          <div className="payment-card">
            <div className="payment-row">
              <div className="payment-icon"><FaMoneyBillWave /></div>
              <div>
                <span>Cash Received</span>
                <strong>
                  {visibleValues.cash ? `₹${Number(dashboardData?.cash_received || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}` : maskedValue}
                </strong>
                <button type="button" className="dashboard-value-eye" onClick={() => toggleValue("cash")} aria-label={visibleValues.cash ? "Hide cash received" : "Show cash received"}>
                  {visibleValues.cash ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
            <div className="payment-divider" />
            <div className="payment-row">
              <div className="payment-icon"><FaCreditCard /></div>
              <div>
                <span>Online Received</span>
                <strong>
                  {visibleValues.online ? `₹${Number(dashboardData?.online_received || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}` : maskedValue}
                </strong>
                <button type="button" className="dashboard-value-eye" onClick={() => toggleValue("online")} aria-label={visibleValues.online ? "Hide online received" : "Show online received"}>
                  {visibleValues.online ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-section">
          <h3>Quick Actions</h3>
          <div className="quick-grid">

            <button onClick={() => navigate("/tokens")}>
              <div className="quick-icon"><FaTag /></div>
              <div>
                <strong>Token / Gold Deposit</strong>
                <span>Create New Token</span>
              </div>
              <b>›</b>
            </button>

            <button onClick={() => navigate("/billing")}>
              <div className="quick-icon"><FaFileInvoice /></div>
              <div>
                <strong>Billing / Gold Return</strong>
                <span>Create New Bill</span>
              </div>
              <b>›</b>
            </button>

            <button onClick={() => navigate("/reports")}>
              <div className="quick-icon"><FaChartBar /></div>
              <div>
                <strong>Reports</strong>
                <span>View Reports</span>
              </div>
              <b>›</b>
            </button>

          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className="transactions-section">
          <div className="section-title">
            <h3>Recent Transactions</h3>
            <button onClick={() => navigate("/billing")}>View All</button>
          </div>

          {dashboardError && (
            <p style={{ color: "red", fontSize: 13, marginBottom: 10 }}>{dashboardError}</p>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Token / Bill No.</th>
                  <th>Customer Mobile</th>
                  <th>Gold Deposit (gm)</th>
                  <th>Gold Return (gm)</th>
                  <th>Amount (₹)</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#888" }}>
                      Loading...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#888" }}>
                      No transactions today.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <span className={transaction.type === "BILL" ? "type-badge bill" : "type-badge token"}>
                          {transaction.type}
                        </span>
                      </td>
                      <td><strong>{transaction.number}</strong></td>
                      <td>{transaction.mobile}</td>
                      <td>{transaction.deposit ? Number(transaction.deposit).toFixed(3) : "-"}</td>
                      <td>{transaction.returned ? Number(transaction.returned).toFixed(3) : "-"}</td>
                      <td>
                        {transaction.amount
                          ? `₹${Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </td>
                      <td>
                        {new Date(transaction.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="table-actions">···</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}

export default StaffDashboard;
