import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Home, Zap, Target, Award } from "lucide-react";
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

  const playerId = localStorage.getItem("quiz_arena_player_id") || "";

  const { rank, score, totalPlayers } = useMemo(() => {
    if (!data || !data.finalLeaderboard) {
      return { rank: 0, score: 0, totalPlayers: 0 };
    }
    const idx = data.finalLeaderboard.findIndex((p) => p.id === playerId);
    const player = idx >= 0 ? data.finalLeaderboard[idx] : null;
    return {
      rank: idx >= 0 ? idx + 1 : 0,
      score: player ? player.score : 0,
      totalPlayers: data.finalLeaderboard.length,
    };
  }, [data, playerId]);

  const totalQuestions = Number(localStorage.getItem("currentQuizQuestionCount") || "0");
  const correctCount = Number(localStorage.getItem("currentQuizCorrectCount") || "0");
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const isWinner = rank === 1 && totalPlayers > 0;

  const handleReturnHome = () => {
    localStorage.removeItem("lastMatchResult");
    localStorage.removeItem("quiz_arena_player_id");
    localStorage.removeItem("currentQuizCorrectCount");
    localStorage.removeItem("currentQuizQuestionCount");
    setLocation("/");
  };

  if (!data) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-[#020205] p-6">
        <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
        <div className="relative z-10 glass-panel rounded-2xl p-12 text-center max-w-xl w-full border border-white/5 shadow-2xl bg-background/60">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mx-auto mb-8">
            <Zap className="w-8 h-8 text-white/20" />
          </div>
          <h1 className="text-3xl font-display font-black text-white mb-4 uppercase tracking-widest">No Results Found</h1>
          <p className="text-xs text-muted-foreground mb-10">Match data is currently unavailable for this session.</p>
          <Button onClick={() => setLocation("/")} variant="neon" className="w-full h-14 rounded-xl text-sm">Return to Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-[#020205] px-6 py-12">
      {/* Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 glass-panel rounded-[2.5rem] border border-white/5 px-10 py-12 max-w-2xl w-full text-center overflow-hidden bg-background/40 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-accent to-primary" />
        
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-background/80 border border-secondary/40 flex items-center justify-center shadow-2xl"
            >
              {isWinner ? (
                <Trophy className="w-10 h-10 text-secondary" />
              ) : (
                <Award className="w-10 h-10 text-primary" />
              )}
            </motion.div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-secondary font-black mb-2 opacity-60">
                Quiz Session Complete
              </p>
              <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-none tracking-tighter uppercase">
                {isWinner ? "Winner" : "Results"}
              </h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-md font-medium leading-relaxed">
            {isWinner
              ? "Excellent work! You've achieved the top rank in this session."
              : "Session completed. Your performance data has been updated in your profile."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center hover:border-white/20 transition-colors"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-3 opacity-60">
                Final Rank
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-secondary leading-none">
                {rank > 0 ? `${rank}` : "-"}
              </p>
              <div className="mt-3 h-0.5 w-10 bg-secondary/20 mx-auto rounded-full" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-panel rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center hover:border-white/20 transition-colors"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-3 opacity-60">
                Total Score
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-white leading-none">
                {score.toLocaleString()}
              </p>
              <div className="mt-3 h-0.5 w-10 bg-white/10 mx-auto rounded-full" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-panel rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center hover:border-white/20 transition-colors"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-3 opacity-60">
                Accuracy
              </p>
              <p className="text-3xl md:text-4xl font-display font-black text-primary leading-none">
                {accuracy}%
              </p>
              <div className="mt-3 h-0.5 w-10 bg-primary/20 mx-auto rounded-full" />
            </motion.div>
          </div>

          <div className="w-full space-y-3">
            <Button
              onClick={handleReturnHome}
              className="w-full h-16 rounded-xl bg-white text-black hover:bg-white/90 font-display uppercase tracking-[0.2em] font-black text-xs relative overflow-hidden group transition-all duration-500 shadow-2xl"
            >
              <span className="relative z-10 flex items-center justify-center gap-2.5">
                <Home className="w-4 h-4" />
                Return to Dashboard
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>

            <button
              onClick={() => {
                localStorage.removeItem("lastMatchResult");
                localStorage.removeItem("quiz_arena_player_id");
                localStorage.removeItem("currentQuizCorrectCount");
                localStorage.removeItem("currentQuizQuestionCount");
                setLocation("/join");
              }}
              className="text-[9px] text-muted-foreground hover:text-secondary transition-colors uppercase tracking-[0.3em] font-black flex items-center justify-center gap-2.5 w-full py-3 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Join New Session
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

