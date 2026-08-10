import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaInfo,
  FaLock,
  FaLockOpen,
  FaMobileAlt,
  FaPencilAlt,
  FaPlug,
  FaPlus,
  FaPrint,
  FaSearch,
  FaTag,
  FaTrash,
  FaWeight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import useWeighingMachine from "../../hooks/useWeighingMachine";
import { createBill } from "../../services/billingService";
import { getCustomerByMobile } from "../../services/customerService";
import { getDiePrices } from "../../services/masterService";
import { getBillingProfile, getWeighingMachineConfig } from "../../services/settingsService";
import { getCustomerTokens, getTokenByNumber } from "../../services/tokenService";

const money = (value) => Number.parseFloat(value || 0);
const mapPaymentMethod = (mode) => (mode === "online" ? "ONLINE" : "CASH");

const formatError = (err) => {
  const data = err?.response?.data;

  if (!data) return "Something went wrong while creating bill.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const entries = Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
      if (typeof value === "string") return `${key}: ${value}`;
      return null;
    })
    .filter(Boolean);

  return entries.length > 0 ? entries.join(" | ") : "Please check the form values and try again.";
};

const PALETTE = [
  "#4caf50",
  "#3f91e5",
  "#ff8f1f",
  "#7b4fca",
  "#ec407a",
  "#26a69a",
  "#ffb300",
  "#5c6bc0",
  "#8d6e63",
  "#ef5350",
  "#26c6da",
  "#66bb6a",
];

function BillingPage() {
  const navigate = useNavigate();
  const dieGridRef = useRef(null);

  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTokens, setCustomerTokens] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [tokenNumber, setTokenNumber] = useState("");
  const [selectedToken, setSelectedToken] = useState(null);

  const [dies, setDies] = useState([]);
  const [dieSearch, setDieSearch] = useState("");
  const [selectedDieCategory, setSelectedDieCategory] = useState("all");
  const [billItems, setBillItems] = useState([]);

  const [goldReturnWeight, setGoldReturnWeight] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [weightMode, setWeightMode] = useState(() => localStorage.getItem("preferredWeightMode") || "machine");
  const [manualWeightAllowed, setManualWeightAllowed] = useState(false);
  const [machineConfig, setMachineConfig] = useState({ weighing_machine_enabled: false });
  const [printConfig, setPrintConfig] = useState({
    shop_name: "NELLORE DIE CUTTING",
    address: "13/5/32/1, Ground Floor\nVemugunta Vari Veedhi\nNellore - 524001",
    phone_number: "8074771338",
    bill_paper_size: "80MM",
    show_bill_header: true,
    show_bill_footer: true,
    show_discount: true,
  });

  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [paymentMode, setPaymentMode] = useState("cash");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerMessageType, setCustomerMessageType] = useState("");
  const [tokenMessage, setTokenMessage] = useState("");
  const [tokenMessageType, setTokenMessageType] = useState("");

  const [createdBill, setCreatedBill] = useState(null);

  useEffect(() => {
    const loadDies = async () => {
      try {
        const response = await getDiePrices();
        setDies(response.filter((die) => die.is_active !== false));
      } catch {
        setError("Unable to load die/work master.");
        setErrorType("error");
      }
    };

    loadDies();
  }, []);

  useEffect(() => {
    getBillingProfile()
      .then((config) => setPrintConfig((current) => ({ ...current, ...(config || {}) })))
      .catch(() => {
        // Keep safe receipt defaults if the optional business profile cannot be loaded.
      });
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
  // it active across customer/token switches and Clear — only the captured
  // weight value resets per transaction, not the chosen capture method.
  // It only reverts to machine mode if admin disables manual entry.
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

  // Auto-fill Gold Return weight from the scale once a stable reading arrives,
  // but only while the staff has not unlocked manual entry.
  useEffect(() => {
    if (weightMode === "machine" && machineStableWeight !== null) {
      setGoldReturnWeight(String(machineStableWeight));
    }
  }, [weightMode, machineStableWeight]);

  const getDieCategory = (die) => {
    const text = `${die?.name || ""}`.toLowerCase();
    if (text.includes("ring")) return "ring";
    if (text.includes("pendant")) return "pendant";
    if (text.includes("chain")) return "chain";
    if (text.includes("bangle")) return "bangle";
    if (text.includes("earring")) return "earring";
    return "other";
  };

  const dieCategories = useMemo(() => {
    const available = new Set(dies.map((die) => getDieCategory(die)));

    return [
      { key: "all", label: "All Items" },
      ...(available.has("ring") ? [{ key: "ring", label: "Ring" }] : []),
      ...(available.has("pendant") ? [{ key: "pendant", label: "Pendant" }] : []),
      ...(available.has("chain") ? [{ key: "chain", label: "Chain" }] : []),
      ...(available.has("bangle") ? [{ key: "bangle", label: "Bangle" }] : []),
      ...(available.has("earring") ? [{ key: "earring", label: "Earring" }] : []),
      ...(available.has("other") ? [{ key: "other", label: "Other" }] : []),
    ];
  }, [dies]);

  const visibleDies = useMemo(() => {
    return dies.filter((die) => {
      const text = `${die?.die_code || ""} ${die?.name || ""} ${die?.rate || ""}`.toLowerCase();
      const matchesSearch = text.includes(dieSearch.trim().toLowerCase());
      const matchesCategory = selectedDieCategory === "all" || getDieCategory(die) === selectedDieCategory;
      return matchesSearch && matchesCategory;
    });
  }, [dies, dieSearch, selectedDieCategory]);

  const totalAmount = useMemo(
    () => billItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [billItems]
  );

  const parsedDiscount = printConfig.show_discount ? Math.max(0, money(discountAmount)) : 0;
  const finalAmount = Math.max(totalAmount - parsedDiscount, 0);

  const now = new Date();
  const billDateMain = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const billDateWeekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const billTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const getDieColor = (die, index) => {
    const fromCode = String(die?.die_code || "").replace(/\D/g, "");
    const n = fromCode ? Number.parseInt(fromCode, 10) : Number(die?.id || index);
    return PALETTE[Math.abs(n) % PALETTE.length];
  };

  const selectCustomerToken = (token) => {
    setSelectedToken(token);
    setTokenNumber(token.token_number);
    setTokenMessage(`Token selected: ${token.token_number}`);
    setTokenMessageType("success");
    // Weight must come from the scale (or manual entry), never preset.
    setGoldReturnWeight("");
    setManualWeight("");
    setWeightModeWithStorage(keepWeightMode);
  };

  const handleTokenNumberChange = (event) => {
    const nextTokenNumber = event.target.value.toUpperCase();
    setTokenNumber(nextTokenNumber);
    setTokenMessage("");
    setTokenMessageType("");

    if (selectedToken?.token_number !== nextTokenNumber) {
      setSelectedToken(null);
      setGoldReturnWeight("");
      setManualWeight("");
      setWeightModeWithStorage(keepWeightMode);
    }
  };

  const lookupCustomer = async () => {
    if (!customerMobile || customerMobile.length !== 10) {
      setCustomerMessage("Please enter a valid 10-digit mobile number.");
      setCustomerMessageType("error");
      return;
    }

    setCustomerLoading(true);
    setCustomerMessage("");
    setCustomerMessageType("");
    setTokenMessage("");
    setTokenMessageType("");
    setError("");
    setErrorType("");
    setCreatedBill(null);

    try {
      const customer = await getCustomerByMobile(customerMobile);
      const tokens = await getCustomerTokens(customer.id);
      const availableTokens = tokens.filter(
        (token) => money(token.remaining_gold) > 0
      );

      setSelectedCustomer(customer);
      setCustomerTokens(availableTokens);
      setSelectedToken(null);
      setTokenNumber("");
      setGoldReturnWeight("");
      setManualWeight("");
      setWeightModeWithStorage(keepWeightMode);

      setCustomerMessage(`Customer found: ${customer.name}`);
      setCustomerMessageType("success");

      if (availableTokens.length === 1) {
        selectCustomerToken(availableTokens[0]);
      } else if (availableTokens.length === 0) {
        setTokenMessage("No active tokens are available for this customer.");
        setTokenMessageType("error");
      } else {
        setTokenMessage("Select a token number for this customer.");
        setTokenMessageType("success");
      }
    } catch {
      setSelectedCustomer(null);
      setCustomerTokens([]);
      setSelectedToken(null);
      setTokenNumber("");
      setCustomerMessage("Customer not found.");
      setCustomerMessageType("error");
    } finally {
      setCustomerLoading(false);
    }
  };

  const lookupToken = async () => {
    const normalizedTokenNumber = tokenNumber.trim().toUpperCase();

    if (!normalizedTokenNumber) {
      setTokenMessage("Enter a token number.");
      setTokenMessageType("error");
      return;
    }

    setTokenLoading(true);
    setTokenMessage("");
    setTokenMessageType("");
    setCustomerMessage("");
    setCustomerMessageType("");
    setError("");
    setErrorType("");
    setCreatedBill(null);

    try {
      const token = await getTokenByNumber(normalizedTokenNumber);
      const tokens = await getCustomerTokens(token.customer);
      const availableTokens = tokens.filter(
        (item) => money(item.remaining_gold) > 0
      );
      const selectedAvailableToken = availableTokens.find(
        (item) => item.id === token.id
      );

      setSelectedCustomer({
        id: token.customer,
        customer_code: token.customer_code,
        name: token.customer_name,
        mobile: token.customer_mobile,
      });
      setCustomerMobile(token.customer_mobile || "");
      setCustomerTokens(availableTokens);
      setBillItems([]);
      setDiscountAmount("0.00");

      if (selectedAvailableToken) {
        selectCustomerToken(selectedAvailableToken);
        setCustomerMessage(`Customer found: ${token.customer_name}`);
        setCustomerMessageType("success");
      } else {
        setSelectedToken(null);
        setGoldReturnWeight("");
        setManualWeight("");
        setWeightModeWithStorage(keepWeightMode);
        setTokenMessage(
          "This token has no remaining gold. Select another active token for this customer."
        );
        setTokenMessageType("error");
      }
    } catch (lookupError) {
      setSelectedCustomer(null);
      setCustomerTokens([]);
      setSelectedToken(null);
      setGoldReturnWeight("");
      setManualWeight("");
      setWeightModeWithStorage(keepWeightMode);
      setCustomerMessage("");
      setCustomerMessageType("");
      setTokenMessage(
        lookupError.response?.data?.detail || "Unable to find token."
      );
      setTokenMessageType("error");
    } finally {
      setTokenLoading(false);
    }
  };

  const addBillItem = (die) => {
    const existing = billItems.find((item) => item.die_id === die.id);

    if (existing) {
      setBillItems((current) =>
        current.map((item) =>
          item.die_id === die.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }

    setBillItems((current) => [
      ...current,
      {
        local_id: `${die.id}-${Date.now()}`,
        die_id: die.id,
        die_code: die.die_code,
        work_name: die.name,
        price: money(die.rate),
        quantity: 1,
      },
    ]);
  };

  const updateItemQuantity = (localId, nextQty) => {
    const qty = Math.max(1, Number.parseInt(nextQty, 10) || 1);
    setBillItems((current) =>
      current.map((item) => (item.local_id === localId ? { ...item, quantity: qty } : item))
    );
  };

  const removeBillItem = (localId) => {
    setBillItems((current) => current.filter((item) => item.local_id !== localId));
  };

  const printBill = (bill, printWindow) => {
    const createdAt = new Date(bill.created_at);
    const address = String(printConfig.address || "").replace(/\r?\n/g, "<br />");
    const paperSize = printConfig.bill_paper_size === "58MM" ? "58mm" : "80mm";
    const rows = (bill.items || [])
      .map(
        (item) => `
          <tr>
            <td>${item.die_code || ""}</td>
            <td>${item.quantity || 0}</td>
            <td>${Number(item.rate || 0).toFixed(2)}</td>
            <td>${Number(item.amount || 0).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    if (!printWindow || printWindow.closed) return;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${bill.bill_number || "Bill"}</title>
          <style>
            @page { size: ${paperSize} auto; margin: 3mm; }
            * { box-sizing: border-box; font-family: Arial, sans-serif; }
            body { margin: 0; background: #fff; color: #000; }
            .receipt { width: 72mm; margin: auto; padding: 8px; }
            .shop-name, .bill-title, .footer { text-align: center; }
            .shop-name { font-size: 22px; font-weight: bold; }
            .shop-address { text-align: center; font-size: 12px; line-height: 1.5; margin-top: 6px; }
            .separator { border-top: 2px dashed #000; margin: 10px 0; }
            .bill-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
            .info, .items { width: 100%; border-collapse: collapse; }
            .info td { padding: 3px 0; font-size: 13px; }
            .items { margin-top: 10px; }
            .items th, .items td { border: 1px solid #000; padding: 5px; font-size: 12px; text-align: center; }
            .total { margin-top: 12px; font-size: 14px; }
            .line { display: flex; justify-content: space-between; margin-top: 6px; }
            .final-box { border: 2px solid #000; margin-top: 12px; padding: 10px; text-align: center; }
            .final-label { font-size: 16px; font-weight: bold; }
            .final-value { font-size: 30px; font-weight: bold; }
            .footer { margin-top: 15px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${printConfig.show_bill_header ? `<div class="shop-name">${printConfig.shop_name || "NELLORE DIE CUTTING"}</div>
            <div class="shop-address">${address}<br />Contact: ${printConfig.phone_number || ""}</div>` : ""}
            <div class="separator"></div>
            <div class="bill-title">★ BILL ★</div>
            <div class="separator"></div>
            <table class="info">
              <tr><td><b>Bill No</b></td><td>:</td><td>${bill.bill_number || ""}</td></tr>
              <tr><td><b>Date</b></td><td>:</td><td>${createdAt.toLocaleDateString("en-IN")}</td></tr>
              <tr><td><b>Time</b></td><td>:</td><td>${createdAt.toLocaleTimeString("en-IN")}</td></tr>
              <tr><td><b>Mobile</b></td><td>:</td><td>${bill.customer_mobile || ""}</td></tr>
              <tr><td><b>Token No</b></td><td>:</td><td>${bill.token_number || ""}</td></tr>
              <tr><td><b>Payment</b></td><td>:</td><td>${bill.payment_method || ""}</td></tr>
              <tr><td><b>Gold Return</b></td><td>:</td><td><b>${Number(bill.gold_return || 0).toFixed(3)} gm</b></td></tr>
            </table>
            <div class="separator"></div>
            <table class="items">
              <thead><tr><th>Die</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="total">
              <div class="line"><span>Total Amount</span><b>₹ ${Number(bill.total_amount || 0).toFixed(2)}</b></div>
              ${printConfig.show_discount ? `<div class="line"><span>Discount</span><b>₹ ${Number(bill.discount || 0).toFixed(2)}</b></div>` : ""}
            </div>
            <div class="final-box">
              <div class="final-label">FINAL AMOUNT</div>
              <div class="final-value">₹ ${Number(bill.final_amount || 0).toFixed(2)}</div>
            </div>
            ${printConfig.show_bill_footer ? `<div class="separator"></div><div class="footer">Thank You! Visit Again.<br />Please keep this bill safely.</div>` : ""}
          </div>
        </body>
      </html>`);
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    };
    printWindow.document.close();
  };

  const createBillAndPrint = async () => {
    setError("");
    setErrorType("");
    setMessage("");
    setMessageType("");

    if (!selectedCustomer) {
      setError("Please search and select customer.");
      setErrorType("error");
      return;
    }

    if (!selectedToken) {
      setError("Please fetch and select a valid token.");
      setErrorType("error");
      return;
    }

    if (billItems.length === 0) {
      setError("Please add at least one bill item.");
      setErrorType("error");
      return;
    }

    if (parsedDiscount > totalAmount) {
      setError("Discount cannot exceed total amount.");
      setErrorType("error");
      return;
    }

    const weightInput = weightMode === "manual" && manualWeightAllowed ? manualWeight : goldReturnWeight;
    const goldReturn = money(weightInput);

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

    if (!goldReturn || goldReturn <= 0) {
      setError("Gold return must be greater than zero.");
      setErrorType("error");
      return;
    }

    if (goldReturn > money(selectedToken.remaining_gold)) {
      setError(
        `Gold return cannot exceed remaining gold(${ money(selectedToken.remaining_gold).toFixed(3)
  } gm).`
      );
      setErrorType("error");
      return;
    }

    // Open the print window while still inside the button click event.
    // Browsers may block a new window opened after the API request resolves.
    const printWindow = window.open("", "_blank", "width=420,height=900");

    if (!printWindow) {
      setError("Printing was blocked by the browser. Please allow pop-ups and try again.");
      setErrorType("error");
      return;
    }

    printWindow.document.write("<p style='font-family: Arial'>Creating bill...</p>");

    setSaving(true);

    try {
      const payload = {
        customer: selectedCustomer.id,
        token: selectedToken.id,
        gold_return: goldReturn.toFixed(3),
        items: billItems.map((item) => ({
          die_price: item.die_id,
          quantity: item.quantity,
        })),
        discount: parsedDiscount.toFixed(2),
        payment_method: mapPaymentMethod(paymentMode),
        remarks: "",
      };

      const bill = await createBill(payload);
      setCreatedBill(bill);
      setMessage(`Bill created successfully: ${ bill.bill_number } `);
      setMessageType("success");
      printBill(bill, printWindow);
    } catch (err) {
      if (!printWindow.closed) printWindow.close();
      setError(formatError(err));
      setErrorType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setCustomerMobile("");
    setSelectedCustomer(null);
    setCustomerTokens([]);
    setTokenNumber("");
    setSelectedToken(null);
    setBillItems([]);
    setGoldReturnWeight("");
    setManualWeight("");
    setWeightModeWithStorage(keepWeightMode);
    setDiscountAmount("0.00");
    setPaymentMode("cash");
    setCustomerMessage("");
    setCustomerMessageType("");
    setTokenMessage("");
    setTokenMessageType("");
    setError("");
    setErrorType("");
    setMessage("");
    setMessageType("");
    setCreatedBill(null);
    setDieSearch("");
    setSelectedDieCategory("all");
  };

  return (
    <div className="billing-page-container">
      <Sidebar />

      <main className="billing-main-content">
        <div className="page-title-section billing-page-title-section">
          <h1 className="page-title">Billing & Gold Return</h1>
        </div>

        <div className="billing-container">
          <div className="billing-top-header">
            <div className="billing-back-section">
              <button className="billing-back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft size={18} />
              </button>
              <div className="billing-title-group">
                <h2>BILLING / GOLD RETURN</h2>
                <p>Create Bill & Return Gold</p>
              </div>
            </div>

            <div className="billing-top-right">
              <div className="billing-date-box">
                <FaCalendarAlt className="box-icon" />
                <div>
                  <div className="box-value">{billDateMain}</div>
                  <small>{billDateWeekday}</small>
                </div>
              </div>
              <div className="billing-time-box">
                <FaClock className="box-icon" />
                <div>
                  <small>Time</small>
                  <div className="box-value">{billTime}</div>
                </div>
              </div>
            </div>
          </div>

          {message && <div className={`alert alert - ${ messageType } `}>{message}</div>}
          {error && <div className={`alert alert - ${ errorType } `}>{error}</div>}

          <div className="billing-top-input-grid">
            <div className="billing-section billing-card">
              <label className="billing-section-label">MOBILE NUMBER</label>
              <div className="billing-input-group">
                <div className="billing-input-wrapper">
                  <FaMobileAlt className="input-icon" />
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                    maxLength="10"
                  />
                </div>
                <button className="btn-billing-search" onClick={lookupCustomer} disabled={customerLoading}>
                  {customerLoading ? "Searching..." : "Search"}
                </button>
              </div>

              {customerMessage && (
                <div className={`billing - message billing - message - ${ customerMessageType } `}>
                  {customerMessageType === "success" && <FaCheck />}
                  {customerMessage}
                </div>
              )}
            </div>

            <div className="billing-section billing-card">
              <label className="billing-section-label">TOKEN NUMBER</label>
              <div className="billing-input-group">
                <div className="billing-input-wrapper">
                  <FaTag className="input-icon" />
                  <input
                    type="text"
                    list="customer-token-numbers"
                    placeholder="Enter token number"
                    value={tokenNumber}
                    onChange={handleTokenNumberChange}
                    onKeyDown={(event) => event.key === "Enter" && lookupToken()}
                  />
                  <datalist id="customer-token-numbers">
                    {customerTokens.map((token) => (
                      <option key={token.id} value={token.token_number}>
                        {token.token_number} - {Number(token.remaining_gold || 0).toFixed(3)} gm remaining
                      </option>
                    ))}
                  </datalist>
                </div>
                <button
                  className="btn-billing-fetch"
                  onClick={lookupToken}
                  disabled={tokenLoading}
                >
                  {tokenLoading ? "Finding..." : "Find Token"}
                </button>
              </div>

              {tokenMessage && (
                <div className={`billing - message billing - message - ${ tokenMessageType } `}>
                  {tokenMessageType === "success" && <FaCheck />}
                  {tokenMessage}
                </div>
              )}

              {selectedToken && (
                <div className="billing-token-stats">
                  <div>
                    <span>Deposited</span>
                    <strong>{Number(selectedToken.gold_weight || 0).toFixed(3)} gm</strong>
                  </div>
                  <div>
                    <span>Returned</span>
                    <strong>{Number(selectedToken.total_returned || 0).toFixed(3)} gm</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{Number(selectedToken.remaining_gold || 0).toFixed(3)} gm</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="billing-main-layout">
            <div className="billing-left-column">
              <div className="billing-section billing-card billing-die-card">
                <div className="billing-section-header">
                  <label className="billing-section-label">SELECT DIE NO</label>
                  <div className="billing-die-search">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search Die No / Work"
                      value={dieSearch}
                      onChange={(e) => setDieSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="billing-filter-pills">
                  {dieCategories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      className={`billing-filter-pill ${selectedDieCategory === category.key ? "active" : ""}`}
                      onClick={() => setSelectedDieCategory(category.key)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <div className="billing-die-grid" ref={dieGridRef}>
                  {visibleDies.map((die, index) => {
                    const itemInBill = billItems.find((item) => item.die_id === die.id);
                    return (
                      <button
                        key={die.id}
                        type="button"
                        className={`billing-die-button ${itemInBill ? "selected" : ""}`}
                        style={{ backgroundColor: getDieColor(die, index) }}
                        onClick={() => addBillItem(die)}
                        title={`${die.die_code} - ${die.name} - ${die.rate}`}
                        aria-label={`Add ${die.die_code}, ${die.name}`}
                      >
                        <span className="die-label">{die.die_code}</span>
                        <span className="die-work-name">{die.name}</span>
                        <span className="die-price">Rs {Number(die.rate).toFixed(2)}</span>
                        {itemInBill && <span className="die-quantity-badge">×{itemInBill.quantity}</span>}
                      </button>
                    );
                  })}
                </div>

                {visibleDies.length === 0 && <p className="billing-empty-note">No die/work found.</p>}

                <div className="billing-die-note">
                  <FaInfo />
                  <span>Tap on Die No to add item to the bill. Tap again to increase quantity.</span>
                </div>
              </div>

              <div className="billing-gold-section billing-card billing-gold-panel">
                <div className="billing-section-header">
                  <label className="billing-section-label">GOLD RETURN (WEIGHT)</label>

                  <div className={`weight - lock - pill ${ weightMode === "manual" ? "unlocked" : "locked" } `}>
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

                <div className="gold-return-layout">
                  <div className="gold-weight-display">
                    <FaWeight className="weight-icon" />
                    <div className="gold-weight-copy">
                      <div className="gold-weight-value">
                        {money(weightMode === "manual" ? manualWeight : goldReturnWeight).toFixed(3)}
                        <span>gm</span>
                      </div>
                      <div className={`gold - weight - status ${ weightMode === "manual" ? "manual" : "success" } `}>
                        {weightMode === "manual"
                          ? "Manual Weight Applied"
                          : machineStableWeight !== null
                            ? "Weight Captured Successfully"
                            : machineConnected
                              ? "Reading... place gold on scale"
                              : "Waiting for weight capture"}
                      </div>
                    </div>
                  </div>

                  <div className="gold-capture-source">
                    <div className="capture-label">CAPTURE SOURCE</div>
                    <div className="capture-status">
                      <span>
                        {weightMode === "manual"
                          ? "Manual Entry"
                          : machineConnected
                            ? "Weighing Machine"
                            : automaticCaptureEnabled
                              ? "Machine Not Connected"
                              : "Automatic Capture Disabled"}
                      </span>
                      <div className={`capture - dot ${ weightMode === "manual" || machineConnected ? "active" : "" } `}></div>
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
                        This browser cannot read the weighing machine directly. Use Chrome/Edge, or switch to
                        manual entry below.
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

                <div className="gold-manual-section">
                  <label className="billing-section-label">MANUAL ENTRY (IF AUTO CAPTURE FAILS)</label>
                  <div className="manual-input-row">
                    <div className="manual-input-group">
                      <input
                        type="number"
                        placeholder="Enter Weight Manually"
                        value={manualWeight}
                        onChange={(e) => setManualWeight(e.target.value)}
                        step="0.001"
                        disabled={!manualWeightAllowed}
                      />
                      <span className="manual-unit">gm</span>
                    </div>
                    <button
                      type="button"
                      className="btn-manual-weight"
                      disabled={!manualWeightAllowed}
                      onClick={() => {
                        if (manualWeightAllowed && manualWeight && money(manualWeight) > 0) {
                          setWeightModeWithStorage("manual");
                        }
                      }}
                    >
                      <FaPencilAlt /> Use Manual Weight
                    </button>
                    {weightMode === "manual" && automaticCaptureEnabled && (
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
                  {!manualWeightAllowed && (
                    <p className="billing-manual-weight-locked">
                      Manual weight entry is disabled by admin settings.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="billing-right-column">
              <div className="billing-items-section billing-card">
                <h3 className="billing-items-label">BILL ITEMS</h3>

                <div className="billing-items-table">
                  <div className="billing-table-header">
                    <div className="col-die-no">Die No</div>
                    <div className="col-qty">Qty</div>
                    <div className="col-price">Price (Rs)</div>
                    <div className="col-amount">Amount (Rs)</div>
                    <div className="col-action">Action</div>
                  </div>

                  {billItems.map((item) => (
                    <div key={item.local_id} className="billing-table-row">
                      <div className="col-die-no">{item.die_code}</div>

                      <div className="col-qty">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateItemQuantity(item.local_id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.local_id, e.target.value)}
                          min="1"
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateItemQuantity(item.local_id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="col-price">{item.price.toFixed(2)}</div>
                      <div className="col-amount">{(item.quantity * item.price).toFixed(2)}</div>

                      <div className="col-action">
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => removeBillItem(item.local_id)}
                          title="Delete item"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {billItems.length === 0 && (
                    <div className="billing-table-empty">
                      <p>No items added yet. Select die/work from the left panel.</p>
                    </div>
                  )}
                </div>

                <div className="billing-items-footer">
                  <button
                    type="button"
                    className="btn-add-row"
                    onClick={() => {
                      if (visibleDies[0]) {
                        addBillItem(visibleDies[0]);
                      } else if (dieGridRef.current) {
                        dieGridRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                  >
                    <FaPlus /> Add New Row
                  </button>

                  <div className="billing-inline-total">
                    <span>Total Amount (Rs)</span>
                    <strong>{totalAmount.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="billing-summary-card">
                  <div className="billing-summary-row">
                    <span>Total Amount (Rs)</span>
                    <strong>{totalAmount.toFixed(2)}</strong>
                  </div>

                  {printConfig.show_discount && (
                    <div className="billing-summary-row billing-summary-row-input">
                      <span>Discount (Rs)</span>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  )}

                  <div className="billing-summary-row billing-summary-total">
                    <span>Final Amount (Rs)</span>
                    <strong>{finalAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="billing-payment-section billing-card">
                <label className="billing-section-label">PAYMENT MODE</label>
                <div className="payment-options">
                  <button
                    type="button"
                    className={`payment-btn ${paymentMode === "cash" ? "active" : ""}`}
                    onClick={() => setPaymentMode("cash")}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMode === "online" ? "active" : ""}`}
                    onClick={() => setPaymentMode("online")}
                  >
                    Online
                  </button>
                </div>
              </div>

              <div className="billing-actions">
                <button
                  type="button"
                  className="btn-billing-print"
                  onClick={createdBill ? () => printBill(createdBill) : createBillAndPrint}
                  disabled={saving}
                >
                  {saving ? "Saving..." : <><FaPrint /> PRINT BILL</>}
                </button>

                <button type="button" className="btn-billing-clear" onClick={handleClear}>
                  <FaClock /> CLEAR
                </button>
              </div>

              <div className="billing-info-footer">
                <FaInfo size={12} />
                <span>
                  Bill will include Shop Name, Address, Phone No, Date, Time, Bill No, Item Details,
                  Amount, Payment Mode, Gold Return Weight.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default BillingPage;
