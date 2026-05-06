import { Switch, Route } from "wouter";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeacherDashboard from "@/pages/teacher-dashboard";
import JoinRoom from "@/pages/join-room";
import WaitingLobby from "@/pages/waiting-lobby";
import HostLobby from "@/pages/host-lobby";
import MatchControl from "@/pages/match-control";
import Arena from "@/pages/arena";
import PostMatchStudent from "@/pages/post-match-student";
import MatchAnalytics from "@/pages/match-analytics";

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={TeacherDashboard} />
        <Route path="/join" component={JoinRoom} />
        <Route path="/lobby/:roomCode" component={WaitingLobby} />
        <Route path="/host-lobby/:roomCode" component={HostLobby} />
        <Route path="/arena/:roomCode" component={Arena} />
        <Route path="/match-control/:roomCode" component={MatchControl} />
        <Route path="/analytics/:quizId" component={MatchAnalytics} />
        <Route path="/post-match" component={PostMatchStudent} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
