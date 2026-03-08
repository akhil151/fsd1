import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { socket } from "@/lib/socket";
import { StudentAvatar } from "@/components/student/student-avatar";

export default function HostLobby() {
    const [location, setLocation] = useLocation();
    const roomCode = location.split("/").pop() || "";
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        const handlePlayerJoined = (data: { student: any }) => {
            setStudents(prev => [...prev, data.student]);
        };

        socket.on("player_joined", handlePlayerJoined);

        return () => {
            socket.off("player_joined", handlePlayerJoined);
        };
    }, []);

    const handleStartQuiz = () => {
        socket.emit("start_quiz", { roomCode });
        // Move host into Match Control immediately so the first question broadcast is received there.
        setLocation(`/match-control/${roomCode}`);
    };

    const handleEndSession = () => {
        // Navigate back to dashboard, optionally close room on server
        setLocation("/dashboard");
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            {/* Animated Background */}
            <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-background/50 flex justify-between items-center"
            >
                <div>
                    <h1 className="text-3xl font-display font-black text-white">ACTIVE LOBBY</h1>
                    <p className="text-sm text-primary uppercase tracking-widest font-semibold mt-1">
                        Host Controls
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleEndSession}
                    className="flex items-center gap-2 border-white/20 hover:border-destructive/50 hover:text-destructive"
                >
                    <LogOut className="w-4 h-4" />
                    End Session
                </Button>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col lg:flex-row p-8 gap-8 max-w-7xl mx-auto w-full">

                {/* Left Side: Room Code Info */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="lg:w-1/3 flex flex-col justify-center space-y-8"
                >
                    <div className="glass-panel rounded-2xl p-10 border border-primary/30 neon-border-primary text-center">
                        <h2 className="text-sm uppercase font-display font-bold text-muted-foreground tracking-widest mb-6">
                            Join Code
                        </h2>
                        <div className="text-6xl sm:text-7xl font-display font-black tracking-[0.2em] text-white neon-text-primary mb-6">
                            {roomCode}
                        </div>
                        <p className="text-lg text-muted-foreground font-medium">
                            Instruct students to go to <span className="text-white font-bold">/join</span>
                        </p>
                    </div>

                    <div className="glass-panel rounded-xl p-6 border border-white/10 text-center">
                        <p className="text-sm uppercase font-display font-bold text-muted-foreground tracking-widest mb-2">
                            Players Joined
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Users className="w-8 h-8 text-secondary" />
                            <span className="text-5xl font-display font-black text-secondary">
                                {students.length}
                            </span>
                        </div>
                    </div>

                    <Button
                        className="w-full h-16 bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] text-white rounded-xl font-display uppercase tracking-widest font-bold text-lg group"
                        disabled={students.length === 0}
                        onClick={handleStartQuiz}
                    >
                        Start Quiz
                        <CheckCircle2 className="w-5 h-5 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </motion.div>

                {/* Right Side: Players Grid */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="lg:w-2/3 glass-panel rounded-2xl border border-white/10 p-8 flex flex-col"
                >
                    <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                        <h3 className="text-2xl font-display font-bold text-white">
                            ASSEMBLED PLAYERS
                        </h3>
                        <span className="text-sm text-secondary font-bold uppercase tracking-widest bg-secondary/10 px-3 py-1 rounded-full">
                            Waiting for players...
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50 space-y-4">
                                <Users className="w-16 h-16" />
                                <p className="text-lg font-medium">The arena is empty.<br />Students will appear here as they join.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                                {students.map((student, index) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 12
                                        }}
                                    >
                                        <StudentAvatar student={student} isHost={false} />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
