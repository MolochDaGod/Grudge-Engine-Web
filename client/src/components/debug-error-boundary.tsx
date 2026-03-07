import { Component, type ReactNode } from "react";
import { useDebugWorker, createErrorBoundaryHandler } from "@/hooks/use-debug-worker";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md p-6 text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">
              An error occurred in the application. The error has been logged for analysis.
            </p>
            {this.state.error && (
              <div className="p-3 bg-destructive/10 rounded-md text-left">
                <code className="text-sm text-destructive break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DebugErrorBoundary({ children }: { children: ReactNode }) {
  const debugWorker = useDebugWorker({
    autoCapture: true,
    captureConsoleErrors: true,
    captureUnhandledRejections: true
  });

  const handleError = createErrorBoundaryHandler(debugWorker);

  return (
    <ErrorBoundaryClass onError={handleError}>
      {children}
    </ErrorBoundaryClass>
  );
}

export function DebugWorkerProvider({ children }: { children: ReactNode }) {
  useDebugWorker({
    autoCapture: true,
    captureConsoleErrors: true,
    captureUnhandledRejections: true
  });

  return <>{children}</>;
}
