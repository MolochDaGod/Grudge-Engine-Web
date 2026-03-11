import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { storageAdapter } from "./storage-adapter";
import type { S3StorageAdapter } from "./storage-adapter";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { log } from "./index";

// Multer config for server-side uploads (memory storage → forward to S3)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Temp disk storage for ZIP processing
const tempDir = path.join(process.cwd(), "public", "uploads", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const zipDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`);
  },
});

const zipUpload = multer({
  storage: zipDiskStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB for ZIPs
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".zip") {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed on this endpoint"));
    }
  },
});

/** Helper: determine content type from extension */
function mimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".bmp": "image/bmp", ".ico": "image/x-icon",
    ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
    ".fbx": "application/octet-stream", ".obj": "text/plain",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".flac": "audio/flac", ".aac": "audio/aac",
    ".mp4": "video/mp4", ".webm": "video/webm",
    ".json": "application/json", ".js": "text/javascript",
    ".ts": "text/typescript", ".txt": "text/plain",
    ".css": "text/css", ".html": "text/html",
    ".wasm": "application/wasm", ".zip": "application/zip",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

/** Check if the adapter supports S3 features */
function isS3Adapter(adapter: any): adapter is S3StorageAdapter {
  return typeof adapter.listObjects === "function" &&
         typeof adapter.getUploadUrl === "function" &&
         typeof adapter.getSignedDownloadUrl === "function";
}

export function registerStorageRoutes(app: Express): void {
  // ============ PRESIGNED UPLOAD URL ============
  app.post("/api/storage/upload-url", async (req: Request, res: Response) => {
    try {
      const { name, contentType, size } = req.body;
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      const ct = contentType || mimeFromExt(name);

      if (isS3Adapter(storageAdapter)) {
        const result = JSON.parse(await storageAdapter.getUploadUrl(name, ct));
        return res.json({
          uploadUrl: result.url,
          key: result.key,
          method: "PUT",
          contentType: ct,
          metadata: { name, size, contentType: ct },
        });
      }

      // Fallback: return a local upload endpoint
      res.json({
        uploadUrl: "/api/storage/upload",
        key: null,
        method: "POST",
        contentType: ct,
        metadata: { name, size, contentType: ct },
        fallback: true,
      });
    } catch (error: any) {
      log(`Storage upload-url error: ${error.message}`, "storage");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // ============ DIRECT MULTIPART UPLOAD ============
  app.post("/api/storage/upload", memoryUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const folder = (req.body.folder as string) || "";
      const fileName = folder
        ? `${folder.replace(/\/$/, "")}/${req.file.originalname}`
        : req.file.originalname;

      const contentType = req.file.mimetype || mimeFromExt(req.file.originalname);
      const storedKey = await storageAdapter.upload(fileName, req.file.buffer, contentType);

      res.json({
        success: true,
        key: storedKey,
        name: req.file.originalname,
        size: req.file.size,
        contentType,
      });
    } catch (error: any) {
      log(`Storage upload error: ${error.message}`, "storage");
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ============ MULTI-FILE UPLOAD ============
  app.post("/api/storage/upload-multi", memoryUpload.array("files", 50), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const folder = (req.body.folder as string) || "";
      const results = await Promise.all(
        files.map(async (file) => {
          const fileName = folder
            ? `${folder.replace(/\/$/, "")}/${file.originalname}`
            : file.originalname;
          const ct = file.mimetype || mimeFromExt(file.originalname);
          const key = await storageAdapter.upload(fileName, file.buffer, ct);
          return { key, name: file.originalname, size: file.size, contentType: ct };
        })
      );

      res.json({ success: true, uploaded: results.length, files: results });
    } catch (error: any) {
      log(`Storage multi-upload error: ${error.message}`, "storage");
      res.status(500).json({ error: "Multi-upload failed" });
    }
  });

  // ============ ZIP UPLOAD + UNZIP ============
  app.post("/api/storage/upload-zip", zipUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No ZIP file provided" });
      }

      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(req.file.path);
      const entries = zip.getEntries();
      const targetFolder = (req.body.folder as string) || `unzipped/${randomUUID()}`;

      const uploaded: Array<{ key: string; name: string; size: number; contentType: string }> = [];
      const skipped: string[] = [];

      for (const entry of entries) {
        // Skip directories and hidden files
        if (entry.isDirectory || entry.entryName.startsWith("__MACOSX") || entry.entryName.startsWith(".")) {
          skipped.push(entry.entryName);
          continue;
        }

        const data = entry.getData();
        if (data.length === 0) {
          skipped.push(entry.entryName);
          continue;
        }

        const entryPath = `${targetFolder.replace(/\/$/, "")}/${entry.entryName}`;
        const ct = mimeFromExt(entry.entryName);
        const key = await storageAdapter.upload(entryPath, data, ct);

        uploaded.push({
          key,
          name: entry.entryName,
          size: data.length,
          contentType: ct,
        });
      }

      // Clean up temp ZIP file
      try { fs.unlinkSync(req.file.path); } catch {}

      res.json({
        success: true,
        zipName: req.file.originalname,
        folder: targetFolder,
        uploaded: uploaded.length,
        skipped: skipped.length,
        files: uploaded,
      });
    } catch (error: any) {
      log(`Storage ZIP upload error: ${error.message}`, "storage");
      // Clean up on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ error: `ZIP upload failed: ${error.message}` });
    }
  });

  // ============ BROWSE STORAGE ============
  app.get("/api/storage/browse", async (req: Request, res: Response) => {
    try {
      const prefix = (req.query.prefix as string) || "";
      const cursor = (req.query.cursor as string) || undefined;
      const limit = parseInt((req.query.limit as string) || "100", 10);

      if (isS3Adapter(storageAdapter)) {
        const result = await storageAdapter.listObjects(prefix, cursor, limit);
        return res.json(result);
      }

      // Fallback: list local files
      const baseDir = path.join(process.cwd(), "public", "uploads");
      const targetDir = path.join(baseDir, prefix);

      if (!fs.existsSync(targetDir)) {
        return res.json({ items: [], folders: [], cursor: null, hasMore: false });
      }

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = entries
        .filter(e => e.isFile() && !e.name.endsWith(".meta.json"))
        .map(e => {
          const stats = fs.statSync(path.join(targetDir, e.name));
          return {
            key: prefix ? `${prefix}${e.name}` : e.name,
            size: stats.size,
            lastModified: stats.mtime,
            isFolder: false,
          };
        });

      const folders = entries
        .filter(e => e.isDirectory())
        .map(e => (prefix ? `${prefix}${e.name}/` : `${e.name}/`));

      res.json({ items, folders, cursor: null, hasMore: false });
    } catch (error: any) {
      log(`Storage browse error: ${error.message}`, "storage");
      res.status(500).json({ error: "Browse failed" });
    }
  });

  // ============ DOWNLOAD / SIGNED URL ============
  app.get("/api/storage/download", async (req: Request, res: Response) => {
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: "key query parameter required" });
      }

      if (isS3Adapter(storageAdapter)) {
        const signedUrl = await storageAdapter.getSignedDownloadUrl(key, 3600);
        return res.json({ url: signedUrl, key });
      }

      // Fallback: serve local file
      const publicUrl = storageAdapter.getPublicUrl(key);
      res.json({ url: publicUrl, key });
    } catch (error: any) {
      log(`Storage download error: ${error.message}`, "storage");
      res.status(500).json({ error: "Download failed" });
    }
  });

  // ============ DELETE OBJECT ============
  app.delete("/api/storage/delete", async (req: Request, res: Response) => {
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: "key query parameter required" });
      }

      const deleted = await storageAdapter.delete(key);
      res.json({ success: deleted, key });
    } catch (error: any) {
      log(`Storage delete error: ${error.message}`, "storage");
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // ============ STORAGE STATUS ============
  app.get("/api/storage/status", async (_req: Request, res: Response) => {
    try {
      const provider = process.env.STORAGE_PROVIDER || "local";
      const isS3 = isS3Adapter(storageAdapter);

      const status: Record<string, any> = {
        provider,
        isS3,
        bucket: isS3 ? process.env.BUCKET_NAME : null,
        endpoint: isS3 ? process.env.BUCKET_ENDPOINT : null,
        features: {
          presignedUpload: isS3,
          presignedDownload: isS3,
          browse: true,
          zipUpload: true,
          multiUpload: true,
        },
      };

      // Quick health check
      if (isS3) {
        try {
          await storageAdapter.listObjects!("", undefined, 1);
          status.healthy = true;
        } catch (e: any) {
          status.healthy = false;
          status.error = e.message;
        }
      } else {
        status.healthy = true;
        status.localDir = path.join(process.cwd(), "public", "uploads");
      }

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: "Status check failed" });
    }
  });

  log("Storage routes registered", "storage");
}
