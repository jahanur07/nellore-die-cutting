import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaInfo,
  FaLock,
  FaLockOpen,
  FaPencilAlt,
  FaPhoneAlt,
  FaPlug,
  FaPrint,
  FaSync,
  FaTag, 
  FaWeight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import useWeighingMachine from "../../hooks/useWeighingMachine";
import { getBusinessProfile, getWeighingMachineConfig } from "../../services/settingsService";
import { createToken, getTokens } from "../../services/tokenService";

const DEFAULT_BUSINESS_PROFILE = {
  shop_name: "Nellore Die Cutting",
  address: "",
  phone_number: "",
};

const escapePrintText = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function TokenPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_mobile: "",
    gold_weight: "",
    remarks: "",
  });

  const [manualWeight, setManualWeight] = useState("");
  const [weightMode, setWeightMode] = useState(() => localStorage.getItem("preferredWeightMode") || "machine");
  const [manualWeightAllowed, setManualWeightAllowed] = useState(false);
  const [machineConfig, setMachineConfig] = useState({ weighing_machine_enabled: false });
  const [tokens, setTokens] = useState([]);
  const [createdToken, setCreatedToken] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(DEFAULT_BUSINESS_PROFILE);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");

  const [tokenNumber, setTokenNumber] = useState("");
  const [tokenDate, setTokenDate] = useState("");
  const [tokenTime, setTokenTime] = useState("");
  const displayedWeight = weightMode === "manual" ? manualWeight : formData.gold_weight;

  useEffect(() => {
    const num = Math.floor(Math.random() * 100000);
    setTokenNumber(`T${String(num).padStart(5, "0")}`);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setTokenDate(dateStr);
    setTokenTime(timeStr);

    loadTokens();
  }, []);

  useEffect(() => {
    let active = true;

    const loadBusinessProfile = async () => {
      try {
        const profile = await getBusinessProfile();
        if (active) {
          setBusinessProfile(profile);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadBusinessProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadWeighingConfig = async () => {
      try {
        const config = await getWeighingMachineConfig();
        setMachineConfig(config || {});
        setManualWeightAllowed(Boolean(config?.allow_manual_weight_entry));
      } catch {
        // Keep manual entry unavailable if the settings policy cannot be loaded.
        setMachineConfig({ weighing_machine_enabled: false });
        setManualWeightAllowed(false);
      }
    };

    loadWeighingConfig();
  }, []);

  const {
    status: machineStatus,
    stableWeight: machineStableWeight,
    errorMessage: machineError,
    connect: connectMachine,
  } = useWeighingMachine({
    baudRate: machineConfig.machine_baud_rate,
    parity: machineConfig.machine_parity,
    dataBits: machineConfig.machine_data_bits,
    stopBits: machineConfig.machine_stop_bits,
    stableReadCount: machineConfig.machine_stable_read_count,
    readTimeoutMs: machineConfig.machine_read_timeout_ms,
  });

  const setWeightModeWithStorage = (modeOrFn) => {
    setWeightMode((currentMode) => {
      const nextMode = typeof modeOrFn === "function" ? modeOrFn(currentMode) : modeOrFn;
      localStorage.setItem("preferredWeightMode", nextMode);
      return nextMode;
    });
  };

  const machineConnected = machineStatus === "connected" || machineStatus === "no-signal";
  const automaticCaptureEnabled = Boolean(machineConfig.weighing_machine_enabled);

  // Once staff has switched to manual entry (and admin still allows it), keep
  // it active across form resets — only the captured weight value resets per
  // token, not the chosen capture method. It only reverts to machine mode if
  // admin disables manual entry.
  const keepWeightMode = (current) => {
    if (!automaticCaptureEnabled && manualWeightAllowed) return "manual";
    if (current === "manual" && manualWeightAllowed) return "manual";
    return "machine";
  };

  // If admin turns automatic capture off but leaves manual entry allowed,
  // don't strand staff in a non-functional "machine" mode — switch to manual
  // automatically instead of showing a dead "connect scale" prompt.
  useEffect(() => {
    if (!automaticCaptureEnabled && manualWeightAllowed) {
      setWeightModeWithStorage((current) => (current === "machine" ? "manual" : current));
    }
  }, [automaticCaptureEnabled, manualWeightAllowed]);

  // If admin turns manual entry off while it is active, fall back to machine mode.
  useEffect(() => {
    if (weightMode === "manual" && !manualWeightAllowed) {
      setWeightModeWithStorage("machine");
      setManualWeight("");
    }
  }, [manualWeightAllowed, weightMode]);

  // Auto-fill Gold Deposit weight from the scale once a stable reading arrives,
  // but only while staff has not unlocked manual entry.
  useEffect(() => {
    if (weightMode === "machine" && machineStableWeight !== null) {
      setFormData((prev) => ({ ...prev, gold_weight: String(machineStableWeight) }));
    }
  }, [weightMode, machineStableWeight]);

  const loadTokens = async () => {
    try {
      const data = await getTokens();
      setTokens(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "customer_mobile") {
      setFormData((prev) => ({
        ...prev,
        customer_mobile: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const clearTokenForm = () => {
    setFormData({
      customer_mobile: "",
      gold_weight: "",
      remarks: "",
    });
    setManualWeight("");
    setWeightModeWithStorage(keepWeightMode);
  };

  const handleClear = () => {
    clearTokenForm();
    setCreatedToken(null);
    setMessage("");
    setError("");
  };

  const printToken = (token, printWindow, profile = businessProfile) => {
    const targetWindow = printWindow || window.open("", "_blank", "width=440,height=720");

    if (!targetWindow || targetWindow.closed) {
      return false;
    }

    const createdAt = token.created_at ? new Date(token.created_at) : new Date(); 
    const customerCode = escapePrintText(token.customer_code || "");
    const remarks = escapePrintText(token.remarks || "-");
    const shopName = escapePrintText(profile?.shop_name || DEFAULT_BUSINESS_PROFILE.shop_name);
    const shopAddress = escapePrintText(profile?.address?.trim() || "Address not configured");
    const shopPhone = escapePrintText(profile?.phone_number?.trim() || "Not configured");

    try {
      targetWindow.document.open();
      targetWindow.document.write(`
      <html>
        <head>
          <title>${escapePrintText(token.token_number)}</title>
          <style>
          @page {
              size: 80mm auto;
              margin: 3mm;
          }
          *{
              margin:0;
              padding:0;
              box-sizing:border-box;
              font-family:Arial, Helvetica, sans-serif;
          }

          body{
              background:white;
              color:black;
              padding:18px;
          }

          .receipt{
                width:72mm;
                margin:0 auto;
            }

          .shop-name{
              text-align:center;
              font-size:28px;
              font-weight:900;
              letter-spacing:2px;
              margin-bottom:10px;
          }

          .shop-address{
              text-align:center;
              font-size:16px;
              line-height:1.45;
          }

          .separator{
              border-top:2px dashed #000;
              margin:18px 0;
          }

          .token-title{
              text-align:center;
              font-size:22px;
              font-weight:bold;
              margin:12px 0;
          }

          .info-table{
              width:100%;
              border-collapse:collapse;
          }

          .info-table td{
              padding:8px 0;
              font-size:19px;
          }

          .info-label{
              width:42%;
          }

          .info-colon{
              width:8%;
              text-align:center;
          }

          .info-value{
              font-weight:bold;
          }

          .gold-box{
              border:2px solid #000;
              border-radius:12px;
              padding:18px;
              margin:20px 0;
              text-align:center;
          }

          .gold-title{
              font-size:21px;
              font-weight:bold;
              margin-bottom:10px;
          }

          .gold-value{
              font-size:62px;
              font-weight:bold;
          }

          .gold-unit{
              font-size:28px;
          }

          .remarks-heading{
              font-size:20px;
              font-weight:bold;
              margin-bottom:10px;
          }

          .remark-line{
              border-bottom:2px solid #000;
              height:34px;
              margin-bottom:16px;
          }

          .footer{
              margin-top:20px;
              text-align:center;
              font-size:18px;
              line-height:1.6;
          }

          .thank-you{
              margin-top:20px;
              text-align:center;
              font-size:26px;
              font-weight:bold;
              letter-spacing:2px;
          }

          @media print{

          body{
              padding:0;
          }

          .receipt{
              width:100%;
          }

          }

          </style>
        </head>
        <body>
          <section class="receipt">

              <div class="shop-name">
                  ${shopName}
              </div>

              <div class="shop-address">
                  ${shopAddress}<br>
                  Phone : ${shopPhone}
              </div>

              <div class="separator"></div>

              <div class="token-title">
                  ★ GOLD DEPOSIT TOKEN ★
              </div>

              <div class="separator"></div>

              <table class="info-table">

                  <tr>
                      <td class="info-label">Token No</td>
                      <td class="info-colon">:</td>
                      <td class="info-value">${escapePrintText(token.token_number)}</td>
                  </tr>

                  <tr>
                      <td class="info-label">Date</td>
                      <td class="info-colon">:</td>
                      <td class="info-value">
                          ${createdAt.toLocaleDateString("en-IN")}
                      </td>
                  </tr>

                  <tr>
                      <td class="info-label">Time</td>
                      <td class="info-colon">:</td>
                      <td class="info-value">
                          ${createdAt.toLocaleTimeString("en-IN")}
                      </td>
                  </tr>

                  <tr>
                      <td class="info-label">Mobile</td>
                      <td class="info-colon">:</td>
                      <td class="info-value">
                          ${token.customer_mobile}
                      </td>
                  </tr>

              </table>

              <div class="separator"></div>

              <div class="gold-box">

                  <div class="gold-title">
                      GOLD DEPOSIT
                  </div>

                  <div class="gold-value">
                      ${Number(token.gold_weight || 0).toFixed(3)}
                      <span class="gold-unit">gm</span>
                  </div>

              </div>

              <div class="separator"></div>

              <div class="remarks-heading">
                  Remarks :
              </div>

              <div class="remark-line">
                  ${remarks === "-" ? "" : remarks}
              </div>

              <div class="remark-line"></div>

              <div class="separator"></div>

              <div class="footer">
                  Please keep this token safely.<br>
                  Required during billing.
              </div>

              <div class="thank-you">
                  *** THANK YOU ***
              </div>

          </section>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>
      `);
      targetWindow.document.close();
      targetWindow.focus();
    } catch {
      return false;
    }

    return true;
  };

  const handleReprint = async () => {
    if (!createdToken) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=440,height=720");
    let profile = businessProfile;

    try {
      profile = await getBusinessProfile();
      setBusinessProfile(profile);
    } catch (err) {
      console.error(err);
    }

    const printed = printToken(createdToken, printWindow, profile);
    if (!printed) {
      setError("Browser blocked the print window. Allow pop-ups for this site and try again.");
      setErrorType("error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!/^\d{10}$/.test(formData.customer_mobile)) {
      setError("Mobile number must contain exactly 10 digits.");
      setErrorType("error");
      return;
    }

    const finalWeight = weightMode === "manual" ? manualWeight : formData.gold_weight;

    if (weightMode === "machine" && machineStableWeight === null) {
      if (!automaticCaptureEnabled) {
        setError(
          manualWeightAllowed
            ? "Automatic weighing machine capture is turned off by admin. Switch to manual weight entry."
            : "Weight capture is disabled. Ask admin to enable the weighing machine or allow manual entry."
        );
      } else {
        setError(
          machineConnected
            ? "Waiting for a stable weight reading from the scale. Place the gold on the scale, or unlock manual entry."
            : "Weighing machine is not connected. Connect the scale, or unlock manual entry."
        );
      }
      setErrorType("error");
      return;
    }

    if (!finalWeight) {
      setError("Gold weight is required.");
      setErrorType("error");
      return;
    }

    const weight = Number(finalWeight);
    if (Number.isNaN(weight) || weight <= 0) {
      setError("Please enter a valid gold weight.");
      setErrorType("error");
      return;
    }

    const printWindow = window.open("", "_blank", "width=440,height=720");

    try {
      setLoading(true);
      const profileRequest = getBusinessProfile().catch(() => businessProfile);
      const [newToken, profile] = await Promise.all([
        createToken({
            customer_mobile: formData.customer_mobile,
            gold_weight: finalWeight,
            remarks: formData.remarks.trim(),
        }),
        profileRequest,
      ]);

      setTokens((prev) => [newToken, ...prev]);
      setCreatedToken(newToken);
      setBusinessProfile(profile);
      const printed = printToken(newToken, printWindow, profile);
      setMessage(
        printed
          ? `${newToken.token_number} saved successfully. Customer ${newToken.customer_code} linked automatically. Print dialog opened.`
          : `${newToken.token_number} saved successfully. Customer ${newToken.customer_code} linked automatically. Allow pop-ups to print the token.`
      );
      setMessageType("success");

      clearTokenForm();
    } catch (err) {
      console.error(err);
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      if (err.response?.status === 401) {
        setError("Your login session has expired. Please login again.");
      } else {
        setError("Unable to save token.");
      }
      setErrorType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="token-main">
        {/* PAGE TITLE */}
        <div className="page-title-section">
          <h1 className="page-title">Token / Gold Deposit</h1>
        </div>

        {/* MAIN CONTAINER */}
        <div className="token-container">
          {/* TOP HEADER WITH DATE/TIME */}
          <div className="token-top-header">
            <div className="token-top-left">
              <button className="token-back-btn" onClick={() => navigate("/dashboard")}>
                <FaArrowLeft />
              </button>
              <div className="token-title-group">
                <h2>TOKEN / GOLD DEPOSIT</h2>
                <p>Create Token for Gold Deposit</p>
              </div>
            </div>
            <div className="token-top-right">
              <div className="top-date-box">
                <FaCalendarAlt />
                <span>
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="day-name">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long" })}
                </span>
              </div>
              <div className="top-time-box">
                <FaClock />
                <span>
                  {new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* TOKEN DETAILS GRID */}
          <div className="token-details-section">
            <div className="token-detail-item">
              <FaTag className="detail-item-icon" />
              <div className="detail-item-content">
                <label>TOKEN NO.</label>
                <p className="detail-item-value">{tokenNumber}</p>
                <small>( Auto Generated )</small>
              </div>
            </div>
            <div className="token-detail-item">
              <FaCalendarAlt className="detail-item-icon" />
              <div className="detail-item-content">
                <label>DATE</label>
                <p className="detail-item-value">{tokenDate}</p>
                <small>( Auto Generated )</small>
              </div>
            </div>
            <div className="token-detail-item">
              <FaClock className="detail-item-icon" />
              <div className="detail-item-content">
                <label>TIME</label>
                <p className="detail-item-value">{tokenTime}</p>
                <small>( Auto Generated )</small>
              </div>
            </div>
          </div>

          {/* ALERTS */}
          {message && (
            <div className={`alert alert-${messageType}`}>
              <FaCheck /> {message}
            </div>
          )}
          {error && <div className={`alert alert-${errorType}`}>⚠ {error}</div>}

          {/* CUSTOMER DETAILS */}
          <div className="token-form-section">
            <label className="section-label">CUSTOMER DETAILS</label>

            <div className="customer-details-grid">

              {/* Mobile Number */}
              <div className="customer-field">
                <label className="field-label">
                  Mobile Number
                </label>

                <div className="customer-input-wrapper">
                  <FaPhoneAlt className="customer-input-icon" />

                  <input
                    type="tel"
                    name="customer_mobile"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.customer_mobile}
                    onChange={handleChange}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="customer-field">
                <label className="field-label">
                  Remarks
                  <span> (Optional)</span>
                </label>

                <textarea
                  name="remarks"
                  placeholder="Example: Old customer • Urgent order • Repair work • Special instructions..."
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="token-remarks-input"
                />
              </div>

            </div>

            <p className="token-customer-note">
              Customer will be created automatically if this mobile number is not already registered.
            </p>
          </div>

          {/* GOLD DEPOSIT WEIGHT */}
          <div className="token-form-section">
            <div className="token-section-header">
              <label className="section-label">GOLD DEPOSIT (WEIGHT)</label>

              <div className={`weight-lock-pill ${weightMode === "manual" ? "unlocked" : "locked"}`}>
                {weightMode === "manual" ? <FaLockOpen /> : <FaLock />}
                <span>
                  {weightMode === "manual"
                    ? "Manual Entry Unlocked"
                    : !automaticCaptureEnabled
                      ? "Automatic Capture Disabled by Admin"
                      : manualWeightAllowed
                        ? "Machine Locked (Admin Allows Manual)"
                        : "Machine Locked by Admin"}
                </span>
              </div>
            </div>

            <div className="weight-section">
              <div className="weight-display-box">
                <FaWeight className="weight-box-icon" />
                <div className="weight-value-group">
                  <p className="weight-number">
                    <strong>{displayedWeight || "0.00"}</strong>
                    <span>gm</span>
                  </p>
                  {displayedWeight ? (
                    <p className="weight-success">
                      <FaCheck /> {weightMode === "manual" ? "Manual Weight Entered" : "Weight Captured Successfully"}
                    </p>
                  ) : (
                    weightMode === "machine" && (
                      <p className="weight-success weight-pending">
                        {machineConnected ? "Reading... place gold on scale" : "Waiting for weight capture"}
                      </p>
                    )
                  )}
                </div>
              </div>
              <div className="capture-source-box">
                <p className="capture-label">CAPTURE SOURCE</p>
                <div className="capture-status">
                  <span className="capture-name">
                    {weightMode === "manual"
                      ? "Manual Entry"
                      : machineConnected
                        ? "Weighing Machine"
                        : automaticCaptureEnabled
                          ? "Machine Not Connected"
                          : "Automatic Capture Disabled"}
                  </span>
                  <span className={`capture-dot ${weightMode === "manual" || machineConnected ? "active" : ""}`}></span>
                </div>

                {machineConfig.weighing_machine_enabled && weightMode === "machine" && (
                  <button
                    type="button"
                    className="btn-connect-machine"
                    onClick={connectMachine}
                    disabled={machineConnected || machineStatus === "connecting"}
                  >
                    <FaPlug />
                    {machineStatus === "connecting"
                      ? "Connecting..."
                      : machineConnected
                        ? "Connected"
                        : "Connect Weighing Machine"}
                  </button>
                )}

                {machineStatus === "unsupported" && (
                  <p className="billing-manual-weight-locked">
                    This browser cannot read the weighing machine directly. Use Chrome/Edge, or switch to manual
                    entry below.
                  </p>
                )}

                {machineError && machineStatus !== "unsupported" && (
                  <p className="billing-manual-weight-locked">{machineError}</p>
                )}

                {machineStatus === "no-signal" && (
                  <p className="billing-manual-weight-locked">
                    No signal from the scale. Check the connection or switch to manual entry.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* MANUAL WEIGHT ENTRY OR TOGGLE */}
          {weightMode === "manual" ? (
            <div className="token-form-section manual-section">
              <label className="section-label">MANUAL ENTRY (IF AUTO CAPTURE FAILS)</label>
              <div className="manual-input-row">
                <div className="manual-input-group">
                  <FaPencilAlt className="manual-icon" />
                  <input
                    type="number"
                    placeholder="Enter Weight Manually"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    step="0.01"
                    min="0"
                    disabled={!manualWeightAllowed}
                  />
                  <span className="manual-unit">gm</span>
                </div>
                {automaticCaptureEnabled && (
                  <button
                    type="button"
                    className="btn-manual-weight btn-use-machine"
                    onClick={() => {
                      setManualWeight("");
                      setWeightModeWithStorage("machine");
                    }}
                  >
                    <FaWeight /> Back to Machine
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="or-divider">
              <p>OR</p>
            </div>
          )}

          {weightMode === "machine" && (
            <div className="token-form-section">
              <button
                type="button"
                className="btn-manual-weight"
                disabled={!manualWeightAllowed}
                onClick={() => {
                  if (manualWeightAllowed) {
                    setWeightModeWithStorage("manual");
                  }
                }}
              >
                <FaPencilAlt /> Use Manual Weight
              </button>
              {!manualWeightAllowed && (
                <p className="billing-manual-weight-locked">
                  Manual weight entry is disabled by admin settings.
                </p>
              )}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="token-actions">
            <button
              type="button"
              className="btn-generate"
              onClick={handleSubmit}
              disabled={loading}
            >
              <FaPrint /> {loading ? "GENERATING TOKEN..." : "GENERATE TOKEN & PRINT"}
            </button>
            {createdToken && (
              <button type="button" className="btn-generate" onClick={handleReprint}>
                <FaPrint /> PRINT LAST TOKEN
              </button>
            )}
            <button type="button" className="btn-clear" onClick={handleClear}>
              <FaSync /> CLEAR
            </button>
          </div>

          {/* INFO TEXT */}
          <p className="token-info-footer">
            <FaInfo className="info-icon" /> Token slip will include Shop Name, Address, Phone No, Date, Time, Token No & Gold Deposit Weight.
          </p>
        </div>

        {/* RECENT TOKENS */}
        {tokens.length > 0 && (
          <div className="recent-tokens-section">
            <h3>Recent Tokens</h3>
            <div className="recent-list">
              {tokens.map((token) => (
                <div key={token.id} className="recent-item">
                  <span className="recent-token-no">{token.token_number}</span>
                  <span className="recent-customer">{token.customer_mobile}</span>
                  <span className="recent-weight">{Number(token.gold_weight).toFixed(3)} gm</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TokenPage;
