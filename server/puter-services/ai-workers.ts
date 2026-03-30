// Puter AI Workers Service for Express Backend
// Server-side AI processing using Puter.js

import { getPuter, isPuterAvailable } from "./puter-cloud";

// AI Models available through Puter
export type AIModel = 
  | "gpt-4o" 
  | "gpt-4o-mini" 
  | "gpt-4-turbo"
  | "o1"
  | "o1-mini"
  | "o3-mini"
  | "claude-3-5-sonnet"
  | "claude-3-5-haiku"
  | "claude-3-opus"
  | "gemini-2.0-flash"
  | "gemini-1.5-pro"
  | "mistral-large"
  | "llama-3.3-70b";

// Default models for different tasks
export const AI_MODELS = {
  chat: "gpt-4o" as AIModel,
  code: "claude-3-5-sonnet" as AIModel,
  fast: "gpt-4o-mini" as AIModel,
  creative: "claude-3-opus" as AIModel,
  reasoning: "o1" as AIModel
};

// AI Chat Worker
export interface ChatOptions {
  model?: AIModel;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  success: boolean;
  response?: string;
  model?: AIModel;
  error?: string;
}

export async function aiChat(
  prompt: string, 
  options: ChatOptions = {}
): Promise<ChatResult> {
  if (!isPuterAvailable()) {
    return { success: false, error: "Puter AI not available. Set PUTER_AUTH_TOKEN." };
  }

  try {
    const puter = getPuter();
    const model = options.model || AI_MODELS.chat;
    
    let fullPrompt = prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\nUser: ${prompt}`;
    }

    const response = await puter.ai.chat(fullPrompt, { model });
    
    let text: string;
    if (typeof response === "string") {
      text = response;
    } else if (response?.message?.content) {
      text = response.message.content;
    } else {
      text = String(response);
    }

    return { success: true, response: text, model };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "AI chat failed" 
    };
  }
}

// Code Generation Worker
export interface CodeGenOptions {
  language?: string;
  framework?: string;
  context?: string;
  model?: AIModel;
}

export async function generateCode(
  description: string,
  options: CodeGenOptions = {}
): Promise<ChatResult> {
  const systemPrompt = `You are an expert programmer. Generate clean, production-ready code.
${options.language ? `Language: ${options.language}` : ""}
${options.framework ? `Framework: ${options.framework}` : ""}
${options.context ? `Context: ${options.context}` : ""}

Respond with only the code, no explanations unless specifically asked.`;

  return aiChat(description, {
    model: options.model || AI_MODELS.code,
    systemPrompt
  });
}

// Game Development AI Worker
export interface GameDevOptions {
  gameType?: string;
  engine?: string;
  model?: AIModel;
}

export async function gameDevAssistant(
  prompt: string,
  options: GameDevOptions = {}
): Promise<ChatResult> {
  const systemPrompt = `You are an expert game developer assistant for Grudge Engine.
Engine: ${options.engine || "Babylon.js"}
Game Type: ${options.gameType || "3D Game"}

You specialize in:
- 3D game development with Babylon.js
- Scene hierarchy and object management
- Character controllers and animation
- Physics and collision detection
- Shader programming and materials
- Performance optimization
- Game design patterns

Provide practical, implementation-ready advice and code.`;

  return aiChat(prompt, {
    model: options.model || AI_MODELS.code,
    systemPrompt
  });
}

// AI Image Generation Worker
export interface ImageGenOptions {
  model?: string;
  size?: string;
  quality?: string;
}

export interface ImageGenResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<ImageGenResult> {
  if (!isPuterAvailable()) {
    return { success: false, error: "Puter AI not available. Set PUTER_AUTH_TOKEN." };
  }

  try {
    const puter = getPuter();
    const result = await puter.ai.txt2img(prompt, { model: options.model });
    
    // The result should contain the image URL or data
    const imageUrl = typeof result === "string" ? result : result?.src || result?.url;
    
    if (!imageUrl) {
      return { success: false, error: "No image URL in response" };
    }

    return { success: true, imageUrl };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Image generation failed" 
    };
  }
}

// Batch AI Processing Worker
export interface BatchTask {
  id: string;
  prompt: string;
  options?: ChatOptions;
}

export interface BatchResult {
  id: string;
  result: ChatResult;
}

export async function processBatch(
  tasks: BatchTask[]
): Promise<BatchResult[]> {
  const results = await Promise.all(
    tasks.map(async (task) => ({
      id: task.id,
      result: await aiChat(task.prompt, task.options)
    }))
  );
  return results;
}

// AI Analysis Worker (for code review, asset analysis, etc.)
export async function analyzeContent(
  content: string,
  analysisType: "code" | "asset" | "scene" | "performance"
): Promise<ChatResult> {
  const prompts: Record<typeof analysisType, string> = {
    code: `Analyze this code for:
- Bugs and potential issues
- Performance optimizations
- Best practices
- Security concerns

Code:
${content}`,
    asset: `Analyze this game asset description:
- File type compatibility
- Size/performance implications
- Usage recommendations
- Optimization suggestions

Asset:
${content}`,
    scene: `Analyze this scene configuration:
- Object hierarchy
- Performance concerns
- Missing components
- Improvement suggestions

Scene:
${content}`,
    performance: `Analyze these performance metrics:
- Bottlenecks
- Memory usage
- Render optimizations
- Recommendations

Metrics:
${content}`
  };

  return aiChat(prompts[analysisType], {
    model: AI_MODELS.code,
    systemPrompt: "You are a game development expert analyzing content for Grudge Engine."
  });
}

// ============================================
// AI DEBUG WORKER - Live Error Detection & Fixing
// ============================================

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
  model: AIModel;
}

export interface DebugSession {
  id: string;
  errors: ErrorReport[];
  analyses: DebugAnalysis[];
  autoFixEnabled: boolean;
  startTime: number;
}

// In-memory error buffer for live debugging
const errorBuffer: ErrorReport[] = [];
const MAX_ERROR_BUFFER = 100;
let currentDebugSession: DebugSession | null = null;

// Start a debug session
export function startDebugSession(autoFix: boolean = false): DebugSession {
  currentDebugSession = {
    id: `debug-${Date.now()}`,
    errors: [],
    analyses: [],
    autoFixEnabled: autoFix,
    startTime: Date.now()
  };
  console.log(`[DebugWorker] Started debug session: ${currentDebugSession.id}`);
  return currentDebugSession;
}

// Get current debug session
export function getDebugSession(): DebugSession | null {
  return currentDebugSession;
}

// End debug session
export function endDebugSession(): DebugSession | null {
  const session = currentDebugSession;
  currentDebugSession = null;
  if (session) {
    console.log(`[DebugWorker] Ended session ${session.id} with ${session.errors.length} errors`);
  }
  return session;
}

// Parse error type from message/stack
function detectErrorType(error: Partial<ErrorReport>): ErrorReport["type"] {
  const message = (error.message || "").toLowerCase();
  const stack = (error.stack || "").toLowerCase();
  
  if (message.includes("babylon") || stack.includes("babylon")) return "babylon";
  if (message.includes("react") || stack.includes("react") || message.includes("jsx")) return "react";
  if (message.includes("fetch") || message.includes("network") || message.includes("cors")) return "network";
  if (message.includes("syntaxerror") || message.includes("typeerror") && stack.includes("at compile")) return "compile";
  if (message.includes("typeerror") || message.includes("referenceerror") || message.includes("rangeerror")) return "runtime";
  return "unknown";
}

// Report an error to the debug worker
export function reportError(error: Partial<ErrorReport>): ErrorReport {
  const report: ErrorReport = {
    id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: error.type || detectErrorType(error),
    message: error.message || "Unknown error",
    stack: error.stack,
    file: error.file,
    line: error.line,
    column: error.column,
    timestamp: Date.now(),
    source: error.source || "frontend",
    context: error.context,
    severity: error.severity || "error"
  };
  
  // Add to buffer
  errorBuffer.push(report);
  if (errorBuffer.length > MAX_ERROR_BUFFER) {
    errorBuffer.shift();
  }
  
  // Add to current session
  if (currentDebugSession) {
    currentDebugSession.errors.push(report);
  }
  
  console.log(`[DebugWorker] Error reported: ${report.type} - ${report.message.substring(0, 100)}`);
  return report;
}

// Get recent errors
export function getRecentErrors(count: number = 10): ErrorReport[] {
  return errorBuffer.slice(-count);
}

// Clear error buffer
export function clearErrors(): void {
  errorBuffer.length = 0;
  if (currentDebugSession) {
    currentDebugSession.errors = [];
  }
}

// AI-powered error analysis and fix suggestion
export async function analyzeError(
  error: ErrorReport,
  sourceCode?: string
): Promise<DebugAnalysis> {
  if (!isPuterAvailable()) {
    return {
      success: false,
      error,
      diagnosis: "Puter AI not available",
      rootCause: "Cannot analyze without AI",
      suggestedFix: "Set PUTER_AUTH_TOKEN environment variable",
      preventionTips: [],
      confidence: 0,
      model: AI_MODELS.code
    };
  }

  const prompt = `You are an expert debugging AI for a game engine called Grudge Engine built with:
- Frontend: React 18, TypeScript, Babylon.js 3D engine, Vite, Tailwind CSS
- Backend: Express.js, TypeScript
- Features: 3D game development, character controllers, scene management

Analyze this error and provide a fix:

ERROR TYPE: ${error.type}
MESSAGE: ${error.message}
${error.stack ? `STACK TRACE:\n${error.stack}` : ""}
${error.file ? `FILE: ${error.file}${error.line ? `:${error.line}` : ""}${error.column ? `:${error.column}` : ""}` : ""}
${error.context ? `CONTEXT: ${error.context}` : ""}
SOURCE: ${error.source}
${sourceCode ? `\nRELEVANT SOURCE CODE:\n\`\`\`\n${sourceCode}\n\`\`\`` : ""}

Respond in this exact JSON format:
{
  "diagnosis": "Brief description of what went wrong",
  "rootCause": "The underlying cause of this error",
  "suggestedFix": "Clear step-by-step instructions to fix the issue",
  "codeChanges": [
    {
      "file": "path/to/file.ts",
      "oldCode": "the buggy code snippet",
      "newCode": "the fixed code snippet",
      "explanation": "why this change fixes the issue"
    }
  ],
  "preventionTips": ["tip 1", "tip 2"],
  "confidence": 0.85
}`;

  try {
    const result = await aiChat(prompt, {
      model: AI_MODELS.code,
      systemPrompt: "You are a senior software engineer specializing in debugging TypeScript, React, and Babylon.js applications. Always respond with valid JSON."
    });

    if (!result.success || !result.response) {
      return {
        success: false,
        error,
        diagnosis: "AI analysis failed",
        rootCause: result.error || "Unknown error",
        suggestedFix: "Try again or debug manually",
        preventionTips: [],
        confidence: 0,
        model: AI_MODELS.code
      };
    }

    // Parse AI response
    let parsed: any;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = result.response;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // If JSON parsing fails, create structured response from text
      parsed = {
        diagnosis: result.response.substring(0, 200),
        rootCause: "See diagnosis",
        suggestedFix: result.response,
        codeChanges: [],
        preventionTips: [],
        confidence: 0.5
      };
    }

    const analysis: DebugAnalysis = {
      success: true,
      error,
      diagnosis: parsed.diagnosis || "Analysis complete",
      rootCause: parsed.rootCause || "Unknown",
      suggestedFix: parsed.suggestedFix || "No specific fix suggested",
      codeChanges: parsed.codeChanges || [],
      preventionTips: parsed.preventionTips || [],
      confidence: parsed.confidence || 0.5,
      model: AI_MODELS.code
    };

    // Add to session
    if (currentDebugSession) {
      currentDebugSession.analyses.push(analysis);
    }

    return analysis;
  } catch (err) {
    return {
      success: false,
      error,
      diagnosis: "Analysis threw an exception",
      rootCause: err instanceof Error ? err.message : "Unknown",
      suggestedFix: "Check the error details manually",
      preventionTips: [],
      confidence: 0,
      model: AI_MODELS.code
    };
  }
}

// Batch analyze multiple errors
export async function analyzeErrors(
  errors: ErrorReport[]
): Promise<DebugAnalysis[]> {
  const analyses = await Promise.all(
    errors.map(error => analyzeError(error))
  );
  return analyses;
}

// Quick fix suggestion for common error patterns
export function getQuickFix(error: ErrorReport): string | null {
  const msg = error.message.toLowerCase();
  
  // Common quick fixes
  if (msg.includes("cannot read properties of undefined") || msg.includes("cannot read property")) {
    return "Add null/undefined check: Use optional chaining (?.) or nullish coalescing (??)";
  }
  if (msg.includes("is not a function")) {
    return "Check if the function exists and is properly imported";
  }
  if (msg.includes("failed to fetch") || msg.includes("network error")) {
    return "Check network connection and CORS settings. Verify the API endpoint is correct.";
  }
  if (msg.includes("babylon") && msg.includes("mesh")) {
    return "Ensure mesh is loaded before accessing. Use async/await or callbacks.";
  }
  if (msg.includes("scene is not ready")) {
    return "Wait for scene.executeWhenReady() before performing operations";
  }
  if (msg.includes("module") && msg.includes("not found")) {
    return "Check import path and ensure the module is installed (npm install)";
  }
  if (msg.includes("cors")) {
    return "Add CORS headers to the server or use a proxy for development";
  }
  
  return null;
}

// Debug worker object
export const debugWorker = {
  startSession: startDebugSession,
  endSession: endDebugSession,
  getSession: getDebugSession,
  reportError,
  getRecentErrors,
  clearErrors,
  analyzeError,
  analyzeErrors,
  getQuickFix
};

// Export worker functions
export const aiWorkers = {
  chat: aiChat,
  generateCode,
  gameDevAssistant,
  generateImage,
  processBatch,
  analyzeContent,
  debugWorker,
  models: AI_MODELS
};

export default aiWorkers;
