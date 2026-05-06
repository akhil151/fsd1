import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Timer, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

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

export default function Arena({ params }: { params: { roomCode: string } }) {
  const [, setLocation] = useLocation();
  const roomCode = params.roomCode || localStorage.getItem("currentRoom") || "UNKNOWN";
  const { user } = useAuth();

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

  // Refs that mirror the state above — always current, readable inside
  // useEffect closures that would otherwise capture stale initial values.
  const questionCountRef = useRef(0);
  const correctCountRef = useRef(0);

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
    questionCountRef.current = data.totalQuestions || 0;
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
      // Track accuracy: increment if the player's locked-in answer was correct.
      // selectedIndex is read via closure — we use a functional update to avoid
      // stale closure issues with correctCount.
      setCorrectCount(prev => {
        const next = typeof selectedIndex === "number" && selectedIndex === data.correctAnswer
          ? prev + 1
          : prev;
        correctCountRef.current = next;
        return next;
      });
    };

    const handleQuizFinished = (data: { finalLeaderboard: LeaderboardEntry[] }) => {
      setIsFinished(true);
      setLeaderboard(data.finalLeaderboard);
      setShowLeaderboard(true);
      setIsTimeUp(true);

      // Persist final match data for the post-match screen.
      // Use localStorage for playerId instead of window.quizSocketId —
      // window properties are unreliable across React page navigations.
      localStorage.setItem("lastMatchResult", JSON.stringify(data));
      localStorage.setItem("quiz_arena_player_id", playerId || "");
      // Use refs to read live values — the state variables are stale inside this
      // closure because the useEffect dependency array is empty ([]).
      localStorage.setItem("currentQuizQuestionCount", String(questionCountRef.current));
      localStorage.setItem("currentQuizCorrectCount", String(correctCountRef.current));

      // Clean up current room data since quiz is finished
      localStorage.removeItem("currentRoom");
      localStorage.removeItem("currentQuestionPayload");

      setTimeout(() => {
        setLocation("/post-match");
      }, 1200);
    };

    const handleSyncState = (data: {
      status: string;
      currentQuestionIndex: number;
      totalQuestions: number;
      timerSeconds: number;
      question: QuestionData | null;
    }) => {
      if (data.question) {
        applyQuestionActive({
          currentQuestionIndex: data.currentQuestionIndex,
          totalQuestions: data.totalQuestions,
          question: data.question,
        });
        setTimeLeft(data.timerSeconds);
        setMaxTime(Math.max(QUESTION_TIME_SECONDS, data.timerSeconds));
        setIsTimeUp(data.status === "leaderboard" || data.status === "finished");
      }
    };

    socket.on("question_active", handleQuestionActive);
    socket.on("timer_tick", handleTimerTick);
    socket.on("time_up", handleTimeUp);
    socket.on("leaderboard_update", handleLeaderboardUpdate);
    socket.on("quiz_finished", handleQuizFinished);
    socket.on("sync_state", handleSyncState);

    return () => {
      socket.off("question_active", handleQuestionActive);
      socket.off("timer_tick", handleTimerTick);
      socket.off("time_up", handleTimeUp);
      socket.off("leaderboard_update", handleLeaderboardUpdate);
      socket.off("quiz_finished", handleQuizFinished);
      socket.off("sync_state", handleSyncState);
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
    // Clean up localStorage when exiting arena
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("currentQuestionPayload");
    setLocation("/join");
  };

  const progressPercent =
    maxTime > 0 ? Math.max(0, Math.min(100, (timeLeft / maxTime) * 100)) : 0;

  const playerId = user?.id || socket.id;

  // Capture socket id globally for post-match lookup
  (window as any).quizSocketId = playerId;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#020205]">
      {/* Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: "0.8s" }} />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 border-b border-white/5 backdrop-blur-md bg-background/40 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <h1 className="text-xl font-display font-black text-white uppercase tracking-widest">The Arena</h1>
          </div>
          <p className="text-[9px] text-secondary uppercase tracking-[0.3em] font-black opacity-60">
            Room Code: {roomCode}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={handleExitArena}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white border border-white/5 hover:bg-white/5 px-3.5 h-9 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit Session
        </Button>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="w-full space-y-8">
          {/* Progress Bar */}
          <div className="w-full glass-panel p-5 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-white/5" />
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary via-accent to-primary rounded-full shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                animate={{ width: `${progressPercent}%` }}
                transition={{ ease: "linear", duration: 0.3 }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-secondary opacity-60" />
                <span className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] font-black">Time Remaining</span>
              </div>
              <span className="text-lg font-display font-black text-white tracking-widest" style={{ fontVariantNumeric: "tabular-nums" }}>
                {String(Math.max(0, timeLeft)).padStart(2, "0")}<span className="text-[10px] text-muted-foreground ml-1">SEC</span>
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="glass-panel relative rounded-2xl p-10 md:p-12 border border-white/5 overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
            {!isTimeUp && (
              <div className="absolute inset-0 bg-primary/[0.01] animate-pulse pointer-events-none" />
            )}
            <div className="relative z-10">
              <p className="text-[9px] uppercase tracking-[0.4em] text-secondary font-black mb-4 opacity-60">
                Current Question
              </p>
              <h2 className="text-3xl md:text-5xl font-display font-black leading-tight text-white tracking-tighter uppercase">
                {question?.text || "Synchronizing session..."}
              </h2>
            </div>
          </div>

          {/* Answers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question?.options?.map((opt, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect =
                typeof correctAnswerIndex === "number" && correctAnswerIndex === index;

              return (
                <motion.button
                  key={index}
                  whileHover={!isLocked && !isTimeUp ? { scale: 1.01, y: -2 } : undefined}
                  whileTap={!isLocked && !isTimeUp ? { scale: 0.99 } : undefined}
                  onClick={() => handleAnswerClick(index)}
                  disabled={isLocked || isTimeUp}
                  className={`relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-500 group ${
                    isSelected
                      ? "border-secondary bg-secondary/10 shadow-2xl"
                      : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] uppercase font-black tracking-[0.3em] text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
                        Option {String.fromCharCode(65 + index)}
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                    </div>
                    <div className="text-lg md:text-xl font-display font-black text-white group-hover:text-secondary transition-colors leading-tight uppercase">
                      {opt}
                    </div>
                  </div>

                  {/* Locked overlay */}
                  {isLocked && isSelected && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-md border border-secondary/40">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-4 py-2 rounded-xl border border-secondary/50 bg-secondary/10 text-secondary font-display text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl"
                      >
                        Answer Submitted
                      </motion.div>
                    </div>
                  )}

                  {/* Reveal correct answer highlight when leaderboard shows */}
                  {showLeaderboard && isCorrect && (
                    <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-secondary/10 via-transparent to-accent/10 animate-pulse" />
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
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-4"
            >
              <div className="max-w-3xl mx-auto glass-panel rounded-2xl border border-white/10 bg-background/95 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-accent to-primary" />
                
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/30">
                      <Trophy className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.4em] text-secondary font-black mb-1">
                          {isFinished ? "Final Rankings" : "Session Leaderboard"}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {!isFinished ? "Prepare for the next question." : "Redirecting to final results..."}
                        </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-white rounded-full h-8 w-8 border border-white/5"
                    onClick={() => setShowLeaderboard(false)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="px-8 py-6 max-h-[350px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {leaderboard.map((entry, idx) => {
                      const isYou = playerId && entry.id === playerId;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center justify-between rounded-xl px-5 py-4 transition-all ${
                            isYou 
                              ? "bg-secondary/10 border border-secondary/40 shadow-xl scale-[1.01]" 
                              : "bg-white/[0.03] border border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-6 text-center font-display font-black text-xl text-secondary">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                                {entry.name}
                                {isYou && <span className="px-1.5 py-0.5 rounded-full bg-secondary/20 text-[7px] text-secondary border border-secondary/30">YOU</span>}
                              </div>
                              <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 opacity-60">
                                {entry.score.toLocaleString()} Points
                              </div>
                            </div>
                          </div>
                          {idx === 0 && <Star className="w-4 h-4 text-yellow-400 fill-current animate-pulse" />}
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

