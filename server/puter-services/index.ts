// Puter Services - Main Export
// Consolidates all Puter cloud services for the Express backend

export {
  initializePuter,
  isPuterAvailable,
  getPuter,
  cloudStorage,
  kvStore
} from "./puter-cloud";

export {
  aiWorkers,
  aiChat,
  generateCode,
  gameDevAssistant,
  generateImage,
  processBatch,
  analyzeContent,
  debugWorker,
  startDebugSession,
  endDebugSession,
  getDebugSession,
  reportError,
  getRecentErrors,
  clearErrors,
  analyzeError,
  analyzeErrors,
  getQuickFix,
  AI_MODELS,
  type AIModel,
  type ChatOptions,
  type ChatResult,
  type CodeGenOptions,
  type GameDevOptions,
  type ImageGenOptions,
  type ImageGenResult,
  type BatchTask,
  type BatchResult,
  type ErrorReport,
  type DebugAnalysis,
  type DebugSession
} from "./ai-workers";

export {
  autoSetupCloud,
  getCloudPaths,
  getProjectPath,
  getAssetPath,
  checkCloudHealth,
  cleanupTempFiles
} from "./auto-setup";

// Combined initialization function
import { initializePuter } from "./puter-cloud";
import { autoSetupCloud } from "./auto-setup";

export async function initializePuterServices(): Promise<{
  success: boolean;
  puterAvailable: boolean;
  cloudSetup: boolean;
  errors: string[];
}> {
  const result = {
    success: false,
    puterAvailable: false,
    cloudSetup: false,
    errors: [] as string[]
  };

  try {
    // Initialize Puter first (only place where initializePuter is called)
    const puter = await initializePuter();
    result.puterAvailable = puter !== null;

    if (result.puterAvailable) {
      // Auto setup cloud directories (uses already-initialized Puter)
      const setupResult = await autoSetupCloud();
      result.cloudSetup = setupResult.success;
      result.errors.push(...setupResult.errors);
    }

    // Success only if no errors occurred
    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}
