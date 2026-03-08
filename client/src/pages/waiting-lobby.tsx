import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/student/student-avatar";
import { socket } from "@/lib/socket";
import { useLocation } from "wouter";

export default function WaitingLobby() {
  const [students, setStudents] = useState<any[]>([]);
  const isHost = false;
  const [, setLocation] = useLocation();
  const roomCode = localStorage.getItem("currentRoom") || "UNKNOWN";

  // Listen for players joining
  useEffect(() => {
    // If we have a stored room code, we could also emit a rejoin or just join the socket room again
    // But since join_room was already emitted on the JoinRoom page, we are in the room.

    // Add ourselves to the list immediately if we want, but the server broadcasts player_joined to everyone 
    // including the sender, so we should receive it.

    const handlePlayerJoined = (data: { student: any }) => {
      setStudents(prev => {
        if (prev.find(s => s.id === data.student.id)) return prev;
        return [...prev, data.student];
      });
    };

    const handleQuestionActive = (data: any) => {
      // Persist the first question payload so the Arena view can hydrate immediately.
      localStorage.setItem("currentQuestionPayload", JSON.stringify(data));
      setLocation("/arena");
    };

    socket.on("player_joined", handlePlayerJoined);
    socket.on("question_active", handleQuestionActive);

    return () => {
      socket.off("player_joined", handlePlayerJoined);
      socket.off("question_active", handleQuestionActive);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-background/50 flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-display font-black text-white">ROOM: {roomCode}</h1>
          <p className="text-xs text-secondary uppercase tracking-widest font-semibold mt-1">Waiting for Host...</p>
        </div>
        {!isHost && (
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 border-white/20 hover:border-white/50"
            data-testid="btn-exit-lobby"
          >
            <LogOut className="w-4 h-4" />
            Leave Lobby
          </Button>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8 py-12">

        {/* Status Animation */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-secondary/30 bg-secondary/10 mb-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="w-5 h-5 text-secondary" />
            </motion.div>
            <span className="text-secondary font-display font-bold uppercase tracking-wide">STANDBY MODE ACTIVE</span>
          </motion.div>

          <h2 className="text-5xl md:text-6xl font-display font-black leading-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">
              AWAITING SIGNAL
            </span>
          </h2>

          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-lg text-muted-foreground font-medium"
          >
            Host is preparing the challenge...
          </motion.p>
        </motion.div>

        {/* Students Grid */}
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <p className="text-sm uppercase font-display font-bold tracking-widest text-muted-foreground mb-4">
              Players Assembled ({students.length}/4)
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: index * 0.15,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                >
                  <StudentAvatar student={student} isHost={isHost && student.id === "1"} />
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 4 - students.length) }).map((_, index) => (
                <motion.div
                  key={`empty-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (students.length + index) * 0.15 }}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center"
                >
                  <div className="text-center">
                    <p className="text-2xl text-white/30">?</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Host Controls */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 w-full max-w-md"
          >
            <Button
              className="w-full h-14 bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-[0_0_25px_rgba(255,0,128,0.5)] text-white rounded-xl font-display uppercase tracking-widest font-bold group"
              data-testid="btn-start-quiz"
            >
              <Zap className="w-5 h-5 mr-2" />
              Launch Quiz
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              {students.length} of 4 players ready
            </p>
          </motion.div>
        )}

        {/* Player Status */}
        {!isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5">
              <motion.div
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm text-muted-foreground font-semibold">Connected & Ready</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
