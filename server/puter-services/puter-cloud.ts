// Puter Cloud Storage Service for Express Backend
// Uses @heyputer/puter.js for server-side cloud storage

import { createRequire } from "module";
const require = createRequire(import.meta.url);

interface PuterInstance {
  fs: {
    write: (path: string, content: string | Buffer, options?: { dedupeName?: boolean; createMissingParents?: boolean }) => Promise<{ path: string; name: string; size: number }>;
    read: (path: string) => Promise<Blob>;
    mkdir: (path: string, options?: { createMissingParents?: boolean }) => Promise<void>;
    readdir: (path: string) => Promise<Array<{ name: string; path: string; is_dir: boolean; size: number }>>;
    delete: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{ name: string; path: string; size: number; is_dir: boolean; created: number; modified: number }>;
    rename: (oldPath: string, newPath: string) => Promise<void>;
    copy: (src: string, dest: string) => Promise<void>;
    move: (src: string, dest: string) => Promise<void>;
    getReadURL: (path: string) => Promise<string>;
  };
  ai: {
    chat: (prompt: string, options?: { model?: string; stream?: boolean }) => Promise<string | { message?: { content: string } }>;
    txt2img: (prompt: string, options?: { model?: string }) => Promise<any>;
  };
  kv: {
    set: (key: string, value: string) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    del: (key: string) => Promise<void>;
    list: () => Promise<string[]>;
  };
  print: (message: string) => void;
}

let puterInstance: PuterInstance | null = null;
let initializationPromise: Promise<PuterInstance | null> | null = null;

// Initialize Puter with auth token
export async function initializePuter(): Promise<PuterInstance | null> {
  if (puterInstance) return puterInstance;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    const authToken = process.env.PUTER_AUTH_TOKEN;
    
    if (!authToken) {
      console.log("[Puter] No PUTER_AUTH_TOKEN found - Puter cloud services disabled");
      console.log("[Puter] Set PUTER_AUTH_TOKEN environment variable to enable Puter cloud storage");
      return null;
    }

    try {
      const { init } = require("@heyputer/puter.js/src/init.cjs");
      puterInstance = init(authToken) as PuterInstance;
      console.log("[Puter] Cloud services initialized successfully");
      return puterInstance;
    } catch (error) {
      console.error("[Puter] Failed to initialize:", error);
      return null;
    }
  })();

  return initializationPromise;
}

// Check if Puter is available
export function isPuterAvailable(): boolean {
  return puterInstance !== null;
}

// Get Puter instance (throws if not available)
export function getPuter(): PuterInstance {
  if (!puterInstance) {
    throw new Error("Puter not initialized. Call initializePuter() first or set PUTER_AUTH_TOKEN");
  }
  return puterInstance;
}

// Cloud Storage Operations
export const cloudStorage = {
  // Write file to cloud storage
  async write(path: string, content: string | Buffer, options?: { dedupeName?: boolean; createMissingParents?: boolean }): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const puter = getPuter();
      const result = await puter.fs.write(path, content, { createMissingParents: true, ...options });
      return { success: true, path: result.path };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Write failed" };
    }
  },

  // Read file from cloud storage
  async read(path: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      const puter = getPuter();
      const blob = await puter.fs.read(path);
      const arrayBuffer = await blob.arrayBuffer();
      return { success: true, data: Buffer.from(arrayBuffer) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Read failed" };
    }
  },

  // Read file as text
  async readText(path: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const puter = getPuter();
      const blob = await puter.fs.read(path);
      const text = await blob.text();
      return { success: true, text };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Read failed" };
    }
  },

  // Create directory
  async mkdir(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.fs.mkdir(path, { createMissingParents: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Mkdir failed" };
    }
  },

  // List directory contents
  async readdir(path: string): Promise<{ success: boolean; items?: Array<{ name: string; path: string; isDir: boolean; size: number }>; error?: string }> {
    try {
      const puter = getPuter();
      const items = await puter.fs.readdir(path);
      return { 
        success: true, 
        items: items.map(item => ({
          name: item.name,
          path: item.path,
          isDir: item.is_dir,
          size: item.size
        }))
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Readdir failed" };
    }
  },

  // Delete file or directory
  async delete(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.fs.delete(path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
    }
  },

  // Get file stats
  async stat(path: string): Promise<{ success: boolean; stats?: { name: string; size: number; isDir: boolean; created: Date; modified: Date }; error?: string }> {
    try {
      const puter = getPuter();
      const stats = await puter.fs.stat(path);
      return { 
        success: true, 
        stats: {
          name: stats.name,
          size: stats.size,
          isDir: stats.is_dir,
          created: new Date(stats.created * 1000),
          modified: new Date(stats.modified * 1000)
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Stat failed" };
    }
  },

  // Check if path exists
  async exists(path: string): Promise<boolean> {
    try {
      const puter = getPuter();
      await puter.fs.stat(path);
      return true;
    } catch {
      return false;
    }
  },

  // Copy file
  async copy(src: string, dest: string): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.fs.copy(src, dest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Copy failed" };
    }
  },

  // Move file
  async move(src: string, dest: string): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.fs.move(src, dest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Move failed" };
    }
  },

  // Get public URL for file
  async getPublicUrl(path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const puter = getPuter();
      const url = await puter.fs.getReadURL(path);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Get URL failed" };
    }
  }
};

// Key-Value Store Operations
export const kvStore = {
  async set(key: string, value: any): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.kv.set(key, typeof value === "string" ? value : JSON.stringify(value));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "KV set failed" };
    }
  },

  async get<T = string>(key: string): Promise<{ success: boolean; value?: T; error?: string }> {
    try {
      const puter = getPuter();
      const value = await puter.kv.get(key);
      if (value === null) {
        return { success: true, value: undefined };
      }
      try {
        return { success: true, value: JSON.parse(value) as T };
      } catch {
        return { success: true, value: value as unknown as T };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "KV get failed" };
    }
  },

  async delete(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const puter = getPuter();
      await puter.kv.del(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "KV delete failed" };
    }
  },

  async list(): Promise<{ success: boolean; keys?: string[]; error?: string }> {
    try {
      const puter = getPuter();
      const keys = await puter.kv.list();
      return { success: true, keys };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "KV list failed" };
    }
  }
};

export default {
  initializePuter,
  isPuterAvailable,
  getPuter,
  cloudStorage,
  kvStore
};
