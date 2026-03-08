import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";

interface PlayerResult {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

interface MatchResult {
  _id: string;
  roomCode: string;
  players: PlayerResult[];
  winner: PlayerResult | null;
  createdAt: string;
}

export default function MatchAnalytics() {
  const [location, setLocation] = useLocation();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quizId = location.split("/").pop() || "";

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch<{ results: MatchResult[] }>(`/quizzes/${quizId}/analytics`);
        setResults(data.results || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      load();
    }
  }, [quizId]);

  const latest = results[0] || null;

  const { totalPlayers, averageScore, winnerName, maxScore } = useMemo(() => {
    if (!latest || !latest.players?.length) {
      return { totalPlayers: 0, averageScore: 0, winnerName: "-", maxScore: 0 };
    }
    const totalPlayers = latest.players.length;
    const totalScore = latest.players.reduce((sum, p) => sum + p.score, 0);
    const averageScore = Math.round(totalScore / totalPlayers);
    const maxScore = latest.players.reduce((max, p) => Math.max(max, p.score), 0);
    const winnerName = latest.winner?.name || "-";
    return { totalPlayers, averageScore, winnerName, maxScore };
  }, [latest]);

  const handleBack = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-secondary/20 rounded-full blur-[150px] pointer-events-none" />

      <header className="relative z-10 px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-background/60 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary font-display font-semibold">
            Post-Match Analytics
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white">
            Match Data Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Quiz ID: {quizId}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2 border-white/20 hover:border-white/60 text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </header>

      <main className="relative z-10 flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
        {isLoading && (
          <div className="glass-panel rounded-2xl border border-white/10 p-10 text-center text-muted-foreground">
            Loading analytics...
          </div>
        )}

        {!isLoading && error && (
          <div className="glass-panel rounded-2xl border border-destructive/30 p-10 text-center text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && !latest && (
          <div className="glass-panel rounded-2xl border border-white/10 p-10 text-center text-muted-foreground">
            No match results recorded yet for this quiz.
          </div>
        )}

        {!isLoading && !error && latest && (
          <>
            {/* Top-level stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl border border-white/10 p-6 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary/50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-1">
                    Total Players
                  </p>
                  <p className="text-3xl font-display font-black text-white">{totalPlayers}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-panel rounded-2xl border border-white/10 p-6 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-1">
                    Average Score
                  </p>
                  <p className="text-3xl font-display font-black text-white">{averageScore}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-panel rounded-2xl border border-white/10 p-6 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/50 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display mb-1">
                    Winner
                  </p>
                  <p className="text-xl font-display font-black text-white">
                    {winnerName}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Leaderboard table */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary font-display font-semibold">
                    Final Leaderboard
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Room {latest.roomCode} · {new Date(latest.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="w-full space-y-2">
                {latest.players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx, arr) => {
                    const relative = maxScore > 0 ? (p.score / maxScore) * 100 : 0;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-4 rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                      >
                        <div className="w-10 text-center font-display font-black text-lg text-secondary">
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm md:text-base font-display font-semibold text-white">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.score.toLocaleString()} pts
                            </p>
                          </div>
                          <div className="mt-2 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent shadow-[0_0_20px_rgba(255,0,128,0.7)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${relative}%` }}
                              transition={{ duration: 0.5, delay: 0.05 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

