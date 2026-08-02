import api from "./api";

// Fetch all bills. Optionally pass a search string
// to filter by bill number, customer, mobile, or token.
export const getBills = async (search = "") => {
  const response = await api.get("/billing/", {
    params: search ? { search } : {},
  });

  return response.data;
};

// Fetch one bill by ID.
export const getBillById = async (id) => {
  const response = await api.get(`/billing/${id}/`);
  return response.data;
};

// Accepts the current UI payload shape and converts it
// to backend serializer field names.
const normalizeBillPayload = (billData) => {
  const customer = billData.customer ?? billData.customer_id;
  const token = billData.token ?? billData.token_id ?? billData.tokenId;
  const gold_return =
    billData.gold_return ??
    billData.gold_return_weight ??
    billData.goldReturn;

  const payment_method = String(
    billData.payment_method ??
      billData.payment_mode ??
      billData.paymentMode ??
      "CASH"
  ).toUpperCase();

  const discount = Number(
    billData.discount ??
      billData.discount_amount ??
      billData.discountAmount ??
      0
  );

  const remarks = billData.remarks ?? "";

  const inputItems = billData.items ?? billData.bill_items ?? [];

  const items = inputItems.map((item) => ({
    die_price: item.die_price ?? item.die_id ?? item.diePrice,
    quantity: Number(item.quantity) || 1,
  }));

  const payload = {
    customer,
    token,
    gold_return,
    items,
    payment_method,
    discount,
    remarks,
  };

  // Remove undefined keys so we don't send noisy null fields.
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

// Create a new bill.
export const createBill = async (billData) => {
  const response = await api.post("/billing/", normalizeBillPayload(billData));
  return response.data;
};

// Update an existing bill (partial update).
export const updateBill = async (id, billData) => {
  const response = await api.patch(`/billing/${id}/`, normalizeBillPayload(billData));
  return response.data;
};

// Delete a bill by ID.
export const deleteBill = async (id) => {
  await api.delete(`/billing/${id}/`);
};
