import { useEffect, useState } from "react";

import {
  FaEdit,
  FaFileExcel,
  FaSave,
  FaSearch,
  FaTools,
  FaTrash,
  FaUndo,
} from "react-icons/fa";

import Sidebar from "../../components/layout/Sidebar";

import {
  createDiePrice,
  deleteDiePrice,
  getDiePrices,
  updateDiePrice,
  importDiePrices,
} from "../../services/masterService";

// MasterPage manages the Die Price catalog.
// Each die type (e.g. "Small Die", "Large Die") has a name, rate per gram,
// and an active/inactive flag. Active dies appear in the Billing page dropdown.
function MasterPage() {

  // List of all die prices shown in the table
  const [diePrices, setDiePrices] = useState([]);

  // Form fields for adding or editing a die price
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    is_active: true,
  });

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);


  const loadDiePrices = async (searchText = "") => {

    try {

      setLoadingList(true);

      const data = await getDiePrices(searchText);

      setDiePrices(data);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to load die prices."
      );

    } finally {

      setLoadingList(false);

    }
  };


  useEffect(() => {
    loadDiePrices();
  }, []);


  const handleChange = (e) => {

    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };


  const clearForm = () => {

    setFormData({
      name: "",
      rate: "",
      is_active: true,
    });

    setEditingId(null);

    setMessage("");
    setError("");
  };


  const handleSubmit = async (e) => {

    e.preventDefault();

    setMessage("");
    setError("");

    if (formData.name.trim().length < 2) {

      setError(
        "Please enter a valid die/work name."
      );

      return;
    }

    const rate = Number(formData.rate);

    if (
      Number.isNaN(rate) ||
      rate <= 0
    ) {

      setError(
        "Rate must be greater than zero."
      );

      return;
    }

    try {

      setLoading(true);

      const data = {
        name: formData.name.trim(),
        rate: formData.rate,
        is_active: formData.is_active,
      };


      if (editingId) {

        const updated =
          await updateDiePrice(
            editingId,
            data
          );

        setMessage(
          `${updated.die_code} updated successfully.`
        );

      } else {

        const created =
          await createDiePrice(data);

        setMessage(
          `${created.die_code} created successfully.`
        );

      }


      setFormData({
        name: "",
        rate: "",
        is_active: true,
      });

      setEditingId(null);

      await loadDiePrices(search);

    } catch (err) {

      console.error(err);

      const responseData =
        err.response?.data;

      if (responseData?.name) {

        setError(
          Array.isArray(responseData.name)
            ? responseData.name[0]
            : responseData.name
        );

      } else if (responseData?.rate) {

        setError(
          Array.isArray(responseData.rate)
            ? responseData.rate[0]
            : responseData.rate
        );

      } else {

        setError(
          "Unable to save die price."
        );

      }

    } finally {

      setLoading(false);

    }
  };


  const handleEdit = (die) => {

    setEditingId(die.id);

    setFormData({
      name: die.name,
      rate: die.rate,
      is_active: die.is_active,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  const handleDelete = async (die) => {

    const confirmed = window.confirm(
      `Delete ${die.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {

      await deleteDiePrice(die.id);

      setMessage(
        `${die.die_code} deleted successfully.`
      );

      if (editingId === die.id) {
        clearForm();
      }

      await loadDiePrices(search);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to delete die price."
      );

    }
  };


  const toggleStatus = async (die) => {

    try {

      await updateDiePrice(
        die.id,
        {
          is_active: !die.is_active,
        }
      );

      await loadDiePrices(search);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to change status."
      );

    }
  };


  const handleSearch = async (e) => {

    e.preventDefault();

    setError("");

    await loadDiePrices(
      search.trim()
    );
  };


  const clearSearch = async () => {

    setSearch("");

    await loadDiePrices("");
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setMessage("");
    setError("");
    try {
      const result = await importDiePrices(file);
      setMessage(result.detail || "Die items imported successfully.");
      await loadDiePrices(search);
    } catch (err) {
      const responseData = err.response?.data;
      const rowErrors = responseData?.errors?.join(" ");
      setError(rowErrors || responseData?.detail || "Unable to import Excel file.");
    } finally {
      setImporting(false);
    }
  };


  return (

    <div className="dashboard-layout">

      <Sidebar />

      <main className="dashboard-main master-main">


        <header className="master-header">

          <div>

            <h1>Master / Die Price</h1>

            <p>
              Manage die cutting work and rates
            </p>

          </div>


          <div className="master-header-icon">

            <FaTools />

          </div>

        </header>


        <section className="master-card">

          <div className="master-card-title">

            <div className="master-title-icon">

              {editingId
                ? <FaEdit />
                : <FaTools />
              }

            </div>


            <div>

              <h2>
                {editingId
                  ? "Edit Die Price"
                  : "Add Die Price"
                }
              </h2>

              <p>
                Configure work type and rate per gram
              </p>

            </div>

          </div>


          {message && (

            <div className="master-success">
              {message}
            </div>

          )}


          {error && (

            <div className="master-error">
              {error}
            </div>

          )}


          <form onSubmit={handleSubmit}>

            <div className="master-form-grid">


              <div className="master-field">

                <label>
                  Die / Work Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Example: Chain Cutting"
                />

              </div>


              <div className="master-field">

                <label>
                  Rate per Gram (₹) *
                </label>

                <input
                  type="number"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  placeholder="500.00"
                  min="0.01"
                  step="0.01"
                />

              </div>


              <div className="master-active-field">

                <label>

                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />

                  Active

                </label>

                <p>
                  Only active die prices will be
                  available during billing.
                </p>

              </div>


            </div>


            <div className="master-buttons">

              <button
                type="submit"
                className="master-save-button"
                disabled={loading}
              >

                <FaSave />

                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update Die Price"
                    : "Save Die Price"
                }

              </button>


              <button
                type="button"
                className="master-clear-button"
                onClick={clearForm}
                disabled={loading}
              >

                <FaUndo />

                {editingId
                  ? "Cancel Edit"
                  : "Clear"
                }

              </button>

            </div>

          </form>

          <div className="master-excel-import">
            <div>
              <strong>Import from Excel</strong>
              <span>Columns: name, rate; optional: die_code, is_active</span>
            </div>
            <label className={`master-excel-button ${importing ? "disabled" : ""}`}>
              <FaFileExcel />
              {importing ? "Importing..." : "Choose Excel File"}
              <input type="file" accept=".xlsx,.xlsm" onChange={handleExcelImport} disabled={importing} />
            </label>
          </div>

        </section>


        <section className="master-card master-list-card">


          <div className="master-list-header">

            <div>

              <h2>Die Price List</h2>

              <p>
                Manage existing work rates
              </p>

            </div>


            <span>
              {diePrices.length} item(s)
            </span>

          </div>


          <form
            className="master-search"
            onSubmit={handleSearch}
          >

            <div className="master-search-input">

              <FaSearch />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search by code or work name..."
              />

            </div>


            <button type="submit">
              Search
            </button>


            {search && (

              <button
                type="button"
                className="master-search-clear"
                onClick={clearSearch}
              >
                Clear
              </button>

            )}

          </form>


          <div className="table-wrapper">

            <table className="master-table">

              <thead>

                <tr>

                  <th>Die Code</th>

                  <th>Work Name</th>

                  <th>Rate / gm</th>

                  <th>Status</th>

                  <th>Created By</th>

                  <th>Action</th>

                </tr>

              </thead>


              <tbody>

                {loadingList ? (

                  <tr>

                    <td colSpan="6">
                      Loading die prices...
                    </td>

                  </tr>

                ) : diePrices.length === 0 ? (

                  <tr>

                    <td colSpan="6">
                      No die prices found.
                    </td>

                  </tr>

                ) : (

                  diePrices.map((die) => (

                    <tr key={die.id}>

                      <td>

                        <strong className="die-code">
                          {die.die_code}
                        </strong>

                      </td>


                      <td>
                        {die.name}
                      </td>


                      <td>

                        <strong>
                          ₹{Number(
                            die.rate
                          ).toFixed(2)}
                        </strong>

                      </td>


                      <td>

                        <button
                          type="button"
                          className={
                            die.is_active
                              ? "master-status active"
                              : "master-status inactive"
                          }
                          onClick={() =>
                            toggleStatus(die)
                          }
                        >

                          {die.is_active
                            ? "Active"
                            : "Inactive"
                          }

                        </button>

                      </td>


                      <td>
                        {die.created_by}
                      </td>


                      <td>

                        <div className="master-actions">

                          <button
                            type="button"
                            className="master-edit"
                            onClick={() =>
                              handleEdit(die)
                            }
                          >

                            <FaEdit />

                          </button>


                          <button
                            type="button"
                            className="master-delete"
                            onClick={() =>
                              handleDelete(die)
                            }
                          >

                            <FaTrash />

                          </button>

                        </div>

                      </td>

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


export default MasterPage;
