import { io } from "socket.io-client";

// In development, the Vite dev server handles proxying or we connect directly to the Express server port
// The package.json starts Vite on 5000 and Express on 5000 (actually Vite might share the same server or we connect to localhost:5000)
// When using Express with Vite middleware, they run on the same port.
const SOCKET_URL =
    process.env.NODE_ENV === "production"
        ? window.location.origin
        : "http://localhost:5000";

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: true,
});
