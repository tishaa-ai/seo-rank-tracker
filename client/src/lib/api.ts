import axios from "axios";

export const TOKEN_KEY = "token";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    timeout: 90000, // analysis can take 10-30s
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// If the server says our token is invalid/expired, log out
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const isAuthForm = /\/auth\/(login|register)/.test(error.config?.url || "");
        if (error.response?.status === 401 && !isAuthForm && localStorage.getItem(TOKEN_KEY)) {
            localStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new Event("auth:logout"));
        }
        return Promise.reject(error);
    }
);

// Turns any axios error into a readable message
export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
    if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") return "The request took too long. Please try again.";
        if (!error.response) return "Cannot reach the server. Is the backend running?";
        return error.response.data?.message || fallback;
    }
    return fallback;
}

export default api;
