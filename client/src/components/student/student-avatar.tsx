import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface StudentAvatarProps {
  student: {
    id: string;
    name: string;
    avatar: string;
  };
  isHost?: boolean;
}

export function StudentAvatar({ student, isHost }: StudentAvatarProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-2"
    >
      <div className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
        isHost 
          ? "border-primary shadow-[0_0_20px_rgba(255,0,128,0.5)] bg-primary/20" 
          : "border-white/20 bg-black/50 hover:border-secondary"
      }`}>
        {/* Avatar Circle */}
        <div className="w-full h-full flex items-center justify-center relative">
          <motion.div
            className={`text-3xl font-display font-black ${
              isHost ? "text-primary neon-text-primary" : "text-white"
            }`}
            animate={isHost ? { scale: [1, 1.1, 1] } : {}}
            transition={isHost ? { duration: 2, repeat: Infinity } : {}}
          >
            {student.avatar}
          </motion.div>
          
          {/* Host Crown */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-1 right-1 bg-primary/80 rounded-full p-1 shadow-[0_0_10px_rgba(255,0,128,0.4)]"
            >
              <Crown className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </div>

        {/* Shimmer Effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      </div>

      {/* Name */}
      <p className="text-center text-xs font-semibold text-white truncate w-full px-1">
        {student.name}
      </p>
      {isHost && (
        <p className="text-xs text-primary font-display font-bold uppercase tracking-wider">HOST</p>
      )}
    </motion.div>
  );
}
