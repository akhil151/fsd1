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
    login: (data: any) => Promise<User>;
    register: (data: any) => Promise<User>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    const data = await apiFetch<{ user: User }>("/auth/me");
                    setUser(data.user);
                    // Restore authenticated socket connection on page refresh
                    if (socket.disconnected) {
                        socket.connect();
                    }
                } catch (error) {
                    clearAuthToken();
                    setUser(null);
                    socket.disconnect();
                }
            }
            setIsLoading(false);
        };

        loadUser();
    }, []);

    const login = async (credentials: any): Promise<User> => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
            data: credentials,
        });
        setAuthToken(data.token);
        setUser(data.user);

        // Cleanly reconnect with the new token
        socket.disconnect().connect();

        return data.user;
    };

    const register = async (userData: any): Promise<User> => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/register", {
            data: userData,
        });
        setAuthToken(data.token);
        setUser(data.user);

        // Cleanly reconnect with the new token
        socket.disconnect().connect();

        return data.user;
    };

    const logout = () => {
        clearAuthToken();
        setUser(null);
        // Clean up any stale room data so the next session starts fresh.
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentQuestionPayload");
        localStorage.removeItem("lastMatchResult");
        localStorage.removeItem("quiz_arena_player_id");
        localStorage.removeItem("currentQuizId");
        localStorage.removeItem("currentQuizQuestionCount");
        localStorage.removeItem("currentQuizCorrectCount");
        // Cleanly drop the authenticated connection.
        // The next connection attempt will use getAuthToken() which will return null.
        socket.disconnect();
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
