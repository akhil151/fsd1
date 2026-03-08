const API_URL = "/api";

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
            // Only reload if we're not already on the login page or handling a login request
            if (window.location.pathname !== "/" && endpoint !== "/auth/login") {
                window.location.assign("/");
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
