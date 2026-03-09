import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { log } from "./index";
import Quiz, { IQuiz, IQuestion } from "./models/Quiz";
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

// userId -> reconnect timeout
const reconnectTimers = new Map<string, NodeJS.Timeout>();

export function setupWebSocket(httpServer: HttpServer) {
    const allowedOrigins = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
    ];

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
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

            // If this teacher already has an active room, close it to prevent ghost rooms
            for (const [code, state] of activeRooms.entries()) {
                if (state.hostUserId === String(user._id)) {
                    if (state.timerInterval) {
                        clearInterval(state.timerInterval);
                    }
                    activeRooms.delete(code);
                    io.to(code).emit("room_closed", { reason: "host_launched_new_room" });
                }
            }

            // Generate 6-character alphanumeric code
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Initialize room state
            activeRooms.set(roomCode, {
                quizCode: roomCode,
                quizId: data?.quizId || "",
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

            log(`Room created: ${roomCode} by ${socket.id} (Quiz: ${data?.quizId})`, "socket.io");
            socket.emit("room_created", { roomCode });
        });

        // Student joining a room (or reconnecting)
        socket.on("join_room", (data: { roomCode: string; studentDetails?: any }) => {
            if (!user) {
                socket.emit("error", { message: "Unauthorized join." });
                return;
            }

            const { roomCode, studentDetails } = data;
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
                // Reconnection: update socket id only
                const existing = gameState.players.get(userId)!;
                existing.socketId = socket.id;
                playerInfo = existing;
            } else {
                const base = studentDetails || {
                    name: `Player ${socket.id.substring(0, 4)}`,
                    avatar: socket.id.substring(0, 2).toUpperCase(),
                };
                playerInfo = {
                    userId,
                    socketId: socket.id,
                    name: base.name,
                    avatar: base.avatar,
                    score: 0,
                    hasAnsweredCurrent: false,
                    currentAnswerIsCorrect: false,
                };
                gameState.players.set(userId, playerInfo);
            }

            socketIndex.set(socket.id, { roomCode, userId, isHost: false });

            // Notify everyone in the room
            io.to(roomCode).emit("player_joined", {
                student: {
                    id: playerInfo.socketId, // keep existing client expectations
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

            // Start Timer
            gameState.timerSeconds = 15; // 15 seconds per question

            if (gameState.timerInterval) {
                clearInterval(gameState.timerInterval);
            }

            gameState.timerInterval = setInterval(() => {
                gameState.timerSeconds--;
                io.to(roomCode).emit("timer_tick", { timeLeft: gameState.timerSeconds });

                if (gameState.timerSeconds <= 0) {
                    clearInterval(gameState.timerInterval!);
                    handleTimeUp(roomCode);
                }
            }, 1000);
        };

        const handleTimeUp = (roomCode: string) => {
            const gameState = activeRooms.get(roomCode);
            if (!gameState) return;

            gameState.status = "leaderboard";
            io.to(roomCode).emit("time_up");

            // Compute Leaderboard
            const leaderboard = Array.from(gameState.players.values()).map(p => ({
                id: p.id,
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
            const gameState = activeRooms.get(roomCode);

            if (gameState && gameState.hostUserId === String(user._id) && gameState.status === "waiting") {
                log(`Starting quiz for room ${roomCode}`, "socket.io");
                try {
                    // Fetch real quiz from MongoDB
                    const quizDoc = await Quiz.findById(gameState.quizId);
                    if (quizDoc && quizDoc.questions && quizDoc.questions.length > 0) {
                        gameState.questions = quizDoc.questions;
                    } else {
                        // Fallback mock questions for testing
                        log(`Warning: Quiz ${gameState.quizId} not found or empty. Using mock.`, "socket.io");
                        gameState.questions = [
                            { text: "What runs on V8?", options: ["Java", "Node.js", "Python", "C#"], correctAnswer: 1, difficulty: "medium" },
                            { text: "Which HTTP method is idempotent?", options: ["POST", "PATCH", "PUT", "CONNECT"], correctAnswer: 2, difficulty: "medium" }
                        ];
                    }

                    gameState.currentQuestionIndex = 0;
                    broadcastQuestion(roomCode);

                } catch (e) {
                    log(`Error starting quiz: ${e}`, "socket.io");
                    socket.emit("error", { message: "Failed to load quiz." });
                }
            }
        });

        socket.on("submit_answer", (data: { roomCode: string; answerIndex: number }) => {
            if (!user) return;

            const { roomCode, answerIndex } = data;
            const gameState = activeRooms.get(roomCode);

            if (gameState && gameState.status === "active") {
                const player = gameState.players.get(String(user._id));

                // Anti-Cheat: Only accept one answer, and only while timer is running
                if (player && !player.hasAnsweredCurrent && gameState.timerSeconds > 0) {
                    player.hasAnsweredCurrent = true;
                    const q = gameState.questions[gameState.currentQuestionIndex];

                    if (answerIndex === q.correctAnswer) {
                        player.currentAnswerIsCorrect = true;
                        // Score calculation based on speed
                        const timeBonus = gameState.timerSeconds * 10;
                        player.score += (100 + timeBonus);
                    }

                    log(`Player ${player.name} answered. Score: ${player.score}`, "socket.io");
                    // Notify host that someone answered
                    io.to(gameState.hostId).emit("player_answered", { playerId: player.userId });
                }
            }
        });

        socket.on("next_question", async (data: { roomCode: string }) => {
            if (!user) return;

            const gameState = activeRooms.get(data.roomCode);
            if (gameState && gameState.hostUserId === String(user._id) && gameState.status === "leaderboard") {
                gameState.currentQuestionIndex++;
                if (gameState.currentQuestionIndex < gameState.questions.length) {
                    broadcastQuestion(data.roomCode);
                } else {
                    gameState.status = "finished";

                    const finalLeaderboard = Array.from(gameState.players.values())
                        .map(p => ({ id: p.userId, name: p.name, avatar: p.avatar, score: p.score }))
                        .sort((a, b) => b.score - a.score);

                    const winner = finalLeaderboard[0] || null;

                    try {
                        await MatchResult.create({
                            quizId: gameState.quizId,
                            roomCode: gameState.quizCode,
                            players: finalLeaderboard,
                            winner,
                        });
                        log(`Match result saved for room ${gameState.quizCode}`, "socket.io");
                    } catch (err) {
                        log(`Failed to save match result for room ${gameState.quizCode}: ${err}`, "socket.io");
                    }

                    io.to(data.roomCode).emit("quiz_finished", {
                        finalLeaderboard,
                    });

                    // Optionally clean up finished room from memory
                    activeRooms.delete(data.roomCode);
                }
            }
        });

        // ------------------------------------------------------------

        socket.on("disconnect", () => {
            log(`Client disconnected: ${socket.id}`, "socket.io");

            const meta = socketIndex.get(socket.id);
            if (!meta) {
                return;
            }

            socketIndex.delete(socket.id);

            const { roomCode, userId, isHost } = meta;

            // Start a short grace period to allow reconnection
            const timer = setTimeout(() => {
                reconnectTimers.delete(userId);
                const gameState = activeRooms.get(roomCode);
                if (!gameState) return;

                if (isHost) {
                    // Host did not return in time: close room and clean up
                    if (gameState.timerInterval) {
                        clearInterval(gameState.timerInterval);
                    }
                    activeRooms.delete(roomCode);
                    io.to(roomCode).emit("room_closed", { reason: "host_disconnected" });
                    return;
                }

                // Remove player from room if they haven't reconnected
                if (gameState.players.has(userId)) {
                    gameState.players.delete(userId);

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
