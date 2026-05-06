const API_URL = import.meta.env.VITE_API_URL || "/api";

export const getAuthToken = () => localStorage.getItem("quiz_arena_token");

export const setAuthToken = (token: string) => {
    localStorage.setItem("quiz_arena_token", token);
};

export const clearAuthToken = () => {
    localStorage.removeItem("quiz_arena_token");
};

interface FetchOptions extends RequestInit {
    data?: any;
}

export async function apiFetch<T>(
    endpoint: string,
    { data, headers: customHeaders, ...customConfig }: FetchOptions = {}
): Promise<T> {
    const token = getAuthToken();

    const config: RequestInit = {
        method: data ? "POST" : "GET",
        body: data ? JSON.stringify(data) : undefined,
        headers: {
            "Content-Type": data ? "application/json" : "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...customHeaders,
        },
        ...customConfig,
    };

    return window.fetch(`${API_URL}${endpoint}`, config).then(async (response) => {
        if (response.status === 401) {
            clearAuthToken();
            // Use href instead of assign — both navigate, but this avoids
            // React state loss in cases where the auth guard already redirected.
            // The auth guard useEffect in protected pages fires first via React
            // state; this is a safety net for truly unauthorized direct access.
            if (window.location.pathname !== "/" && endpoint !== "/auth/login") {
                window.location.href = "/";
                return Promise.reject(new Error("Unauthorized"));
            }
        }

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            return data as T;
        } else {
            return Promise.reject(new Error(data.message || "An error occurred"));
        }
    });
}
