import api from "./api";

// Send username and password to the backend login endpoint.
// Returns access token, refresh token, and user info on success.
export const loginUser = async (username, password) => {
  const response = await api.post("/auth/login/", {
    username,
    password,
  });

  return response.data;
};

export const getAdminSetupStatus = async () => {
  const response = await api.get("/auth/admin-setup/");
  return response.data;
};

export const createInitialAdmin = async (credentials) => {
  const response = await api.post("/auth/admin-setup/", credentials);
  return response.data;
};

export const requestPasswordReset = async (email) => {
  const response = await api.post("/auth/password-reset/", { email });
  return response.data;
};

export const confirmPasswordReset = async (payload) => {
  const response = await api.post("/auth/password-reset/confirm/", payload);
  return response.data;
};

// Alias for loginUser — both staff and admin use the same login endpoint.
export const loginStaff = async (username, password) => {
  return loginUser(username, password);
};

// Clear all auth data from localStorage.
// Called when the staff member clicks Logout.
export const logoutUser = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("staffToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

// Check if a token exists in localStorage.
// Used by ProtectedRoute to decide if the page can be shown.
export const isAuthenticated = () => {
  return Boolean(localStorage.getItem("accessToken") || localStorage.getItem("staffToken"));
};