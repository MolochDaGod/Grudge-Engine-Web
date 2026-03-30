import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface ErrorReport {
  id: string;
  type: "runtime" | "compile" | "network" | "babylon" | "react" | "unknown";
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: number;
  source: "frontend" | "backend" | "console";
  context?: string;
  severity: "error" | "warning" | "info";
}

export interface DebugAnalysis {
  success: boolean;
  error?: ErrorReport;
  diagnosis: string;
  rootCause: string;
  suggestedFix: string;
  codeChanges?: Array<{
    file: string;
    oldCode: string;
    newCode: string;
    explanation: string;
  }>;
  preventionTips: string[];
  confidence: number;
}

export interface DebugSession {
  id: string;
  errors: ErrorReport[];
  analyses: DebugAnalysis[];
  autoFixEnabled: boolean;
  startTime: number;
}

interface UseDebugWorkerOptions {
  autoCapture?: boolean;
  captureConsoleErrors?: boolean;
  captureUnhandledRejections?: boolean;
  onError?: (error: ErrorReport) => void;
  onAnalysis?: (analysis: DebugAnalysis) => void;
}

export function useDebugWorker(options: UseDebugWorkerOptions = {}) {
  const {
    autoCapture = true,
    captureConsoleErrors = true,
    captureUnhandledRejections = true,
    onError,
    onAnalysis
  } = options;

  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [session, setSession] = useState<DebugSession | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const originalConsoleError = useRef<typeof console.error | null>(null);

  const reportError = useCallback(async (error: Partial<ErrorReport>): Promise<ErrorReport | null> => {
    try {
      const response = await apiRequest("POST", "/api/debug/report", error);
      const data = await response.json();
      
      if (data.success && data.error) {
        const report = data.error as ErrorReport;
        setErrors(prev => [...prev.slice(-99), report]);
        onError?.(report);
        return report;
      }
      return null;
    } catch (err) {
      console.warn("[DebugWorker] Failed to report error:", err);
      return null;
    }
  }, [onError]);

  const captureError = useCallback((error: Error, context?: string) => {
    const stack = error.stack || "";
    const fileMatch = stack.match(/at\s+.*?\s+\(?(.*?):(\d+):(\d+)\)?/);
    
    reportError({
      message: error.message,
      stack: error.stack,
      file: fileMatch?.[1],
      line: fileMatch ? parseInt(fileMatch[2]) : undefined,
      column: fileMatch ? parseInt(fileMatch[3]) : undefined,
      source: "frontend",
      context,
      severity: "error"
    });
  }, [reportError]);

  const analyzeError = useCallback(async (error: ErrorReport, sourceCode?: string): Promise<DebugAnalysis | null> => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/debug/analyze", { error, sourceCode });
      const analysis = await response.json() as DebugAnalysis;
      onAnalysis?.(analysis);
      return analysis;
    } catch (err) {
      console.warn("[DebugWorker] Failed to analyze error:", err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAnalysis]);

  const startSession = useCallback(async (autoFix: boolean = false) => {
    try {
      const response = await apiRequest("POST", "/api/debug/session/start", { autoFix });
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        setErrors([]);
      }
      return data.session;
    } catch (err) {
      console.warn("[DebugWorker] Failed to start session:", err);
      return null;
    }
  }, []);

  const endSession = useCallback(async () => {
    try {
      const response = await apiRequest("POST", "/api/debug/session/end", {});
      const data = await response.json();
      if (data.success) {
        setSession(null);
      }
      return data.session;
    } catch (err) {
      console.warn("[DebugWorker] Failed to end session:", err);
      return null;
    }
  }, []);

  const getRecentErrors = useCallback(async (count: number = 10) => {
    try {
      const response = await fetch(`/api/debug/errors?count=${count}`);
      const data = await response.json();
      if (data.success) {
        setErrors(data.errors);
      }
      return data.errors;
    } catch (err) {
      console.warn("[DebugWorker] Failed to get errors:", err);
      return [];
    }
  }, []);

  const clearErrors = useCallback(async () => {
    try {
      await apiRequest("DELETE", "/api/debug/errors", {});
      setErrors([]);
    } catch (err) {
      console.warn("[DebugWorker] Failed to clear errors:", err);
    }
  }, []);

  const getQuickFix = useCallback(async (error: ErrorReport): Promise<string | null> => {
    try {
      const response = await apiRequest("POST", "/api/debug/quick-fix", { error });
      const data = await response.json();
      return data.quickFix || null;
    } catch (err) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!autoCapture) return;

    const handleError = (event: ErrorEvent) => {
      reportError({
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        source: "frontend",
        severity: "error"
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!captureUnhandledRejections) return;
      
      const error = event.reason;
      reportError({
        message: error?.message || String(error),
        stack: error?.stack,
        source: "frontend",
        type: "runtime",
        context: "Unhandled Promise Rejection",
        severity: "error"
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (captureConsoleErrors) {
      originalConsoleError.current = console.error;
      console.error = (...args: any[]) => {
        originalConsoleError.current?.apply(console, args);
        
        const message = args.map(arg => 
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" ");
        
        if (!message.includes("[DebugWorker]")) {
          reportError({
            message,
            source: "console",
            type: "unknown",
            severity: "error"
          });
        }
      };
    }

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
    };
  }, [autoCapture, captureConsoleErrors, captureUnhandledRejections, reportError]);

  return {
    errors,
    session,
    isAnalyzing,
    reportError,
    captureError,
    analyzeError,
    startSession,
    endSession,
    getRecentErrors,
    clearErrors,
    getQuickFix
  };
}

export function createErrorBoundaryHandler(debugWorker: ReturnType<typeof useDebugWorker>) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    debugWorker.reportError({
      message: error.message,
      stack: error.stack,
      type: "react",
      source: "frontend",
      context: `React Component Stack:\n${errorInfo.componentStack}`,
      severity: "error"
    });
  };
}
