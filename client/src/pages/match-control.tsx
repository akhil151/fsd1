import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Timer, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { socket } from "@/lib/socket";

interface QuestionData {
    text: string;
    options: string[];
}

export default function MatchControl({ params }: { params: { roomCode: string } }) {
    const [, setLocation] = useLocation();
    const roomCode = params.roomCode || "";

    const [timeLeft, setTimeLeft] = useState(15);
    const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [answersCount, setAnswersCount] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        // Re-request state if we somehow missed it, or just rely on the broadcast we just got
        // The server just sent question_active to trigger this route change.

        // In a production app, we'd want to fetch current state on mount just in case of reload.
        // For now, we listen for the socket events.

        const handleQuestionActive = (data: any) => {
            setActiveQuestion(data.question);
            setQuestionIndex(data.currentQuestionIndex);
            setTotalQuestions(data.totalQuestions);
            setAnswersCount(0);
            setIsTimeUp(false);
        };

        const handleTimerTick = (data: { timeLeft: number }) => {
            setTimeLeft(data.timeLeft);
        };

        const handleTimeUp = () => {
            setIsTimeUp(true);
            setTimeLeft(0);
        };

        const handlePlayerAnswered = () => {
            setAnswersCount(prev => prev + 1);
        };

        const handleQuizFinished = () => {
            setIsFinished(true);
        };

        const handleSyncState = (data: {
            status: string;
            currentQuestionIndex: number;
            totalQuestions: number;
            timerSeconds: number;
            question: QuestionData | null;
        }) => {
            if (data.question) {
                setActiveQuestion(data.question);
                setQuestionIndex(data.currentQuestionIndex);
                setTotalQuestions(data.totalQuestions);
                setTimeLeft(data.timerSeconds);
                setIsTimeUp(data.status === "leaderboard" || data.status === "finished");
            }
        };

        socket.on("question_active", handleQuestionActive);
        socket.on("timer_tick", handleTimerTick);
        socket.on("time_up", handleTimeUp);
        socket.on("player_answered", handlePlayerAnswered);
        socket.on("quiz_finished", handleQuizFinished);
        socket.on("sync_state", handleSyncState);

        return () => {
            socket.off("question_active", handleQuestionActive);
            socket.off("timer_tick", handleTimerTick);
            socket.off("time_up", handleTimeUp);
            socket.off("player_answered", handlePlayerAnswered);
            socket.off("quiz_finished", handleQuizFinished);
            socket.off("sync_state", handleSyncState);
        };
    }, []);

    const handleNextQuestion = () => {
        socket.emit("next_question", { roomCode });
    };

    const handleEndQuiz = () => {
        const quizId = localStorage.getItem("currentQuizId");
        if (quizId) {
            setLocation(`/analytics/${quizId}`);
        } else {
            setLocation("/dashboard");
        }
    };

    if (isFinished) {
        return (
            <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#020205]">
                <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative z-10 glass-panel rounded-2xl p-12 text-center max-w-xl w-full border border-white/5 shadow-2xl bg-background/60"
                >
                    <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/30 mx-auto mb-8 shadow-2xl">
                        <Trophy className="w-10 h-10 text-secondary" />
                    </div>
                    <h1 className="text-4xl font-display font-black text-white mb-4 uppercase tracking-tighter leading-none">Session Complete</h1>
                    <p className="text-base text-muted-foreground mb-10 font-medium">The quiz has concluded successfully. You can now review detailed performance analytics for all students.</p>

                    <Button
                        onClick={handleEndQuiz}
                        variant="neon"
                        className="w-full h-14 rounded-xl text-base font-black"
                    >
                        View Results & Analytics
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#020205]">
            <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />

            {/* Header */}
            <div className="relative z-10 px-6 py-5 border-b border-white/5 backdrop-blur-md bg-background/40 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <h1 className="text-xl font-display font-black text-white uppercase tracking-widest">Session Control</h1>
                    </div>
                    <p className="text-[9px] text-secondary uppercase tracking-[0.3em] font-black opacity-60">
                        Room Code: {roomCode}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="glass-panel px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3 bg-white/5">
                        <Users className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">{answersCount} Student Responses</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">

                {/* Progress */}
                <div className="w-full mb-12 max-w-xl">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] uppercase font-black tracking-[0.3em] text-muted-foreground opacity-60">
                            Quiz Progress
                        </p>
                        <p className="text-[9px] uppercase font-black tracking-[0.3em] text-primary">
                            Question {questionIndex + 1} of {totalQuestions || "?"}
                        </p>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(255,0,128,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${((questionIndex + 1) / (totalQuestions || 1)) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Timer */}
                <motion.div
                    className={`flex items-center justify-center gap-4 mb-12 ${timeLeft <= 5 && !isTimeUp ? 'text-primary animate-pulse' : 'text-white'
                        }`}
                    animate={{ scale: isTimeUp ? 0.95 : 1 }}
                >
                    <div className="relative">
                        <Timer className={`w-12 h-12 ${timeLeft <= 5 && !isTimeUp ? 'text-primary' : 'text-secondary/40'}`} />
                        {timeLeft <= 5 && !isTimeUp && (
                            <motion.div 
                                className="absolute inset-0 border-2 border-primary rounded-full"
                                animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        )}
                    </div>
                    <span className="text-8xl font-display font-black tracking-tighter leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {String(timeLeft).padStart(2, "0")}
                    </span>
                </motion.div>

                {/* Question Area */}
                <div className="w-full glass-panel rounded-2xl p-12 border border-white/5 text-center mb-12 relative overflow-hidden bg-background/40 shadow-2xl">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
                    {!isTimeUp && (
                        <div className="absolute inset-0 bg-primary/[0.01] animate-pulse pointer-events-none" />
                    )}

                    <div className="relative z-10">
                        <p className="text-[9px] uppercase tracking-[0.4em] text-secondary font-black mb-6 opacity-40">Current Question</p>
                        <h2 className="text-3xl md:text-5xl font-display font-black leading-tight text-white tracking-tighter uppercase">
                            {activeQuestion?.text || "Synchronizing session..."}
                        </h2>
                    </div>
                </div>

                {/* Controls */}
                <motion.div
                    className="w-full flex flex-col items-center"
                    initial={false}
                    animate={{ opacity: isTimeUp ? 1 : 0.6 }}
                >
                    <Button
                        onClick={handleNextQuestion}
                        disabled={!isTimeUp}
                        className={`w-full max-w-sm h-16 rounded-xl font-display uppercase tracking-[0.2em] font-black text-xs transition-all duration-500 relative overflow-hidden ${isTimeUp
                                ? "bg-white text-black hover:shadow-2xl hover:-translate-y-0.5"
                                : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                            }`}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {questionIndex + 1 >= totalQuestions ? "End Quiz Session" : "Continue to Next Question"}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {isTimeUp && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />}
                    </Button>
                    {!isTimeUp && (
                        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                            <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
                            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                                Question in progress...
                            </p>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
}
