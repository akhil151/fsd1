import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Play, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { QuizCard } from "@/components/teacher/quiz-card";
import { CreateQuizModal } from "@/components/teacher/create-quiz-modal";
import { Button } from "@/components/ui/button";

// Mock data for quizzes
const mockQuizzes = [
  {
    id: "1",
    title: "React Fundamentals",
    questionCount: 12,
    difficulty: "intermediate",
    createdAt: new Date("2025-03-01"),
    playCount: 234,
  },
  {
    id: "2",
    title: "TypeScript Basics",
    questionCount: 10,
    difficulty: "beginner",
    createdAt: new Date("2025-02-28"),
    playCount: 189,
  },
  {
    id: "3",
    title: "Advanced GraphQL",
    questionCount: 15,
    difficulty: "expert",
    createdAt: new Date("2025-02-20"),
    playCount: 456,
  },
  {
    id: "4",
    title: "Web Performance Optimization",
    questionCount: 18,
    difficulty: "advanced",
    createdAt: new Date("2025-02-15"),
    playCount: 123,
  },
];

export default function TeacherDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("quizzes");
  const [quizzes, setQuizzes] = useState(mockQuizzes);

  const handleCreateQuiz = (quizData: any) => {
    const newQuiz = {
      id: String(quizzes.length + 1),
      title: quizData.title,
      questionCount: quizData.questions.length,
      difficulty: "intermediate",
      createdAt: new Date(),
      playCount: 0,
    };
    setQuizzes([newQuiz, ...quizzes]);
    setShowCreateModal(false);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.map((quiz, index) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <QuizCard quiz={quiz} />
                    </motion.div>
                  ))}
                </div>
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
