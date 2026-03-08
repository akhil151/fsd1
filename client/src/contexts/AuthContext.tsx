import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";

export interface User {
    id: string;
    name: string;
    email: string;
    role: "teacher" | "student";
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            if (getAuthToken()) {
                try {
                    const data = await apiFetch<{ user: User }>("/auth/me");
                    setUser(data.user);
                } catch (error) {
                    clearAuthToken();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        loadUser();
    }, []);

    const login = async (credentials: any) => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
            data: credentials,
        });
        setAuthToken(data.token);
        setUser(data.user);
    };

    const register = async (userData: any) => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/register", {
            data: userData,
        });
        setAuthToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        clearAuthToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                register,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
