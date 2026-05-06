import { motion } from "framer-motion";
import { LucideIcon, Database, Lock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsEmptyStateProps {
  title: string;
  description: string;
  requirement: string;
  icon?: LucideIcon;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  className?: string;
}

export function AnalyticsEmptyState({
  title,
  description,
  requirement,
  icon: Icon = Database,
  currentValue,
  targetValue,
  unit = "sessions",
  className
}: AnalyticsEmptyStateProps) {
  const hasProgress = currentValue !== undefined && targetValue !== undefined;
  const progressPercentage = hasProgress ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl h-full min-h-[280px] relative overflow-hidden group",
        className
      )}
    >
      {/* Background Polish */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
      <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-500" />
      
      <div className="relative z-10 space-y-5 max-w-sm">
        {/* Icon Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl">
            <Icon className="w-6 h-6 text-muted-foreground opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-white/10 flex items-center justify-center">
              <Lock className="w-2 h-2 text-primary" />
            </div>
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{title}</h3>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">
            "{description}"
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="h-px w-4 bg-white/10" />
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">
              Unlock Requirement
            </span>
            <div className="h-px w-4 bg-white/10" />
          </div>
          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide">
            {requirement}
          </p>
        </div>

        {/* Progress Indicator */}
        {hasProgress && (
          <div className="w-full space-y-2 pt-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-primary" />
                Data Readiness
              </span>
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                {currentValue} / {targetValue} {unit}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-gradient-to-r from-primary/40 to-primary"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
