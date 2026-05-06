import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Play, LogOut, Grid3X3, Brain, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const tabs = [
    { id: "quizzes", label: "Quiz Library", icon: Grid3X3 },
    { id: "intelligence", label: "Student Insights", icon: Brain },
    { id: "sessions", label: "Live Sessions", icon: Play },
    { id: "analytics", label: "Session Results", icon: BarChart3 },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col relative overflow-hidden group">
      {/* Glow effect */}
      <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary via-accent to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-white/5">
        <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter leading-none">
          Neon<br /><span className="text-primary neon-text-primary">Arena</span>
        </h2>
        <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] font-black mt-3 opacity-60">Version 2.0.4</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl font-display font-black uppercase tracking-[0.15em] text-[9px] transition-all relative group/btn ${isActive
                  ? "bg-white/5 text-white shadow-xl border border-white/5"
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.02]"
                }`}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'opacity-40'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(255,0,128,0.8)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-6 border-t border-white/5 bg-black/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all text-[9px] font-black uppercase tracking-[0.15em]"
          data-testid="btn-logout-sidebar"
        >
          <LogOut className="w-3.5 h-3.5 opacity-40" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b border-white/5 bg-background/80 backdrop-blur-md z-40 flex items-center justify-between px-5">
        <h2 className="text-lg font-display font-black text-white uppercase tracking-tighter">
          Neon<span className="text-primary">Arena</span>
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-9 w-9">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex w-64 bg-background border-r border-white/5 backdrop-blur-md flex-col sticky top-0 h-screen"
      >
        {sidebarContent}
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-80 bg-background border-r border-white/5 z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
