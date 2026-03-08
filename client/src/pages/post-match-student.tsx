import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
}

interface StoredMatchSummary {
  finalLeaderboard: LeaderboardEntry[];
}

export default function PostMatchStudent() {
  const [, setLocation] = useLocation();

  const stored = localStorage.getItem("lastMatchResult");
  const data: StoredMatchSummary | null = stored ? JSON.parse(stored) : null;

  const socketId = (window as any).quizSocketId || "";

  const { rank, score, totalPlayers } = useMemo(() => {
    if (!data || !data.finalLeaderboard) {
      return { rank: 0, score: 0, totalPlayers: 0 };
    }
    const idx = data.finalLeaderboard.findIndex((p) => p.id === socketId);
    const player = idx >= 0 ? data.finalLeaderboard[idx] : null;
    return {
      rank: idx >= 0 ? idx + 1 : 0,
      score: player ? player.score : 0,
      totalPlayers: data.finalLeaderboard.length,
    };
  }, [data, socketId]);

  const totalQuestions = Number(localStorage.getItem("currentQuizQuestionCount") || "0");
  const correctCount = Number(localStorage.getItem("currentQuizCorrectCount") || "0");
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const isWinner = rank === 1 && totalPlayers > 0;

  const handleReturnHome = () => {
    localStorage.removeItem("lastMatchResult");
    localStorage.removeItem("currentQuizCorrectCount");
    localStorage.removeItem("currentQuizQuestionCount");
    setLocation("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-6 py-10">
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-[420px] h-[420px] bg-secondary/30 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-primary/30 rounded-full blur-[180px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateX: -30 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 glass-panel rounded-3xl border border-white/15 px-10 py-12 max-w-3xl w-full text-center overflow-hidden"
      >
        <motion.div
          className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-secondary/40 via-accent/40 to-primary/40 blur-3xl opacity-60"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 1.2 }}
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-black/60 border border-secondary/70 flex items-center justify-center shadow-[0_0_35px_rgba(0,255,255,0.5)]"
            >
              <Trophy className="w-10 h-10 text-secondary" />
            </motion.div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.35em] text-secondary font-display font-semibold">
                Match Complete
              </p>
              <h1 className="text-4xl md:text-5xl font-display font-black text-white">
                {isWinner ? "VICTORY" : "DEFEAT"}
              </h1>
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground max-w-xl">
            {isWinner
              ? "You stood at the top of the Neon Quiz Arena. Well played."
              : "The arena falls silent, but the battle made you stronger. Analyze, adapt, and return."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 w-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel rounded-2xl border border-white/10 px-6 py-5 text-left"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-2">
                Final Rank
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-secondary">
                {rank > 0 ? `#${rank}` : "-"}
              </p>
              {totalPlayers > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {totalPlayers} combatants
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-panel rounded-2xl border border-white/10 px-6 py-5 text-left"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-2">
                Total Score
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-white">
                {score.toLocaleString()}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-panel rounded-2xl border border-white/10 px-6 py-5 text-left"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-2">
                Accuracy
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-primary">
                {accuracy}%
              </p>
              {totalQuestions > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {correctCount}/{totalQuestions} correct
                </p>
              )}
            </motion.div>
          </div>

          <Button
            onClick={handleReturnHome}
            className="mt-6 h-14 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary text-white font-display uppercase tracking-[0.3em] text-sm md:text-base px-10 hover:shadow-[0_0_35px_rgba(255,0,128,0.6)] flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Button>

          <button
            onClick={() => setLocation("/join")}
            className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-secondary transition-colors uppercase tracking-[0.25em]"
          >
            <ArrowLeft className="w-3 h-3" />
            Queue for another match
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

