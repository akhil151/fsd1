import { io } from "socket.io-client";
import { getAuthToken } from "@/lib/api";

// In development, the Vite dev server handles proxying or we connect directly to the Express server port
// The package.json starts Vite on 5000 and Express on 5000 (actually Vite might share the same server or we connect to localhost:5000)
// When using Express with Vite middleware, they run on the same port.
const SOCKET_URL =
    process.env.NODE_ENV === "production"
        ? window.location.origin
        : "http://localhost:5000";

export const socket = io(SOCKET_URL, {
    // Do NOT auto-connect: the socket must only connect after a valid JWT token
    // is available (i.e. after login). Connecting before that causes the server's
    // auth middleware to reject the handshake ("missing token"), which triggers
    // a connect_error → retry loop on every page load.
    autoConnect: false,
    withCredentials: true,
    auth: {
        token: undefined, // will be set by AuthContext after login
    },
    timeout: 10000,
    // Limit reconnection attempts to prevent infinite retry loops.
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
});

// ── Lifecycle Logging (additive, no core logic changed) ──────────────────────

socket.on("connect", () => {
    console.log(`[Socket] Connected — id: ${socket.id}`);
});

socket.on("connect_error", (error) => {
    console.warn("[Socket] Connection error:", error.message);
    // Clear potentially stale room data on authentication errors
    if (error.message.includes("Authentication")) {
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentQuestionPayload");
    }
});

socket.on("disconnect", (reason) => {
    console.log(`[Socket] Disconnected — reason: ${reason}`);
    // Only clear room data if it's a permanent disconnect (not a transient one)
    if (reason === "io server disconnect" || reason === "io client disconnect") {
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentQuestionPayload");
    }
});

socket.io.on("reconnect_attempt", (attempt: number) => {
    console.log(`[Socket] Reconnect attempt #${attempt}…`);
});

socket.io.on("reconnect", (attempt: number) => {
    console.log(`[Socket] Reconnected after ${attempt} attempt(s) — id: ${socket.id}`);
});

socket.io.on("reconnect_failed", () => {
    console.error("[Socket] All reconnect attempts failed. Please reload the page.");
});

// Handle room closure events
socket.on("room_closed", (data) => {
    console.log("[Socket] Room closed:", data.reason);
    // Clean up all room-related data
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("currentQuestionPayload");
    localStorage.removeItem("lastMatchResult");
    localStorage.removeItem("currentQuizQuestionCount");
    localStorage.removeItem("currentQuizCorrectCount");
});
