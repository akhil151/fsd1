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

export default function MatchControl() {
    const [location, setLocation] = useLocation();
    const roomCode = location.split("/").pop() || "";

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

        socket.on("question_active", handleQuestionActive);
        socket.on("timer_tick", handleTimerTick);
        socket.on("time_up", handleTimeUp);
        socket.on("player_answered", handlePlayerAnswered);
        socket.on("quiz_finished", handleQuizFinished);

        return () => {
            socket.off("question_active", handleQuestionActive);
            socket.off("timer_tick", handleTimerTick);
            socket.off("time_up", handleTimeUp);
            socket.off("player_answered", handlePlayerAnswered);
            socket.off("quiz_finished", handleQuizFinished);
        };
    }, []);

    const handleNextQuestion = () => {
        socket.emit("next_question", { roomCode });
    };

    const handleEndQuiz = () => {
        setLocation("/dashboard");
    };

    if (isFinished) {
        return (
            <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-8">
                <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[150px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 glass-panel rounded-2xl p-12 text-center max-w-2xl w-full border border-secondary/50 neon-border-secondary"
                >
                    <Trophy className="w-24 h-24 mx-auto text-secondary mb-6" />
                    <h1 className="text-5xl font-display font-black text-white mb-4">MATCH COMPLETE</h1>
                    <p className="text-xl text-muted-foreground mb-12">The arena has fallen silent. The victors have been decided.</p>

                    <Button
                        onClick={handleEndQuiz}
                        className="w-full h-16 bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] text-white rounded-xl font-display uppercase tracking-widest font-bold text-lg"
                    >
                        Return to Dashboard
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-background/50 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-black text-white">MATCH CONTROL</h1>
                    <p className="text-xs text-secondary uppercase tracking-widest font-semibold mt-1">
                        Room: {roomCode}
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="glass-panel px-6 py-2 rounded-full border border-white/10 flex items-center gap-3">
                        <Users className="w-5 h-5 text-secondary" />
                        <span className="font-display font-bold text-lg">{answersCount} Submitted</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">

                {/* Progress */}
                <div className="w-full mb-12 text-center">
                    <p className="text-sm uppercase font-display font-bold tracking-widest text-muted-foreground mb-4">
                        Question {questionIndex + 1} of {totalQuestions || "?"}
                    </p>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-secondary shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${((questionIndex + 1) / (totalQuestions || 1)) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* Timer */}
                <motion.div
                    className={`flex items-center justify-center gap-4 mb-12 ${timeLeft <= 5 && !isTimeUp ? 'text-destructive animate-pulse' : 'text-primary'
                        }`}
                    animate={{ scale: isTimeUp ? 0.9 : 1 }}
                >
                    <Timer className="w-12 h-12" />
                    <span className="text-8xl font-display font-black tracking-tighter" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {timeLeft}
                    </span>
                </motion.div>

                {/* Question Area */}
                <div className="w-full glass-panel rounded-2xl p-12 border border-white/10 text-center mb-12 relative overflow-hidden">
                    {/* Subtle pulse background when waiting for answers */}
                    {!isTimeUp && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
                    )}

                    <h2 className="text-3xl md:text-5xl font-display font-black leading-tight text-white relative z-10">
                        {activeQuestion?.text || "Waiting for question data..."}
                    </h2>
                </div>

                {/* Controls */}
                <motion.div
                    className="w-full flex flex-col items-center"
                    initial={false}
                    animate={{ opacity: isTimeUp ? 1 : 0.5 }}
                >
                    <Button
                        onClick={handleNextQuestion}
                        disabled={!isTimeUp}
                        className={`w-full max-w-md h-20 rounded-2xl font-display uppercase tracking-widest font-black text-xl transition-all ${isTimeUp
                                ? "bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-[0_0_40px_rgba(255,0,128,0.6)] text-white hover:-translate-y-1"
                                : "bg-white/10 text-white/30 border border-white/10"
                            }`}
                    >
                        {questionIndex + 1 >= totalQuestions ? "Show Final Standings" : "Next Question"}
                        <ArrowRight className="w-6 h-6 ml-3" />
                    </Button>
                    {!isTimeUp && (
                        <p className="mt-4 text-sm text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Waiting for timer to expire...
                        </p>
                    )}
                </motion.div>

            </div>
        </div>
    );
}
