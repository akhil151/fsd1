import { motion } from "framer-motion";
import { Play, Trash2, Eye, Calendar, Layers, Activity } from "lucide-react";

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    questionCount: number;
    difficulty: string;
    createdAt: Date;
    playCount: number;
  };
  onDelete?: (id: string) => void;
  onLaunch?: (id: string) => void;
  onViewAnalytics?: (id: string) => void;
}

export function QuizCard({ quiz, onDelete, onLaunch, onViewAnalytics }: QuizCardProps) {
  const difficultyColors = {
    beginner: "text-green-400",
    intermediate: "text-secondary",
    advanced: "text-accent",
    expert: "text-primary",
  };

  const difficultyBgColors = {
    beginner: "bg-green-400/10 border-green-400/20",
    intermediate: "bg-secondary/10 border-secondary/20",
    advanced: "bg-accent/10 border-accent/20",
    expert: "bg-primary/10 border-primary/20",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <div className="glass-panel rounded-2xl p-6 h-full flex flex-col border border-white/5 hover:border-white/20 transition-all duration-500 hover:shadow-2xl relative overflow-hidden bg-background/40">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />

        {/* Header */}
        <div className="mb-4 flex-1 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-[0.2em] ${difficultyBgColors[quiz.difficulty as keyof typeof difficultyBgColors]} ${difficultyColors[quiz.difficulty as keyof typeof difficultyColors]}`}>
              {quiz.difficulty}
            </div>
            <div className="text-[8px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-1 opacity-40">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(quiz.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <h3 className="text-lg font-display font-black text-white mb-1 leading-tight group-hover:text-primary transition-colors">
            {quiz.title}
          </h3>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-white/5 relative z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-2.5 h-2.5 opacity-40" />
              <p className="text-[8px] uppercase font-black tracking-widest opacity-60">Questions</p>
            </div>
            <p className="text-lg font-display font-black text-white">{quiz.questionCount}</p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="w-2.5 h-2.5 opacity-40" />
              <p className="text-[8px] uppercase font-black tracking-widest opacity-60">Completions</p>
            </div>
            <p className="text-lg font-display font-black text-secondary">{quiz.playCount}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 relative z-10">
          {onLaunch && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLaunch?.(quiz.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black py-2.5 rounded-lg font-display font-black uppercase tracking-widest text-[9px] hover:bg-white/90 transition-all shadow-lg"
              data-testid={`btn-play-quiz-${quiz.id}`}
            >
              <Play className="w-3 h-3 fill-current" />
              Start Session
            </motion.button>
          )}

          {onViewAnalytics && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewAnalytics?.(quiz.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-secondary/10 border border-secondary/30 text-secondary py-2.5 rounded-lg font-display font-black uppercase tracking-widest text-[9px] hover:bg-secondary hover:text-black transition-all"
              data-testid={`btn-view-quiz-${quiz.id}`}
            >
              <Eye className="w-3 h-3" />
              Analytics
            </motion.button>
          )}

          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDelete?.(quiz.id)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/5 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
              data-testid={`btn-delete-quiz-${quiz.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
