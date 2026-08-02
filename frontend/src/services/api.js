import axios from "axios";

// Create a single axios instance used by all API calls.
// baseURL points to the Django backend running locally.
const api = axios.create({
  baseURL: "https://nellore-die-cutting.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: runs before every request.
// Automatically attaches the JWT token to the Authorization header
// so the backend knows which staff member is making the request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("staffToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Save the JWT access token to localStorage after login.
// Pass null to remove the token (used on logout).
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("staffToken", token);
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("staffToken");
  }
};

// Helper to remove the token (same as setAuthToken(null)).
export const clearAuthToken = () => {
  setAuthToken(null);
};

export default api;