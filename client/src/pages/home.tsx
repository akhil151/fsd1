import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, User, Lock, Mail, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <main className="z-10 w-full max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Hero Text */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary w-fit shadow-[0_0_15px_rgba(255,0,128,0.2)]">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase font-display">Multiplayer Beta is Live</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black leading-tight uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">Dominate the </span><br/>
            <span className="text-primary neon-text-primary">Neon</span>
            <span className="text-secondary neon-text-secondary">Quiz</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400"> Arena</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-lg font-medium leading-relaxed">
            Challenge your friends, test your knowledge, and climb the global leaderboards in fast-paced, real-time trivia battles.
          </p>

          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent/20 border border-accent/50 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(138,43,226,0.2)]">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-white">10K+</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Active Players</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Auth Component */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
            {/* Animated border glow effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 rounded-2xl transition-colors duration-500 pointer-events-none" />
            
            {/* Toggle Login/Register */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-8 relative border border-white/10">
              <motion.div
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-gradient-to-r from-primary/80 to-accent/80 rounded-lg shadow-[0_0_15px_rgba(255,0,128,0.4)]"
                layout
                initial={false}
                animate={{ 
                  x: isLogin ? 4 : "calc(100% + 4px)" 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-sm font-display uppercase tracking-widest font-bold z-10 transition-colors ${isLogin ? "text-white" : "text-gray-400 hover:text-white"}`}
                data-testid="btn-toggle-login"
              >
                Login
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-sm font-display uppercase tracking-widest font-bold z-10 transition-colors ${!isLogin ? "text-white" : "text-gray-400 hover:text-white"}`}
                data-testid="btn-toggle-register"
              >
                Register
              </button>
            </div>

            {/* Form Container */}
            <div className="relative min-h-[300px]">
              <AnimatePresence mode="wait">
                <motion.form
                  key={isLogin ? "login" : "register"}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5 absolute inset-0"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="space-y-4">
                    {!isLogin && (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="PLAYER TAG" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:neon-border-secondary focus:border-secondary transition-all font-sans text-lg"
                          data-testid="input-username"
                        />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        placeholder="EMAIL ADDRESS" 
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:neon-border-secondary focus:border-secondary transition-all font-sans text-lg"
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="password" 
                        placeholder="PASSWORD" 
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:neon-border-secondary focus:border-secondary transition-all font-sans text-lg"
                        data-testid="input-password"
                      />
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex justify-end">
                      <a href="#" className="text-sm text-secondary hover:text-primary transition-colors font-semibold">Forgot Password?</a>
                    </div>
                  )}

                  <Button 
                    className="w-full h-14 mt-auto bg-white text-black hover:bg-white/90 rounded-xl font-display uppercase tracking-widest text-lg font-bold group relative overflow-hidden"
                    data-testid="btn-submit-auth"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLogin ? "Initialize Link" : "Create Profile"}
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary opacity-0 group-hover:opacity-20 transition-opacity" />
                  </Button>
                </motion.form>
              </AnimatePresence>
            </div>
            
          </div>
        </motion.div>
      </main>
    </div>
  );
}
