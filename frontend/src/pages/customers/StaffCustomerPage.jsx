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
  FaRupeeSign,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Sidebar from "../../components/layout/Sidebar";
import {
  getStaffCustomerSummary,
  updateCustomer,
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

function StaffCustomerPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchBy, setSearchBy] = useState("mobile");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", address: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCustomers = async ({
    page = pagination.page,
    searchText = appliedSearch,
    searchField = searchBy,
  } = {}) => {
    setLoading(true);
    setError("");

    try {
      const data = await getStaffCustomerSummary({
        page,
        search: searchText,
        searchBy: searchField,
      });
      setSummary({ ...EMPTY_SUMMARY, ...data.summary });
      setCustomers(data.customers || []);
      setPagination({ ...EMPTY_PAGINATION, ...data.pagination });
    } catch {
      setError("Customer transaction data could not be loaded.");
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

  const handleEdit = (customer) => {
    if (!customer.staff_edit_unlocked) {
      setError("This customer is locked. Ask an administrator to unlock editing.");
      return;
    }

    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address || "",
    });
    setEditError("");
    setMessage("");
  };

  const closeEdit = () => {
    if (!saving) {
      setEditingCustomer(null);
      setEditError("");
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: name === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    if (editForm.name.trim().length < 2) {
      setEditError("Please enter a valid customer name.");
      return;
    }

    if (!/^\d{10}$/.test(editForm.mobile)) {
      setEditError("Mobile number must contain exactly 10 digits.");
      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const updatedCustomer = await updateCustomer(editingCustomer.id, {
        name: editForm.name.trim(),
        mobile: editForm.mobile,
        address: editForm.address.trim(),
      });
      setCustomers((current) => current.map((customer) => (
        customer.id === updatedCustomer.id
          ? { ...customer, ...updatedCustomer }
          : customer
      )));
      setMessage(`${updatedCustomer.customer_code} updated successfully.`);
      setEditingCustomer(null);
    } catch (saveError) {
      const data = saveError.response?.data;
      setEditError(
        data?.mobile?.[0]
          || data?.name?.[0]
          || data?.detail
          || "Unable to update customer information."
      );
    } finally {
      setSaving(false);
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
            <div className="staff-customer-view-badge">
              <FaUsers />
              <span>Staff View</span>
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

          {message && <div className="admin-customer-message">{message}</div>}
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
                ) : customers.map((customer, index) => {
                  const canEdit = Boolean(customer.staff_edit_unlocked);

                  return (
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
                        <button
                          type="button"
                          className={`admin-customer-access-button ${canEdit ? "unlocked" : "locked"}`}
                          onClick={() => handleEdit(customer)}
                          disabled={!canEdit}
                          title={canEdit ? "Edit customer" : "Locked by administrator"}
                          aria-label={canEdit ? "Edit customer" : "Customer editing locked by administrator"}
                        >
                          {canEdit ? <FaEdit /> : <FaLock />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
      </main>

      {editingCustomer && (
        <div className="staff-customer-modal-backdrop" role="presentation" onMouseDown={closeEdit}>
          <section className="staff-customer-modal" role="dialog" aria-modal="true" aria-labelledby="staff-customer-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="staff-customer-edit-title">Edit Customer</h2>
                <p>{editingCustomer.customer_code}</p>
              </div>
              <button type="button" title="Close" aria-label="Close edit customer" onClick={closeEdit} disabled={saving}><FaTimes /></button>
            </header>

            <form onSubmit={saveCustomer}>
              <label htmlFor="staff-customer-name">Customer Name</label>
              <input id="staff-customer-name" type="text" name="name" value={editForm.name} onChange={handleEditChange} />

              <label htmlFor="staff-customer-mobile">Mobile Number</label>
              <input id="staff-customer-mobile" type="tel" name="mobile" maxLength="10" value={editForm.mobile} onChange={handleEditChange} />

              <label htmlFor="staff-customer-address">Address</label>
              <textarea id="staff-customer-address" name="address" rows="3" value={editForm.address} onChange={handleEditChange} />

              {editError && <p className="staff-customer-modal-error" role="alert">{editError}</p>}

              <footer>
                <button type="button" className="staff-customer-modal-cancel" onClick={closeEdit} disabled={saving}>Cancel</button>
                <button type="submit" className="staff-customer-modal-save" disabled={saving}><FaSave /> {saving ? "Saving..." : "Save Changes"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default StaffCustomerPage;