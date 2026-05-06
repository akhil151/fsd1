import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { socket } from "@/lib/socket";
import { StudentAvatar } from "@/components/student/student-avatar";

export default function HostLobby({ params }: { params: { roomCode: string } }) {
    const [, setLocation] = useLocation();
    const roomCode = params.roomCode || "";
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        const handlePlayerJoined = (data: { student: any }) => {
            setStudents(prev => {
                if (prev.find((s) => s.id === data.student.id)) return prev;
                return [...prev, data.student];
            });
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
        <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#020205]">
            {/* Animated Background */}
            <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 px-10 py-8 border-b border-white/5 backdrop-blur-md bg-background/40 flex justify-between items-center"
            >
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <h1 className="text-2xl font-display font-black text-white uppercase tracking-widest">Waiting Room</h1>
                    </div>
                    <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-black opacity-60">
                        Status: Ready for Students
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleEndSession}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive border border-white/5 hover:bg-destructive/5 px-4 h-10 rounded-xl transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Terminate Lobby
                </Button>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col lg:flex-row p-10 gap-10 max-w-7xl mx-auto w-full">

                {/* Left Side: Room Code Info */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="lg:w-1/3 flex flex-col justify-center space-y-10"
                >
                    <div className="glass-panel rounded-[2.5rem] p-12 border border-white/5 text-center relative overflow-hidden bg-background/60 shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                        <h2 className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.4em] mb-10 opacity-60">
                            Join Code
                        </h2>
                        <div className="flex justify-center items-center min-h-[4rem] mb-10 overflow-hidden">
                            <div className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-[0.15em] text-white leading-none uppercase break-all">
                                {roomCode}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            Instruct students to enter this code at<br />
                            <span className="text-secondary font-black uppercase tracking-widest mt-2 block">/join</span>
                        </p>
                    </div>

                    <div className="glass-panel rounded-3xl p-8 border border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1 opacity-60">
                                Students Joined
                            </p>
                            <div className="text-4xl font-display font-black text-secondary">
                                {students.length}
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-xl">
                            <Users className="w-6 h-6 text-secondary" />
                        </div>
                    </div>

                    <Button
                        className="w-full h-20 bg-white text-black hover:bg-white/90 rounded-[1.5rem] font-display uppercase tracking-[0.25em] font-black text-sm group relative overflow-hidden transition-all duration-500 shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed"
                        disabled={students.length === 0}
                        onClick={handleStartQuiz}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            Start Quiz
                            <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </motion.div>

                {/* Right Side: Players Grid */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="lg:w-2/3 glass-panel rounded-[3rem] border border-white/5 p-10 flex flex-col bg-background/40 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                    
                    <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">
                                Student List
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-60">Real-time status</p>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/5 border border-secondary/20 backdrop-blur-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                            <span className="text-[10px] text-secondary font-black uppercase tracking-widest">
                                Waiting for Players
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                        {students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
                                    <Users className="w-8 h-8 text-white/10" />
                                </div>
                                <div>
                                    <p className="text-lg font-display font-black text-white/20 uppercase tracking-widest">No students joined yet</p>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto font-medium opacity-60">Students will appear here as they enter the join code.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-8">
                                {students.map((student, index) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 12,
                                            delay: index * 0.05
                                        }}
                                        className="group"
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
