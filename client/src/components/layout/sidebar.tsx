import { motion } from "framer-motion";
import { BarChart3, Play, Settings, LogOut, Grid3X3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const tabs = [
    { id: "quizzes", label: "My Quizzes", icon: Grid3X3 },
    { id: "sessions", label: "Live Sessions", icon: Play },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-64 bg-background border-r border-white/10 backdrop-blur-sm flex flex-col relative overflow-hidden group"
    >
      {/* Glow effect */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-accent to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-white/10">
        <h2 className="text-2xl font-display font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          NEON<br />QUIZ
        </h2>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-2">Teacher Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-display font-bold uppercase tracking-wider text-sm transition-all relative group/btn ${isActive
                  ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,0,128,0.3)]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-r"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-6 border-t border-white/10 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-all text-sm font-semibold uppercase tracking-widest"
          data-testid="btn-settings"
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all text-sm font-semibold uppercase tracking-widest"
          data-testid="btn-logout-sidebar"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </motion.div>
  );
}
