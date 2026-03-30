import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { z } from "zod";
import { gameObjectSchema, assetSchema, sceneSchema, insertProjectSchema, insertSceneSchema, insertAssetSchema, scriptableObjectSchema, scriptableObjectTypeSchema, DEFAULT_LAYERS } from "@shared/schema";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
import multer from "multer";
import { isPuterAvailable, cloudStorage, kvStore, aiWorkers, checkCloudHealth, getCloudPaths, debugWorker, type ErrorReport } from "./puter-services";
import { AssetPipeline, type GenerateCharacterOptions } from "./asset-pipeline";
const require = createRequire(import.meta.url);

// Configure multer for FBX uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fbxStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fbxUpload = multer({
  storage: fbxStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.fbx') {
      cb(null, true);
    } else {
      cb(new Error('Only FBX files are allowed'));
    }
  }
});

// General-purpose multer for 3D model conversion (any format)
const modelUpload = multer({
  storage: fbxStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.fbx', '.glb', '.gltf', '.obj', '.dae', '.stl', '.ply', '.3ds'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported format: ${ext}. Allowed: ${allowed.join(', ')}`));
  }
});

const scriptableObjects = new Map<string, z.infer<typeof scriptableObjectSchema>>();

const rpgSceneConfigs = [
  { id: 'builder', name: 'Builder Scene', mapSize: 20000, description: 'Large open world for building' },
  { id: 'outdoor', name: 'Outdoor Day', mapSize: 10000, description: 'Daytime outdoor environment' },
  { id: 'town', name: 'Town', mapSize: 5000, description: 'Medieval town setting' },
  { id: 'night', name: 'Night Scene', mapSize: 8000, description: 'Nighttime environment with moonlight' },
  { id: 'inn', name: 'Inn Interior', mapSize: 500, description: 'Indoor tavern/inn scene' },
];

// Initialize asset pipeline
const assetPipeline = new AssetPipeline();

// Setup multer for asset processing (zip archives and model files)
const assetUpload = multer({
  storage: fbxStorage,
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB max for complex models
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.zip', '.fbx', '.glb', '.gltf', '.obj', '.dae', '.stl', '.ply', '.3ds'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file format: ${ext}`));
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // In-memory cloud asset registry (persists for server session)
  const cloudAssetRegistry: Array<{
    id: string;
    name: string;
    type: string;
    objectPath: string;
    size?: number;
    uploadedAt: string;
  }> = [];
  const objectStorageSvc = new ObjectStorageService();

  app.get("/api/assets/cloud", (_req, res) => {
    res.json(cloudAssetRegistry);
  });

  app.post("/api/assets/cloud/register", async (req, res) => {
    try {
      const { name, type, uploadURL, size } = req.body;
      if (!name || !uploadURL) {
        return res.status(400).json({ error: "name and uploadURL are required" });
      }
      const objectPath = objectStorageSvc.normalizeObjectEntityPath(uploadURL);
      const entry = {
        id: randomUUID(),
        name,
        type: type || "model",
        objectPath,
        size,
        uploadedAt: new Date().toISOString(),
      };
      cloudAssetRegistry.push(entry);
      res.status(201).json(entry);
    } catch (err) {
      res.status(500).json({ error: "Failed to register asset" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const parsed = insertProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid project data", details: parsed.error.format() });
      }
      const { name, description } = parsed.data;
      const project = await storage.createProject({
        name: name || "New Project",
        description: description || "",
        scenes: [{
          id: randomUUID(),
          name: "Main Scene",
          objects: [],
          settings: {
            ambientColor: '#1a1a2e',
            fogEnabled: false,
            fogColor: '#888888',
            fogDensity: 0.01,
            gravity: { x: 0, y: -9.81, z: 0 }
          }
        }],
        assets: [],
        settings: {
          renderMode: 'pbr',
          antiAliasing: true,
          shadows: true,
          postProcessing: true
        }
      });
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ==================== SCENE API ====================
  // List all scenes in a project
  app.get("/api/projects/:projectId/scenes", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project.scenes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scenes" });
    }
  });

  app.get("/api/projects/:projectId/scenes/:sceneId", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.projectId, req.params.sceneId);
      if (!scene) {
        return res.status(404).json({ error: "Scene not found" });
      }
      res.json(scene);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scene" });
    }
  });

  app.post("/api/projects/:projectId/scenes", async (req, res) => {
    try {
      const parsed = insertSceneSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid scene data", details: parsed.error.format() });
      }
      const scene = await storage.createScene(req.params.projectId, {
        name: parsed.data.name || "New Scene",
        objects: [],
        settings: {
          ambientColor: '#1a1a2e',
          fogEnabled: false,
          fogColor: '#888888',
          fogDensity: 0.01,
          gravity: { x: 0, y: -9.81, z: 0 }
        }
      });
      if (!scene) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(201).json(scene);
    } catch (error) {
      res.status(500).json({ error: "Failed to create scene" });
    }
  });

  app.patch("/api/projects/:projectId/scenes/:sceneId", async (req, res) => {
    try {
      const scene = await storage.updateScene(
        req.params.projectId,
        req.params.sceneId,
        req.body
      );
      if (!scene) {
        return res.status(404).json({ error: "Scene not found" });
      }
      res.json(scene);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scene" });
    }
  });

  app.delete("/api/projects/:projectId/scenes/:sceneId", async (req, res) => {
    try {
      const deleted = await storage.deleteScene(
        req.params.projectId,
        req.params.sceneId
      );
      if (!deleted) {
        return res.status(404).json({ error: "Scene not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scene" });
    }
  });

  app.post("/api/projects/:projectId/scenes/:sceneId/objects", async (req, res) => {
    try {
      const parsed = gameObjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid game object data", details: parsed.error });
      }
      
      const object = await storage.addGameObject(
        req.params.projectId,
        req.params.sceneId,
        parsed.data
      );
      if (!object) {
        return res.status(404).json({ error: "Project or scene not found" });
      }
      res.status(201).json(object);
    } catch (error) {
      res.status(500).json({ error: "Failed to add game object" });
    }
  });

  app.patch("/api/projects/:projectId/scenes/:sceneId/objects/:objectId", async (req, res) => {
    try {
      const object = await storage.updateGameObject(
        req.params.projectId,
        req.params.sceneId,
        req.params.objectId,
        req.body
      );
      if (!object) {
        return res.status(404).json({ error: "Game object not found" });
      }
      res.json(object);
    } catch (error) {
      res.status(500).json({ error: "Failed to update game object" });
    }
  });

  app.delete("/api/projects/:projectId/scenes/:sceneId/objects/:objectId", async (req, res) => {
    try {
      const deleted = await storage.deleteGameObject(
        req.params.projectId,
        req.params.sceneId,
        req.params.objectId
      );
      if (!deleted) {
        return res.status(404).json({ error: "Game object not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete game object" });
    }
  });

  app.get("/api/projects/:projectId/assets/:assetId", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.projectId, req.params.assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/projects/:projectId/assets", async (req, res) => {
    try {
      const parsed = insertAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid asset data", details: parsed.error.format() });
      }
      const asset = await storage.createAsset(req.params.projectId, {
        name: parsed.data.name || "New Asset",
        type: parsed.data.type || "texture",
        path: parsed.data.path || "/assets/new-asset"
      });
      if (!asset) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(201).json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.patch("/api/projects/:projectId/assets/:assetId", async (req, res) => {
    try {
      const asset = await storage.updateAsset(
        req.params.projectId,
        req.params.assetId,
        req.body
      );
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/projects/:projectId/assets/:assetId", async (req, res) => {
    try {
      const deleted = await storage.deleteAsset(
        req.params.projectId,
        req.params.assetId
      );
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Proxy download endpoint for assets - bypasses CORS issues
  app.post("/api/assets/import-remote", async (req, res) => {
    try {
      const { url, name, type, projectId } = req.body;
      
      if (!url || !name) {
        return res.status(400).json({ error: "URL and name are required" });
      }
      
      // Download the file server-side (bypasses CORS)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'GrudgeEngine/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.status(400).json({ error: `Failed to download: ${response.statusText}` });
      }
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Size limit: 50MB
      if (contentLength > 50 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large (max 50MB)' });
      }
      
      const buffer = await response.arrayBuffer();
      
      // Upload to object storage
      try {
        const objectStorageService = new ObjectStorageService();
        const privateDir = objectStorageService.getPrivateObjectDir();
        const fileExtension = url.split('.').pop()?.split('?')[0] || 'bin';
        const objectId = randomUUID();
        const fileName = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}_${objectId.slice(0, 8)}.${fileExtension}`;
        const objectName = `uploads/${objectId}`;
        
        // Parse the private dir to get bucket name
        const pathParts = privateDir.startsWith('/') ? privateDir.slice(1).split('/') : privateDir.split('/');
        const bucketName = pathParts[0];
        const fullObjectName = pathParts.slice(1).join('/') + '/' + objectName;
        
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(fullObjectName);
        
        // Upload the buffer
        await file.save(Buffer.from(buffer), {
          metadata: { contentType },
        });
        
        // Return the normalized object path that can be resolved via /objects/<id>
        const normalizedPath = `/objects/${objectName}`;
        
        // Persist asset to project storage if projectId provided
        let persistedAsset = null;
        if (projectId) {
          persistedAsset = await storage.createAsset(projectId, {
            name,
            type: type || 'model',
            path: normalizedPath,
          });
        }
        
        res.json({
          success: true,
          path: normalizedPath,
          objectId,
          contentType,
          size: buffer.byteLength,
          fileName,
          asset: persistedAsset,
        });
      } catch (storageError) {
        console.error('Storage upload failed:', storageError);
        // Return the original URL as fallback for use in session
        res.json({
          success: true,
          path: url,
          objectId: null,
          contentType,
          size: buffer.byteLength,
          fileName: name,
          fallback: true,
        });
      }
    } catch (error) {
      console.error('Asset import error:', error);
      res.status(500).json({ error: `Failed to import asset: ${error}` });
    }
  });
  
  // Get a fresh signed URL for an object
  app.get("/api/assets/signed-url/:objectId", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      const pathParts = privateDir.startsWith('/') ? privateDir.slice(1).split('/') : privateDir.split('/');
      const bucketName = pathParts[0];
      const fullObjectName = pathParts.slice(1).join('/') + '/uploads/' + req.params.objectId;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fullObjectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });
      
      res.json({ signedUrl });
    } catch (error) {
      console.error('Signed URL error:', error);
      res.status(500).json({ error: 'Failed to generate signed URL' });
    }
  });

  // XCF file processing - extract layers from GIMP files
  app.post("/api/assets/process-xcf", async (req, res) => {
    try {
      const { fileData, fileName, projectId } = req.body;
      
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "File data and name are required" });
      }
      
      // Dynamically require xcfreader (CommonJS module)
      let readXCFBuffer: (buffer: Buffer) => any;
      try {
        const xcfreader = require('xcfreader');
        readXCFBuffer = xcfreader.readXCFBuffer;
        if (!readXCFBuffer) {
          throw new Error('readXCFBuffer not found in xcfreader module');
        }
      } catch (e) {
        console.error('XCF library load error:', e);
        return res.status(500).json({ error: "XCF processing library not available" });
      }
      
      // Decode base64 file data
      const buffer = Buffer.from(fileData, 'base64');
      
      // Read XCF file
      const xcf = readXCFBuffer(buffer);
      
      const extractedLayers: Array<{
        name: string;
        width: number;
        height: number;
        x: number;
        y: number;
        path?: string;
        objectId?: string;
      }> = [];
      
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const pathParts = privateDir.startsWith('/') ? privateDir.slice(1).split('/') : privateDir.split('/');
      const bucketName = pathParts[0];
      
      // Process each layer
      for (let i = 0; i < xcf.layers.length; i++) {
        const layer = xcf.layers[i];
        const layerName = layer.name || `Layer_${i}`;
        
        // Get layer pixel data as PNG
        try {
          const layerBuffer = layer.toPNG();
          
          // Upload to storage
          const objectId = randomUUID();
          const safeLayerName = layerName.replace(/[^a-zA-Z0-9-_]/g, '_');
          const fullObjectName = pathParts.slice(1).join('/') + `/uploads/${objectId}`;
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(fullObjectName);
          
          await file.save(layerBuffer, {
            metadata: { contentType: 'image/png' },
          });
          
          const normalizedPath = `/objects/uploads/${objectId}`;
          
          // Create asset in project if projectId provided
          if (projectId) {
            await storage.createAsset(projectId, {
              name: `${fileName.replace('.xcf', '')} - ${layerName}`,
              type: 'texture',
              path: normalizedPath,
            });
          }
          
          extractedLayers.push({
            name: layerName,
            width: layer.width,
            height: layer.height,
            x: layer.x,
            y: layer.y,
            path: normalizedPath,
            objectId,
          });
        } catch (layerError) {
          console.error(`Failed to process layer ${layerName}:`, layerError);
          extractedLayers.push({
            name: layerName,
            width: layer.width,
            height: layer.height,
            x: layer.x,
            y: layer.y,
          });
        }
      }
      
      res.json({
        success: true,
        fileName,
        imageWidth: xcf.width,
        imageHeight: xcf.height,
        layerCount: xcf.layers.length,
        layers: extractedLayers,
      });
    } catch (error) {
      console.error('XCF processing error:', error);
      res.status(500).json({ error: `Failed to process XCF file: ${error}` });
    }
  });

  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { type, prompt, style, parameters } = req.body;
      
      res.json({
        success: true,
        type,
        prompt,
        result: {
          id: randomUUID(),
          status: "completed",
          message: `Generated ${type} based on prompt: ${prompt}`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context, model } = req.body;
      
      // Use Puter AI workers if available
      if (isPuterAvailable()) {
        const result = await aiWorkers.gameDevAssistant(message, {
          engine: "Babylon.js",
          gameType: context?.gameType || "3D Game",
          model: model
        });
        
        if (result.success) {
          return res.json({
            response: result.response,
            model: result.model,
            timestamp: new Date().toISOString(),
            source: "puter-ai"
          });
        }
      }
      
      // Fallback response when Puter is not available
      res.json({
        response: `AI Assistant: I received your message "${message}". To enable full AI capabilities, please set up PUTER_AUTH_TOKEN.`,
        timestamp: new Date().toISOString(),
        source: "fallback"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process AI chat" });
    }
  });

  app.get("/api/engine/status", async (req, res) => {
    const puterAvailable = isPuterAvailable();
    res.json({
      name: "Grudge Engine",
      version: "1.0.0",
      renderer: "Babylon.js v8",
      features: [
        "3D Rendering (WebGL 2.0)",
        "Scene Management",
        "Asset Browser",
        "AI Studio Integration",
        "Puter.js Cloud Storage",
        "Animation Timeline",
        "Physics Support"
      ],
      status: "running",
      puter: {
        available: puterAvailable,
        services: puterAvailable ? ["cloud-storage", "ai-workers", "kv-store"] : []
      }
    });
  });

  app.get("/api/layers", async (req, res) => {
    res.json(DEFAULT_LAYERS);
  });

  app.get("/api/rpg/scenes", async (req, res) => {
    res.json(rpgSceneConfigs);
  });

  app.get("/api/rpg/scenes/:sceneId", async (req, res) => {
    const scene = rpgSceneConfigs.find(s => s.id === req.params.sceneId);
    if (!scene) {
      return res.status(404).json({ error: "RPG scene not found" });
    }
    res.json(scene);
  });

  // ==================== DATA CACHE API ====================
  // In-memory cache for scene data and assets
  const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  const DEFAULT_CACHE_TTL = 300000; // 5 minutes

  // Get cached data by key
  app.get("/api/cache/:key", async (req, res) => {
    try {
      const cacheEntry = dataCache.get(req.params.key);
      if (!cacheEntry) {
        return res.status(404).json({ error: "Cache entry not found" });
      }
      // Check if expired
      if (Date.now() > cacheEntry.timestamp + cacheEntry.ttl) {
        dataCache.delete(req.params.key);
        return res.status(404).json({ error: "Cache entry expired" });
      }
      res.json({ key: req.params.key, data: cacheEntry.data, age: Date.now() - cacheEntry.timestamp });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cache entry" });
    }
  });

  // Set cached data
  app.post("/api/cache/:key", async (req, res) => {
    try {
      const { data, ttl } = req.body;
      if (data === undefined) {
        return res.status(400).json({ error: "Data is required" });
      }
      const cacheTtl = typeof ttl === 'number' ? ttl : DEFAULT_CACHE_TTL;
      dataCache.set(req.params.key, { data, timestamp: Date.now(), ttl: cacheTtl });
      res.status(201).json({ key: req.params.key, ttl: cacheTtl, message: "Cached successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to cache data" });
    }
  });

  // Delete cached data
  app.delete("/api/cache/:key", async (req, res) => {
    try {
      const deleted = dataCache.delete(req.params.key);
      if (!deleted) {
        return res.status(404).json({ error: "Cache entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete cache entry" });
    }
  });

  // List all cache keys
  app.get("/api/cache", async (req, res) => {
    try {
      const now = Date.now();
      const entries = Array.from(dataCache.entries())
        .filter(([_, entry]) => now <= entry.timestamp + entry.ttl)
        .map(([key, entry]) => ({
          key,
          age: now - entry.timestamp,
          ttl: entry.ttl,
          expiresIn: entry.timestamp + entry.ttl - now
        }));
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to list cache entries" });
    }
  });

  // Clear all cache
  app.delete("/api/cache", async (req, res) => {
    try {
      dataCache.clear();
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Bulk cache scene data (for quick save/restore)
  app.post("/api/cache/scene/:sceneId", async (req, res) => {
    try {
      const { objects, settings, ttl } = req.body;
      const sceneKey = `scene:${req.params.sceneId}`;
      const cacheTtl = typeof ttl === 'number' ? ttl : DEFAULT_CACHE_TTL;
      dataCache.set(sceneKey, { 
        data: { objects, settings, sceneId: req.params.sceneId }, 
        timestamp: Date.now(), 
        ttl: cacheTtl 
      });
      res.status(201).json({ key: sceneKey, ttl: cacheTtl, objectCount: objects?.length || 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to cache scene data" });
    }
  });

  // Get cached scene data
  app.get("/api/cache/scene/:sceneId", async (req, res) => {
    try {
      const sceneKey = `scene:${req.params.sceneId}`;
      const cacheEntry = dataCache.get(sceneKey);
      if (!cacheEntry) {
        return res.status(404).json({ error: "Scene not in cache" });
      }
      if (Date.now() > cacheEntry.timestamp + cacheEntry.ttl) {
        dataCache.delete(sceneKey);
        return res.status(404).json({ error: "Scene cache expired" });
      }
      res.json(cacheEntry.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scene from cache" });
    }
  });

  app.get("/api/scriptable-objects", async (req, res) => {
    const objects = Array.from(scriptableObjects.values());
    res.json(objects);
  });

  app.get("/api/scriptable-objects/:id", async (req, res) => {
    const obj = scriptableObjects.get(req.params.id);
    if (!obj) {
      return res.status(404).json({ error: "ScriptableObject not found" });
    }
    res.json(obj);
  });

  app.post("/api/scriptable-objects", async (req, res) => {
    try {
      const { name, type, data, description } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }

      const parsed = scriptableObjectTypeSchema.safeParse(type);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid ScriptableObject type" });
      }

      const now = new Date().toISOString();
      const newObj = {
        id: randomUUID(),
        name,
        type: parsed.data,
        description: description || '',
        data: data || {},
        references: [],
        createdAt: now,
        updatedAt: now,
      };

      scriptableObjects.set(newObj.id, newObj);
      res.status(201).json(newObj);
    } catch (error) {
      res.status(500).json({ error: "Failed to create ScriptableObject" });
    }
  });

  app.patch("/api/scriptable-objects/:id", async (req, res) => {
    try {
      const obj = scriptableObjects.get(req.params.id);
      if (!obj) {
        return res.status(404).json({ error: "ScriptableObject not found" });
      }

      const updated = {
        ...obj,
        ...req.body,
        id: obj.id,
        createdAt: obj.createdAt,
        updatedAt: new Date().toISOString(),
      };

      scriptableObjects.set(updated.id, updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ScriptableObject" });
    }
  });

  app.delete("/api/scriptable-objects/:id", async (req, res) => {
    const deleted = scriptableObjects.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "ScriptableObject not found" });
    }
    res.status(204).send();
  });

  // FBX upload with auto-conversion to GLB
  app.post("/api/convert/fbx-upload", fbxUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No FBX file uploaded" });
      }
      
      const inputPath = req.file.path;
      const originalName = req.file.originalname.replace(/\.fbx$/i, '');
      const outputDir = path.join(process.cwd(), 'public', 'assets', 'converted');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFilename = `${originalName}-${Date.now()}.glb`;
      const outputPath = path.join(outputDir, outputFilename);
      
      const convert = require('fbx2gltf');
      const startTime = Date.now();
      
      await convert(inputPath, outputPath, []);
      
      const duration = Date.now() - startTime;
      const stats = fs.statSync(outputPath);
      
      // Clean up temp FBX file
      fs.unlinkSync(inputPath);
      
      const publicPath = `/assets/converted/${outputFilename}`;
      
      res.json({
        success: true,
        outputPath: publicPath,
        duration,
        fileSize: stats.size,
        originalName: req.file.originalname
      });
    } catch (error: any) {
      console.error("FBX upload/conversion error:", error);
      // Clean up temp file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: `Conversion failed: ${error.message}` });
    }
  });

  app.post("/api/convert/fbx-to-glb", async (req, res) => {
    try {
      const { inputPath, outputPath } = req.body;
      
      if (!inputPath || !outputPath) {
        return res.status(400).json({ error: "inputPath and outputPath are required" });
      }
      
      const absoluteInput = path.join(process.cwd(), 'public', inputPath);
      const absoluteOutput = path.join(process.cwd(), 'public', outputPath);
      
      if (!fs.existsSync(absoluteInput)) {
        return res.status(404).json({ error: `Input file not found: ${inputPath}` });
      }
      
      const outputDir = path.dirname(absoluteOutput);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const convert = require('fbx2gltf');
      const startTime = Date.now();
      
      await convert(absoluteInput, absoluteOutput, []);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const stats = fs.statSync(absoluteOutput);
      
      res.json({ 
        success: true, 
        outputPath,
        duration: `${duration}ms`,
        fileSize: `${(stats.size / 1024 / 1024).toFixed(2)}MB`
      });
    } catch (error: any) {
      console.error("FBX conversion error:", error);
      res.status(500).json({ error: `Conversion failed: ${error.message}` });
    }
  });

  // Optimize any GLB/GLTF using gltf-transform (Draco/MeshOpt compression + texture resize)
  app.post("/api/convert/optimize-glb", modelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const inputPath = req.file.path;
      const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const outputDir = path.join(process.cwd(), 'public', 'assets', 'converted');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const outputFilename = `${originalName}-optimized-${Date.now()}.glb`;
      const outputPath = path.join(outputDir, outputFilename);
      const gltfBin = path.join(process.cwd(), 'node_modules/.bin/gltf-transform');
      const { compress = 'draco', textureSize = '1024', textureCompress = 'webp' } = req.body;
      const args: string[] = ['optimize', inputPath, outputPath, '--texture-compress', textureCompress];
      if (compress && compress !== 'none') args.push('--compress', compress);
      if (textureSize && textureSize !== 'original') args.push('--texture-size', textureSize);
      const { execFile } = await import('child_process');
      const startTime = Date.now();
      await new Promise<void>((resolve, reject) => {
        execFile(gltfBin, args, { timeout: 120000 }, (err) => err ? reject(err) : resolve());
      });
      const duration = Date.now() - startTime;
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      fs.unlinkSync(inputPath);
      res.json({
        success: true,
        outputPath: `/assets/converted/${outputFilename}`,
        duration,
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        savings: Math.round((1 - outputStats.size / inputStats.size) * 100)
      });
    } catch (error: any) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: `Optimization failed: ${error.message}` });
    }
  });

  // Convert any 3D format to GLB (FBX via fbx2gltf, others via gltf-transform copy)
  app.post("/api/convert/to-glb", modelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const inputPath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const outputDir = path.join(process.cwd(), 'public', 'assets', 'converted');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const outputFilename = `${originalName}-${Date.now()}.glb`;
      const outputPath = path.join(outputDir, outputFilename);
      const startTime = Date.now();
      if (ext === '.fbx') {
        const convert = require('fbx2gltf');
        await convert(inputPath, outputPath, []);
      } else {
        const gltfBin = path.join(process.cwd(), 'node_modules/.bin/gltf-transform');
        const { execFile } = await import('child_process');
        await new Promise<void>((resolve, reject) => {
          execFile(gltfBin, ['copy', inputPath, outputPath], { timeout: 120000 }, (err) => err ? reject(err) : resolve());
        });
      }
      const duration = Date.now() - startTime;
      const stats = fs.statSync(outputPath);
      fs.unlinkSync(inputPath);
      res.json({
        success: true,
        outputPath: `/assets/converted/${outputFilename}`,
        filename: `${originalName}.glb`,
        duration,
        fileSize: stats.size
      });
    } catch (error: any) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: `Conversion failed: ${error.message}` });
    }
  });

  // ============================================
  // PUTER CLOUD SERVICES API
  // ============================================

  // Check Puter cloud status
  app.get("/api/puter/status", async (req, res) => {
    const available = isPuterAvailable();
    if (!available) {
      return res.json({
        available: false,
        message: "Puter cloud services not configured. Set PUTER_AUTH_TOKEN to enable."
      });
    }
    
    const health = await checkCloudHealth();
    const paths = getCloudPaths();
    
    res.json({
      available: true,
      healthy: health.healthy,
      rootExists: health.rootExists,
      paths,
      errors: health.errors
    });
  });

  // Cloud storage - write file
  app.post("/api/puter/storage/write", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const { path: filePath, content, encoding } = req.body;
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: "path and content are required" });
      }
      
      const data = encoding === "base64" ? Buffer.from(content, "base64") : content;
      const result = await cloudStorage.write(filePath, data);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Write failed" });
    }
  });

  // Cloud storage - read file
  app.get("/api/puter/storage/read", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "path query parameter required" });
      }
      
      const result = await cloudStorage.readText(filePath);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }
      res.json({ success: true, content: result.text });
    } catch (error) {
      res.status(500).json({ error: "Read failed" });
    }
  });

  // Cloud storage - list directory
  app.get("/api/puter/storage/list", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const dirPath = (req.query.path as string) || getCloudPaths().root;
      const result = await cloudStorage.readdir(dirPath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "List failed" });
    }
  });

  // Cloud storage - delete file
  app.delete("/api/puter/storage/delete", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "path query parameter required" });
      }
      
      const result = await cloudStorage.delete(filePath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // Cloud storage - get public URL
  app.get("/api/puter/storage/url", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "path query parameter required" });
      }
      
      const result = await cloudStorage.getPublicUrl(filePath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Get URL failed" });
    }
  });

  // Key-Value store - set
  app.post("/api/puter/kv/set", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "key is required" });
      }
      
      const result = await kvStore.set(key, value);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "KV set failed" });
    }
  });

  // Key-Value store - get
  app.get("/api/puter/kv/get", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: "key query parameter required" });
      }
      
      const result = await kvStore.get(key);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "KV get failed" });
    }
  });

  // Key-Value store - delete
  app.delete("/api/puter/kv/delete", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter cloud not available" });
    }
    
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: "key query parameter required" });
      }
      
      const result = await kvStore.delete(key);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "KV delete failed" });
    }
  });

  // AI Workers - code generation
  app.post("/api/puter/ai/generate-code", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available" });
    }
    
    try {
      const { description, language, framework, context, model } = req.body;
      if (!description) {
        return res.status(400).json({ error: "description is required" });
      }
      
      const result = await aiWorkers.generateCode(description, {
        language,
        framework,
        context,
        model
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Code generation failed" });
    }
  });

  // AI Workers - image generation
  app.post("/api/puter/ai/generate-image", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available" });
    }
    
    try {
      const { prompt, model, size, quality } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
      }
      
      const result = await aiWorkers.generateImage(prompt, { model, size, quality });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Image generation failed" });
    }
  });

  // AI Workers - content analysis
  app.post("/api/puter/ai/analyze", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available" });
    }
    
    try {
      const { content, type } = req.body;
      if (!content || !type) {
        return res.status(400).json({ error: "content and type are required" });
      }
      
      if (!["code", "asset", "scene", "performance"].includes(type)) {
        return res.status(400).json({ error: "type must be: code, asset, scene, or performance" });
      }
      
      const result = await aiWorkers.analyzeContent(content, type);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // AI Workers - batch processing
  app.post("/api/puter/ai/batch", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available" });
    }
    
    try {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "tasks array is required" });
      }
      
      const results = await aiWorkers.processBatch(tasks);
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: "Batch processing failed" });
    }
  });

  // ============================================
  // DEBUG WORKER API - Live Error Detection & Fixing
  // Note: These are development-only endpoints for internal debugging
  // ============================================

  // Validation schemas for debug endpoints
  const errorReportSchema = z.object({
    message: z.string().min(1).max(10000),
    stack: z.string().max(50000).optional(),
    file: z.string().max(500).optional(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
    type: z.enum(["runtime", "compile", "network", "babylon", "react", "unknown"]).optional(),
    source: z.enum(["frontend", "backend", "console"]).optional(),
    context: z.string().max(5000).optional(),
    severity: z.enum(["error", "warning", "info"]).optional()
  });

  const analyzeRequestSchema = z.object({
    error: z.object({
      id: z.string().optional(),
      message: z.string().min(1).max(10000),
      stack: z.string().max(50000).optional(),
      file: z.string().max(500).optional(),
      line: z.number().int().positive().optional(),
      column: z.number().int().positive().optional(),
      type: z.enum(["runtime", "compile", "network", "babylon", "react", "unknown"]).optional(),
      source: z.enum(["frontend", "backend", "console"]).optional(),
      context: z.string().max(5000).optional(),
      severity: z.enum(["error", "warning", "info"]).optional(),
      timestamp: z.number().optional()
    }),
    sourceCode: z.string().max(50000).optional()
  });

  // Start a debug session
  app.post("/api/debug/session/start", (req, res) => {
    try {
      const { autoFix } = req.body;
      const session = debugWorker.startSession(autoFix === true);
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: "Failed to start debug session" });
    }
  });

  // End debug session
  app.post("/api/debug/session/end", (req, res) => {
    try {
      const session = debugWorker.endSession();
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: "Failed to end debug session" });
    }
  });

  // Get current debug session
  app.get("/api/debug/session", (req, res) => {
    try {
      const session = debugWorker.getSession();
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: "Failed to get debug session" });
    }
  });

  // Report an error from frontend
  app.post("/api/debug/report", (req, res) => {
    try {
      const parsed = errorReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid error report format", details: parsed.error.errors });
      }
      
      const errorData: Partial<ErrorReport> = {
        message: parsed.data.message,
        stack: parsed.data.stack,
        file: parsed.data.file,
        line: parsed.data.line,
        column: parsed.data.column,
        type: parsed.data.type,
        source: parsed.data.source || "frontend",
        context: parsed.data.context,
        severity: parsed.data.severity || "error"
      };
      
      const report = debugWorker.reportError(errorData);
      const quickFix = debugWorker.getQuickFix(report);
      
      res.json({ 
        success: true, 
        error: report,
        quickFix
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to report error" });
    }
  });

  // Get recent errors
  app.get("/api/debug/errors", (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 10;
      const errors = debugWorker.getRecentErrors(count);
      res.json({ success: true, errors });
    } catch (error) {
      res.status(500).json({ error: "Failed to get errors" });
    }
  });

  // Clear all errors
  app.delete("/api/debug/errors", (req, res) => {
    try {
      debugWorker.clearErrors();
      res.json({ success: true, message: "Errors cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear errors" });
    }
  });

  // Analyze a specific error with AI
  app.post("/api/debug/analyze", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available for analysis. Set PUTER_AUTH_TOKEN." });
    }
    
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid analyze request format", details: parsed.error.errors });
      }
      
      const { error, sourceCode } = parsed.data;
      
      const errorReport: ErrorReport = {
        id: error.id || `err-${Date.now()}`,
        type: error.type || "unknown",
        message: error.message,
        stack: error.stack,
        file: error.file,
        line: error.line,
        column: error.column,
        timestamp: error.timestamp || Date.now(),
        source: error.source || "frontend",
        context: error.context,
        severity: error.severity || "error"
      };
      
      const analysis = await aiWorkers.debugWorker.analyzeError(errorReport, sourceCode);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Analyze multiple errors
  app.post("/api/debug/analyze-batch", async (req, res) => {
    if (!isPuterAvailable()) {
      return res.status(503).json({ error: "Puter AI not available for analysis" });
    }
    
    try {
      const { errors } = req.body;
      if (!errors || !Array.isArray(errors)) {
        return res.status(400).json({ error: "errors array is required" });
      }
      
      const analyses = await aiWorkers.debugWorker.analyzeErrors(errors);
      res.json({ success: true, analyses });
    } catch (error) {
      res.status(500).json({ error: "Batch analysis failed" });
    }
  });

  // Get quick fix for an error (no AI needed)
  app.post("/api/debug/quick-fix", (req, res) => {
    try {
      const { error } = req.body;
      if (!error || !error.message) {
        return res.status(400).json({ error: "error object with message is required" });
      }
      
      const quickFix = debugWorker.getQuickFix(error);
      res.json({ 
        success: true, 
        quickFix,
        hasQuickFix: quickFix !== null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get quick fix" });
    }
  });

  // ===== Local AI Agent Proxy Routes =====

  app.get("/api/ai/ollama/status", async (_req, res) => {
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data = await resp.json() as { models?: Array<{ name: string; size: number; modified_at: string }> };
        res.json({
          status: 'connected',
          models: (data.models || []).map((m: any) => ({ name: m.name, size: m.size, modified_at: m.modified_at })),
        });
      } else {
        res.json({ status: 'disconnected', models: [] });
      }
    } catch {
      res.json({ status: 'disconnected', models: [] });
    }
  });

  app.post("/api/ai/ollama/chat", async (req, res) => {
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const { model, messages, stream } = req.body;
      if (!model || !messages) {
        return res.status(400).json({ error: 'model and messages required' });
      }

      const resp = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: stream || false }),
      });

      if (!resp.ok) {
        return res.status(resp.status).json({ error: `Ollama error: ${resp.status}` });
      }

      const data = await resp.json() as { message?: { content: string } };
      res.json({
        success: true,
        content: data.message?.content || '',
        model,
        provider: 'ollama',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ollama proxy failed' });
    }
  });

  app.post("/api/ai/ollama/pull", async (req, res) => {
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'model name required' });

      const resp = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      res.json({ success: resp.ok, status: resp.status });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Pull failed' });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { provider, model, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }
    if (!provider || !['ollama', 'openai', 'anthropic', 'deepseek'].includes(provider)) {
      return res.status(400).json({ error: `Invalid provider: ${provider}` });
    }

    try {
      let content = '';

      if (provider === 'ollama') {
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const resp = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model || 'llama3.2', messages, stream: false }),
        });
        const data = await resp.json() as { message?: { content: string } };
        content = data.message?.content || '';
      } else if (provider === 'openai' || provider === 'deepseek') {
        const baseUrl = provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
        const key = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.DEEPSEEK_API_KEY;
        if (!key) return res.status(400).json({ error: `${provider} API key not configured. Set ${provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'} environment variable.` });
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: model || 'gpt-4o', messages, max_tokens: 4096 }),
        });
        const data = await resp.json() as { choices?: Array<{ message?: { content: string } }> };
        content = data.choices?.[0]?.message?.content || '';
      } else if (provider === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) return res.status(400).json({ error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.' });
        const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
        const userMsgs = messages.filter((m: any) => m.role !== 'system');
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: model || 'claude-sonnet-4-20250514', max_tokens: 4096, system: systemMsg, messages: userMsgs }),
        });
        const data = await resp.json() as { content?: Array<{ text: string }> };
        content = data.content?.[0]?.text || '';
      }

      res.json({ success: true, content, provider, model });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'AI proxy failed' });
    }
  });

  app.get("/api/ai/providers/status", async (_req, res) => {
    const providers: Record<string, { available: boolean; status: string }> = {};

    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      providers.ollama = { available: resp.ok, status: resp.ok ? 'connected' : 'unavailable' };
    } catch {
      providers.ollama = { available: false, status: 'not running' };
    }

    providers.puter = { available: isPuterAvailable(), status: isPuterAvailable() ? 'available' : 'not configured' };
    providers.openai = { available: !!process.env.OPENAI_API_KEY, status: process.env.OPENAI_API_KEY ? 'configured' : 'no key' };
    providers.anthropic = { available: !!process.env.ANTHROPIC_API_KEY, status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'no key' };
    providers.deepseek = { available: !!process.env.DEEPSEEK_API_KEY, status: process.env.DEEPSEEK_API_KEY ? 'configured' : 'no key' };

    res.json(providers);
  });

  app.get("/api/system/info", (_req, res) => {
    res.json({
      engine: 'Grudge Engine',
      version: '2.0.0',
      runtime: 'Node.js ' + process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: {
        puterCloud: isPuterAvailable(),
        ollamaLocal: true,
        objectStorage: true,
        aiAgents: true,
        multiProvider: true,
        grudgeSDK: true,
        assetPipeline: true,
        pipelineSync: true,
        meshyGeneration: !!process.env.GRUDGE_PIPELINE_URL,
        objectStoreSync: !!(process.env.OBJECTSTORE_API_KEY || process.env.INTERNAL_API_KEY),
      }
    });
  });

  // ============================================
  // ASSET PIPELINE ROUTES
  // ============================================

  // Upload & process a 3D asset (single file or zip)
  app.post("/api/assets/upload", assetUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const assetName = req.body.name || path.basename(req.file.originalname, path.extname(req.file.originalname));
      const ext = path.extname(req.file.originalname).toLowerCase();
      const syncToObjectStore = req.body.sync !== 'false';
      const tags: string[] = req.body.tags ? JSON.parse(req.body.tags) : [];

      let results;

      if (ext === '.zip') {
        results = await assetPipeline.processZipArchive(req.file.path, assetName, { syncToObjectStore, tags });
      } else {
        const result = await assetPipeline.processAsset(req.file.path, assetName, { syncToObjectStore, tags });
        results = [result];
      }

      // Cleanup uploaded temp file
      try { fs.unlinkSync(req.file.path); } catch (_) { /* ok */ }

      res.json({
        success: true,
        assetsProcessed: results.length,
        assets: results.map(r => ({
          id: r.metadata.id,
          name: r.metadata.name,
          format: r.metadata.format,
          size: r.metadata.size,
          meshCount: r.metadata.meshCount,
          animationCount: r.metadata.animationCount,
          hasBones: r.metadata.hasBones,
          glbPath: r.glbPath ? path.relative(process.cwd(), r.glbPath).replace(/\\/g, '/') : undefined,
          gltfPath: r.gltfPath ? path.relative(process.cwd(), r.gltfPath).replace(/\\/g, '/') : undefined,
          pipelineAsset: r.pipelineAsset,
        }))
      });
    } catch (error) {
      console.error(`Asset upload error: ${error}`);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Asset processing failed' });
    }
  });

  // Asset registry (from pipeline manifests)
  app.get("/api/assets/registry", (_req, res) => {
    try {
      const registry = assetPipeline.getAssetRegistry();
      const assets = Array.from(registry.values()).map(meta => ({
        id: meta.id,
        name: meta.name,
        format: meta.format,
        size: meta.size,
        meshCount: meta.meshCount,
        animationCount: meta.animationCount,
        hasBones: meta.hasBones,
        processedAt: meta.processedAt,
      }));
      res.json({ assets });
    } catch (error) {
      console.error(`Registry error: ${error}`);
      res.status(500).json({ error: 'Failed to retrieve asset registry' });
    }
  });

  // Full pipeline manifest (typed GrudgePipelineAsset[])
  app.get("/api/assets/pipeline-manifest", (_req, res) => {
    try {
      const manifest = assetPipeline.getPipelineManifest();
      res.json(manifest);
    } catch (error) {
      console.error(`Pipeline manifest error: ${error}`);
      res.status(500).json({ error: 'Failed to retrieve pipeline manifest' });
    }
  });

  // Force-resync pipeline manifest from disk manifests
  app.post("/api/assets/pipeline-manifest/sync", (_req, res) => {
    try {
      const manifest = assetPipeline.syncPipelineManifest();
      res.json({ success: true, assetCount: manifest.assets.length, generatedAt: manifest.generatedAt });
    } catch (error) {
      console.error(`Pipeline sync error: ${error}`);
      res.status(500).json({ error: 'Failed to sync pipeline manifest' });
    }
  });

  // AI Character generation via Meshy text-to-3d
  app.post("/api/assets/generate-character", async (req, res) => {
    try {
      const { prompt, name, stylePrompt, tags, topology, targetPolycount, poseMode } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required' });
      }

      const options: GenerateCharacterOptions = {
        name,
        stylePrompt,
        tags,
        topology,
        targetPolycount,
        poseMode,
      };

      const result = await assetPipeline.generateCharacter(prompt, options);

      res.json({
        success: true,
        asset: {
          id: result.metadata.id,
          name: result.metadata.name,
          format: result.metadata.format,
          size: result.metadata.size,
          hasBones: result.metadata.hasBones,
          glbPath: result.glbPath ? path.relative(process.cwd(), result.glbPath).replace(/\\/g, '/') : undefined,
          pipelineAsset: result.pipelineAsset,
        },
      });
    } catch (error) {
      console.error(`Character generation error: ${error}`);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Character generation failed' });
    }
  });

  // Cleanup temp processing directory
  app.post("/api/assets/pipeline/cleanup", (_req, res) => {
    try {
      assetPipeline.cleanup();
      res.json({ success: true, message: 'Processing directory cleaned up' });
    } catch (error) {
      res.status(500).json({ error: 'Cleanup failed' });
    }
  });

  return httpServer;
}
