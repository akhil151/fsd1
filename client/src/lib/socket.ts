import { io } from "socket.io-client";
import { getAuthToken } from "@/lib/api";

// In development, the Vite dev server handles proxying or we connect directly to the Express server port
// The package.json starts Vite on 5000 and Express on 5000 (actually Vite might share the same server or we connect to localhost:5000)
// When using Express with Vite middleware, they run on the same port.
const SOCKET_URL =
    process.env.NODE_ENV === "production"
        ? window.location.origin
        : "http://localhost:5000";

// Read the current token at connection time so the backend can authenticate the socket.
const initialToken = getAuthToken();

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: true,
    auth: {
        token: initialToken || undefined,
    },
    // Add connection timeout and retry settings
    timeout: 10000,
    retries: 3,
});

// Handle connection errors and cleanup
socket.on("connect_error", (error) => {
    console.warn("Socket connection error:", error.message);
    // Clear potentially stale room data on connection errors
    if (error.message.includes("Authentication")) {
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentQuestionPayload");
    }
});

// Clean up localStorage when disconnected
socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    // Only clear room data if it's a permanent disconnect
    if (reason === "io server disconnect" || reason === "io client disconnect") {
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentQuestionPayload");
    }
});

// Handle room closure events
socket.on("room_closed", (data) => {
    console.log("Room closed:", data.reason);
    // Clean up all room-related data
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("currentQuestionPayload");
    localStorage.removeItem("lastMatchResult");
    localStorage.removeItem("currentQuizQuestionCount");
    localStorage.removeItem("currentQuizCorrectCount");
});
