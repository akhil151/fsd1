import { motion } from "framer-motion";
import { Play, Trash2, Eye } from "lucide-react";

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
}

export function QuizCard({ quiz, onDelete, onLaunch }: QuizCardProps) {
  const difficultyColors = {
    beginner: "text-green-400",
    intermediate: "text-yellow-400",
    advanced: "text-orange-400",
    expert: "text-red-400",
  };

  const difficultyBgColors = {
    beginner: "bg-green-400/20 border-green-400/50",
    intermediate: "bg-yellow-400/20 border-yellow-400/50",
    advanced: "bg-orange-400/20 border-orange-400/50",
    expert: "bg-red-400/20 border-red-400/50",
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group h-full"
    >
      <div className="glass-panel rounded-xl p-6 h-full flex flex-col border border-white/10 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(255,0,128,0.2)]">

        {/* Header */}
        <div className="mb-4 flex-1">
          <h3 className="text-xl font-display font-black text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {quiz.title}
          </h3>

          {/* Difficulty Badge */}
          <div className={`inline-block px-3 py-1 rounded-full border text-xs font-display font-bold uppercase tracking-wider ${difficultyBgColors[quiz.difficulty as keyof typeof difficultyBgColors]} ${difficultyColors[quiz.difficulty as keyof typeof difficultyColors]}`}>
            {quiz.difficulty}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-widest mb-1">Questions</p>
            <p className="text-2xl font-display font-black text-white">{quiz.questionCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-widest mb-1">Plays</p>
            <p className="text-2xl font-display font-black text-secondary">{quiz.playCount}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLaunch?.(quiz.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-lg font-display font-bold uppercase tracking-wider text-xs hover:shadow-[0_0_15px_rgba(255,0,128,0.4)] transition-all"
            data-testid={`btn-play-quiz-${quiz.id}`}
          >
            <Play className="w-4 h-4" />
            Launch
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-2.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all"
            data-testid={`btn-view-quiz-${quiz.id}`}
          >
            <Eye className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete?.(quiz.id)}
            className="px-3 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
            data-testid={`btn-delete-quiz-${quiz.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
