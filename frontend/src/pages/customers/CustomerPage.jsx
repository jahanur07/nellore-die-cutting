import { useEffect, useState } from "react";
import {
  FaEdit,
  FaLock,
  FaSave,
  FaSearch,
  FaUndo,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import Sidebar from "../../components/layout/Sidebar";

import {
  createCustomer,
  getCustomers,
  updateCustomer,
} from "../../services/customerService";

// CustomerPage manages the customer list.
// Staff can edit a customer only after an administrator unlocks that customer.
// Customers are looked up by mobile number in Token and Billing pages.
function CustomerPage() {
  // List of customers shown in the table
  const [customers, setCustomers] = useState([]);

  // Form fields for adding or editing a customer
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  // Search box value
  const [search, setSearch] = useState("");

  // If editing, holds the ID of the customer being edited.
  // If null, the form is in "Add New" mode.
  const [editingId, setEditingId] = useState(null);

  // True while the save/update API is running
  const [loading, setLoading] = useState(false);

  // True while the customer list is loading
  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch customers from backend. Optionally filter by searchText.
  const loadCustomers = async (searchText = "") => {
    try {
      setLoadingCustomers(true);

      const data = await getCustomers(searchText);

      setCustomers(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load customers.");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load customer list when the page first opens
  useEffect(() => {
    loadCustomers();
  }, []);

  // Handle form field changes.
  // Mobile field: strips non-digits and limits to 10 characters.
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "mobile") {
      newValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((previous) => ({
      ...previous,
      [name]: newValue,
    }));
  };

  // Reset the form to empty "Add New" state
  const clearForm = () => {
    setFormData({
      name: "",
      mobile: "",
      address: "",
    });

    setEditingId(null);
    setError("");
    setMessage("");
  };

  // Submit the form.
  // If editingId is set → update existing customer.
  // If editingId is null → create a new customer.
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (formData.name.trim().length < 2) {
      setError("Please enter a valid customer name.");
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile)) {
      setError("Mobile number must contain exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        const updatedCustomer = await updateCustomer(
          editingId,
          {
            name: formData.name.trim(),
            mobile: formData.mobile,
            address: formData.address.trim(),
          }
        );

        setMessage(
          `${updatedCustomer.customer_code} updated successfully.`
        );
      } else {
        const newCustomer = await createCustomer({
          name: formData.name.trim(),
          mobile: formData.mobile,
          address: formData.address.trim(),
        });

        setMessage(
          `${newCustomer.customer_code} created successfully.`
        );
      }

      setFormData({
        name: "",
        mobile: "",
        address: "",
      });

      setEditingId(null);

      await loadCustomers(search);
    } catch (err) {
      console.error(err);

      const responseData = err.response?.data;

      if (responseData?.mobile) {
        setError(responseData.mobile[0]);
      } else if (responseData?.name) {
        setError(responseData.name[0]);
      } else if (err.response?.status === 403) {
        setError(
          responseData?.detail
          || "This customer is locked. Ask an administrator to unlock editing."
        );
      } else if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Unable to save customer.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fill the form with the selected customer's data for editing.
  // Scrolls the page to top so the form is visible.
  const handleEdit = (customer) => {
    if (!customer.staff_edit_unlocked) {
      setError("This customer is locked. Ask an administrator to unlock editing.");
      return;
    }

    setEditingId(customer.id);

    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address || "",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Submit a search — reloads the customer list filtered by the search text.
  const handleSearch = async (e) => {
    e.preventDefault();

    setError("");

    await loadCustomers(search.trim());
  };

  // Clear the search box and reload the full customer list.
  const clearSearch = async () => {
    setSearch("");
    await loadCustomers("");
  };

  return (
    <div className="dashboard-layout">

      <Sidebar />

      <main className="dashboard-main customer-main">

        <header className="customer-header">
          <div>
            <h1>Customers</h1>
            <p>
              Manage customer information and contact details
            </p>
          </div>

          <div className="customer-header-icon">
            <FaUsers />
          </div>
        </header>

        <section className="customer-form-card">

          <div className="customer-card-title">
            <div className="customer-title-icon">
              {editingId ? <FaEdit /> : <FaUserPlus />}
            </div>

            <div>
              <h2>
                {editingId
                  ? "Edit Customer"
                  : "Add New Customer"}
              </h2>

              <p>
                {editingId
                  ? "Update customer information"
                  : "Create a new customer record"}
              </p>
            </div>
          </div>

          {message && (
            <div className="customer-success">
              {message}
            </div>
          )}

          {error && (
            <div className="customer-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="customer-form-grid">

              <div className="customer-field">
                <label>
                  Customer Name <span>*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="customer-field">
                <label>
                  Mobile Number <span>*</span>
                </label>

                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter 10 digit mobile number"
                  maxLength="10"
                />
              </div>

              <div className="customer-field customer-address-field">
                <label>Address</label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter customer address"
                  rows="3"
                />
              </div>

            </div>

            <div className="customer-form-buttons">

              <button
                type="submit"
                className="customer-save-button"
                disabled={loading}
              >
                <FaSave />

                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update Customer"
                    : "Save Customer"}
              </button>

              <button
                type="button"
                className="customer-clear-button"
                onClick={clearForm}
                disabled={loading}
              >
                <FaUndo />

                {editingId ? "Cancel Edit" : "Clear"}
              </button>

            </div>

          </form>

        </section>

        <section className="customer-list-card">

          <div className="customer-list-header">
            <div>
              <h2>Customer List</h2>
              <p>Search and manage customers</p>
            </div>

            <span>
              {customers.length} customer(s)
            </span>
          </div>

          <form
            className="customer-search"
            onSubmit={handleSearch}
          >
            <div className="customer-search-input">
              <FaSearch />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search by code, name or mobile..."
              />
            </div>

            <button type="submit">
              Search
            </button>

            {search && (
              <button
                type="button"
                className="customer-search-clear"
                onClick={clearSearch}
              >
                Clear
              </button>
            )}

          </form>

          <div className="table-wrapper">

            <table className="customer-table">

              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Address</th>
                  <th>Created By</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {loadingCustomers ? (
                  <tr>
                    <td colSpan="7">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const canEdit = Boolean(customer.staff_edit_unlocked);

                    return (
                      <tr key={customer.id}>

                        <td>
                          <strong className="customer-code">
                            {customer.customer_code}
                          </strong>
                        </td>

                        <td>{customer.name}</td>

                        <td>{customer.mobile}</td>

                        <td>
                          {customer.address || "-"}
                        </td>

                        <td>
                          {customer.created_by}
                        </td>

                        <td>
                          {new Date(
                            customer.created_at
                          ).toLocaleDateString("en-IN")}
                        </td>

                        <td>
                          <div className="customer-actions">

                            <button
                              type="button"
                              className={canEdit ? "customer-edit" : "customer-edit customer-edit-locked"}
                              onClick={() =>
                                handleEdit(customer)
                              }
                              disabled={!canEdit}
                              title={canEdit ? "Edit" : "Locked by administrator"}
                              aria-label={canEdit ? "Edit customer" : "Customer editing locked by administrator"}
                            >
                              {canEdit ? <FaEdit /> : <FaLock />}
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>
    </div>
  );
}

export default CustomerPage;