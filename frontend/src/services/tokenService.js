import api from "./api";

// Fetch all tokens (gold deposit records) from the backend.
export const getTokens = async () => {
  const response = await api.get("/tokens/");
  return response.data;
};

// Create a new token when a customer deposits gold.
// tokenData = { customer, gold_weight, remarks }
export const createToken = async (tokenData) => {
  const response = await api.post("/tokens/", tokenData);
  return response.data;
};

// Fetch only the tokens that belong to a specific customer.
// Used in Billing page to show which tokens are available for billing.
export const getCustomerTokens = async (customerId) => {
  const response = await api.get(
    `/tokens/customer/${customerId}/`
  );

  return response.data;
};

// Find a token and its linked customer for the Billing workflow.
export const getTokenByNumber = async (tokenNumber) => {
  const response = await api.get(
    `/tokens/number/${encodeURIComponent(tokenNumber)}/`
  );

  return response.data;
};