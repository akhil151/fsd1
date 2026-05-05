import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { nanoid } from "nanoid";
import { log } from "./index";
import Quiz, { IQuestion } from "./models/Quiz";
import MatchResult from "./models/MatchResult";
import User from "./models/User";

// In-Memory Game State
interface PlayerState {
    userId: string;
    socketId: string;
    name: string;
    avatar: string;
    score: number;
    hasAnsweredCurrent: boolean;
    currentAnswerIsCorrect: boolean;
}

interface RoomState {
    quizCode: string;
    quizId: string;
    hostId: string; // current host socket id
    hostUserId: string;
    players: Map<string, PlayerState>; // keyed by userId
    questions: IQuestion[];
    currentQuestionIndex: number;
    timerInterval: NodeJS.Timeout | null;
    timerSeconds: number;
    status: "waiting" | "active" | "leaderboard" | "finished";
}

// roomCode -> RoomState
const activeRooms = new Map<string, RoomState>();

// socket.id -> metadata for disconnect handling
const socketIndex = new Map<string, { roomCode: string; userId: string; isHost: boolean }>();

// WebSocket Integrity tracking
const eventCounters = new Map<string, Map<string, number>>(); // socketId -> eventName -> count

// userId -> reconnect timeout
const reconnectTimers = new Map<string, NodeJS.Timeout>();

export function setupWebSocket(httpServer: HttpServer) {
    const allowedOrigins = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
    ];

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Integrity Middleware
    io.use((socket, next) => {
        const originalEmit = socket.emit;
        socket.emit = function (event: string, ...args: any[]) {
            if (event === "sync_state" || event === "error") {
                // Allow these to repeat
                return originalEmit.apply(socket, [event, ...args]);
            }
            
            const counts = eventCounters.get(socket.id) || new Map();
            const count = (counts.get(event) || 0) + 1;
            counts.set(event, count);
            eventCounters.set(socket.id, counts);

            if (count > 5) { // Threshold for suspicious duplicates
                console.error(`FAIL: WebSocket Integrity violated. Duplicate event emission: ${event} (${count} times) for socket ${socket.id}`);
                process.exit(1);
            }
            return originalEmit.apply(socket, [event, ...args]);
        };
        next();
    });

    // Socket.IO authentication middleware
    io.use(async (socket, next) => {
        try {
            const auth = socket.handshake.auth as { token?: string } | undefined;
            const token =
                auth?.token ||
                (socket.handshake.headers.authorization &&
                    (socket.handshake.headers.authorization as string).startsWith("Bearer ")
                    ? (socket.handshake.headers.authorization as string).split(" ")[1]
                    : undefined);

            if (!token) {
                return next(new Error("Authentication error: missing token"));
            }

            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return next(new Error("Authentication error: server misconfigured"));
            }

            const decoded = jwt.verify(token, secret) as { id: string; role: string };
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return next(new Error("Authentication error: user not found"));
            }

            (socket as any).data = (socket as any).data || {};
            (socket as any).data.user = user;

            return next();
        } catch (err) {
            return next(new Error("Authentication error: invalid token"));
        }
    });

    const emitSyncState = (socket: Socket, roomCode: string, gameState: RoomState) => {
        const q =
            gameState.currentQuestionIndex >= 0 &&
            gameState.currentQuestionIndex < gameState.questions.length
                ? gameState.questions[gameState.currentQuestionIndex]
                : undefined;

        socket.emit("sync_state", {
            roomCode,
            status: gameState.status,
            currentQuestionIndex: gameState.currentQuestionIndex,
            totalQuestions: gameState.questions.length,
            timerSeconds: gameState.timerSeconds,
            question: q
                ? {
                    text: q.text,
                    options: q.options,
                }
                : null,
        });
    };

    io.on("connection", (socket: Socket) => {
        log(`Client connected: ${socket.id}`, "socket.io");

        const user = (socket as any).data.user as { _id: string; role: string; name: string } | undefined;

        // Teacher hosting a room
        socket.on("host_room", (data?: { quizId: string }) => {
            if (!user) {
                socket.emit("error", { message: "Unauthorized host." });
                return;
            }

            if (user.role !== "teacher") {
                socket.emit("error", { message: "Only teachers can host rooms." });
                return;
            }

            // Validate input data structure
            if (!data || typeof data !== 'object') {
                socket.emit("error", { message: "Invalid request data." });
                return;
            }

            if (!data.quizId || typeof data.quizId !== 'string' || !Types.ObjectId.isValid(data.quizId)) {
                socket.emit("error", { message: "Invalid or missing quiz id." });
                return;
            }

            // If this teacher already has an active room, close it to prevent ghost rooms
            activeRooms.forEach((state, code) => {
                if (state.hostUserId === String(user._id)) {
                    if (state.timerInterval) {
                        clearInterval(state.timerInterval);
                        state.timerInterval = null;
                    }
                    activeRooms.delete(code);
                    io.to(code).emit("room_closed", { reason: "host_launched_new_room" });
                }
            });

            // Generate unique 8-character code with safety limit
            let roomCode = "";
            let attempts = 0;
            const maxAttempts = 100; // Prevent infinite loop
            
            do {
                roomCode = nanoid(8).toUpperCase();
                attempts++;
                
                if (attempts >= maxAttempts) {
                    log(`Failed to generate unique room code after ${maxAttempts} attempts`, "socket.io");
                    socket.emit("error", { message: "Unable to create room. Please try again." });
                    return;
                }
            } while (activeRooms.has(roomCode));

            // Initialize room state
            activeRooms.set(roomCode, {
                quizCode: roomCode,
                quizId: data.quizId,
                hostId: socket.id,
                hostUserId: String(user._id),
                players: new Map(),
                questions: [],
                currentQuestionIndex: -1,
                timerInterval: null,
                timerSeconds: 0,
                status: "waiting",
            });

            socket.join(roomCode);
            socketIndex.set(socket.id, { roomCode, userId: String(user._id), isHost: true });

            log(`Room created: ${roomCode} by ${socket.id} (Quiz: ${data.quizId})`, "socket.io");
            socket.emit("room_created", { roomCode });
        });

        // Student joining a room (or reconnecting)
        socket.on("join_room", (data: { roomCode: string; studentDetails?: any }) => {
            if (!user) {
                socket.emit("error", { message: "Unauthorized join." });
                return;
            }

            const { roomCode, studentDetails } = data;
            
            if (!roomCode || typeof roomCode !== 'string') {
                socket.emit("error", { message: "Invalid room code format." });
                return;
            }

            const room = io.sockets.adapter.rooms.get(roomCode);
            const gameState = activeRooms.get(roomCode);

            if (!room || !gameState) {
                socket.emit("error", { message: "Invalid room code." });
                return;
            }

            const userId = String(user._id);
            const isExistingPlayer = gameState.players.has(userId);

            // Only allow fresh joins while waiting; allow reconnects anytime
            if (!isExistingPlayer && gameState.status !== "waiting") {
                socket.emit("error", { message: "Game already in progress." });
                return;
            }

            socket.join(roomCode);
            log(`Student ${socket.id} joined room: ${roomCode} (user ${userId})`, "socket.io");

            // Clear any pending reconnect timeout for this user
            const pendingTimer = reconnectTimers.get(userId);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                reconnectTimers.delete(userId);
            }

            let playerInfo: PlayerState;

            if (isExistingPlayer) {
                // Reconnection: update socket id and clean up old socket index
                const existing = gameState.players.get(userId)!;
                const oldSocketId = existing.socketId;
                
                // Clean up old socket index entry if it exists
                if (oldSocketId && socketIndex.has(oldSocketId)) {
                    socketIndex.delete(oldSocketId);
                }
                
                existing.socketId = socket.id;
                playerInfo = existing;
                log(`Player ${userId} reconnected to room: ${roomCode}`, "socket.io");
            } else {
                // Validate and sanitize student details
                const sanitizedDetails = studentDetails || {};
                
                // Sanitize name: limit length and remove potentially harmful characters
                let playerName = sanitizedDetails.name || `Player ${socket.id.substring(0, 4)}`;
                if (typeof playerName !== 'string') {
                    playerName = `Player ${socket.id.substring(0, 4)}`;
                } else {
                    // Trim whitespace and limit length
                    playerName = playerName.trim().substring(0, 50);
                    // Remove potentially harmful characters but keep basic punctuation
                    playerName = playerName.replace(/[<>"'&]/g, '');
                    // Ensure name is not empty after sanitization
                    if (!playerName) {
                        playerName = `Player ${socket.id.substring(0, 4)}`;
                    }
                }
                
                // Sanitize avatar: limit length and basic validation
                let playerAvatar = sanitizedDetails.avatar || socket.id.substring(0, 2).toUpperCase();
                if (typeof playerAvatar !== 'string') {
                    playerAvatar = socket.id.substring(0, 2).toUpperCase();
                } else {
                    // Trim and limit length
                    playerAvatar = playerAvatar.trim().substring(0, 10);
                    // Remove potentially harmful characters
                    playerAvatar = playerAvatar.replace(/[<>"'&]/g, '');
                    // Ensure avatar is not empty after sanitization
                    if (!playerAvatar) {
                        playerAvatar = socket.id.substring(0, 2).toUpperCase();
                    }
                }
                
                playerInfo = {
                    userId,
                    socketId: socket.id,
                    name: playerName,
                    avatar: playerAvatar,
                    score: 0,
                    hasAnsweredCurrent: false,
                    currentAnswerIsCorrect: false,
                };
                gameState.players.set(userId, playerInfo);
            }

            socketIndex.set(socket.id, { roomCode, userId, isHost: false });

            // Notify everyone in the room with stable user identity
            io.to(roomCode).emit("player_joined", {
                student: {
                    id: playerInfo.userId,
                    name: playerInfo.name,
                    avatar: playerInfo.avatar,
                    score: playerInfo.score,
                },
            });

            // Confirm to student
            socket.emit("joined_successfully", { roomCode });

            // If the game is already in progress or showing leaderboard, hydrate the joining client
            if (gameState.status !== "waiting") {
                emitSyncState(socket, roomCode, gameState);
            }
        });

        // ------------------------------------------------------------
        // PHASE 5: Server-Authoritative Game Engine
        // ------------------------------------------------------------

        const broadcastQuestion = (roomCode: string) => {
            const gameState = activeRooms.get(roomCode);
            if (!gameState || gameState.currentQuestionIndex >= gameState.questions.length) return;

            const q = gameState.questions[gameState.currentQuestionIndex];

            // Reset player answer tracking
            gameState.players.forEach(p => {
                p.hasAnsweredCurrent = false;
                p.currentAnswerIsCorrect = false;
            });

            gameState.status = "active";

            // Send question without the answer
            io.to(roomCode).emit("question_active", {
                currentQuestionIndex: gameState.currentQuestionIndex,
                totalQuestions: gameState.questions.length,
                question: {
                    text: q.text,
                    options: q.options,
                }
            });

            // Clear any existing timer first and ensure clean state
            if (gameState.timerInterval) {
                clearInterval(gameState.timerInterval);
                gameState.timerInterval = null;
            }

            // Start Timer
            gameState.timerSeconds = 15; // 15 seconds per question

            gameState.timerInterval = setInterval(() => {
                gameState.timerSeconds--;
                io.to(roomCode).emit("timer_tick", { timeLeft: gameState.timerSeconds });

                if (gameState.timerSeconds <= 0) {
                    clearInterval(gameState.timerInterval!);
                    gameState.timerInterval = null;
                    handleTimeUp(roomCode);
                }
            }, 1000);
        };

        const handleTimeUp = (roomCode: string) => {
            const gameState = activeRooms.get(roomCode);
            if (!gameState) return;

            // Ensure timer is properly cleaned up
            if (gameState.timerInterval) {
                clearInterval(gameState.timerInterval);
                gameState.timerInterval = null;
            }

            gameState.status = "leaderboard";
            io.to(roomCode).emit("time_up");

            // Compute Leaderboard
            const leaderboard = Array.from(gameState.players.values()).map(p => ({
                id: p.userId,
                name: p.name,
                avatar: p.avatar,
                score: p.score
            })).sort((a, b) => b.score - a.score);

            const q = gameState.questions[gameState.currentQuestionIndex];

            // Send leaderboard and the correct answer
            io.to(roomCode).emit("leaderboard_update", {
                leaderboard,
                correctAnswer: q.correctAnswer
            });
        };

        socket.on("start_quiz", async (data: { roomCode: string }) => {
            if (!user) return;

            const { roomCode } = data;
            if (!roomCode || typeof roomCode !== 'string') {
                socket.emit("error", { message: "Invalid room code." });
                return;
            }

            const gameState = activeRooms.get(roomCode);

            if (!gameState || gameState.hostUserId !== String(user._id)) {
                socket.emit("error", { message: "Unauthorized to start this quiz." });
                return;
            }

            if (gameState.status !== "waiting") {
                socket.emit("error", { message: "Quiz already started or finished." });
                return;
            }

            log(`Starting quiz for room ${roomCode}`, "socket.io");
            
            try {
                if (!Types.ObjectId.isValid(gameState.quizId)) {
                    socket.emit("error", { message: "Invalid quiz id." });
                    return;
                }

                // Fetch real quiz from MongoDB with timeout
                const quizDoc = await Quiz.findById(gameState.quizId).maxTimeMS(5000);
                
                if (!quizDoc) {
                    log(`Error: Quiz ${gameState.quizId} not found.`, "socket.io");
                    socket.emit("error", { message: "Quiz not found." });
                    return;
                }

                if (!quizDoc.questions || quizDoc.questions.length === 0) {
                    log(`Error: Quiz ${gameState.quizId} has no questions.`, "socket.io");
                    socket.emit("error", { message: "Quiz has no questions." });
                    return;
                }

                gameState.questions = quizDoc.questions;
                gameState.currentQuestionIndex = 0;
                broadcastQuestion(roomCode);

            } catch (error) {
                log(`Error starting quiz: ${error}`, "socket.io");
                
                // Determine specific error type for better user feedback
                if (error instanceof Error) {
                    if (error.name === 'MongoTimeoutError' || error.message.includes('timeout')) {
                        socket.emit("error", { message: "Database timeout. Please try again." });
                    } else if (error.name === 'MongoNetworkError') {
                        socket.emit("error", { message: "Database connection error. Please try again." });
                    } else {
                        socket.emit("error", { message: "Failed to load quiz. Please try again." });
                    }
                } else {
                    socket.emit("error", { message: "Failed to load quiz. Please try again." });
                }
            }
        });

        socket.on("submit_answer", (data: { roomCode: string; answerIndex: number }) => {
            if (!user) return;

            const { roomCode, answerIndex } = data;
            const gameState = activeRooms.get(roomCode);

            if (!gameState || gameState.status !== "active") {
                return; // Ignore answers when game is not active
            }

            const player = gameState.players.get(String(user._id));
            if (!player || player.hasAnsweredCurrent || gameState.timerSeconds <= 0) {
                return; // Player already answered or time is up
            }

            // Validate answer index
            if (typeof answerIndex !== 'number' || 
                !Number.isInteger(answerIndex) || 
                answerIndex < 0) {
                log(`Invalid answer index ${answerIndex} from player ${player.name}`, "socket.io");
                return;
            }

            const q = gameState.questions[gameState.currentQuestionIndex];
            if (!q || !q.options || answerIndex >= q.options.length) {
                log(`Answer index ${answerIndex} out of bounds for player ${player.name}`, "socket.io");
                return;
            }

            // Process valid answer
            player.hasAnsweredCurrent = true;

            if (answerIndex === q.correctAnswer) {
                player.currentAnswerIsCorrect = true;
                // Score calculation based on speed
                const timeBonus = gameState.timerSeconds * 10;
                player.score += (100 + timeBonus);
            }

            log(`Player ${player.name} answered ${answerIndex}. Score: ${player.score}`, "socket.io");
            // Notify host that someone answered
            io.to(gameState.hostId).emit("player_answered", { playerId: player.userId });
        });

        socket.on("next_question", async (data: { roomCode: string }) => {
            if (!user) return;

            const { roomCode } = data;
            if (!roomCode || typeof roomCode !== 'string') {
                return;
            }

            const gameState = activeRooms.get(roomCode);
            if (!gameState || 
                gameState.hostUserId !== String(user._id) || 
                gameState.status !== "leaderboard") {
                return;
            }
            gameState.currentQuestionIndex++;
            if (gameState.currentQuestionIndex < gameState.questions.length) {
                broadcastQuestion(roomCode);
            } else {
                gameState.status = "finished";

                const finalLeaderboard = Array.from(gameState.players.values())
                    .map(p => ({ id: p.userId, name: p.name, avatar: p.avatar, score: p.score }))
                    .sort((a, b) => b.score - a.score);

                const winner = finalLeaderboard[0] || null;

                try {
                    const quizObjectId = new Types.ObjectId(gameState.quizId);
                    // Save match result and increment quiz play count atomically.
                    await Promise.all([
                        MatchResult.create({
                            quizId: quizObjectId,
                            roomCode: gameState.quizCode,
                            players: finalLeaderboard,
                            winner,
                        }),
                        Quiz.findByIdAndUpdate(quizObjectId, { $inc: { playCount: 1 } }),
                    ]);
                    log(`Match result saved for room ${gameState.quizCode}`, "socket.io");
                } catch (err) {
                    log(`Failed to save match result for room ${gameState.quizCode}: ${err}`, "socket.io");
                }

                io.to(roomCode).emit("quiz_finished", {
                    finalLeaderboard,
                });

                // Clean up finished room from memory
                if (gameState.timerInterval) {
                    clearInterval(gameState.timerInterval);
                    gameState.timerInterval = null;
                }
                activeRooms.delete(roomCode);
            }
        });

        // ------------------------------------------------------------

        socket.on("disconnect", () => {
            log(`Client disconnected: ${socket.id}`, "socket.io");
            eventCounters.delete(socket.id); // Clean up event counters

            // Integrity check: No ghost connections
            const currentConnections = Array.from(io.sockets.sockets.keys());
            if (currentConnections.includes(socket.id)) {
                // This shouldn't happen inside the disconnect handler of the same socket,
                // but we check if the socket id still exists in the general map after some time.
                setTimeout(() => {
                    if (io.sockets.sockets.has(socket.id)) {
                        console.error(`FAIL: WebSocket Integrity violated. Ghost connection detected for socket ${socket.id} after disconnect.`);
                        process.exit(1);
                    }
                }, 1000);
            }

            const meta = socketIndex.get(socket.id);
            if (!meta) {
                return;
            }

            socketIndex.delete(socket.id);

            const { roomCode, userId, isHost } = meta;

            // Start a short grace period to allow reconnection
            const timer = setTimeout(() => {
                // Double-check that the timer hasn't been cleared (race condition protection)
                if (!reconnectTimers.has(userId)) {
                    return;
                }
                
                reconnectTimers.delete(userId);
                const gameState = activeRooms.get(roomCode);
                if (!gameState) return;

                if (isHost) {
                    // Host did not return in time: close room and clean up
                    if (gameState.timerInterval) {
                        clearInterval(gameState.timerInterval);
                        gameState.timerInterval = null;
                    }
                    activeRooms.delete(roomCode);
                    io.to(roomCode).emit("room_closed", { reason: "host_disconnected" });
                    log(`Room ${roomCode} closed due to host disconnect`, "socket.io");
                    return;
                }

                // Remove player from room if they haven't reconnected
                if (gameState.players.has(userId)) {
                    const removedPlayer = gameState.players.get(userId);
                    gameState.players.delete(userId);
                    
                    if (removedPlayer) {
                        log(`Player ${removedPlayer.name} (${userId}) removed from room ${roomCode} due to disconnect`, "socket.io");
                    }

                    // Optionally emit updated leaderboard when appropriate (post-question views)
                    if (gameState.status === "leaderboard" || gameState.status === "finished") {
                        const leaderboard = Array.from(gameState.players.values())
                            .map(p => ({ id: p.userId, name: p.name, avatar: p.avatar, score: p.score }))
                            .sort((a, b) => b.score - a.score);

                        const q =
                            gameState.currentQuestionIndex >= 0 &&
                                gameState.currentQuestionIndex < gameState.questions.length
                                ? gameState.questions[gameState.currentQuestionIndex]
                                : undefined;

                        io.to(roomCode).emit("leaderboard_update", {
                            leaderboard,
                            correctAnswer: q ? q.correctAnswer : undefined,
                        });
                    }
                }
            }, 10_000);

            reconnectTimers.set(userId, timer);
        });
    });

    return io;
}
