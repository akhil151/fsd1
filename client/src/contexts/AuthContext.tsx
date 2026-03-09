import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import { socket } from "@/lib/socket";

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

        // Attach JWT to socket and reconnect so real-time events are authenticated
        (socket as any).auth = {
            ...(socket as any).auth,
            token: data.token,
        };
        if (socket.disconnected) {
            socket.connect();
        }
    };

    const register = async (userData: any) => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/register", {
            data: userData,
        });
        setAuthToken(data.token);
        setUser(data.user);

        (socket as any).auth = {
            ...(socket as any).auth,
            token: data.token,
        };
        if (socket.disconnected) {
            socket.connect();
        }
    };

    const logout = () => {
        clearAuthToken();
        setUser(null);
        // Drop authenticated socket connection on logout
        try {
            socket.disconnect();
            (socket as any).auth = {
                ...(socket as any).auth,
                token: undefined,
            };
        } catch {
            // ignore socket errors on logout
        }
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
