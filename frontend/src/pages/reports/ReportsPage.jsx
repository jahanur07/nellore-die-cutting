import { jsPDF } from "jspdf";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartBar,
  FaChevronDown,
  FaDownload,
  FaFileInvoice,
  FaLightbulb,
  FaRupeeSign,
  FaWallet,
  FaWeight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Sidebar from "../../components/layout/Sidebar";
import { getReportSummary } from "../../services/reportService";

const FILTER_OPTIONS = [
  { key: "daily", label: "Daily Summary" },
  { key: "date_range", label: "Date Range" },
  { key: "monthly", label: "Monthly Summary" },
  { key: "custom", label: "Custom Range" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EMPTY_REPORT = {
  mode: "daily",
  period: {
    start_date: "",
    end_date: "",
    is_single_day: true,
  },
  gold_deposit: {
    total: "0.000",
    transactions: 0,
  },
  gold_return: {
    total: "0.000",
    transactions: 0,
  },
  billing: {
    total_amount: "0.00",
    final_amount: "0.00",
    transactions: 0,
  },
  payments: {
    cash: "0.00",
    online: "0.00",
    cash_percentage: "0.00",
    online_percentage: "0.00",
  },
  weight_chart: [],
  recent_tokens: [],
  recent_bills: [],
  statistics: {
    net_weight: "0.000",
    average_bill: "0.00",
    average_token_weight: "0.000",
  },
  totals: {
    token_count: 0,
    token_weight: "0.000",
    bill_count: 0,
    bill_final_amount: "0.00",
  },
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatWeight = (value) =>
  `${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(parseNumber(value))} gm`;

const formatCurrency = (value) =>
  `₹ ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseNumber(value))}`;

const formatPercent = (value) =>
  `${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseNumber(value))}%`;

const formatDateForHeading = (isoDate) => {
  if (!isoDate) return { main: "-", sub: "-" };
  const date = new Date(`${isoDate}T00:00:00`);

  return {
    main: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    sub: date.toLocaleDateString("en-GB", { weekday: "long" }),
  };
};

function ReportsPage() {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayISO = today.toISOString().slice(0, 10);

  const [mode, setMode] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestParams = useMemo(() => {
    if (mode === "monthly") {
      return {
        mode,
        month: selectedMonth,
        year: selectedYear,
      };
    }

    if (mode === "date_range" || mode === "custom") {
      return {
        mode,
        start_date: startDate,
        end_date: endDate,
      };
    }

    return {
      mode: "daily",
      date: selectedDate,
    };
  }, [mode, selectedDate, startDate, endDate, selectedMonth, selectedYear]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getReportSummary(requestParams);
      setReport({ ...EMPTY_REPORT, ...data });
    } catch {
      setReport(EMPTY_REPORT);
      setError("Unable to load report data.");
    } finally {
      setLoading(false);
    }
  }, [requestParams]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const paymentChartData = [
    {
      name: "Cash",
      value: parseNumber(report.payments.cash),
      percentage: parseNumber(report.payments.cash_percentage),
      color: "#59bc4f",
    },
    {
      name: "Online",
      value: parseNumber(report.payments.online),
      percentage: parseNumber(report.payments.online_percentage),
      color: "#4f95ec",
    },
  ];

  const paymentTotal = paymentChartData.reduce((sum, item) => sum + item.value, 0);

  const hasWeightData = useMemo(
    () => report.weight_chart.some((point) => parseNumber(point.deposit) > 0 || parseNumber(point.return) > 0),
    [report.weight_chart]
  );

  const headingDate = useMemo(() => {
    if (mode === "monthly") {
      return {
        main: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
        sub: "Monthly Summary",
      };
    }

    if (mode === "date_range" || mode === "custom") {
      const start = formatDateForHeading(startDate).main;
      const end = formatDateForHeading(endDate).main;
      return {
        main: `${start} - ${end}`,
        sub: "Selected Range",
      };
    }

    return formatDateForHeading(selectedDate);
  }, [mode, selectedDate, startDate, endDate, selectedMonth, selectedYear]);

  const exportReport = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const left = 40;
      let y = 44;

      const addRow = (label, value) => {
        if (y > 790) {
          doc.addPage();
          y = 44;
        }
        doc.setFont("helvetica", "bold");
        doc.text(label, left, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), left + 190, y);
        y += 20;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("Nellore Die Cutting - Reports", left, y);
      y += 24;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Report Type: ${FILTER_OPTIONS.find((item) => item.key === mode)?.label || "Daily Summary"}`, left, y);
      y += 16;
      doc.text(`Period: ${headingDate.main} (${headingDate.sub})`, left, y);
      y += 20;

      doc.setDrawColor(220);
      doc.line(left, y, 555, y);
      y += 18;

      addRow("Gold Deposit", formatWeight(report.gold_deposit.total));
      addRow("Gold Return", formatWeight(report.gold_return.total));
      addRow("Total Bill Amount", formatCurrency(report.billing.total_amount));
      addRow("Final Amount", formatCurrency(report.billing.final_amount));
      addRow("Cash", formatCurrency(report.payments.cash));
      addRow("Online", formatCurrency(report.payments.online));
      addRow("Token Transactions", report.gold_deposit.transactions);
      addRow("Bill Transactions", report.billing.transactions);
      addRow("Net Weight", formatWeight(report.statistics.net_weight));
      addRow("Average Billing", formatCurrency(report.statistics.average_bill));
      addRow("Average Weight", formatWeight(report.statistics.average_token_weight));

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.text("Recent Tokens", left, y);
      y += 16;
      doc.setFont("helvetica", "normal");

      if (report.recent_tokens.length === 0) {
        doc.text("No tokens found.", left, y);
        y += 18;
      } else {
        report.recent_tokens.forEach((token) => {
          addRow(
            `${token.token_number} | ${token.time} | ${token.customer_mobile}`,
            `${formatWeight(token.gold_deposit)}`
          );
        });
      }

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Recent Bills", left, y);
      y += 16;
      doc.setFont("helvetica", "normal");

      if (report.recent_bills.length === 0) {
        doc.text("No bills found.", left, y);
      } else {
        report.recent_bills.forEach((bill) => {
          addRow(
            `${bill.bill_number} | ${bill.time} | ${bill.customer_mobile} | ${bill.payment_method}`,
            formatCurrency(bill.final_amount)
          );
        });
      }

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`ndc-report-${stamp}.pdf`);
    } catch {
      const backupContent = JSON.stringify(report, null, 2);
      const blob = new Blob([backupContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ndc-report-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="reports-layout dashboard-layout">
      <Sidebar />

      <main className="reports-page">
        <section className="reports-header">
          <div className="reports-header-left">
            <button className="reports-back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft size={18} />
            </button>

            <div>
              <h1>REPORTS</h1>
              <p>Track your daily business activity</p>
            </div>
          </div>

          <div className="reports-header-right">
            <div className="reports-date-selector">
              <FaCalendarAlt className="reports-control-icon" />
              <div>
                <div className="reports-date-main">{headingDate.main}</div>
                <div className="reports-date-sub">{headingDate.sub}</div>
              </div>
              <FaChevronDown className="reports-control-chevron" />
            </div>

            <button type="button" className="reports-download-btn" onClick={exportReport}>
              <FaDownload />
              <span>Download Report</span>
            </button>
          </div>
        </section>

        <div className="reports-divider" />

        {error && (
          <div className="reports-error-banner">
            <span>Unable to load report data.</span>
            <button type="button" onClick={loadReport}>Retry</button>
          </div>
        )}

        <section className="report-filter-tabs">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`report-filter-tab ${mode === option.key ? "active" : ""}`}
              onClick={() => setMode(option.key)}
            >
              <FaCalendarAlt />
              <span>{option.label}</span>
            </button>
          ))}
        </section>

        <section className="report-filter-controls">
          {mode === "daily" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          )}

          {(mode === "date_range" || mode === "custom") && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </>
          )}

          {mode === "monthly" && (
            <>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
              >
                {MONTHS.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {[0, 1, 2, 3, 4].map((offset) => {
                  const year = today.getFullYear() - offset;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </>
          )}
        </section>

        <section className="report-stats-grid">
          <article className="report-stat-card report-stat-green">
            <h3>GOLD DEPOSIT (TODAY)</h3>
            <div className="report-stat-main">
              <div className="report-stat-icon icon-deposit"><FaDownload /></div>
              <div>
                <strong>{loading ? "..." : formatWeight(report.gold_deposit.total)}</strong>
                <p>Total Weight</p>
              </div>
            </div>
            <div className="report-stat-bottom">Transactions : {loading ? "..." : report.gold_deposit.transactions}</div>
          </article>

          <article className="report-stat-card report-stat-blue">
            <h3>GOLD RETURN (TODAY)</h3>
            <div className="report-stat-main">
              <div className="report-stat-icon icon-return"><FaDownload className="rotate-up" /></div>
              <div>
                <strong>{loading ? "..." : formatWeight(report.gold_return.total)}</strong>
                <p>Total Weight</p>
              </div>
            </div>
            <div className="report-stat-bottom">Transactions : {loading ? "..." : report.gold_return.transactions}</div>
          </article>

          <article className="report-stat-card report-stat-yellow">
            <h3>TOTAL BILL AMOUNT (TODAY)</h3>
            <div className="report-stat-main">
              <div className="report-stat-icon icon-total"><FaRupeeSign /></div>
              <div>
                <strong>{loading ? "..." : formatCurrency(report.billing.total_amount)}</strong>
                <p>Total Sales</p>
              </div>
            </div>
            <div className="report-stat-bottom">Transactions : {loading ? "..." : report.billing.transactions}</div>
          </article>

          <article className="report-stat-card report-stat-final">
            <h3>FINAL AMOUNT (TODAY)</h3>
            <div className="report-stat-main">
              <div className="report-stat-icon icon-final"><FaWallet /></div>
              <div>
                <strong>{loading ? "..." : formatCurrency(report.billing.final_amount)}</strong>
                <p>After Discount</p>
              </div>
            </div>
            <div className="report-stat-bottom">Transactions : {loading ? "..." : report.billing.transactions}</div>
          </article>
        </section>

        <section className="report-middle-grid">
          <article className="payment-summary-card">
            <h3>PAYMENT SUMMARY (TODAY)</h3>
            <div className="payment-summary-body">
              <div className="payment-method-card cash">
                <div className="payment-method-icon"><FaWallet /></div>
                <span>CASH RECEIVED</span>
                <strong>{loading ? "..." : formatCurrency(report.payments.cash)}</strong>
                <p>{loading ? "..." : `${formatPercent(report.payments.cash_percentage)} of Total`}</p>
              </div>

              <div className="payment-method-card online">
                <div className="payment-method-icon"><FaFileInvoice /></div>
                <span>ONLINE RECEIVED</span>
                <strong>{loading ? "..." : formatCurrency(report.payments.online)}</strong>
                <p>{loading ? "..." : `${formatPercent(report.payments.online_percentage)} of Total`}</p>
              </div>

              <div className="payment-chart-wrap">
                {loading ? (
                  <div className="chart-loading" />
                ) : (
                  <div className="payment-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={64}
                          paddingAngle={1}
                          isAnimationActive={false}
                        >
                          {paymentChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="payment-chart-center">
                      <span>Total</span>
                      <strong>{formatCurrency(paymentTotal)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="payment-chart-legend">
                {paymentChartData.map((item) => (
                  <div key={item.name}>
                    <span className="legend-line"><i style={{ background: item.color }} /> {item.name}</span>
                    <strong>{loading ? "..." : formatPercent(item.percentage)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="weight-chart-card">
            <h3>WEIGHT SUMMARY CHART (TODAY)</h3>
            <div className="weight-chart-inner">
              {loading ? (
                <div className="chart-loading chart-loading-wide" />
              ) : hasWeightData || report.weight_chart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.weight_chart} barCategoryGap={14}>
                    <CartesianGrid stroke="#f0f0e8" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#666" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#666" }} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${new Intl.NumberFormat("en-IN", {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        }).format(parseNumber(value))} gm`,
                        name === "deposit" ? "Gold Deposit" : "Gold Return",
                      ]}
                    />
                    <Bar dataKey="deposit" name="Gold Deposit (gm)" fill="#72b659" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="return" name="Gold Return (gm)" fill="#6aaaf0" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No chart data for selected filter.</div>
              )}
            </div>
          </article>
        </section>

        <section className="report-tables-grid">
          <article className="report-table-card">
            <div className="report-table-head">
              <h3>RECENT TOKENS (TODAY)</h3>
              <button type="button" onClick={() => navigate("/tokens")}>View All</button>
            </div>

            <div className="report-table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Token No</th>
                    <th>Time</th>
                    <th>Customer Mobile</th>
                    <th>Gold Deposit (gm)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="report-table-empty">Loading...</td>
                    </tr>
                  ) : report.recent_tokens.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="report-table-empty">No tokens found.</td>
                    </tr>
                  ) : (
                    report.recent_tokens.map((item) => (
                      <tr key={item.id}>
                        <td>{item.token_number}</td>
                        <td>{item.time}</td>
                        <td>{item.customer_mobile}</td>
                        <td>{new Intl.NumberFormat("en-IN", {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        }).format(parseNumber(item.gold_deposit))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="report-table-footer">
              <span>Total Tokens : {loading ? "..." : report.totals.token_count}</span>
              <strong>{loading ? "..." : formatWeight(report.totals.token_weight)}</strong>
            </div>
          </article>

          <article className="report-table-card">
            <div className="report-table-head">
              <h3>RECENT BILLS (TODAY)</h3>
              <button type="button" onClick={() => navigate("/billing")}>View All</button>
            </div>

            <div className="report-table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Time</th>
                    <th>Customer Mobile</th>
                    <th>Final Amount (₹)</th>
                    <th>Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="report-table-empty">Loading...</td>
                    </tr>
                  ) : report.recent_bills.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="report-table-empty">No bills found.</td>
                    </tr>
                  ) : (
                    report.recent_bills.map((item) => (
                      <tr key={item.id}>
                        <td>{item.bill_number}</td>
                        <td>{item.time}</td>
                        <td>{item.customer_mobile}</td>
                        <td>{new Intl.NumberFormat("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(parseNumber(item.final_amount))}</td>
                        <td>
                          <span className={`payment-badge ${String(item.payment_method || "").toLowerCase()}`}>
                            {item.payment_method === "ONLINE" ? "Online" : "Cash"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="report-table-footer">
              <span>Total Bills : {loading ? "..." : report.totals.bill_count}</span>
              <strong>{loading ? "..." : formatCurrency(report.totals.bill_final_amount)}</strong>
            </div>
          </article>
        </section>

        <section className="report-bottom-summary">
          <div className="report-summary-item">
            <div className="summary-icon"><FaLightbulb /></div>
            <div>
              <p>Net Weight Processed (Today)</p>
              <strong>{loading ? "..." : formatWeight(report.statistics.net_weight)}</strong>
              <small>(Gold Deposit - Gold Return)</small>
            </div>
          </div>

          <div className="report-summary-item">
            <div className="summary-icon"><FaChartBar /></div>
            <div>
              <p>Average Billing (Per Bill)</p>
              <strong>{loading ? "..." : formatCurrency(report.statistics.average_bill)}</strong>
            </div>
          </div>

          <div className="report-summary-item">
            <div className="summary-icon"><FaWeight /></div>
            <div>
              <p>Average Weight (Per Token)</p>
              <strong>{loading ? "..." : formatWeight(report.statistics.average_token_weight)}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReportsPage;
