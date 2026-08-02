import { useEffect, useMemo, useState } from "react";
import {
  FaBars,
  FaCalendarAlt,
  FaChartBar,
  FaClock,
  FaCog,
  FaCreditCard,
  FaFileInvoice,
  FaGem,
  FaMoneyBillWave,
  FaReceipt,
  FaTag,
  FaUserCircle,
  FaUsers,
  FaWallet,
  FaWeight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Sidebar from "../../components/layout/Sidebar";
import { getAdminDashboardData } from "../../services/dashboardService";

const EMPTY_DASHBOARD = {
  today: {
    gold_deposit: "0.000",
    gold_return: "0.000",
    sales: "0.00",
    cash: "0.00",
    online: "0.00",
    bill_count: 0,
    net_weight: "0.000",
    pending_bills: 0,
    pending_amount: "0.00",
    average_bill: "0.00",
  },
  weekly_sales: [],
  recent_transactions: [],
};

const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value) => `₹ ${asNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const weight = (value) => `${asNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} gm`;

function StatCard({ icon, tone, title, value, detail, children }) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-icon ${tone}`}>{icon}</div>
      <div className="admin-stat-copy">
        <p>{title}</p>
        {value && <h2>{value}</h2>}
        {detail && <small className={tone}>{detail}</small>}
        {children}
      </div>
    </article>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storedUser = localStorage.getItem("user");
  const user = useMemo(() => {
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [storedUser]);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminDashboardData();
        setDashboard({ ...EMPTY_DASHBOARD, ...data, today: { ...EMPTY_DASHBOARD.today, ...data.today } });
      } catch (loadError) {
        setError(loadError?.response?.status === 403 ? "Administrator access is required." : "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate, user?.is_superuser]);

  const today = dashboard.today;
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
  });

  const quickActions = [
    { label: "Token / Deposit", icon: <FaTag />, path: "/tokens", tone: "green" },
    { label: "Gold Return", icon: <FaWeight />, path: "/billing", tone: "blue" },
    { label: "Die Price", icon: <FaGem />, path: "/die-price", tone: "orange" },
    { label: "Bills (Gold)", icon: <FaFileInvoice />, path: "/billing", tone: "purple" },
    { label: "Reports", icon: <FaChartBar />, path: "/reports", tone: "green" },
    { label: "Customers", icon: <FaUsers />, path: "/customers", tone: "purple" },
    { label: "Settings", icon: <FaCog />, path: "/settings", tone: "blue" },
  ];

  return (
    <div className="admin-dashboard-layout">
      <Sidebar />
      <main className="admin-dashboard-main">
        <header className="admin-dashboard-header">
          <div className="admin-dashboard-title">
            <FaBars />
            <div><h1>Dashboard</h1><p>Overview of your shop today</p></div>
          </div>
          <div className="admin-dashboard-userbar">
            <div className="admin-dashboard-date"><FaCalendarAlt /><span>{dateLabel}</span></div>
            <div className="admin-dashboard-user"><FaUserCircle /><div><strong>{user?.username || "Admin"}</strong><small>Super Admin</small></div></div>
          </div>
        </header>

        <div className="admin-dashboard-content">
          {error && <div className="admin-dashboard-message error">{error}</div>}
          {loading && <div className="admin-dashboard-message">Loading live dashboard data...</div>}

          <section className="admin-stats-grid" aria-label="Today at a glance">
            <StatCard icon={<FaWallet />} tone="green" title="Gold Deposit" value={weight(today.gold_deposit)} detail={money(today.sales)} />
            <StatCard icon={<FaWeight />} tone="blue" title="Gold Return" value={weight(today.gold_return)} detail={weight(today.net_weight)} />
            <StatCard icon={<FaReceipt />} tone="orange" title="Today's Bill" value={String(today.bill_count)} detail={money(today.sales)} />
            <StatCard icon={<FaCreditCard />} tone="purple" title="Payments"><div className="admin-payment-lines"><span>Cash <b>{money(today.cash)}</b></span><span>Online <b>{money(today.online)}</b></span></div></StatCard>
            <StatCard icon={<FaFileInvoice />} tone="blue" title="Total Bills" value={String(today.bill_count)} detail="Today" />
            <StatCard icon={<FaWeight />} tone="orange" title="Total Weight" value={weight(today.net_weight)} detail="Net Weight" />
            <StatCard icon={<FaClock />} tone="red" title="Pending Bills" value={String(today.pending_bills)} detail={money(today.pending_amount)} />
            <StatCard icon={<FaMoneyBillWave />} tone="teal" title="Avg. Bill Value" value={money(today.average_bill)} />
          </section>

          <section className="admin-dashboard-mid-grid">
            <article className="admin-panel admin-sales-panel">
              <div className="admin-panel-heading"><div><h2>SALES OVERVIEW</h2><span>This Week</span></div><button type="button">This Week</button></div>
              <div className="admin-sales-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.weekly_sales} margin={{ top: 16, right: 8, left: -15, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e7ece6" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#607065", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#607065", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => money(value)} cursor={{ fill: "rgba(47, 107, 22, .06)" }} />
                    <Bar dataKey="amount" fill="#24681b" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {!loading && dashboard.weekly_sales.length === 0 && <p className="admin-empty-chart">No sales recorded this week.</p>}
            </article>

            <article className="admin-panel admin-transactions-panel">
              <div className="admin-panel-heading"><h2>RECENT TRANSACTIONS</h2><button type="button" onClick={() => navigate("/billing")}>View All</button></div>
              <div className="admin-transaction-list">
                {dashboard.recent_transactions.length === 0 && !loading ? <p className="admin-empty-list">No recent transactions.</p> : dashboard.recent_transactions.map((item) => (
                  <div className="admin-transaction" key={item.id}>
                    <div className={`admin-transaction-icon ${item.type === "BILL" ? "blue" : "green"}`}>{item.type === "BILL" ? <FaFileInvoice /> : <FaWallet />}</div>
                    <div><strong>{item.type === "BILL" ? "Bill" : "Deposit"}</strong><span>{item.number}</span></div>
                    <div className="admin-transaction-value"><strong>{weight(item.weight)}</strong><span>{item.amount ? money(item.amount) : "-"}</span></div>
                    <time>{new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="admin-summary-grid">
            <article className="admin-panel admin-summary-panel">
              <div className="admin-panel-heading"><h2>DAILY SUMMARY</h2></div>
              <div className="admin-summary-columns">
                <div><p>Gold Deposit <b>{weight(today.gold_deposit)}</b><strong>{money(today.sales)}</strong></p><p>Gold Return <b>{weight(today.gold_return)}</b><strong>{weight(today.net_weight)}</strong></p><p>Net Weight <b>{weight(today.net_weight)}</b></p></div>
                <div><p>Cash Received <strong>{money(today.cash)}</strong></p><p>Online Received <strong>{money(today.online)}</strong></p><p>Total Transactions <strong>{today.bill_count}</strong></p></div>
              </div>
            </article>
          </section>

          <section className="admin-panel admin-quick-panel">
            <div className="admin-panel-heading"><h2>QUICK ACTIONS</h2></div>
            <div className="admin-quick-grid">
              {quickActions.map((action) => <button key={action.label} type="button" onClick={() => navigate(action.path)}><span className={action.tone}>{action.icon}</span>{action.label}</button>)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
