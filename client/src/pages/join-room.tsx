import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  useEffect(() => {
    const handleJoinSuccess = (data: { roomCode: string }) => {
      setJoinError(null);
      localStorage.setItem("currentRoom", data.roomCode);
      setLocation(`/lobby/${data.roomCode}`);
    };

    // Show a visible error when the server rejects the join request.
    // Previously this fired silently — the student saw no feedback.
    const handleSocketError = (data: { message: string }) => {
      setJoinError(data.message || "Failed to join room. Please try again.");
    };

    socket.on("joined_successfully", handleJoinSuccess);
    socket.on("error", handleSocketError);

    return () => {
      socket.off("joined_successfully", handleJoinSuccess);
      socket.off("error", handleSocketError);
    };
  }, [setLocation]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 8) {
      setJoinError(null);
      console.log("Joining room:", roomCode);
      socket.emit("join_room", {
        roomCode,
        studentDetails: {
          name: user?.name || "Player",
          avatar: (user?.name || "PL").substring(0, 2).toUpperCase(),
        },
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-[#020205]">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header with Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-8 right-8 z-20"
      >
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white border border-white/5 hover:bg-white/5 px-4 h-10 rounded-xl"
          data-testid="btn-logout"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </Button>
      </motion.div>

      {/* Main Content */}
      <main className="z-10 flex flex-col items-center justify-center max-w-2xl w-full px-6 py-20">

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-secondary w-fit mb-6 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.2em] uppercase font-display">Neural Link Ready</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-black mb-6 leading-[0.85] uppercase tracking-tighter">
            <span className="text-secondary neon-text-secondary">Enter</span>
            <br />
            <span className="text-white">The Arena</span>
          </h1>
          <p className="text-base text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Synchronize with your deployment room to begin the evaluation session.
          </p>
        </motion.div>

        {/* Code Input Section */}
        <motion.form
          onSubmit={handleJoin}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="space-y-8">
            {/* Code Input */}
            <div className="relative group">
              <div className={`glass-panel rounded-[2.5rem] p-10 border-2 transition-all duration-500 bg-background/60 shadow-2xl ${isHovered || roomCode.length > 0
                  ? "border-secondary/50 shadow-[0_0_40px_rgba(0,255,255,0.15)]"
                  : "border-white/5"
                }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="text-center mb-8">
                  <label className="text-[10px] uppercase font-black tracking-[0.3em] text-muted-foreground opacity-60">
                    Deployment Room Code
                  </label>
                </div>
                
                <input
                  type="text"
                  maxLength={8}
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    if (joinError) setJoinError(null);
                  }}
                  autoFocus
                  placeholder="00000000"
                  className="w-full bg-transparent text-center text-6xl font-display font-black text-white tracking-[0.2em] focus:outline-none placeholder:text-white/5 uppercase pr-[0.2em]"
                  data-testid="input-room-code"
                />

                {/* Character count indicators */}
                <div className="flex gap-2.5 mt-10 justify-center">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i < roomCode.length
                          ? "w-4 bg-secondary shadow-[0_0_15px_rgba(0,255,255,0.8)]"
                          : "w-2 bg-white/5"
                        }`}
                    />
                  ))}
                </div>
                
                {/* Error Banner */}
                <AnimatePresence>
                  {joinError && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 text-center text-[10px] text-primary font-black uppercase tracking-[0.2em] animate-pulse"
                    >
                      {joinError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Join Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={roomCode.length !== 8}
                className={`w-full h-16 rounded-2xl font-display uppercase tracking-[0.25em] text-sm font-black group overflow-hidden relative transition-all duration-500 ${roomCode.length === 8
                    ? "bg-white text-black hover:shadow-2xl"
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                  }`}
                data-testid="btn-join-room"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Initiate Link
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-secondary via-accent to-primary opacity-0 group-hover:opacity-10 transition-opacity" />
              </Button>
            </motion.div>
          </div>
        </motion.form>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-24 grid grid-cols-3 gap-6 w-full max-w-xl"
        >
          {[
            { title: "SYNC", desc: "Real-time Telemetry" },
            { title: "COMPETE", desc: "Neural Ranking" },
            { title: "EVOLVE", desc: "Instant Analysis" },
          ].map((item, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 border border-white/5 text-center flex flex-col justify-center gap-1 hover:border-white/20 transition-colors">
              <p className="text-[10px] font-black font-display text-secondary tracking-widest uppercase">{item.title}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight opacity-60">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
