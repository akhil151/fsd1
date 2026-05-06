import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/student/student-avatar";
import { socket } from "@/lib/socket";
import { useLocation } from "wouter";

export default function WaitingLobby({ params }: { params: { roomCode: string } }) {
  const [students, setStudents] = useState<any[]>([]);
  const isHost = false;
  const [, setLocation] = useLocation();
  const roomCode = params.roomCode || localStorage.getItem("currentRoom") || "UNKNOWN";

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
      setLocation(`/arena/${roomCode}`);
    };

    const handleRoomClosed = (data: { reason: string }) => {
      console.log("Room closed:", data.reason);
      // Clean up and redirect to join page
      localStorage.removeItem("currentRoom");
      localStorage.removeItem("currentQuestionPayload");
      setLocation("/join");
    };

    socket.on("player_joined", handlePlayerJoined);
    socket.on("question_active", handleQuestionActive);
    socket.on("room_closed", handleRoomClosed);

    return () => {
      socket.off("player_joined", handlePlayerJoined);
      socket.off("question_active", handleQuestionActive);
      socket.off("room_closed", handleRoomClosed);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#020205]">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 px-10 py-8 border-b border-white/5 backdrop-blur-md bg-background/40 flex justify-between items-center"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-widest">DEPLOYMENT ROOM: {roomCode}</h1>
          </div>
          <p className="text-[10px] text-secondary uppercase tracking-[0.3em] font-black opacity-60">Synchronizing Neural Links...</p>
        </div>
        {!isHost && (
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem("currentRoom");
              localStorage.removeItem("currentQuestionPayload");
              setLocation("/");
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white border border-white/5 hover:bg-white/5 px-4 h-10 rounded-xl"
            data-testid="btn-exit-lobby"
          >
            <LogOut className="w-4 h-4" />
            Terminate Link
          </Button>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8 py-12 max-w-5xl mx-auto w-full">

        {/* Status Animation */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border border-secondary/20 bg-secondary/5 mb-10 backdrop-blur-md shadow-2xl"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="w-5 h-5 text-secondary" />
            </motion.div>
            <span className="text-[10px] text-secondary font-black uppercase tracking-[0.3em]">Neural Interface Standby</span>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-display font-black text-white leading-none tracking-tighter uppercase mb-6">
            Waiting for Host
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto font-medium leading-relaxed">
            You are connected to the quiz room. Please wait for the teacher to start the session.
          </p>
        </motion.div>

        {/* Students Grid */}
        <div className="w-full max-w-3xl glass-panel p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-accent to-primary opacity-20" />
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">
                  Other Students
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-60">
                  Currently in the lobby
                </p>
              </div>
              <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-secondary" 
                  animate={{ width: `${(students.length / 4) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 150,
                    damping: 15
                  }}
                  className="group"
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
                  transition={{ delay: (students.length + index) * 0.1 }}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                    <p className="text-xl text-white/20 font-black">?</p>
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/10">Awaiting Student</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Player Status */}
        {!isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Connected to Session</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
