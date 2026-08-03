import axios from "axios";

const api = axios.create({
  baseURL: "https://abc-xyz.trycloudflare.com",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("staffToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("staffToken", token);
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("staffToken");
  }
};

export const clearAuthToken = () => {
  setAuthToken(null);
};

export default api;