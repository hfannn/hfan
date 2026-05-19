import axios from "axios";


export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const loginPath = window.location.pathname.startsWith("/admin")
        ? "/admin/login"
        : "/login";

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);
