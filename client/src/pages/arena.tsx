import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Timer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useLocation } from "wouter";

interface QuestionData {
  text: string;
  options: string[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

const QUESTION_TIME_SECONDS = 15;

export default function Arena() {
  const [location, setLocation] = useLocation();
  const roomCode = localStorage.getItem("currentRoom") || "UNKNOWN";

  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_SECONDS);
  const [maxTime, setMaxTime] = useState<number>(QUESTION_TIME_SECONDS);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Helper to apply incoming question payloads (including the first one from lobby)
  const applyQuestionActive = (data: {
    currentQuestionIndex: number;
    totalQuestions: number;
    question: QuestionData;
  }) => {
    setQuestion(data.question);
    setTimeLeft(QUESTION_TIME_SECONDS);
    setMaxTime(QUESTION_TIME_SECONDS);
    setSelectedIndex(null);
    setIsLocked(false);
    setIsTimeUp(false);
    setShowLeaderboard(false);
    setLeaderboard(null);
    setCorrectAnswerIndex(null);
    setQuestionCount(data.totalQuestions || 0);
  };

  useEffect(() => {
    // If the lobby stored the first question payload, hydrate from there so we don't miss it.
    const stored = localStorage.getItem("currentQuestionPayload");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        applyQuestionActive(parsed);
      } catch {
        // Ignore malformed data
      }
    }

    const handleQuestionActive = (data: any) => {
      localStorage.setItem("currentQuestionPayload", JSON.stringify(data));
      applyQuestionActive(data);
    };

    const handleTimerTick = (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
      if (data.timeLeft > 0) {
        setMaxTime(prev => (prev === QUESTION_TIME_SECONDS ? prev : Math.max(prev, data.timeLeft)));
      }
    };

    const handleTimeUp = () => {
      setIsTimeUp(true);
      setTimeLeft(0);
    };

    const handleLeaderboardUpdate = (data: { leaderboard: LeaderboardEntry[]; correctAnswer: number }) => {
      setLeaderboard(data.leaderboard);
      setCorrectAnswerIndex(data.correctAnswer);
      setShowLeaderboard(true);
    };

    const handleQuizFinished = (data: { finalLeaderboard: LeaderboardEntry[] }) => {
      setIsFinished(true);
      setLeaderboard(data.finalLeaderboard);
      setShowLeaderboard(true);
      setIsTimeUp(true);

      // Persist final match data for the post-match screen
      localStorage.setItem("lastMatchResult", JSON.stringify(data));
      localStorage.setItem("currentQuizQuestionCount", String(questionCount));
      localStorage.setItem("currentQuizCorrectCount", String(correctCount));

      setTimeout(() => {
        setLocation("/post-match");
      }, 1200);
    };

    socket.on("question_active", handleQuestionActive);
    socket.on("timer_tick", handleTimerTick);
    socket.on("time_up", handleTimeUp);
    socket.on("leaderboard_update", handleLeaderboardUpdate);
    socket.on("quiz_finished", handleQuizFinished);

    return () => {
      socket.off("question_active", handleQuestionActive);
      socket.off("timer_tick", handleTimerTick);
      socket.off("time_up", handleTimeUp);
      socket.off("leaderboard_update", handleLeaderboardUpdate);
      socket.off("quiz_finished", handleQuizFinished);
    };
  }, []);

  const handleAnswerClick = (index: number) => {
    if (isLocked || isTimeUp || !question || roomCode === "UNKNOWN") return;
    setSelectedIndex(index);
    setIsLocked(true);
    socket.emit("submit_answer", { roomCode, answerIndex: index });

    // We can't see correctness client-side, but we can approximate with leaderboard snapshots
    // For now we only track that an answer was attempted; accuracy is refined when leaderboards arrive.
  };

  const handleExitArena = () => {
    setLocation("/join");
  };

  const progressPercent =
    maxTime > 0 ? Math.max(0, Math.min(100, (timeLeft / maxTime) * 100)) : 0;

  const playerId = socket.id;

  // Capture socket id globally for post-match lookup
  (window as any).quizSocketId = playerId;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "0.8s" }} />

      {/* Header */}
      <div className="relative z-10 px-6 md:px-10 py-6 border-b border-white/10 backdrop-blur-sm bg-background/60 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white">THE ARENA</h1>
          <p className="text-xs md:text-sm text-secondary uppercase tracking-widest font-semibold mt-1">
            Room: {roomCode}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExitArena}
          className="flex items-center gap-2 border-white/20 hover:border-white/60 text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Match
        </Button>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-4xl space-y-10">
          {/* Neon Timer Bar */}
          <div className="w-full">
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary via-accent to-primary shadow-[0_0_25px_rgba(0,255,255,0.8)]"
                animate={{ width: `${progressPercent}%` }}
                transition={{ ease: "linear", duration: 0.3 }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-muted-foreground uppercase tracking-[0.2em] font-display">
              <span className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-secondary" />
                Time Remaining
              </span>
              <span className="font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                {String(Math.max(0, timeLeft)).padStart(2, "0")}s
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="glass-panel relative rounded-3xl p-8 md:p-10 border border-white/10 overflow-hidden">
            {!isTimeUp && (
              <div className="absolute inset-0 bg-primary/10 opacity-40 animate-pulse pointer-events-none" />
            )}
            <div className="relative z-10">
              <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-secondary font-display font-semibold mb-4">
                Question
              </p>
              <h2 className="text-3xl md:text-5xl font-display font-black leading-tight text-white">
                {question?.text || "Awaiting the first challenge..."}
              </h2>
            </div>
          </div>

          {/* Answers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {question?.options?.map((opt, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect =
                typeof correctAnswerIndex === "number" && correctAnswerIndex === index;

              return (
                <motion.button
                  key={index}
                  whileHover={!isLocked && !isTimeUp ? { scale: 1.02 } : undefined}
                  whileTap={!isLocked && !isTimeUp ? { scale: 0.98 } : undefined}
                  onClick={() => handleAnswerClick(index)}
                  disabled={isLocked || isTimeUp}
                  className={`relative overflow-hidden rounded-2xl border px-5 py-6 md:px-6 md:py-8 text-left transition-all group ${
                    isSelected
                      ? "border-secondary bg-secondary/20 shadow-[0_0_25px_rgba(0,255,255,0.5)]"
                      : "border-white/15 bg-black/30 hover:border-secondary/60 hover:bg-secondary/10"
                  }`}
                >
                  <div className="relative z-10 space-y-2">
                    <div className="text-xs uppercase font-display tracking-[0.3em] text-muted-foreground">
                      Option {String.fromCharCode(65 + index)}
                    </div>
                    <div className="text-lg md:text-xl font-display font-bold text-white">
                      {opt}
                    </div>
                  </div>

                  {/* Locked overlay */}
                  {isLocked && isSelected && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/5 backdrop-blur-md border border-secondary/70 shadow-[0_0_35px_rgba(0,255,255,0.7)]">
                      <div className="px-4 py-2 rounded-full border border-secondary/80 bg-black/60 text-secondary font-display text-xs md:text-sm uppercase tracking-[0.25em]">
                        Locked In
                      </div>
                    </div>
                  )}

                  {/* Reveal correct answer highlight when leaderboard shows */}
                  {showLeaderboard && isCorrect && (
                    <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-secondary/30 via-transparent to-accent/30 mix-blend-screen" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Leaderboard Overlay */}
        <AnimatePresence>
          {showLeaderboard && leaderboard && (
            <motion.aside
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-4 md:px-8 md:pb-8"
            >
              <div className="max-w-3xl mx-auto glass-panel rounded-3xl border border-secondary/50 bg-background/90 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-secondary" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-secondary font-display font-semibold">
                        {isFinished ? "Final Standings" : "Round Standings"}
                      </p>
                      {!isFinished && (
                        <p className="text-xs text-muted-foreground">
                          Next question will begin when your host advances.
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-white"
                    onClick={() => setShowLeaderboard(false)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="px-6 py-4 max-h-72 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => {
                      const isYou = playerId && entry.id === playerId;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                            isYou ? "bg-secondary/20 border border-secondary/70" : "bg-white/5 border border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 text-center font-display font-black text-lg text-secondary">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="text-sm md:text-base font-display font-semibold text-white">
                                {entry.name}
                                {isYou && <span className="ml-2 text-xs uppercase text-secondary/80">You</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.score.toLocaleString()} pts
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

