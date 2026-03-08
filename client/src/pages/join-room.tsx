import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      // Navigate to waiting lobby with room code
      console.log("Joining room:", roomCode);
      // This would normally use wouter's useLocation to navigate
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-secondary/30 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Header with Logout */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 right-6 z-20"
      >
        <Button 
          variant="outline" 
          className="flex items-center gap-2 border-white/20 hover:border-white/50 text-muted-foreground hover:text-white"
          data-testid="btn-logout"
        >
          <LogOut className="w-4 h-4" />
          Exit
        </Button>
      </motion.div>

      {/* Main Content */}
      <main className="z-10 flex flex-col items-center justify-center max-w-2xl w-full px-6">
        
        {/* Hero Text */}
        <motion.div 
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl md:text-7xl font-display font-black mb-4 leading-tight">
            <span className="text-secondary neon-text-secondary">ENTER</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">THE ARENA</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto">
            Ask your instructor for the room code and prepare to dominate the trivia battle.
          </p>
        </motion.div>

        {/* Code Input Section */}
        <motion.form
          onSubmit={handleJoin}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="space-y-6">
            {/* Code Input */}
            <div className="relative">
              <div className={`glass-panel rounded-2xl p-8 border-2 transition-all duration-300 ${
                isHovered 
                  ? "neon-border-secondary border-secondary shadow-[0_0_25px_rgba(0,255,255,0.3)]" 
                  : "border-white/10"
              }`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              >
                <label className="block text-sm uppercase font-display font-bold tracking-widest text-muted-foreground mb-4">
                  Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="000000"
                  className="w-full bg-transparent text-center text-6xl font-display font-black text-secondary tracking-[0.5em] focus:outline-none placeholder:text-gray-600 neon-text-secondary"
                  data-testid="input-room-code"
                />
                
                {/* Character count indicators */}
                <div className="flex gap-2 mt-6 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`h-1 w-3 rounded-full transition-all ${
                        i < roomCode.length 
                          ? "bg-secondary shadow-[0_0_10px_rgba(0,255,255,0.6)]" 
                          : "bg-white/10"
                      }`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Join Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={roomCode.length !== 6}
                className={`w-full h-16 rounded-xl font-display uppercase tracking-widest text-lg font-black group overflow-hidden relative transition-all ${
                  roomCode.length === 6
                    ? "bg-white text-black hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                    : "bg-white/30 text-white/50 cursor-not-allowed"
                }`}
                data-testid="btn-join-room"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Battle Commence
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-20 transition-opacity" />
              </Button>
            </motion.div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">
                6-digit code provided by your instructor
              </p>
            </div>
          </div>
        </motion.form>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 grid grid-cols-3 gap-4 w-full"
        >
          {[
            { title: "Real-Time", desc: "Live competition" },
            { title: "Ranked", desc: "Global leaderboard" },
            { title: "Instant", desc: "Results displayed" },
          ].map((item, i) => (
            <div key={i} className="glass-panel rounded-xl p-4 border border-white/10 text-center">
              <p className="text-sm font-display font-bold text-secondary mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
