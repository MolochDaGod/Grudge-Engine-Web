import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DebugErrorBoundary, DebugWorkerProvider } from "@/components/debug-error-boundary";
import { AuthProvider } from "@/contexts/AuthContext";
import EditorPage from "@/pages/editor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={EditorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DebugErrorBoundary>
          <DebugWorkerProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </DebugWorkerProvider>
        </DebugErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
