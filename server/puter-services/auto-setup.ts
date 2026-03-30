// Auto Cloud Setup Service for Grudge Engine
// Automatically initializes Puter cloud storage directories on startup

import { isPuterAvailable, cloudStorage } from "./puter-cloud";

// Cloud storage directory structure for Grudge Engine
const CLOUD_DIRECTORIES = {
  root: "grudge-engine",
  projects: "grudge-engine/projects",
  assets: "grudge-engine/assets",
  textures: "grudge-engine/assets/textures",
  models: "grudge-engine/assets/models",
  audio: "grudge-engine/assets/audio",
  scripts: "grudge-engine/assets/scripts",
  prefabs: "grudge-engine/prefabs",
  exports: "grudge-engine/exports",
  temp: "grudge-engine/temp",
  cache: "grudge-engine/cache"
};

export interface SetupResult {
  success: boolean;
  puterAvailable: boolean;
  directoriesCreated: string[];
  errors: string[];
}

// Setup cloud directories (call after initializePuter)
export async function autoSetupCloud(): Promise<SetupResult> {
  const result: SetupResult = {
    success: false,
    puterAvailable: false,
    directoriesCreated: [],
    errors: []
  };

  try {
    // Check if Puter was initialized (should be called from index.ts first)
    if (!isPuterAvailable()) {
      console.log("[AutoSetup] Puter not available - using local storage only");
      result.success = true; // Not a failure, just no cloud
      return result;
    }

    result.puterAvailable = true;
    console.log("[AutoSetup] Puter available - setting up cloud directories...");

    // Create all directories
    for (const [name, path] of Object.entries(CLOUD_DIRECTORIES)) {
      try {
        const exists = await cloudStorage.exists(path);
        if (!exists) {
          const mkdirResult = await cloudStorage.mkdir(path);
          if (mkdirResult.success) {
            result.directoriesCreated.push(path);
            console.log(`[AutoSetup] Created: ${path}`);
          } else {
            result.errors.push(`Failed to create ${path}: ${mkdirResult.error}`);
          }
        } else {
          console.log(`[AutoSetup] Exists: ${path}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error checking ${path}: ${errorMsg}`);
      }
    }

    // Create default config file if it doesn't exist
    const configPath = `${CLOUD_DIRECTORIES.root}/config.json`;
    const configExists = await cloudStorage.exists(configPath);
    
    if (!configExists) {
      const defaultConfig = {
        version: "1.0.0",
        engine: "Grudge Engine",
        createdAt: new Date().toISOString(),
        settings: {
          autoSave: true,
          autoSaveInterval: 60000,
          maxProjects: 100,
          maxAssetsPerProject: 1000
        }
      };
      
      const writeResult = await cloudStorage.write(
        configPath, 
        JSON.stringify(defaultConfig, null, 2)
      );
      
      if (writeResult.success) {
        console.log("[AutoSetup] Created default config.json");
      }
    }

    result.success = result.errors.length === 0;
    console.log(`[AutoSetup] Cloud setup complete. Created ${result.directoriesCreated.length} directories.`);
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Setup failed: ${errorMsg}`);
    console.error("[AutoSetup] Error:", errorMsg);
    return result;
  }
}

// Get cloud directory paths
export function getCloudPaths() {
  return { ...CLOUD_DIRECTORIES };
}

// Get project cloud path
export function getProjectPath(projectId: string): string {
  return `${CLOUD_DIRECTORIES.projects}/${projectId}`;
}

// Get asset cloud path
export function getAssetPath(projectId: string, assetId: string, type: string): string {
  const typeDir = type === "texture" ? "textures" 
    : type === "model" ? "models"
    : type === "audio" ? "audio"
    : type === "script" ? "scripts"
    : "misc";
  return `${CLOUD_DIRECTORIES.assets}/${typeDir}/${projectId}/${assetId}`;
}

// Check cloud health
export async function checkCloudHealth(): Promise<{
  healthy: boolean;
  puterAvailable: boolean;
  rootExists: boolean;
  errors: string[];
}> {
  const health = {
    healthy: false,
    puterAvailable: isPuterAvailable(),
    rootExists: false,
    errors: [] as string[]
  };

  if (!health.puterAvailable) {
    health.healthy = true; // Not a failure if Puter isn't configured
    return health;
  }

  try {
    health.rootExists = await cloudStorage.exists(CLOUD_DIRECTORIES.root);
    health.healthy = health.rootExists;
    
    if (!health.rootExists) {
      health.errors.push("Root directory does not exist - run autoSetupCloud()");
    }
  } catch (error) {
    health.errors.push(error instanceof Error ? error.message : String(error));
  }

  return health;
}

// Cleanup temporary files
export async function cleanupTempFiles(): Promise<{ success: boolean; deleted: number; error?: string }> {
  if (!isPuterAvailable()) {
    return { success: true, deleted: 0 };
  }

  try {
    const tempDir = CLOUD_DIRECTORIES.temp;
    const listResult = await cloudStorage.readdir(tempDir);
    
    if (!listResult.success || !listResult.items) {
      return { success: true, deleted: 0 };
    }

    let deleted = 0;
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const item of listResult.items) {
      try {
        const statResult = await cloudStorage.stat(item.path);
        if (statResult.success && statResult.stats) {
          const age = now - statResult.stats.modified.getTime();
          if (age > maxAge) {
            await cloudStorage.delete(item.path);
            deleted++;
          }
        }
      } catch {
        // Ignore errors for individual files
      }
    }

    return { success: true, deleted };
  } catch (error) {
    return { 
      success: false, 
      deleted: 0, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

export default {
  autoSetupCloud,
  getCloudPaths,
  getProjectPath,
  getAssetPath,
  checkCloudHealth,
  cleanupTempFiles
};
