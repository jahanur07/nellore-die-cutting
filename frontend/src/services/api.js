import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
  localStorage.removeItem("accessToken");
  localStorage.removeItem("staffToken");
};

export default api;