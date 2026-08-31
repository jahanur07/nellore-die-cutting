import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEdit,
  FaFileInvoice,
  FaLock,
  FaPhoneAlt,
  FaPrint,
  FaRupeeSign,
  FaSearch,
  FaSyncAlt,
  FaTrash,
  FaUnlock,
  FaUsers,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import { getBills } from "../../services/billingService";
import { getBillingProfile } from "../../services/settingsService";
import { printCustomerBills } from "../../utils/printCustomerBills";
import {
  deleteCustomer,
  getAdminCustomerSummary,
  updateCustomerStaffEditAccess,
} from "../../services/customerService";

const EMPTY_SUMMARY = {
  total_customers: 0,
  active_customers: 0,
  total_transactions: 0,
  total_billing_amount: "0.00",
};

const EMPTY_PAGINATION = {
  page: 1,
  page_size: 10,
  total_results: 0,
  total_pages: 1,
};

const formatCurrency = (value) => Number(value || 0).toLocaleString("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) {
    return "No visits yet";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function AdminCustomerPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchBy, setSearchBy] = useState("mobile");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingCustomerId, setUpdatingCustomerId] = useState(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [printingCustomerId, setPrintingCustomerId] = useState(null);
  const [billPicker, setBillPicker] = useState(null);
  const [loadingBillsForCustomer, setLoadingBillsForCustomer] = useState(null);

  const loadCustomers = async ({
    page = pagination.page,
    searchText = appliedSearch,
    searchField = searchBy,
  } = {}) => {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminCustomerSummary({
        page,
        search: searchText,
        searchBy: searchField,
      });
      setSummary({ ...EMPTY_SUMMARY, ...data.summary });
      setCustomers(data.customers || []);
      setPagination({ ...EMPTY_PAGINATION, ...data.pagination });
    } catch (loadError) {
      setError(
        loadError.response?.status === 403
          ? "Administrator access is required."
          : "Customer transaction data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers({ page: 1, searchText: "", searchField: "mobile" });
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setAppliedSearch(nextSearch);
    loadCustomers({ page: 1, searchText: nextSearch, searchField: searchBy });
  };

  const handleSearchModeChange = (mode) => {
    setSearchBy(mode);
    setSearch("");
    setAppliedSearch("");
    loadCustomers({ page: 1, searchText: "", searchField: mode });
  };

  const handleReset = () => {
    setSearchBy("mobile");
    setSearch("");
    setAppliedSearch("");
    loadCustomers({ page: 1, searchText: "", searchField: "mobile" });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.total_pages || nextPage === pagination.page) {
      return;
    }

    loadCustomers({ page: nextPage });
  };

  const handleStaffEditAccess = async (customer) => {
    setUpdatingCustomerId(customer.id);
    setError("");

    try {
      const updatedCustomer = await updateCustomerStaffEditAccess(
        customer.id,
        !customer.staff_edit_unlocked
      );
      setCustomers((current) => current.map((item) => (
        item.id === customer.id
          ? { ...item, staff_edit_unlocked: updatedCustomer.staff_edit_unlocked }
          : item
      )));
    } catch (updateError) {
      setError(
        updateError.response?.data?.detail
        || "Unable to update staff edit access for this customer."
      );
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) {
      return;
    }

    setDeletingCustomerId(customer.id);
    setError("");

    try {
      await deleteCustomer(customer.id);
      await loadCustomers({ page: pagination.page });
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.detail
        || "Unable to delete customer."
      );
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handlePrintCustomerBills = async (customer) => {
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      setError("Printing was blocked. Please allow pop-ups for this site.");
      return;
    }
    setPrintingCustomerId(customer.id);
    setError("");
    try {
      const bills = await getBills(customer.mobile);
      if (!bills.length) {
        printWindow.close();
        setError("This customer has no bills to print.");
        return;
      }
      const printConfig = await getBillingProfile().catch(() => ({}));
      if (!printCustomerBills(customer, bills, printWindow, printConfig)) {
        setError("Printing was blocked. Please allow pop-ups for this site.");
      }
    } catch {
      printWindow.close();
      setError("Unable to load this customer's bills.");
    } finally {
      setPrintingCustomerId(null);
    }
  };

  const handleEditCustomerBills = async (customer) => {
    setLoadingBillsForCustomer(customer.id);
    setError("");
    try {
      const bills = await getBills(customer.mobile);
      if (!bills.length) {
        setError("This customer has no bills to edit.");
        return;
      }
      setBillPicker({ customer, bills });
    } catch {
      setError("Unable to load this customer's bills.");
    } finally {
      setLoadingBillsForCustomer(null);
    }
  };

  const exportCustomers = () => {
    const rows = [
      ["Customer ID", "Customer Name", "Mobile Number", "Total Tokens", "Total Bills", "Total Billing Amount", "Last Visit"],
      ...customers.map((customer) => [
        customer.customer_code,
        customer.name,
        customer.mobile,
        customer.total_tokens,
        customer.total_bills,
        customer.total_billing_amount,
        formatDate(customer.last_visit),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startRecord = customers.length
    ? ((pagination.page - 1) * pagination.page_size) + 1
    : 0;
  const endRecord = startRecord + customers.length - 1;
  const searchPlaceholder = searchBy === "bill"
    ? "Enter bill number"
    : "Enter mobile number";

  return (
    <div className="admin-customer-layout">
      <Sidebar />

      <main className="admin-customer-main">
        <header className="admin-customer-header">
          <div className="admin-customer-title">
            <FaUsers />
            <div>
              <h1>CUSTOMERS</h1>
              <p>Customer transaction overview</p>
            </div>
          </div>

          <div className="admin-customer-header-actions">
            <div className="admin-customer-date">
              <FaCalendarAlt />
              <span>{dateLabel}</span>
            </div>
            <div className="admin-customer-readonly" title="Customer records are managed in the staff workflow">
              <FaLock />
              <span>Admin View</span>
            </div>
          </div>
        </header>

        <section className="admin-customer-stats" aria-label="Customer summary">
          <article className="admin-customer-stat total">
            <span className="admin-customer-stat-icon"><FaUsers /></span>
            <div><small>Total Customers</small><strong>{Number(summary.total_customers).toLocaleString("en-IN")}</strong><em>All time</em></div>
          </article>
          <article className="admin-customer-stat active">
            <span className="admin-customer-stat-icon"><FaPhoneAlt /></span>
            <div><small>Active Customers</small><strong>{Number(summary.active_customers).toLocaleString("en-IN")}</strong><em>Used in last 90 days</em></div>
          </article>
          <article className="admin-customer-stat transactions">
            <span className="admin-customer-stat-icon"><FaFileInvoice /></span>
            <div><small>Total Transactions</small><strong>{Number(summary.total_transactions).toLocaleString("en-IN")}</strong><em>Tokens and bills</em></div>
          </article>
          <article className="admin-customer-stat billing">
            <span className="admin-customer-stat-icon"><FaRupeeSign /></span>
            <div><small>Total Billing Amount</small><strong>{formatCurrency(summary.total_billing_amount)}</strong><em>All time</em></div>
          </article>
        </section>

        <section className="admin-customer-panel">
          <form className="admin-customer-search" onSubmit={handleSearch}>
            <div className="admin-customer-search-tabs" role="tablist" aria-label="Customer search type">
              <button
                type="button"
                role="tab"
                aria-selected={searchBy === "mobile"}
                className={searchBy === "mobile" ? "active" : ""}
                onClick={() => handleSearchModeChange("mobile")}
              >
                Mobile Number
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchBy === "bill"}
                className={searchBy === "bill" ? "active" : ""}
                onClick={() => handleSearchModeChange("bill")}
              >
                Bill Number
              </button>
            </div>

            <div className="admin-customer-search-row">
              <div className="admin-customer-search-field">
                <FaSearch />
                <input
                  type="text"
                  inputMode={searchBy === "mobile" ? "numeric" : "text"}
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button type="submit" className="admin-customer-search-button" disabled={loading}>
                <FaSearch /> Search
              </button>
              <button type="button" className="admin-customer-reset-button" onClick={handleReset} disabled={loading}>
                <FaSyncAlt /> Reset
              </button>
              <button type="button" className="admin-customer-export-button" onClick={exportCustomers} disabled={customers.length === 0}>
                <FaDownload /> Export
              </button>
            </div>
          </form>

          {error && <div className="admin-customer-message error">{error}</div>}
          {loading && <div className="admin-customer-message">Loading customer activity...</div>}

          <div className="admin-customer-table-wrap">
            <table className="admin-customer-table">
              <thead>
                <tr>
                  <th>Sl No.</th>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Total Tokens</th>
                  <th>Total Bills</th>
                  <th>Total Amount</th>
                  <th>Last Visit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && customers.length === 0 ? (
                  <tr><td colSpan="9" className="admin-customer-empty">No customers found.</td></tr>
                ) : customers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td>{startRecord + index}</td>
                    <td><strong>{customer.customer_code}</strong></td>
                    <td>{customer.name}</td>
                    <td>{customer.mobile}</td>
                    <td>{customer.total_tokens}</td>
                    <td>{customer.total_bills}</td>
                    <td>{formatCurrency(customer.total_billing_amount)}</td>
                    <td>{formatDate(customer.last_visit)}</td>
                    <td>
                      <div className="admin-customer-row-actions">
                        <button
                          type="button"
                          className="admin-customer-print-button"
                          onClick={() => handlePrintCustomerBills(customer)}
                          disabled={printingCustomerId === customer.id}
                          title="Print customer bills"
                          aria-label="Print customer bills"
                        >
                          <FaPrint />
                        </button>
                        <button
                          type="button"
                          className="admin-customer-edit-button"
                          onClick={() => handleEditCustomerBills(customer)}
                          disabled={loadingBillsForCustomer === customer.id}
                          title="Edit customer bill"
                          aria-label="Edit customer bill"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className={`admin-customer-access-button ${customer.staff_edit_unlocked ? "unlocked" : "locked"}`}
                          onClick={() => handleStaffEditAccess(customer)}
                          disabled={updatingCustomerId === customer.id}
                          title={customer.staff_edit_unlocked ? "Lock staff editing" : "Unlock staff editing"}
                          aria-label={customer.staff_edit_unlocked ? "Lock staff editing" : "Unlock staff editing"}
                        >
                          {customer.staff_edit_unlocked ? <FaUnlock /> : <FaLock />}
                        </button>
                        <button
                          type="button"
                          className="admin-customer-delete-button"
                          onClick={() => handleDeleteCustomer(customer)}
                          disabled={deletingCustomerId === customer.id}
                          title={deletingCustomerId === customer.id ? "Deleting..." : "Delete customer"}
                          aria-label="Delete customer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-customer-pagination">
            <span>
              Showing {startRecord} to {endRecord} of {pagination.total_results} customers
            </span>
            <div>
              <button type="button" title="Previous page" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}><FaChevronLeft /></button>
              <strong>{pagination.page}</strong>
              <span>of {pagination.total_pages}</span>
              <button type="button" title="Next page" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages}><FaChevronRight /></button>
            </div>
          </footer>
        </section>

        {billPicker && (
          <div className="admin-bill-picker-backdrop" role="presentation" onClick={() => setBillPicker(null)}>
            <section className="admin-bill-picker" role="dialog" aria-modal="true" aria-labelledby="bill-picker-title" onClick={(event) => event.stopPropagation()}>
              <div className="admin-bill-picker-header">
                <div>
                  <h2 id="bill-picker-title">Select a bill to edit</h2>
                  <p>{billPicker.customer.name} · {billPicker.customer.mobile}</p>
                </div>
                <button type="button" onClick={() => setBillPicker(null)} aria-label="Close bill selector">×</button>
              </div>
              <div className="admin-bill-picker-list">
                {billPicker.bills.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    className="admin-bill-picker-item"
                    onClick={() => navigate(`/billing?editBill=${bill.id}`)}
                  >
                    <span className="admin-bill-picker-icon"><FaFileInvoice /></span>
                    <span><strong>{bill.bill_number}</strong><small>{formatDate(bill.created_at)} · {bill.items?.length || 0} items</small></span>
                    <b>{formatCurrency(bill.final_amount)}</b>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminCustomerPage;
