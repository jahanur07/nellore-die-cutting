import api from "./api";

// Fetch all die price records from the master table.
// Optionally pass a search string to filter by name or die code.
export const getDiePrices = async (search = "") => {
  const response = await api.get(
    "/masters/die-prices/",
    {
      params: search ? { search } : {},
    }
  );

  return response.data;
};

// Create a new die / work type with its price rate.
// data = { name, rate, is_active }
export const createDiePrice = async (data) => {
  const response = await api.post(
    "/masters/die-prices/",
    data
  );

  return response.data;
};

// Update an existing die price record by ID.
// Only sends changed fields (PATCH = partial update).
export const updateDiePrice = async (id, data) => {
  const response = await api.patch(
    `/masters/die-prices/${id}/`,
    data
  );

  return response.data;
};

// Delete a die price record by ID.
export const deleteDiePrice = async (id) => {
  await api.delete(
    `/masters/die-prices/${id}/`
  );
};