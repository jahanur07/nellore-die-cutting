import { useEffect, useMemo, useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import useWeighingMachine from "../../hooks/useWeighingMachine";
import { createBill, getBillById, getBills, updateBill } from "../../services/billingService";
import { getCustomerByMobile } from "../../services/customerService";
import { getDiePrices } from "../../services/masterService";
import { getBillingProfile, getWeighingMachineConfig } from "../../services/settingsService";
import { getCustomerTokens, getTokenByNumber } from "../../services/tokenService";

const money = (value) => Number.parseFloat(value || 0);
const mapPaymentMethod = (mode) => (mode === "online" ? "ONLINE" : "CASH");
const formatDieNumber = (value) => {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? `DIE - ${text.padStart(3, "0")}` : text;
};

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
  const [searchParams] = useSearchParams();

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
  const [billLocked, setBillLocked] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

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
    const billId = searchParams.get("editBill");
    if (!billId) return;

    let active = true;
    const loadBillForEditing = async () => {
      setEditLoading(true);
      setError("");
      try {
        const bill = await getBillById(billId);
        const customer = await getCustomerByMobile(bill.customer_mobile);
        const tokens = await getCustomerTokens(customer.id);
        const token = tokens.find((item) => item.id === bill.token);

        if (!active) return;
        if (!token) {
          throw new Error("The bill token could not be loaded.");
        }

        setEditingBill(bill);
        setCustomerMobile(customer.mobile);
        setSelectedCustomer(customer);
        setCustomerTokens(tokens);
        setSelectedToken(token);
        setTokenNumber(token.token_number);
        setGoldReturnWeight(String(bill.gold_return || ""));
        setManualWeight(String(bill.gold_return || ""));
        setBillItems((bill.items || []).map((item) => ({
          local_id: `existing-${item.id}`,
          die_id: item.die_price,
          work_name: item.work_name,
          die_code: item.die_code,
          price: Number(item.rate || 0),
          quantity: Number(item.quantity || 1),
        })));
        setDiscountAmount(String(bill.discount || "0.00"));
        setPaymentMode(String(bill.payment_method || "CASH").toLowerCase());
        setCustomerMessage(`Editing ${bill.bill_number} for ${customer.name}`);
        setCustomerMessageType("success");
        setMessage(`Edit mode: update ${bill.bill_number}, or create a new bill from these details.`);
        setMessageType("success");
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.detail || loadError.message || "Unable to load bill for editing.");
          setErrorType("error");
        }
      } finally {
        if (active) setEditLoading(false);
      }
    };

    loadBillForEditing();
    return () => { active = false; };
  }, [searchParams]);

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
    const digits = event.target.value
      .toUpperCase()
      .replace(/^TK/, "")
      .replace(/\D/g, "");
    const nextTokenNumber = digits ? `TK${digits}` : "";
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
    setBillLocked(false);

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

      if (availableTokens.length > 0) {
        // The API returns newest tokens first. Reuse the same phone number
        // for repeat visits, but always start billing from the latest active token.
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
    const digits = tokenNumber.trim().toUpperCase().replace(/^TK/, "").replace(/\D/g, "");
    const normalizedTokenNumber = digits ? `TK${digits}` : "";

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
    setBillLocked(false);

    try {
      const token = await getTokenByNumber(normalizedTokenNumber);
      const existingBills = await getBills(token.token_number);

      if (existingBills.length > 0) {
        const existingBill = existingBills[0];
        setSelectedCustomer({
          id: token.customer,
          customer_code: token.customer_code,
          name: token.customer_name,
          mobile: token.customer_mobile,
        });
        setCustomerMobile(token.customer_mobile || "");
        setSelectedToken(token);
        setTokenNumber(token.token_number);
        setBillItems([]);
        setDiscountAmount("0.00");
        setGoldReturnWeight("");
        setManualWeight("");
        setCreatedBill(null);
        setBillLocked(true);
        setCustomerMessage(`This token already has a bill: ${existingBill.bill_number}`);
        setCustomerMessageType("success");
        setTokenMessage("BILL ALREADY PRINTED. This token is locked and cannot be billed again.");
        setTokenMessageType("success");
        return;
      }

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
        work_name: formatDieNumber(die.name),
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

  const printBill = (bill, printWindow, profile = printConfig) => {
    const targetWindow = printWindow || window.open("", "_blank", "width=420,height=900");

    const createdAt = new Date(bill.created_at);
    const escapePrintText = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const address = escapePrintText(profile.address || "").replace(/\r?\n/g, "<br />");
    const paperSize = profile.bill_paper_size === "58MM" ? "58mm" : "80mm";
    const shopName = escapePrintText(profile.shop_name || "NELLORE DIE CUTTING");
    const phoneNumber = escapePrintText(profile.phone_number || "");
    const billNumber = escapePrintText(bill.bill_number || "");
    const customerName = escapePrintText(bill.customer_name || "NA");
    const customerMobile = escapePrintText(bill.customer_mobile || "NA");
    const tokenNumber = escapePrintText(bill.token_number || "NA");
    const paymentMethod = escapePrintText(bill.payment_method || "");
    const rows = (bill.items || [])
      .map(
        (item) => `
          <tr>
            <td>${escapePrintText(formatDieNumber(item.work_name || item.die_code || ""))}</td>
            <td>${item.quantity || 0}</td>
            <td>${Number(item.rate || 0).toFixed(2)}</td>
            <td>${Number(item.amount || 0).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    if (!targetWindow || targetWindow.closed) return false;

    targetWindow.document.open();
    targetWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${bill.bill_number || "Bill"}</title>
          <style>
            @page { size: ${paperSize} auto; margin: 3mm; }
            * { box-sizing: border-box; font-family: Arial, sans-serif; }
            body { margin: 0; background: #fff; color: #000; }
            .receipt { width: 72mm; margin: auto; padding: 7px 4px; }
            .shop-name, .bill-title, .footer { text-align: center; }
            .shop-name { font-size: 24px; font-weight: 900; letter-spacing: .4px; }
            .shop-address { text-align: center; font-size: 13px; line-height: 1.45; margin-top: 5px; }
            .separator { border-top: 2px dashed #000; margin: 9px 0; }
            .bill-title { font-size: 22px; font-weight: 900; margin: 8px 0; }
            .info, .items { width: 100%; border-collapse: collapse; }
            .info td { padding: 3px 2px; font-size: 12px; vertical-align: top; }
            .info .label { width: 25%; font-weight: 700; white-space: nowrap; }
            .info .colon { width: 5%; text-align: center; }
            .info .value { width: 20%; }
            .info .right-label { width: 25%; font-weight: 700; white-space: nowrap; padding-left: 7px; }
            .info .right-value { width: 25%; }
            .items { margin-top: 9px; }
            .items th, .items td { border: 1px solid #000; padding: 5px 3px; font-size: 11px; text-align: center; }
            .items th { font-weight: 700; }
            .total { margin-top: 9px; padding: 0 5px; font-size: 13px; }
            .line { display: flex; justify-content: space-between; margin-top: 5px; }
            .final-box { display: flex; align-items: center; justify-content: space-between; border: 2px solid #000; border-radius: 7px; margin-top: 10px; padding: 7px 10px; }
            .final-label { font-size: 15px; font-weight: bold; }
            .final-value { font-size: 27px; font-weight: 900; }
            .gold-return-box { border: 2px solid #000; border-radius: 7px; margin-top: 9px; padding: 7px; text-align: center; }
            .gold-return-label { font-size: 15px; font-weight: 900; }
            .gold-return-value { font-size: 29px; font-weight: 900; }
            .footer { margin-top: 11px; font-size: 13px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${profile.show_bill_header ? `<div class="shop-name">${shopName}</div>
            <div class="shop-address">${address}<br />Contact : ${phoneNumber}</div>` : ""}
            <div class="separator"></div>
            <div class="bill-title">★ BILL ★</div>
            <div class="separator"></div>
            <table class="info">
              <tr><td class="label">Bill No.</td><td class="colon">:</td><td class="value">${billNumber}</td><td class="right-label">Payment</td><td class="colon">:</td><td class="right-value">${paymentMethod}</td></tr>
              <tr><td class="label">Date</td><td class="colon">:</td><td class="value">${createdAt.toLocaleDateString("en-IN")}</td><td class="right-label">Mobile</td><td class="colon">:</td><td class="right-value">${customerMobile}</td></tr>
              <tr><td class="label">Time</td><td class="colon">:</td><td class="value">${createdAt.toLocaleTimeString("en-IN")}</td><td class="right-label">Gold Deposit</td><td class="colon">:</td><td class="right-value">${Number(bill.gold_deposit || 0).toFixed(3)} gm</td></tr>
              <tr><td class="label">Customer</td><td class="colon">:</td><td class="value">${customerName}</td><td class="right-label">Token No.</td><td class="colon">:</td><td class="right-value">${tokenNumber}</td></tr>
            </table>
            <div class="separator"></div>
            <div class="gold-return-box">
              <div class="gold-return-label">GOLD RETURN</div>
              <div class="gold-return-value">${Number(bill.gold_return || 0).toFixed(3)} gm</div>
            </div>
            <table class="items">
              <thead><tr><th>Die</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="total">
              <div class="line"><span>Total Amount</span><b>₹ ${Number(bill.total_amount || 0).toFixed(2)}</b></div>
              ${profile.show_discount ? `<div class="line"><span>Discount</span><b>₹ ${Number(bill.discount || 0).toFixed(2)}</b></div>` : ""}
            </div>
            <div class="final-box">
              <div class="final-label">FINAL AMOUNT</div>
              <div class="final-value">₹ ${Number(bill.final_amount || 0).toFixed(2)}</div>
            </div>
            ${profile.show_bill_footer ? `<div class="separator"></div><div class="footer">Thank You! Visit Again.<br />Please keep this bill safely.</div>` : ""}
          </div>
        </body>
      </html>`);
    let printStarted = false;
    const startPrint = () => {
      if (printStarted || targetWindow.closed) return;
      printStarted = true;
      targetWindow.focus();
      targetWindow.print();
      setTimeout(() => targetWindow.close(), 500);
    };
    targetWindow.onload = startPrint;
    targetWindow.document.close();
    // Some mobile browsers do not dispatch onload for document.write pages.
    setTimeout(startPrint, 350);
    return true;
  };

  const saveBillAndPrint = async ({ asNew = false } = {}) => {
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

    if (!editingBill && weightMode === "machine" && machineStableWeight === null) {
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

    const editableRemainingGold = money(selectedToken.remaining_gold)
      + (editingBill && !asNew ? money(editingBill.gold_return) : 0);
    if (goldReturn > editableRemainingGold) {
      setError(
        `Gold return cannot exceed remaining gold(${ editableRemainingGold.toFixed(3)
  } gm).`
      );
      setErrorType("error");
      return;
    }

    // Open during the user's click so mobile browsers do not block the
    // print window after the bill API request completes.
    const printWindow = window.open("", "_blank", "width=420,height=900");
    if (!printWindow) {
      setError("Printing was blocked by the browser. Please allow pop-ups for this site and try again.");
      setErrorType("error");
      return;
    }
    printWindow.document.write("<p style=\"font-family:Arial;padding:20px\">Preparing bill...</p>");

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

      const [bill, latestPrintConfig] = await Promise.all([
        editingBill && !asNew ? updateBill(editingBill.id, payload) : createBill(payload),
        getBillingProfile().catch(() => printConfig),
      ]);
      setPrintConfig((current) => ({ ...current, ...(latestPrintConfig || {}) }));
      setCreatedBill(bill);
      if (asNew) {
        setEditingBill(null);
        navigate("/billing", { replace: true });
      }
      const printed = printBill(bill, printWindow, latestPrintConfig);
      if (!editingBill || asNew) {
        setBillLocked(printed);
      }
      setMessage(
        printed
          ? `${editingBill && !asNew ? "Bill updated" : "Bill created"} successfully: ${bill.bill_number}`
          : `${editingBill && !asNew ? "Bill updated" : "Bill created"} successfully: ${bill.bill_number}. Allow pop-ups to print it.`
      );
      setMessageType("success");
    } catch (err) {
      if (printWindow && !printWindow.closed) printWindow.close();
      setError(formatError(err));
      setErrorType("error");
    } finally {
      setSaving(false);
    }
  };

  const createBillAndPrint = () => saveBillAndPrint({ asNew: false });
  const createNewBillFromEdit = () => saveBillAndPrint({ asNew: true });

  const printCreatedBill = () => {
    if (!createdBill) return;

    if (!printBill(createdBill)) {
      setError("Printing was blocked by the browser. Please allow pop-ups and try again.");
      setErrorType("error");
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
    setBillLocked(false);
    setEditingBill(null);
    if (searchParams.get("editBill")) {
      navigate("/billing", { replace: true });
    }
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
          {editLoading && <div className="billing-edit-banner">Loading bill details for editing...</div>}
          {editingBill && !editLoading && (
            <div className="billing-edit-banner">
              <FaPencilAlt /> <span><strong>Edit mode:</strong> {editingBill.bill_number} is loaded. Update this bill or create a new bill using the same details.</span>
            </div>
          )}

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
                  <span className="token-number-prefix" aria-hidden="true">TK</span>
                  <input
                    type="text"
                    list="customer-token-numbers"
                    placeholder="Enter number (e.g. 009)"
                    value={tokenNumber.replace(/^TK-?/i, "")}
                    onChange={handleTokenNumberChange}
                    onKeyDown={(event) => event.key === "Enter" && lookupToken()}
                  />
                  <datalist id="customer-token-numbers">
                    {customerTokens.map((token) => (
                      <option key={token.id} value={token.token_number.replace(/^TK-?/i, "").replace(/\D/g, "")}>
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

                <div className="billing-die-grid">
                  {visibleDies.map((die, index) => {
                    const itemInBill = billItems.find((item) => item.die_id === die.id);
                    return (
                      <button
                        key={die.id}
                        type="button"
                        className={`billing-die-button ${itemInBill ? "selected" : ""}`}
                        style={{ backgroundColor: getDieColor(die, index) }}
                        onClick={() => addBillItem(die)}
                        title={`${formatDieNumber(die.name)} - Rs ${Number(die.rate).toFixed(2)}`}
                        aria-label={`Add ${formatDieNumber(die.name)}`}
                      >
                        <span className="die-work-name">{formatDieNumber(die.name)}</span>
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
                <div className="billing-section-header billing-gold-heading">
                  <div className="gold-panel-title">
                    <span className="gold-panel-title-icon"><FaWeight /></span>
                    <div>
                    <label className="billing-section-label">GOLD RETURN (WEIGHT)</label>
                    <p className="billing-gold-subtitle">Measure the gold being returned to the customer</p>
                    </div>
                  </div>

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

                <div className="gold-return-layout">
                  <div className="gold-weight-display">
                    <FaWeight className="weight-icon" />
                    <div className="gold-weight-copy">
                      <span className="weight-reading-label">CURRENT READING</span>
                      <div className="gold-weight-value">
                        {money(weightMode === "manual" ? manualWeight : goldReturnWeight).toFixed(3)}
                        <span>gm</span>
                      </div>
                      <div className={`gold-weight-status ${weightMode === "manual" ? "manual" : "success"}`}>
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
                      <div className={`capture-dot ${weightMode === "manual" || machineConnected ? "active" : ""}`}></div>
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
                        Port is open, but the scale returned no weight. On the JE3002GE, set the RS-232
                        interface to MT-SICS / 9600 baud / 8 data bits / no parity / 1 stop bit, then
                        check that the BAFO BF-810 is connected to the scale's RS-232 socket. You can also
                        switch to manual entry.
                      </p>
                    )}
                  </div>
                </div>

                <div className="gold-manual-section">
                  <div className="gold-manual-heading">
                    <label className="billing-section-label">MANUAL ENTRY</label>
                    <span className="manual-entry-hint">Optional • Use if automatic capture is unavailable</span>
                  </div>
                  <div className="manual-input-row">
                    <div className="manual-input-group">
                      <FaWeight className="manual-entry-icon" aria-hidden="true" />
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
                      <div className="col-die-no">{formatDieNumber(item.work_name || item.die_code)}</div>

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
                {editingBill ? (
                  <>
                    <button type="button" className="btn-billing-print" onClick={() => saveBillAndPrint({ asNew: false })} disabled={saving || editLoading}>
                      {saving ? "Updating..." : <><FaPencilAlt /> UPDATE BILL</>}
                    </button>
                    <button type="button" className="btn-billing-create-new" onClick={createNewBillFromEdit} disabled={saving || editLoading}>
                      <FaPlus /> CREATE NEW BILL
                    </button>
                    {createdBill && <button type="button" className="btn-billing-secondary" onClick={printCreatedBill} disabled={saving}><FaPrint /> PRINT UPDATED</button>}
                  </>
                ) : billLocked ? (
                  <button type="button" className="btn-billing-locked" disabled>
                    <FaLock /> BILL ALREADY PRINTED
                  </button>
                ) : (
                  <button type="button" className="btn-billing-print" onClick={createdBill ? printCreatedBill : createBillAndPrint} disabled={saving}>
                    {saving ? "Saving..." : <><FaPrint /> PRINT BILL</>}
                  </button>
                )}

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
