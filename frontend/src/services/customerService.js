import api from "./api";

// Fetch all customers. Optionally pass a search string
// to filter by name, mobile, or customer code.
export const getCustomers = async (search = "") => {
  const response = await api.get("/customers/", {
    params: search ? { search } : {},
  });

  return response.data;
};

// Create a new customer record.
// customerData = { name, mobile, address }
export const createCustomer = async (customerData) => {
  const response = await api.post("/customers/", customerData);
  return response.data;
};

// Update an existing customer by their ID.
// Only sends the changed fields (PATCH = partial update).
export const updateCustomer = async (id, customerData) => {
  const response = await api.patch(
    `/customers/${id}/`,
    customerData
  );

  return response.data;
};

// Administrators control whether staff can edit an individual customer.
export const updateCustomerStaffEditAccess = async (id, staffEditUnlocked) => {
  const response = await api.patch(
    `/customers/${id}/staff-edit-access/`,
    { staff_edit_unlocked: staffEditUnlocked }
  );

  return response.data;
};

// Delete a customer by their ID.
export const deleteCustomer = async (id) => {
  await api.delete(`/customers/${id}/`);
};

// Look up a single customer by their mobile number.
// Used in Token and Billing pages to auto-fill customer details.
export const getCustomerByMobile = async (mobile) => {
  const response = await api.get(
    `/customers/mobile/${mobile}/`
  );

  return response.data;
};

// Look up a customer by the Customer ID displayed in the customer list.
export const getCustomerById = async (customerId) => {
  const response = await api.get(
    `/customers/customer-id/${encodeURIComponent(customerId)}/`
  );

  return response.data;
};

export const getAdminCustomerSummary = async ({
  page = 1,
  search = "",
  searchBy = "mobile",
} = {}) => {
  const response = await api.get("/customers/admin-summary/", {
    params: {
      page,
      search,
      search_by: searchBy,
    },
  });

  return response.data;
};

export const getStaffCustomerSummary = async ({
  page = 1,
  search = "",
  searchBy = "mobile",
} = {}) => {
  const response = await api.get("/customers/staff-summary/", {
    params: {
      page,
      search,
      search_by: searchBy,
    },
  });

  return response.data;
};