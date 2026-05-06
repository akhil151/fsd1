import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, BarChart3, ArrowLeft, Brain, Target, Zap, AlertCircle, Loader2, TrendingUp, ShieldAlert, Database, History, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Cell
} from "recharts";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

const MIN_TOPICS_FOR_RADAR = 3;
const MIN_SESSIONS_FOR_INSIGHTS = 1;

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

interface IntelligenceData {
  summary: {
    totalSessions: number;
    avgAccuracy: number;
    totalResponses: number;
  };
  topicMastery: {
    topic: string;
    accuracy: number;
    avgResponseTime: number;
    totalAttempts: number;
  }[];
  questionIntelligence: {
    index: number;
    text: string;
    accuracy: number;
    avgResponseTime: number;
    commonDistractor?: string;
  }[];
  insights: string[];
}

export default function MatchAnalytics({ params }: { params: { quizId: string } }) {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quizId = params.quizId || "";

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [resData, intelData] = await Promise.all([
          apiFetch<{ results: MatchResult[] }>(`/quizzes/${quizId}/analytics`),
          apiFetch<IntelligenceData>(`/quizzes/${quizId}/intelligence`)
        ]);
        setResults(resData.results || []);
        setIntelligence(intelData);
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
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#020205]">
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      
      <header className="relative z-10 px-6 py-5 border-b border-white/5 backdrop-blur-md bg-background/40 sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-secondary/20 flex items-center justify-center border border-secondary/30">
                  <BarChart3 className="w-4 h-4 text-secondary" />
                </div>
                <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  Session Analytics
                </h1>
              </div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">
                Detailed Performance Analysis • Quiz ID: {quizId.substring(0, 8)}
              </p>
          </div>
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white border border-white/5 hover:bg-white/5 px-3.5 h-9 rounded-xl group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Exit Analytics
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 pb-16">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-3">
            <Loader2 className="w-10 h-10 text-secondary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading performance data...</p>
          </div>
        ) : intelligence ? (
          <>
            {/* Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-4">
                <h3 className="text-lg font-display font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-primary" />
                  Educational Insights
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {intelligence.insights.length > 0 && !intelligence.insights[0].includes("No data") ? (
                    intelligence.insights.map((insight, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel border border-white/5 p-4 bg-white/[0.02] rounded-2xl flex items-start gap-3.5 hover:border-white/20 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5">
                          <AlertCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm leading-relaxed group-hover:text-primary transition-colors">
                            {insight}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] text-primary font-black uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 rounded-md">Actionable Insight</span>
                            <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Verified Data</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <AnalyticsEmptyState
                      title="Insight Engine Building"
                      description="Educational insights require completed quiz sessions to analyze student performance patterns and misconceptions."
                      requirement="Host and complete at least one live quiz session with student participants."
                      icon={Brain}
                      currentValue={intelligence.summary.totalSessions}
                      targetValue={MIN_SESSIONS_FOR_INSIGHTS}
                      className="min-h-[120px] py-6"
                    />
                  )}
                </div>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="glass-panel p-8 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center bg-background/60 shadow-2xl relative overflow-hidden cursor-help">
                      <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
                      <Target className="w-10 h-10 text-secondary/40 mb-4" />
                      <p className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground mb-1">Class Accuracy</p>
                      <p className="text-5xl font-display font-black text-white">{Math.round(intelligence.summary.avgAccuracy)}%</p>
                      <div className="mt-4 flex items-center gap-1.5 text-green-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">+4.2% vs Avg</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Average accuracy across all students in this session.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Topic Mastery Radar */}
              <div className="glass-panel p-8 border border-white/5 rounded-2xl bg-background/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                    Topic Performance
                  </h3>
                  <div className="flex flex-col items-end">
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Accuracy by Category</div>
                    {intelligence.topicMastery.length >= MIN_TOPICS_FOR_RADAR && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", intelligence.topicMastery.length < 5 ? "bg-primary animate-pulse" : "bg-green-400")} />
                        <span className={cn("text-[7px] font-black uppercase tracking-[0.1em]", intelligence.topicMastery.length < 5 ? "text-primary" : "text-green-400")}>
                          {intelligence.topicMastery.length < 5 ? "Preliminary Profile" : "High Confidence"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  {intelligence.topicMastery.length >= MIN_TOPICS_FOR_RADAR ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={intelligence.topicMastery}>
                        <PolarGrid stroke="#ffffff05" />
                        <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 700 }} />
                        <Radar
                          name="Accuracy (%)"
                          dataKey="accuracy"
                          stroke="#ff0080"
                          strokeWidth={2}
                          fill="#ff0080"
                          fillOpacity={0.4}
                        />
                        <ChartTooltip 
                          formatter={(value: number) => [`${value}%`, 'Accuracy']}
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "10px" }}
                          itemStyle={{ color: "#fff" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <AnalyticsEmptyState
                      title="Topic Mastery Building"
                      description="Topic mastery insights become available after students complete quizzes across multiple distinct topics."
                      requirement="Assign questions from at least 3 different topics to generate a comparative radar profile."
                      icon={Target}
                      currentValue={intelligence.topicMastery.length}
                      targetValue={MIN_TOPICS_FOR_RADAR}
                      unit="topics"
                    />
                  )}
                </div>
              </div>

              {/* Response Time Analysis */}
              <div className="glass-panel p-8 border border-white/5 rounded-2xl bg-background/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                    <Zap className="w-3.5 h-3.5 text-secondary" />
                    Question Performance
                  </h3>
                  <div className="flex flex-col items-end">
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Accuracy Trend</div>
                    {intelligence.questionIntelligence.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", intelligence.summary.totalResponses < 10 ? "bg-secondary animate-pulse" : "bg-green-400")} />
                        <span className={cn("text-[7px] font-black uppercase tracking-[0.1em]", intelligence.summary.totalResponses < 10 ? "text-secondary" : "text-green-400")}>
                          {intelligence.summary.totalResponses < 10 ? "Collecting Data" : "Verified Data"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  {intelligence.questionIntelligence.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={intelligence.questionIntelligence}>
                        <XAxis dataKey="index" tickFormatter={(v) => `Q${v + 1}`} tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }} hide />
                        <ChartTooltip
                          formatter={(value: number) => [`${value}%`, 'Accuracy']}
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                          cursor={{ fill: '#ffffff05' }}
                        />
                        <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                          {intelligence.questionIntelligence.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.accuracy > 70 ? "hsl(var(--secondary))" : entry.accuracy > 40 ? "hsl(var(--accent))" : "hsl(var(--primary))"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <AnalyticsEmptyState
                      title="Item Analysis Pending"
                      description="Individual question performance metrics will appear after students submit their responses during a live session."
                      requirement="Collect student responses for at least one question in this quiz."
                      icon={Zap}
                      currentValue={intelligence.summary.totalResponses || 0}
                      targetValue={1}
                      unit="responses"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Question Intelligence Table */}
            {intelligence.questionIntelligence.length > 0 && (
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden bg-background/40">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Question Mastery Matrix</h3>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Proficient</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Needs Review</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground border-b border-white/5 font-black">
                        <th className="px-8 py-5 font-black">Learning Objective</th>
                        <th className="px-8 py-5 font-black text-center">Accuracy</th>
                        <th className="px-8 py-5 font-black text-center">Response Time</th>
                        <th className="px-8 py-5 font-black">Common Misconception</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {intelligence.questionIntelligence.map((q, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-xs font-bold text-white group-hover:text-secondary transition-colors">{q.text}</p>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                q.accuracy > 70 ? 'bg-secondary/10 text-secondary' : 
                                q.accuracy > 40 ? 'bg-accent/10 text-accent' : 
                                'bg-primary/10 text-primary'
                              }`}>
                                {Math.round(q.accuracy)}%
                              </div>
                              <span className="text-[7px] font-black text-muted-foreground uppercase opacity-40">vs 68% avg</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center text-xs font-display font-black text-white/60">
                            {(q.avgResponseTime / 1000).toFixed(2)}s
                          </td>
                          <td className="px-8 py-6">
                          <p className="text-[10px] text-muted-foreground font-medium italic opacity-60">
                            {q.commonDistractor !== undefined && !isNaN(parseInt(q.commonDistractor)) 
                              ? `Option ${String.fromCharCode(65 + parseInt(q.commonDistractor))}` 
                              : "No clear distractor"}
                          </p>
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : error ? (
          <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center max-w-xl mx-auto mt-16">
            <ShieldAlert className="w-10 h-10 text-primary mx-auto mb-5 opacity-40" />
            <h3 className="text-lg font-display font-black text-white uppercase tracking-widest">Analytics Unavailable</h3>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{error}</p>
            <Button variant="neon" className="mt-6 text-xs h-9" onClick={handleBack}>
              Return to Control
            </Button>
          </div>
        ) : null}

        {/* Leaderboard */}
        {latest && (
          <div className="glass-panel rounded-2xl border border-white/5 p-8 bg-background/40">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2.5">
              <Trophy className="w-3.5 h-3.5 text-secondary" />
              Session Rankings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {latest.players.slice().sort((a, b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3.5 rounded-xl bg-white/[0.02] border border-white/5 px-5 py-4 hover:border-white/20 transition-all group">
                  <div className="text-xl font-display font-black text-secondary group-hover:scale-105 transition-transform">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white uppercase tracking-wide truncate">{p.name}</p>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{p.score.toLocaleString()} Points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

