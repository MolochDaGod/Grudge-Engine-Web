import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { z } from "zod";
import { gameObjectSchema, assetSchema, sceneSchema, insertProjectSchema, insertSceneSchema, insertAssetSchema, scriptableObjectSchema, scriptableObjectTypeSchema, DEFAULT_LAYERS } from "@shared/schema";
import { storageAdapter } from "./storage-adapter";
import { registerObjectStoreProxyRoutes } from "./objectstore-proxy";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
import multer from "multer";
import { isPuterAvailable, cloudStorage, kvStore, aiWorkers, checkCloudHealth, getCloudPaths, debugWorker, type ErrorReport } from "./puter-services";
const require = createRequire(import.meta.url);

// Try to load Replit object storage (optional fallback)
let registerObjectStorageRoutes: ((app: Express) => void) | null = null;
let ObjectStorageService: any = null;
let objectStorageClient: any = null;
try {
  const replitStorage = await import("./replit_integrations/object_storage");
  registerObjectStorageRoutes = replitStorage.registerObjectStorageRoutes;
  ObjectStorageService = replitStorage.ObjectStorageService;
  objectStorageClient = replitStorage.objectStorageClient;
} catch {
  console.log("Replit object storage not available, using portable storage adapter");
}

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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.fbx') {
      cb(null, true);
    } else {
      cb(new Error('Only FBX files are allowed'));
    }
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register ObjectStore proxy routes (always available)
  registerObjectStoreProxyRoutes(app);
  
  // Register Replit object storage routes if available (legacy fallback)
  if (registerObjectStorageRoutes) {
    registerObjectStorageRoutes(app);
  }
  
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
      
      // Upload via portable storage adapter
      try {
        const fileExtension = url.split('.').pop()?.split('?')[0] || 'bin';
        const fileName = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.${fileExtension}`;
        
        const storedPath = await storageAdapter.upload(
          fileName,
          Buffer.from(buffer),
          contentType
        );
        
        // Persist asset to project storage if projectId provided
        let persistedAsset = null;
        if (projectId) {
          persistedAsset = await storage.createAsset(projectId, {
            name,
            type: type || 'model',
            path: storedPath,
          });
        }
        
        res.json({
          success: true,
          path: storedPath,
          contentType,
          size: buffer.byteLength,
          fileName,
          asset: persistedAsset,
        });
      } catch (storageError) {
        console.error('Storage upload failed:', storageError);
        // Return the original URL as fallback
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
  
  // Get a fresh signed URL for an object (or public URL via portable adapter)
  app.get("/api/assets/signed-url/:objectId", async (req, res) => {
    try {
      const objectPath = `/uploads/${req.params.objectId}`;
      const fileExists = await storageAdapter.exists(objectPath);
      if (!fileExists) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      const publicUrl = storageAdapter.getPublicUrl(objectPath);
      res.json({ signedUrl: publicUrl });
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
      
      // Process each layer
      for (let i = 0; i < xcf.layers.length; i++) {
        const layer = xcf.layers[i];
        const layerName = layer.name || `Layer_${i}`;
        
        // Get layer pixel data as PNG
        try {
          const layerBuffer = layer.toPNG();
          
          // Upload via portable storage adapter
          const safeLayerName = layerName.replace(/[^a-zA-Z0-9-_]/g, '_');
          const storedPath = await storageAdapter.upload(
            `${safeLayerName}.png`,
            layerBuffer,
            'image/png'
          );
          
          // Create asset in project if projectId provided
          if (projectId) {
            await storage.createAsset(projectId, {
              name: `${fileName.replace('.xcf', '')} - ${layerName}`,
              type: 'texture',
              path: storedPath,
            });
          }
          
          extractedLayers.push({
            name: layerName,
            width: layer.width,
            height: layer.height,
            x: layer.x,
            y: layer.y,
            path: storedPath,
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

  return httpServer;
}
