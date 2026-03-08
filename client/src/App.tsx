import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeacherDashboard from "@/pages/teacher-dashboard";
import JoinRoom from "@/pages/join-room";
import WaitLobby from "@/pages/waiting-lobby";
import HostLobby from "@/pages/host-lobby";
import MatchControl from "@/pages/match-control";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={TeacherDashboard} />
      <Route path="/join" component={JoinRoom} />
      <Route path="/lobby" component={WaitLobby} />
      <Route path="/host-lobby/:code" component={HostLobby} />
      <Route path="/match-control/:code" component={MatchControl} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
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
