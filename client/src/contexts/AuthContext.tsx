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
                    // Always disconnect first to ensure the new token is used for the next handshake
                    socket.disconnect();
                    (socket as any).auth = { token };
                    socket.connect();
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

        // Always disconnect first, then update auth token, then reconnect.
        // This guarantees the server receives a fresh handshake with the new
        // token — skipping disconnect risks sending the old/missing token.
        socket.disconnect();
        (socket as any).auth = { token: data.token };
        socket.connect();

        return data.user;
    };

    const register = async (userData: any): Promise<User> => {
        const data = await apiFetch<{ token: string; user: User }>("/auth/register", {
            data: userData,
        });
        setAuthToken(data.token);
        setUser(data.user);

        // Same pattern as login: always do a clean disconnect+reconnect
        socket.disconnect();
        (socket as any).auth = { token: data.token };
        socket.connect();

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
        // Cleanly drop the authenticated connection and clear the token.
        // Do NOT reconnect — the socket stays dormant until next login.
        try {
            (socket as any).auth = { token: null };
            socket.disconnect();
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
