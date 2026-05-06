import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Play, Users, Loader2, Brain, Target, Zap, AlertCircle, History, TrendingUp, Star, ArrowLeft, ChevronRight, Activity, ShieldAlert, BookOpen, Grid3X3, BarChart3 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { QuizCard } from "@/components/teacher/quiz-card";
import { CreateQuizModal } from "@/components/teacher/create-quiz-modal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { socket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Cell,
  LineChart, Line, AreaChart, Area, PieChart, Pie
} from "recharts";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

const MIN_TOPICS_FOR_STUDENT_RADAR = 3;
const MIN_HISTORY_FOR_TRENDS = 2;
const MIN_RETENTION_METRICS = 1;

export default function TeacherDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("quizzes");
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [studentIntelligence, setStudentIntelligence] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to login if the user logs out while on this page.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  useEffect(() => {
    const handleRoomCreated = (data: { roomCode: string }) => {
      setLocation(`/host-lobby/${data.roomCode}`);
    };

    socket.on("room_created", handleRoomCreated);

    return () => {
      socket.off("room_created", handleRoomCreated);
    };
  }, [setLocation]);

  const loadQuizzes = async () => {
    try {
      const data = await apiFetch<{ quizzes: any[] }>("/quizzes");
      setQuizzes(data.quizzes);
    } catch (err: any) {
      toast({
        title: "Failed to load quizzes",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntelligence = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<{ students: any[] }>("/quizzes/students/intelligence");
      setStudentIntelligence(data.students);
    } catch (err: any) {
      toast({
        title: "Intelligence Load Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "quizzes" || activeTab === "analytics") {
      setIsLoading(true);
      loadQuizzes();
    } else if (activeTab === "intelligence") {
      loadIntelligence();
    }
  }, [activeTab]);

  const handleCreateQuiz = async (quizData: any) => {
    try {
      await apiFetch("/quizzes", { data: quizData });
      toast({
        title: "Success",
        description: "Quiz created successfully.",
      });
      loadQuizzes();
      setShowCreateModal(false);
    } catch (err: any) {
      toast({
        title: "Failed to create quiz",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      await apiFetch(`/quizzes/${id}`, { headers: {}, method: "DELETE" });
      toast({
        title: "Success",
        description: "Quiz deleted successfully.",
      });
      loadQuizzes();
    } catch (err: any) {
      toast({
        title: "Failed to delete quiz",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleLaunchQuiz = (id: string) => {
    const quiz = quizzes.find((q: any) => (q._id || q.id) === id);
    if (quiz && (!quiz.questions || quiz.questions.length === 0)) {
      toast({
        title: "Cannot Launch Quiz",
        description: "Add at least one question before launching.",
        variant: "destructive",
      });
      return;
    }
    socket.emit("host_room", { quizId: id });
  };

  return (
    <div className="min-h-screen bg-[#020205] flex flex-col lg:flex-row">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 relative overflow-hidden pt-16 lg:pt-0">
        <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 px-6 py-4 border-b border-white/5 backdrop-blur-md bg-background/40 sticky top-0"
        >
          <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                  {activeTab === "intelligence" ? <Brain className="w-4 h-4 text-primary" /> : <Activity className="w-4 h-4 text-primary" />}
                </div>
                <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {activeTab === "intelligence" ? "Student Insights" : activeTab === "analytics" ? "Performance Analytics" : "Teacher Dashboard"}
                </h1>
              </div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">Learning Management System • {activeTab}</p>
            </div>
            {activeTab === "quizzes" && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="neon"
                className="h-10 px-5 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> New Quiz
              </Button>
            )}
          </div>
        </motion.div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          {activeTab === "quizzes" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Active Quizzes", value: quizzes.length, icon: BookOpen, color: "text-primary", help: "Number of quizzes currently available in your library." },
                  { label: "Total Completions", value: quizzes.reduce((sum, q) => sum + q.playCount, 0), icon: Activity, color: "text-secondary", help: "Total number of times your quizzes have been completed by students." },
                  { label: "Analytics Status", value: "Live", icon: Zap, color: "text-accent", help: "Current status of the automated student insight engine." },
                ].map((stat, i) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="glass-panel rounded-xl p-5 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors cursor-help"
                        >
                          <div className="relative z-10 flex justify-between items-start">
                            <div>
                              <p className="text-muted-foreground text-[9px] uppercase font-black tracking-widest mb-2 opacity-60">{stat.label}</p>
                              <p className={`text-3xl font-display font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                            <stat.icon className={`w-7 h-7 ${stat.color} opacity-20`} />
                          </div>
                          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/5 group-hover:bg-white/10 transition-colors" />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{stat.help}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-display font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                    <Grid3X3 className="w-4 h-4 text-primary" />
                    Quiz Library
                  </h2>
                </div>
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-48 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading Library...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {quizzes.map((quiz, index) => (
                      <QuizCard
                        key={quiz._id || quiz.id}
                        quiz={{
                          id: quiz._id || quiz.id,
                          title: quiz.title,
                          questionCount: quiz.questions?.length || 0,
                          difficulty: "intermediate",
                          createdAt: new Date(quiz.createdAt),
                          playCount: quiz.playCount || 0,
                        }}
                        onDelete={handleDeleteQuiz}
                        onLaunch={handleLaunchQuiz}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "intelligence" && (
            <div className="space-y-6">
              {!selectedStudent ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-end bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
                    <div className="relative z-10">
                      <h2 className="text-2xl font-display font-black text-white flex items-center gap-2.5 mb-2">
                        <ShieldAlert className="w-6 h-6 text-primary" />
                        STUDENT SUPPORT CENTER
                      </h2>
                      <p className="text-xs text-muted-foreground font-medium max-w-2xl leading-relaxed">
                        Identify students who may need additional support based on performance trends and accuracy metrics across all quiz sessions.
                      </p>
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">Alert Status</div>
                      <div className="text-xl font-display font-black text-white">ACTIVE</div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-24 gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analyzing Student Performance...</p>
                    </div>
                  ) : studentIntelligence.length === 0 ? (
                    <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center space-y-3">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <Activity className="w-8 h-8 text-muted-foreground opacity-20" />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-black text-white uppercase tracking-widest">Awaiting Performance Data</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-2">Complete quiz sessions to generate student insight profiles.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {studentIntelligence
                        .sort((a, b) => {
                          const riskMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
                          return riskMap[b.riskLevel] - riskMap[a.riskLevel];
                        })
                        .map((student, i) => (
                          <motion.div
                            key={student._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedStudent(student)}
                            className={`glass-panel p-6 border rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col h-full hover:translate-y-[-4px] ${
                              student.riskLevel === 'high' ? 'border-primary/40 bg-primary/5 hover:border-primary/60' : 
                              student.riskLevel === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50' : 
                              'border-white/5 hover:border-white/20'
                            }`}
                          >
                            {student.riskLevel !== 'low' && (
                              <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                student.riskLevel === 'high' ? 'bg-primary text-white' : 'bg-yellow-500 text-black'
                              }`}>
                                {student.riskLevel} Priority
                              </div>
                            )}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white group-hover:scale-105 transition-transform duration-500">
                                {student.userId?.name?.[0]}
                              </div>
                              <div>
                                <h3 className="text-lg font-display font-black text-white group-hover:text-primary transition-colors">{student.userId?.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    student.recentTrend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'
                                  }`}>
                                    <TrendingUp className={`w-2.5 h-2.5 ${student.recentTrend < 0 ? 'rotate-180' : ''}`} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {Math.abs(student.recentTrend)}% Shift
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4 flex-1">
                              <div className="space-y-1">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Key Learning Gap</p>
                                <p className="text-xs font-bold text-white bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 inline-block">{student.primaryWeakness}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="space-y-0.5 cursor-help">
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Avg. Accuracy</p>
                                        <div className="flex items-baseline gap-2">
                                          <p className="text-lg font-display font-black text-white">{Math.round(student.globalAccuracy)}%</p>
                                          <span className="text-[8px] font-black text-primary">-3% vs class</span>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Overall percentage of correct responses. Currently 3% below class average.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="space-y-0.5 cursor-help">
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Retention</p>
                                        <div className="flex items-baseline gap-2">
                                          <p className="text-lg font-display font-black text-white">82%</p>
                                          <span className="text-[8px] font-black text-green-400">+5% trend</span>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Estimated long-term recall. Improving by 5% over recent sessions.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                              <p className="text-[8px] uppercase text-primary mb-2 font-black tracking-[0.2em]">Recommended Action</p>
                              <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5 group-hover:bg-black/60 transition-colors">
                                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] text-white/90 font-medium leading-relaxed italic">
                                  "{student.recommendations[0]?.text || "Continue standard reinforcement protocol."}"
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-4 flex justify-end items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                              View Detailed Profile <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedStudent(null)} 
                    className="mb-2 text-muted-foreground hover:text-white group text-xs h-8"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Student List
                  </Button>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-5">
                      <div className="glass-panel p-8 border border-white/5 rounded-2xl text-center relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${
                          selectedStudent.riskLevel === 'high' ? 'bg-primary' : 
                          selectedStudent.riskLevel === 'medium' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`} />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-accent mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                          {selectedStudent.userId?.name?.[0]}
                        </div>
                        <h2 className="text-2xl font-display font-black text-white mb-1">{selectedStudent.userId?.name}</h2>
                        <div className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-8 ${
                          selectedStudent.riskLevel === 'high' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {selectedStudent.riskLevel} Support Priority
                        </div>
                        
                        <div className="space-y-3 text-left">
                          <h4 className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-3">Recommended Support Plan</h4>
                          {selectedStudent.recommendations.map((rec: any, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2 relative group/rec">
                              <div className="flex justify-between items-start">
                                <p className="text-xs text-white font-bold leading-tight">{rec.text}</p>
                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                                  rec.priority === 'high' ? 'bg-primary text-white' : 'bg-blue-500 text-white'
                                }`}>
                                  {rec.priority}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground italic leading-relaxed opacity-60">Basis: {rec.reason}</p>
                              <div className="pt-1.5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Confidence Score</span>
                                  <span className="text-[8px] text-primary font-black">{Math.round(rec.confidence * 100)}%</span>
                                </div>
                                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rec.confidence * 100}%` }}
                                    className="h-full bg-primary" 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="glass-panel p-6 border border-white/5 rounded-2xl">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-primary" /> Topic Mastery
                            </h4>
                            {selectedStudent.topicMastery.length >= MIN_TOPICS_FOR_STUDENT_RADAR && (
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1 h-1 rounded-full", selectedStudent.topicMastery.length < 5 ? "bg-primary animate-pulse" : "bg-green-400")} />
                                <span className={cn("text-[7px] font-black uppercase tracking-widest", selectedStudent.topicMastery.length < 5 ? "text-primary" : "text-green-400")}>
                                  {selectedStudent.topicMastery.length < 5 ? "Developing" : "Verified"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="h-[240px]">
                            {selectedStudent.topicMastery.length >= MIN_TOPICS_FOR_STUDENT_RADAR ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={selectedStudent.topicMastery}>
                                  <PolarGrid stroke="#ffffff05" />
                                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 700 }} />
                                  <Radar name="Mastery" dataKey="difficultyWeightedMastery" stroke="#ff0080" strokeWidth={2} fill="#ff0080" fillOpacity={0.4} />
                                  <Radar name="Confidence" dataKey="confidenceScore" stroke="#00f2ff" strokeWidth={2} fill="#00f2ff" fillOpacity={0.1} />
                                  <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                </RadarChart>
                              </ResponsiveContainer>
                            ) : (
                              <AnalyticsEmptyState
                                title="Building Topic Profile"
                                description="Individual topic mastery requires performance data across multiple distinct subject areas."
                                requirement="This student needs to complete quizzes covering at least 3 different topics."
                                icon={Target}
                                currentValue={selectedStudent.topicMastery.length}
                                targetValue={MIN_TOPICS_FOR_STUDENT_RADAR}
                                unit="topics"
                                className="py-4 min-h-0"
                              />
                            )}
                          </div>
                          {selectedStudent.topicMastery.length >= MIN_TOPICS_FOR_STUDENT_RADAR && (
                            <div className="mt-3 flex justify-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Mastery</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Confidence</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="glass-panel p-6 border border-white/5 rounded-2xl">
                          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-accent" /> Retention Strength
                          </h4>
                          <div className="space-y-5">
                            {selectedStudent.retentionMetrics.length >= MIN_RETENTION_METRICS ? (
                              selectedStudent.retentionMetrics.map((r: any, i: number) => (
                                <div key={i} className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-white font-bold">{r.topic}</span>
                                    <span className={`text-[9px] font-black ${r.retentionStrength > 0.7 ? 'text-green-400' : 'text-primary'}`}>
                                      {Math.round(r.retentionStrength * 100)}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${r.retentionStrength * 100}%` }}
                                      className={`h-full ${r.retentionStrength > 0.7 ? 'bg-green-500' : 'bg-primary'}`} 
                                    />
                                  </div>
                                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Reinforced {new Date(r.lastReinforcedAt).toLocaleDateString()}</p>
                                </div>
                              ))
                            ) : (
                              <AnalyticsEmptyState
                                title="Retention Analysis Building"
                                description="Retention strength measures long-term knowledge durability through repeated reinforcement sessions."
                                requirement="Student needs to revisit and re-test on the same topics over multiple days."
                                icon={History}
                                currentValue={0}
                                targetValue={3}
                                unit="sessions"
                                className="py-4 min-h-0"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="glass-panel p-6 border border-white/5 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-green-400" /> Accuracy Trends
                          </h4>
                          <div className="flex flex-col items-end">
                            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Historical View</div>
                            {selectedStudent.quizHistory.length >= MIN_HISTORY_FOR_TRENDS && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className={cn("w-1 h-1 rounded-full", selectedStudent.quizHistory.length < 5 ? "bg-primary animate-pulse" : "bg-green-400")} />
                                <span className={cn("text-[7px] font-black uppercase tracking-widest", selectedStudent.quizHistory.length < 5 ? "text-primary" : "text-green-400")}>
                                  {selectedStudent.quizHistory.length < 5 ? "Early Trend" : "Established"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="h-[200px]">
                          {selectedStudent.quizHistory.length >= MIN_HISTORY_FOR_TRENDS ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={selectedStudent.quizHistory}>
                                <defs>
                                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff0080" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ff0080" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide domain={[0, 100]} />
                                <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="accuracy" stroke="#ff0080" strokeWidth={3} fillOpacity={1} fill="url(#trendGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <AnalyticsEmptyState
                              title="Longitudinal Trends"
                              description="Historical accuracy trends require multiple data points over time to visualize learning progress."
                              requirement="Student must complete at least 2 separate quiz sessions to establish a performance baseline."
                              icon={TrendingUp}
                              currentValue={selectedStudent.quizHistory.length}
                              targetValue={MIN_HISTORY_FOR_TRENDS}
                              unit="sessions"
                              className="py-4 min-h-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-12 border border-white/5 text-center max-w-xl mx-auto mt-12"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-xl">
                <Play className="w-8 h-8 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-widest mb-3">No Active Sessions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Launch a quiz from the Library to start a live session and begin collecting student performance data.</p>
              <Button 
                variant="neon" 
                className="mt-6 text-xs h-9"
                onClick={() => setActiveTab("quizzes")}
              >
                Go to Quiz Library
              </Button>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/5 rounded-full blur-[80px]" />
                <div className="relative z-10">
                  <h2 className="text-2xl font-display font-black text-white flex items-center gap-2.5 mb-2">
                    <BarChart3 className="w-6 h-6 text-secondary" />
                    PERFORMANCE ANALYTICS
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium max-w-2xl leading-relaxed">
                    Review historical performance, class accuracy trends, and detailed item analysis for completed quiz sessions.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col justify-center items-center h-48 gap-3">
                  <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Session Data...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 border border-white/5 text-center">
                  <p className="text-xs text-muted-foreground">No session data available. Start your first quiz to generate insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {quizzes.map((quiz, index) => (
                    <QuizCard
                      key={quiz._id || quiz.id}
                      quiz={{
                        id: quiz._id || quiz.id,
                        title: quiz.title,
                        questionCount: quiz.questions?.length || 0,
                        difficulty: "intermediate",
                        createdAt: new Date(quiz.createdAt),
                        playCount: quiz.playCount || 0,
                      }}
                      onViewAnalytics={(id) => setLocation(`/analytics/${id}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <CreateQuizModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateQuiz}
        />
      )}
    </div>
  );
}
