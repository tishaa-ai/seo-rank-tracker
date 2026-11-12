/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import api, { TOKEN_KEY } from "../lib/api";

export interface User {
    _id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

    // On page load: if we have a token, ask the server who we are
    useEffect(() => {
        if (!localStorage.getItem(TOKEN_KEY)) return;
        api.get("/auth/me")
            .then((res) => setUser(res.data.user))
            .catch(() => localStorage.removeItem(TOKEN_KEY))
            .finally(() => setLoading(false));
    }, []);

    // The axios interceptor fires this on a 401
    useEffect(() => {
        const onLogout = () => setUser(null);
        window.addEventListener("auth:logout", onLogout);
        return () => window.removeEventListener("auth:logout", onLogout);
    }, []);

    const saveSession = (data: { token: string; user: User }) => {
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
    };

    const login = async (email: string, password: string) => {
        const res = await api.post("/auth/login", { email, password });
        saveSession(res.data);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await api.post("/auth/register", { name, email, password });
        saveSession(res.data);
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
    };

    return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
