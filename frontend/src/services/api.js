import axios from "axios";

const SESSION_DURATION_MS = 5 * 60 * 60 * 1000;

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
    localStorage.setItem("sessionExpiresAt", String(Date.now() + SESSION_DURATION_MS));
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("staffToken");
    localStorage.removeItem("sessionExpiresAt");
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("staffToken");
  localStorage.removeItem("sessionExpiresAt");
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const hasToken = Boolean(
      localStorage.getItem("accessToken") || localStorage.getItem("staffToken")
    );

    if (error.response?.status === 401 && hasToken && !requestUrl.includes("/auth/login/")) {
      clearAuthToken();
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("sessionExpiresAt");
      window.location.assign("/login?session=expired");
    }

    return Promise.reject(error);
  }
);

export default api;
