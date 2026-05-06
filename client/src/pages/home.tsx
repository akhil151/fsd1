import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, User, Lock, Mail, ChevronRight, Zap, Loader2, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("teacher");

  const { login, register, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // If already authenticated (e.g. page refresh with valid token), redirect based on role.
  // Must be in useEffect — never call setLocation during render.
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "teacher") {
        setLocation("/dashboard");
      } else {
        setLocation("/join");
      }
    }
  }, [isAuthenticated, user, setLocation]);

  // Reset form fields when switching tabs to prevent stale values
  // from causing extra re-renders or unexpected validation warnings.
  const handleToggle = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let loggedInUser;
      if (isLogin) {
        loggedInUser = await login({ email, password });
      } else {
        loggedInUser = await register({ email, password, name, role });
      }

      toast({
        title: isLogin ? "Welcome Back" : "Account Created",
        description: isLogin
          ? "Successfully signed in to Neon Arena."
          : `Your ${loggedInUser.role} account is ready to use.`,
      });

      if (loggedInUser.role === "teacher") {
        setLocation("/dashboard");
      } else {
        setLocation("/join");
      }
    } catch (err: any) {
      toast({
        title: "Sign In Failed",
        description: err.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Password Recovery",
      description: "Recovery features are limited in the beta environment. Please contact support.",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-[#020205]">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <main className="z-10 w-full max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Column: Hero Text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary w-fit backdrop-blur-md shadow-[0_0_20px_rgba(255,0,128,0.15)]">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase font-display">Status: Operational</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl md:text-7xl font-black leading-none uppercase tracking-tighter">
              <span className="text-white">The </span>
              <span className="text-primary neon-text-primary">Neon</span><br />
              <span className="text-secondary neon-text-secondary">Quiz</span>
              <span className="text-white"> Arena</span>
            </h1>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </div>
        </motion.div>

        {/* Right Column: Auth Component */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Toggle Login/Register */}
            <div className="flex bg-white/5 p-1 rounded-xl mb-8 relative border border-white/10">
              <motion.div
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-gradient-to-r from-primary to-accent rounded-lg shadow-[0_0_20px_rgba(255,0,128,0.3)] pointer-events-none"
                initial={false}
                animate={{
                  left: isLogin ? "4px" : "calc(50% + 4px)",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
              <button
                onClick={() => handleToggle(true)}
                className={`flex-1 py-2.5 text-[10px] font-display uppercase tracking-[0.2em] font-black z-10 transition-colors ${isLogin ? "text-white" : "text-gray-500 hover:text-white"}`}
                data-testid="btn-toggle-login"
                type="button"
              >
                Sign In
              </button>
              <button
                onClick={() => handleToggle(false)}
                className={`flex-1 py-2.5 text-[10px] font-display uppercase tracking-[0.2em] font-black z-10 transition-colors ${!isLogin ? "text-white" : "text-gray-500 hover:text-white"}`}
                data-testid="btn-toggle-register"
                type="button"
              >
                Register
              </button>
            </div>

            {/* Form Container */}
            <div className="relative min-h-[300px]">
              <AnimatePresence mode="wait">
                <motion.form
                  key={isLogin ? "login" : "register"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-5"
                  onSubmit={handleSubmit}
                >
                  <div className="space-y-4">
                    {!isLogin && (
                      <>
                        {/* Role Toggle */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-2.5">
                          <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-black pl-1.5">
                            Account Type
                          </span>
                          <div className="inline-flex bg-white/5 rounded-lg p-1 border border-white/5">
                            <button
                              type="button"
                              onClick={() => setRole("student")}
                              className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                                role === "student"
                                  ? "bg-secondary text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                                  : "text-muted-foreground hover:text-white"
                              }`}
                              disabled={isSubmitting}
                            >
                              Student
                            </button>
                            <button
                              type="button"
                              onClick={() => setRole("teacher")}
                              className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                                role === "teacher"
                                  ? "bg-primary text-white shadow-[0_0_15px_rgba(255,0,128,0.4)]"
                                  : "text-muted-foreground hover:text-white"
                              }`}
                              disabled={isSubmitting}
                            >
                              Teacher
                            </button>
                          </div>
                        </div>

                        {/* Player Tag */}
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-secondary transition-colors" />
                          <input
                            type="text"
                            placeholder="DISPLAY NAME"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required={!isLogin}
                            disabled={isSubmitting}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all font-sans text-xs tracking-wide"
                            data-testid="input-username"
                          />
                        </div>
                      </>
                    )}

                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-secondary transition-colors" />
                      <input
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all font-sans text-xs tracking-wide"
                        data-testid="input-email"
                      />
                    </div>

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-secondary transition-colors" />
                      <input
                        type="password"
                        placeholder="PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all font-sans text-xs tracking-wide"
                        data-testid="input-password"
                      />
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex justify-end">
                      <button 
                        onClick={handleForgotPassword}
                        className="text-[9px] text-secondary hover:text-primary transition-colors font-black uppercase tracking-widest"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-xl font-display uppercase tracking-[0.2em] text-[10px] font-black group relative overflow-hidden transition-all duration-500"
                    data-testid="btn-submit-auth"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {isLogin ? "Sign In" : "Create Account"}
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary opacity-0 group-hover:opacity-10 transition-opacity" />
                  </Button>
                </motion.form>
              </AnimatePresence>
            </div>

            <p className="mt-6 text-center text-[9px] text-gray-600 font-bold uppercase tracking-widest">
              Authorized personnel only. Secure encrypted connection.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
