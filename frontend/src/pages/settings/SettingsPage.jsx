import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCog,
  FaDatabase,
  FaDownload,
  FaEnvelope,
  FaFileInvoice,
  FaLock,
  FaPhone,
  FaPrint,
  FaRupeeSign,
  FaStore,
  FaSync,
  FaTools,
  FaUpload,
  FaUserShield,
  FaUserPlus,
  FaWeight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import {
  downloadDataBackup,
  getDataSummary,
  getSettings,
  updateSettings,
  uploadLogo,
} from "../../services/settingsService";
import { createUser, getUsers, updateUser } from "../../services/userService";

const TABS = [
  { key: "shop", label: "Shop Information", icon: <FaStore /> },
  { key: "system", label: "System Settings", icon: <FaCog /> },
  { key: "machine", label: "Weighing Machine", icon: <FaTools /> },
  { key: "bill", label: "Bill & Print Settings", icon: <FaPrint /> },
  { key: "users", label: "Users & Roles", icon: <FaUserShield /> },
  { key: "backup", label: "Backup & Data", icon: <FaDatabase /> },
];

const DEFAULT_SETTINGS = {
  shop_name: "",
  address: "",
  phone_number: "",
  email: "",
  gst_number: "",
  business_registration_number: "",
  logo_url: "",
  financial_year_start: "01 April",
  default_payment_mode: "CASH",
  currency: "INR",
  weight_unit: "GRAM",
  weight_decimal_places: 3,
  amount_decimal_places: 2,
  show_discount: true,
  bill_paper_size: "80MM",
  token_paper_size: "58MM",
  show_bill_header: true,
  show_bill_footer: true,
  bill_prefix: "BILL",
  token_prefix: "TK",
  low_weight_alert: true,
  whatsapp_daily_summary: false,
  backup_reminder: true,
  bill_print_sound: true,
  auto_logout_minutes: 30,
  entries_per_page: 10,
  theme_mode: "LIGHT",
  language: "EN",
  weighing_machine_enabled: false,
  machine_port: "",
  machine_baud_rate: 9600,
  machine_parity: "NONE",
  machine_data_bits: 8,
  machine_stop_bits: 1,
  machine_read_timeout_ms: 1500,
  machine_stable_read_count: 3,
  allow_manual_weight_entry: true,
};

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`setting-toggle ${checked ? "on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="setting-toggle-thumb" />
    </button>
  );
}

function SettingsPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("shop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState(DEFAULT_SETTINGS);
  const [users, setUsers] = useState([]);
  const [dataSummary, setDataSummary] = useState(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    mpin: "",
    role: "STAFF",
    department: "",
  });
  const [userSaving, setUserSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const [canEdit, setCanEdit] = useState(false);
  const [editLocked, setEditLocked] = useState(true);

  const dateInfo = useMemo(() => {
    const now = new Date();
    return {
      main: now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      sub: now.toLocaleDateString("en-GB", { weekday: "long" }),
    };
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await getSettings();
      const merged = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
      setFormData(merged);
      const canEditSettings = Boolean(data?.can_edit);
      setCanEdit(canEditSettings);
      setEditLocked(!canEditSettings);
    } catch {
      setError("Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      getUsers().then(setUsers).catch(() => setError("Unable to load users."));
    }
    if (activeTab === "backup") {
      getDataSummary().then(setDataSummary).catch(() => setError("Unable to load data summary."));
    }
  }, [activeTab]);

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.shop_name.trim()) {
      return "Shop name is required.";
    }

    if (formData.phone_number && !/^\d{10,15}$/.test(formData.phone_number.trim())) {
      return "Enter a valid phone number.";
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        return "Enter a valid email address.";
      }
    }

    const prefixRegex = /^[A-Z0-9-]{1,10}$/;
    if (!prefixRegex.test(String(formData.bill_prefix || "").toUpperCase())) {
      return "Bill prefix must be 1 to 10 characters with letters, numbers, or hyphen.";
    }

    if (!prefixRegex.test(String(formData.token_prefix || "").toUpperCase())) {
      return "Token prefix must be 1 to 10 characters with letters, numbers, or hyphen.";
    }

    const weightDp = Number(formData.weight_decimal_places);
    const amountDp = Number(formData.amount_decimal_places);

    if (weightDp < 0 || weightDp > 4 || amountDp < 0 || amountDp > 4) {
      return "Decimal places must be between 0 and 4.";
    }

    const timeout = Number(formData.machine_read_timeout_ms);
    const stableCount = Number(formData.machine_stable_read_count);

    if (timeout < 100 || timeout > 10000) {
      return "Machine read timeout must be between 100 and 10000 milliseconds.";
    }

    if (stableCount < 1 || stableCount > 10) {
      return "Stable read count must be between 1 and 10.";
    }

    return "";
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...formData,
        bill_prefix: String(formData.bill_prefix || "").toUpperCase().trim(),
        token_prefix: String(formData.token_prefix || "").toUpperCase().trim(),
      };

      const data = await updateSettings(payload);
      const merged = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
      setFormData(merged);
      setSuccess("Settings saved successfully.");
      setEditLocked(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else {
        setError("Unable to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const onLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || editLocked || !canEdit) {
      return;
    }

    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const data = await uploadLogo(file);
      const merged = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
      setFormData((current) => ({ ...current, logo_url: merged.logo_url }));
      setSuccess("Logo updated successfully.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Unable to upload logo.");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (disabled) return;
    setUserSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = await createUser(userForm);
      setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)));
      setUserForm({ username: "", email: "", mpin: "", role: "STAFF", department: "" });
      setSuccess("User created successfully.");
    } catch (err) {
      const detail = err?.response?.data;
      setError(detail?.detail || detail?.username?.[0] || detail?.mpin?.[0] || "Unable to create user.");
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUser = async (user) => {
    if (disabled) return;
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(`${updated.username} ${updated.is_active ? "activated" : "deactivated"}.`);
    } catch {
      setError("Unable to update user.");
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setError("");
    try {
      const blob = await downloadDataBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nellore-die-cutting-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess("Backup downloaded successfully.");
    } catch {
      setError("Unable to download backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  const topButtonLabel = editLocked ? "Settings Locked" : "Settings Unlocked";
  const bottomPrimaryLabel = editLocked ? "Settings Locked" : "Save Settings";

  const renderPlaceholderTab = () => (
    <div className="settings-placeholder-card">
      <h3>{TABS.find((item) => item.key === activeTab)?.label}</h3>
      <p>
        This section is prepared for backend-driven configuration. No fake hardware, backup,
        or role actions are enabled without real server-side integrations and permissions.
      </p>
    </div>
  );

  const renderBillSettings = () => (
    <>
      <section className="settings-system-grid">
        <article className="settings-card print-settings">
          <h3>CREATE BILL & PRINT SETTINGS</h3>
          <div className="settings-form-grid two-col">
            <div className="settings-field">
              <label>Default Payment Mode</label>
              <select value={formData.default_payment_mode} onChange={(e) => updateField("default_payment_mode", e.target.value)} disabled={disabled}>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="settings-field">
              <label>Bill Paper Size</label>
              <select value={formData.bill_paper_size} onChange={(e) => updateField("bill_paper_size", e.target.value)} disabled={disabled}>
                <option value="80MM">80mm Thermal</option>
                <option value="58MM">58mm Thermal</option>
              </select>
            </div>
            <div className="settings-field">
              <label>Bill Prefix</label>
              <input value={formData.bill_prefix} onChange={(e) => updateField("bill_prefix", e.target.value.toUpperCase())} maxLength="10" disabled={disabled} />
            </div>
            <div className="settings-field">
              <label>Amount Decimal Places</label>
              <select value={formData.amount_decimal_places} onChange={(e) => updateField("amount_decimal_places", Number(e.target.value))} disabled={disabled}>
                <option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
              </select>
            </div>
          </div>
          {[
            ["show_discount", "Show Discount", "Show the discount row while creating and printing bills."],
            ["show_bill_header", "Print Bill Header", "Show shop name, address and phone on receipts."],
            ["show_bill_footer", "Print Bill Footer", "Show the thank-you message on receipts."],
            ["bill_print_sound", "Bill Print Sound", "Play the browser print sound preference after billing."],
          ].map(([key, label, help]) => (
            <div className="setting-row" key={key}>
              <div><p>{label}</p><small>{help}</small></div>
              <Toggle checked={Boolean(formData[key])} disabled={disabled} onChange={(next) => updateField(key, next)} />
            </div>
          ))}
        </article>
      </section>
      {renderActions()}
    </>
  );

  const renderUsers = () => (
    <section className="settings-users-grid">
      <article className="settings-card">
        <h3><FaUserPlus /> ADD USER</h3>
        <form className="settings-form-grid two-col" onSubmit={handleCreateUser}>
          <div className="settings-field"><label>Username</label><input required value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} disabled={disabled} /></div>
          <div className="settings-field"><label>Email</label><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} disabled={disabled} /></div>
          <div className="settings-field"><label>Staff MPIN</label><input required minLength="4" maxLength="6" inputMode="numeric" type="password" value={userForm.mpin} onChange={(e) => setUserForm({ ...userForm, mpin: e.target.value.replace(/\D/g, "").slice(0, 6) })} disabled={disabled} /></div>
          <div className="settings-field"><label>Role</label><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} disabled={disabled}><option value="STAFF">Staff</option><option value="ADMIN">Administrator</option></select></div>
          <div className="settings-field"><label>Department</label><input value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} disabled={disabled} /></div>
          <button className="settings-primary-action" type="submit" disabled={disabled || userSaving}>{userSaving ? "Creating..." : "Create User"}</button>
        </form>
      </article>
      <article className="settings-card">
        <h3><FaUserShield /> USERS & ROLES</h3>
        <div className="settings-user-list">
          {users.map((user) => (
            <div className="settings-user-row" key={user.id}>
              <div><strong>{user.username}</strong><small>{user.email || "No email"} · {user.department || "General"}</small></div>
              <span className={`settings-role-badge ${user.role === "ADMIN" ? "admin" : "staff"}`}>{user.role === "ADMIN" ? "Administrator" : "Staff"}</span>
              <button type="button" className="settings-refresh-action" onClick={() => toggleUser(user)} disabled={disabled || user.id === JSON.parse(localStorage.getItem("user") || "null")?.id}>{user.is_active ? "Deactivate" : "Activate"}</button>
            </div>
          ))}
          {users.length === 0 && <p className="settings-empty-note">No users found.</p>}
        </div>
      </article>
    </section>
  );

  const renderBackup = () => (
    <section className="settings-users-grid">
      <article className="settings-card">
        <h3><FaDatabase /> BACKUP & DATA</h3>
        <p className="settings-card-description">Download a JSON backup containing customers, tokens, bills, die prices, bill items, and system settings.</p>
        <button type="button" className="settings-primary-action" onClick={handleBackup} disabled={!canEdit || backupLoading}>
          <FaDownload /> <span>{backupLoading ? "Preparing Backup..." : "Download Full Backup"}</span>
        </button>
        <div className="settings-backup-warning">Only administrators can create backups. Store the downloaded file securely.</div>
      </article>
      <article className="settings-card">
        <h3>DATA SUMMARY</h3>
        <div className="settings-data-summary">
          {[["Customers", "customers"], ["Gold Tokens", "tokens"], ["Bills", "bills"], ["Bill Items", "bill_items"], ["Die Prices", "die_prices"]].map(([label, key]) => (
            <div key={key}><span>{label}</span><strong>{dataSummary?.[key] ?? "—"}</strong></div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderActions = () => (
    <section className="settings-actions-row">
      <div className="settings-actions">
        <button
          type="button"
          className="settings-primary-action"
          disabled={saving || !canEdit}
          onClick={() => {
            if (editLocked) {
              if (canEdit) {
                setEditLocked(false);
                setSuccess("");
                setError("");
              }
            } else {
              handleSave();
            }
          }}
        >
          <FaLock />
          <span>{saving ? "Saving..." : bottomPrimaryLabel}</span>
        </button>

        <button type="button" className="settings-refresh-action" onClick={loadSettings} disabled={loading}>
          <FaSync />
          <span>Refresh Settings</span>
        </button>
      </div>

      <div className="settings-info-box">
        <div className="settings-info-icon">i</div>
        <p>
          These settings are controlled by admin.
          <br />
          Contact admin to make changes.
        </p>
      </div>
    </section>
  );

  const disabled = editLocked || !canEdit;

  return (
    <div className="settings-layout dashboard-layout">
      <Sidebar />

      <main className="settings-page">
        <section className="settings-header">
          <div className="settings-header-left">
            <button className="settings-back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft size={18} />
            </button>
            <div>
              <h1>SETTINGS</h1>
              <p>Manage your system preferences</p>
            </div>
          </div>

          <div className="settings-header-right">
            <div className="settings-date-card">
              <FaCalendarAlt className="settings-header-icon" />
              <div>
                <div className="settings-date-main">{dateInfo.main}</div>
                <div className="settings-date-sub">{dateInfo.sub}</div>
              </div>
            </div>

            <button
              type="button"
              className="settings-admin-btn"
              onClick={() => {
                if (!canEdit) return;
                setEditLocked((locked) => !locked);
              }}
            >
              <FaLock />
              <span>{topButtonLabel}</span>
            </button>
          </div>
        </section>

        <section className="settings-tabs" role="tablist" aria-label="Settings Sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </section>

        {error && (
          <div className="settings-feedback settings-feedback-error">
            <span>{error}</span>
            <button type="button" onClick={loadSettings}>Retry</button>
          </div>
        )}

        {success && <div className="settings-feedback settings-feedback-success">{success}</div>}

        {loading ? (
          <div className="settings-skeleton-grid">
            <div className="settings-skeleton-card" />
            <div className="settings-skeleton-card" />
            <div className="settings-skeleton-card" />
            <div className="settings-skeleton-card" />
            <div className="settings-skeleton-card" />
          </div>
        ) : activeTab === "shop" ? (
          <>
            <section className="settings-grid-top">
              <article className="settings-card shop-information">
                <h3>SHOP INFORMATION</h3>

                <div className="shop-top-row">
                  <div className="shop-logo-section">
                    <div className="shop-logo-preview">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Shop logo" />
                      ) : (
                        <div className="shop-logo-fallback">
                          <div className="fallback-ndc">NDC</div>
                          <strong>NELLORE</strong>
                          <span>DIE CUTTING</span>
                          <small>— Jewellery Die Cutting —</small>
                        </div>
                      )}
                    </div>

                    <label className={`shop-logo-upload ${disabled ? "disabled" : ""}`}>
                      <FaUpload />
                      <span>{uploadingLogo ? "Uploading..." : "Change Logo"}</span>
                      <input type="file" accept="image/*" onChange={onLogoSelect} disabled={disabled} />
                    </label>
                  </div>

                  <div className="shop-main-fields">
                    <div className="settings-field">
                      <label>Shop Name</label>
                      <input
                        type="text"
                        value={formData.shop_name}
                        onChange={(event) => updateField("shop_name", event.target.value)}
                        disabled={disabled}
                      />
                    </div>

                    <div className="settings-field">
                      <label>Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(event) => updateField("address", event.target.value)}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label>Phone Number</label>
                    <div className="settings-input-icon-wrap">
                      <FaPhone />
                      <input
                        type="text"
                        value={formData.phone_number}
                        onChange={(event) => updateField("phone_number", event.target.value.replace(/\D/g, ""))}
                        disabled={disabled}
                        maxLength="15"
                      />
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Email (Optional)</label>
                    <div className="settings-input-icon-wrap">
                      <FaEnvelope />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>GST Number (Optional)</label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(event) => updateField("gst_number", event.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Business Reg. Number (Optional)</label>
                    <input
                      type="text"
                      value={formData.business_registration_number}
                      onChange={(event) => updateField("business_registration_number", event.target.value)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </article>

              <article className="settings-card business-settings">
                <h3>BUSINESS SETTINGS</h3>

                <div className="settings-form-grid two-col">
                  <div className="settings-field">
                    <label>Financial Year Start</label>
                    <div className="settings-input-icon-wrap">
                      <FaCalendarAlt />
                      <select
                        value={formData.financial_year_start}
                        onChange={(event) => updateField("financial_year_start", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="01 April">01 April</option>
                        <option value="01 January">01 January</option>
                        <option value="01 July">01 July</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Default Payment Mode</label>
                    <div className="settings-input-icon-wrap">
                      <FaFileInvoice />
                      <select
                        value={formData.default_payment_mode}
                        onChange={(event) => updateField("default_payment_mode", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Currency</label>
                    <div className="settings-input-icon-wrap">
                      <FaRupeeSign />
                      <select
                        value={formData.currency}
                        onChange={(event) => updateField("currency", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Weight Unit</label>
                    <div className="settings-input-icon-wrap">
                      <FaWeight />
                      <select
                        value={formData.weight_unit}
                        onChange={(event) => updateField("weight_unit", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="GRAM">Gram (gm)</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Decimal Places (Weight)</label>
                    <select
                      value={formData.weight_decimal_places}
                      onChange={(event) => updateField("weight_decimal_places", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="3">3 (e.g. 502.850)</option>
                      <option value="2">2 (e.g. 502.85)</option>
                      <option value="1">1 (e.g. 502.8)</option>
                      <option value="0">0 (e.g. 503)</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Decimal Places (Amount)</label>
                    <select
                      value={formData.amount_decimal_places}
                      onChange={(event) => updateField("amount_decimal_places", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="2">2 (e.g. 1500.50)</option>
                      <option value="1">1 (e.g. 1500.5)</option>
                      <option value="0">0 (e.g. 1500)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row business-discount-row">
                  <div>
                    <p>Show Discount in Bill</p>
                    <small>Enable to show discount row in bill</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.show_discount)}
                    disabled={disabled}
                    onChange={(next) => updateField("show_discount", next)}
                  />
                </div>
              </article>
            </section>

            <section className="settings-grid-bottom">
              <article className="settings-card print-settings">
                <h3>PRINT & BILL SETTINGS</h3>

                <div className="settings-form-grid two-col compact">
                  <div className="settings-field">
                    <label>Bill Paper Size</label>
                    <select
                      value={formData.bill_paper_size}
                      onChange={(event) => updateField("bill_paper_size", event.target.value)}
                      disabled={disabled}
                    >
                      <option value="80MM">80mm Thermal</option>
                      <option value="58MM">58mm Thermal</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Token Paper Size</label>
                    <select
                      value={formData.token_paper_size}
                      onChange={(event) => updateField("token_paper_size", event.target.value)}
                      disabled={disabled}
                    >
                      <option value="58MM">58mm Thermal</option>
                      <option value="80MM">80mm Thermal</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <p>Bill Header on Print</p>
                    <small>Show shop name & address on top of bill</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.show_bill_header)}
                    disabled={disabled}
                    onChange={(next) => updateField("show_bill_header", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Bill Footer on Print</p>
                    <small>Show thank you message on bottom of bill</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.show_bill_footer)}
                    disabled={disabled}
                    onChange={(next) => updateField("show_bill_footer", next)}
                  />
                </div>

                <div className="settings-inline-title">
                  <p>Number Format</p>
                  <small>Use prefix for Bill & Token numbers</small>
                </div>

                <div className="settings-form-grid two-col compact">
                  <div className="settings-field">
                    <label>Bill Prefix</label>
                    <input
                      type="text"
                      value={formData.bill_prefix}
                      onChange={(event) => updateField("bill_prefix", event.target.value.toUpperCase())}
                      disabled={disabled}
                      maxLength="10"
                    />
                  </div>

                  <div className="settings-field">
                    <label>Token Prefix</label>
                    <input
                      type="text"
                      value={formData.token_prefix}
                      onChange={(event) => updateField("token_prefix", event.target.value.toUpperCase())}
                      disabled={disabled}
                      maxLength="10"
                    />
                  </div>
                </div>
              </article>

              <article className="settings-card notification-settings">
                <h3>NOTIFICATION SETTINGS</h3>

                <div className="setting-row">
                  <div>
                    <p>Low Weight Alert</p>
                    <small>Alert when gold return weight is less than deposit</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.low_weight_alert)}
                    disabled={disabled}
                    onChange={(next) => updateField("low_weight_alert", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Daily Summary (WhatsApp)</p>
                    <small>Send daily report to admin on WhatsApp</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.whatsapp_daily_summary)}
                    disabled={disabled}
                    onChange={(next) => updateField("whatsapp_daily_summary", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Backup Reminder</p>
                    <small>Reminder to take daily backup</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.backup_reminder)}
                    disabled={disabled}
                    onChange={(next) => updateField("backup_reminder", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Bill Print Sound</p>
                    <small>Play sound after bill print</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.bill_print_sound)}
                    disabled={disabled}
                    onChange={(next) => updateField("bill_print_sound", next)}
                  />
                </div>
              </article>

              <article className="settings-card other-settings">
                <h3>OTHER SETTINGS</h3>

                <div className="settings-field">
                  <label>Auto Logout</label>
                  <small>Automatically logout after inactivity</small>
                  <select
                    value={formData.auto_logout_minutes}
                    onChange={(event) => updateField("auto_logout_minutes", Number(event.target.value))}
                    disabled={disabled}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Data Entries Per Page</label>
                  <small>Number of rows to show in lists</small>
                  <select
                    value={formData.entries_per_page}
                    onChange={(event) => updateField("entries_per_page", Number(event.target.value))}
                    disabled={disabled}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Theme Mode</label>
                  <small>Choose your preferred theme</small>
                  <select
                    value={formData.theme_mode}
                    onChange={(event) => updateField("theme_mode", event.target.value)}
                    disabled={disabled}
                  >
                    <option value="LIGHT">Light</option>
                    <option value="DARK">Dark</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Language</label>
                  <small>Choose application language</small>
                  <select
                    value={formData.language}
                    onChange={(event) => updateField("language", event.target.value)}
                    disabled={disabled}
                  >
                    <option value="EN">English</option>
                  </select>
                </div>
              </article>
            </section>

            {renderActions()}
          </>
        ) : activeTab === "system" ? (
          <>
            <section className="settings-system-grid">
              <article className="settings-card business-settings">
                <h3>SYSTEM SETTINGS</h3>

                <div className="settings-form-grid two-col">
                  <div className="settings-field">
                    <label>Financial Year Start</label>
                    <div className="settings-input-icon-wrap">
                      <FaCalendarAlt />
                      <select
                        value={formData.financial_year_start}
                        onChange={(event) => updateField("financial_year_start", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="01 April">01 April</option>
                        <option value="01 January">01 January</option>
                        <option value="01 July">01 July</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Default Payment Mode</label>
                    <div className="settings-input-icon-wrap">
                      <FaFileInvoice />
                      <select
                        value={formData.default_payment_mode}
                        onChange={(event) => updateField("default_payment_mode", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Currency</label>
                    <div className="settings-input-icon-wrap">
                      <FaRupeeSign />
                      <select
                        value={formData.currency}
                        onChange={(event) => updateField("currency", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Weight Unit</label>
                    <div className="settings-input-icon-wrap">
                      <FaWeight />
                      <select
                        value={formData.weight_unit}
                        onChange={(event) => updateField("weight_unit", event.target.value)}
                        disabled={disabled}
                      >
                        <option value="GRAM">Gram (gm)</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Decimal Places (Weight)</label>
                    <select
                      value={formData.weight_decimal_places}
                      onChange={(event) => updateField("weight_decimal_places", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="3">3 (e.g. 502.850)</option>
                      <option value="2">2 (e.g. 502.85)</option>
                      <option value="1">1 (e.g. 502.8)</option>
                      <option value="0">0 (e.g. 503)</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Decimal Places (Amount)</label>
                    <select
                      value={formData.amount_decimal_places}
                      onChange={(event) => updateField("amount_decimal_places", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="2">2 (e.g. 1500.50)</option>
                      <option value="1">1 (e.g. 1500.5)</option>
                      <option value="0">0 (e.g. 1500)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row business-discount-row">
                  <div>
                    <p>Show Discount in Bill</p>
                    <small>Enable to show discount row in bill</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.show_discount)}
                    disabled={disabled}
                    onChange={(next) => updateField("show_discount", next)}
                  />
                </div>
              </article>
            </section>

            <section className="settings-grid-bottom settings-system-bottom">
              <article className="settings-card notification-settings">
                <h3>NOTIFICATION SETTINGS</h3>

                <div className="setting-row">
                  <div>
                    <p>Low Weight Alert</p>
                    <small>Alert when gold return weight is less than deposit</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.low_weight_alert)}
                    disabled={disabled}
                    onChange={(next) => updateField("low_weight_alert", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Daily Summary (WhatsApp)</p>
                    <small>Send daily report to admin on WhatsApp</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.whatsapp_daily_summary)}
                    disabled={disabled}
                    onChange={(next) => updateField("whatsapp_daily_summary", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Backup Reminder</p>
                    <small>Reminder to take daily backup</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.backup_reminder)}
                    disabled={disabled}
                    onChange={(next) => updateField("backup_reminder", next)}
                  />
                </div>

                <div className="setting-row">
                  <div>
                    <p>Bill Print Sound</p>
                    <small>Play sound after bill print</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.bill_print_sound)}
                    disabled={disabled}
                    onChange={(next) => updateField("bill_print_sound", next)}
                  />
                </div>
              </article>

              <article className="settings-card other-settings">
                <h3>OTHER SETTINGS</h3>

                <div className="settings-field">
                  <label>Auto Logout</label>
                  <small>Automatically logout after inactivity</small>
                  <select
                    value={formData.auto_logout_minutes}
                    onChange={(event) => updateField("auto_logout_minutes", Number(event.target.value))}
                    disabled={disabled}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Data Entries Per Page</label>
                  <small>Number of rows to show in lists</small>
                  <select
                    value={formData.entries_per_page}
                    onChange={(event) => updateField("entries_per_page", Number(event.target.value))}
                    disabled={disabled}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Theme Mode</label>
                  <small>Choose your preferred theme</small>
                  <select
                    value={formData.theme_mode}
                    onChange={(event) => updateField("theme_mode", event.target.value)}
                    disabled={disabled}
                  >
                    <option value="LIGHT">Light</option>
                    <option value="DARK">Dark</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Language</label>
                  <small>Choose application language</small>
                  <select
                    value={formData.language}
                    onChange={(event) => updateField("language", event.target.value)}
                    disabled={disabled}
                  >
                    <option value="EN">English</option>
                  </select>
                </div>
              </article>
            </section>

            {renderActions()}
          </>
        ) : activeTab === "machine" ? (
          <>
            <section className="settings-system-grid settings-machine-grid">
              <article className="settings-card settings-machine-card">
                <h3>WEIGHING MACHINE SETTINGS</h3>

                <div className="setting-row business-discount-row">
                  <div>
                    <p>Enable Weighing Machine</p>
                    <small>Use serial weighing machine input for gold return weight capture.</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.weighing_machine_enabled)}
                    disabled={disabled}
                    onChange={(next) => updateField("weighing_machine_enabled", next)}
                  />
                </div>

                <div className="settings-form-grid two-col settings-machine-form">
                  <div className="settings-field">
                    <label>Machine Port</label>
                    <input
                      type="text"
                      placeholder="e.g. /dev/ttyUSB0 or COM3"
                      value={formData.machine_port}
                      onChange={(event) => updateField("machine_port", event.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Baud Rate</label>
                    <select
                      value={formData.machine_baud_rate}
                      onChange={(event) => updateField("machine_baud_rate", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="9600">9600</option>
                      <option value="19200">19200</option>
                      <option value="38400">38400</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Parity</label>
                    <select
                      value={formData.machine_parity}
                      onChange={(event) => updateField("machine_parity", event.target.value)}
                      disabled={disabled}
                    >
                      <option value="NONE">None</option>
                      <option value="EVEN">Even</option>
                      <option value="ODD">Odd</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Data Bits</label>
                    <select
                      value={formData.machine_data_bits}
                      onChange={(event) => updateField("machine_data_bits", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="8">8</option>
                      <option value="7">7</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Stop Bits</label>
                    <select
                      value={formData.machine_stop_bits}
                      onChange={(event) => updateField("machine_stop_bits", Number(event.target.value))}
                      disabled={disabled}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Read Timeout (ms)</label>
                    <input
                      type="number"
                      value={formData.machine_read_timeout_ms}
                      onChange={(event) => updateField("machine_read_timeout_ms", Number(event.target.value || 0))}
                      min="100"
                      max="10000"
                      disabled={disabled}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Stable Read Count</label>
                    <input
                      type="number"
                      value={formData.machine_stable_read_count}
                      onChange={(event) => updateField("machine_stable_read_count", Number(event.target.value || 0))}
                      min="1"
                      max="10"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <p>Allow Manual Weight Entry</p>
                    <small>Allow staff to enter weight manually if machine read is unavailable.</small>
                  </div>
                  <Toggle
                    checked={Boolean(formData.allow_manual_weight_entry)}
                    disabled={disabled}
                    onChange={(next) => updateField("allow_manual_weight_entry", next)}
                  />
                </div>

                <div className="settings-machine-note">
                  <p>Connection status is not simulated here. This section stores configuration only.</p>
                </div>
              </article>
            </section>

            {renderActions()}
          </>
        ) : activeTab === "bill" ? (
          renderBillSettings()
        ) : activeTab === "users" ? (
          renderUsers()
        ) : activeTab === "backup" ? (
          renderBackup()
        ) : (
          renderPlaceholderTab()
        )}
      </main>
    </div>
  );
}

export default SettingsPage;
