import api from "./api";

// Fetch today's summary data for the dashboard.
// Returns: gold deposited, gold returned, total sales,
// cash received, online received, and recent transactions.
export const getDashboardData = async () => {
  const response = await api.get(
    "/auth/dashboard/"
  );

  return response.data;
};

export const getAdminDashboardData = async () => {
  const response = await api.get("/auth/admin-dashboard/");
  return response.data;
};