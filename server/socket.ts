import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { log } from "./index";
import Quiz, { IQuiz, IQuestion } from "./models/Quiz";
import MatchResult from "./models/MatchResult";

// In-Memory Game State
interface PlayerState {
    id: string;
    name: string;
    avatar: string;
    score: number;
    hasAnsweredCurrent: boolean;
    currentAnswerIsCorrect: boolean;
}

interface RoomState {
    quizCode: string;
    quizId: string;
    hostId: string;
    players: Map<string, PlayerState>;
    questions: IQuestion[];
    currentQuestionIndex: number;
    timerInterval: NodeJS.Timeout | null;
    timerSeconds: number;
    status: "waiting" | "active" | "leaderboard" | "finished";
}

const activeRooms = new Map<string, RoomState>();

export function setupWebSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket: Socket) => {
        log(`Client connected: ${socket.id}`, "socket.io");

        // Teacher hosting a room
        socket.on("host_room", (data?: { quizId: string }) => {
            // Generate 6-digit alphanumeric code
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Initialize room state
            activeRooms.set(roomCode, {
                quizCode: roomCode,
                quizId: data?.quizId || "",
                hostId: socket.id,
                players: new Map(),
                questions: [],
                currentQuestionIndex: -1,
                timerInterval: null,
                timerSeconds: 0,
                status: "waiting"
            });

            socket.join(roomCode);
            log(`Room created: ${roomCode} by ${socket.id} (Quiz: ${data?.quizId})`, "socket.io");
            socket.emit("room_created", { roomCode });
        });

        // Student joining a room
        socket.on("join_room", (data: { roomCode: string; studentDetails?: any }) => {
            const { roomCode, studentDetails } = data;
            const room = io.sockets.adapter.rooms.get(roomCode);
            const gameState = activeRooms.get(roomCode);

            if (room && gameState && gameState.status === "waiting") {
                socket.join(roomCode);
                log(`Student ${socket.id} joined room: ${roomCode}`, "socket.io");

                const playerInfo = studentDetails || {
                    id: socket.id,
                    name: `Player ${socket.id.substring(0, 4)}`,
                    avatar: socket.id.substring(0, 2).toUpperCase(),
                    score: 0,
                    hasAnsweredCurrent: false,
                    currentAnswerIsCorrect: false
                };

                // Add to game state
                gameState.players.set(socket.id, playerInfo);

                // Notify everyone in the room
                io.to(roomCode).emit("player_joined", { student: playerInfo });

                // Confirm to student
                socket.emit("joined_successfully", { roomCode });
            } else {
                socket.emit("error", { message: "Invalid room code or game already started." });
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
            const { roomCode } = data;
            const gameState = activeRooms.get(roomCode);

            if (gameState && gameState.hostId === socket.id && gameState.status === "waiting") {
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
            const { roomCode, answerIndex } = data;
            const gameState = activeRooms.get(roomCode);

            if (gameState && gameState.status === "active") {
                const player = gameState.players.get(socket.id);

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
                    io.to(gameState.hostId).emit("player_answered", { playerId: socket.id });
                }
            }
        });

        socket.on("next_question", async (data: { roomCode: string }) => {
            const gameState = activeRooms.get(data.roomCode);
            if (gameState && gameState.hostId === socket.id && gameState.status === "leaderboard") {
                gameState.currentQuestionIndex++;
                if (gameState.currentQuestionIndex < gameState.questions.length) {
                    broadcastQuestion(data.roomCode);
                } else {
                    gameState.status = "finished";

                    const finalLeaderboard = Array.from(gameState.players.values())
                        .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
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
            // Optional: If host disconnects, end room. If student disconnects, mark offline.
            // For now we keep it simple.
        });
    });

    return io;
}
