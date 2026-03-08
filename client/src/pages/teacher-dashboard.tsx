import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Play, Users, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { QuizCard } from "@/components/teacher/quiz-card";
import { CreateQuizModal } from "@/components/teacher/create-quiz-modal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { socket } from "@/lib/socket";

export default function TeacherDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("quizzes");
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  useEffect(() => {
    if (activeTab === "quizzes") {
      loadQuizzes();
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
    // Ideally map the quiz id to the hosted room state, for now we just create a room
    console.log("Teacher is hosting room for quiz:", id);
    socket.emit("host_room", { quizId: id });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-background/50"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-display font-black text-white mb-1">MISSION CONTROL</h1>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Instructor Portal</p>
            </div>
            {activeTab === "quizzes" && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_20px_rgba(255,0,128,0.5)] text-white rounded-xl h-12 px-6 font-display uppercase tracking-widest font-bold group"
                data-testid="btn-create-quiz"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Quiz
              </Button>
            )}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="relative z-10 p-8 max-w-7xl mx-auto">
          {activeTab === "quizzes" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Quizzes", value: quizzes.length },
                  { label: "Total Plays", value: quizzes.reduce((sum, q) => sum + q.playCount, 0) },
                  { label: "Active Students", value: 234 },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="glass-panel rounded-xl p-6 border border-primary/20 neon-border-primary"
                  >
                    <p className="text-muted-foreground text-sm uppercase font-semibold tracking-widest mb-2">{stat.label}</p>
                    <p className="text-4xl font-display font-black neon-text-primary">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Quizzes Grid */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-6 text-white">YOUR QUIZZES</h2>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center py-20 glass-panel rounded-xl border border-white/10">
                    <p className="text-muted-foreground text-lg mb-4">You haven't created any quizzes yet.</p>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create First Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz, index) => {
                      const quizProps = {
                        id: quiz._id || quiz.id,
                        title: quiz.title,
                        questionCount: quiz.questions?.length || 0,
                        difficulty: "intermediate", // default until model provides it or derived
                        createdAt: new Date(quiz.createdAt),
                        playCount: quiz.playCount || 0,
                      };
                      return (
                        <motion.div
                          key={quizProps.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                        >
                          <QuizCard quiz={quizProps} onDelete={handleDeleteQuiz} onLaunch={handleLaunchQuiz} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "sessions" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl p-8 border border-white/10 text-center"
            >
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-display font-bold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground">Start a quiz to create a live session</p>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl p-8 border border-white/10 text-center"
            >
              <p className="text-muted-foreground">Analytics coming soon...</p>
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
