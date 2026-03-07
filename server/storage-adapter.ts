import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface StorageFile {
  name: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export interface IStorageAdapter {
  upload(fileName: string, data: Buffer, contentType: string): Promise<string>;
  download(objectPath: string): Promise<StorageFile>;
  exists(objectPath: string): Promise<boolean>;
  delete(objectPath: string): Promise<boolean>;
  getPublicUrl(objectPath: string): string;
  getUploadUrl?(): Promise<string>;
}

/**
 * Local filesystem adapter — default for development.
 * Stores files under public/uploads/.
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private baseDir: string;
  private publicPrefix: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "public", "uploads");
    this.publicPrefix = "/uploads";
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(fileName: string, data: Buffer, contentType: string): Promise<string> {
    const objectId = randomUUID();
    const ext = path.extname(fileName) || ".bin";
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${objectId}${ext}`;
    const filePath = path.join(this.baseDir, storedName);

    await fs.promises.writeFile(filePath, data);

    // Write metadata sidecar
    const meta = { originalName: safeName, contentType, size: data.length, uploadedAt: new Date().toISOString() };
    await fs.promises.writeFile(`${filePath}.meta.json`, JSON.stringify(meta, null, 2));

    return `${this.publicPrefix}/${storedName}`;
  }

  async download(objectPath: string): Promise<StorageFile> {
    const fileName = objectPath.replace(/^\/uploads\//, "");
    const filePath = path.join(this.baseDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${objectPath}`);
    }

    const data = await fs.promises.readFile(filePath);
    let contentType = "application/octet-stream";
    let originalName = fileName;

    const metaPath = `${filePath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
        contentType = meta.contentType || contentType;
        originalName = meta.originalName || originalName;
      } catch {}
    }

    return { name: originalName, contentType, size: data.length, data };
  }

  async exists(objectPath: string): Promise<boolean> {
    const fileName = objectPath.replace(/^\/uploads\//, "");
    return fs.existsSync(path.join(this.baseDir, fileName));
  }

  async delete(objectPath: string): Promise<boolean> {
    const fileName = objectPath.replace(/^\/uploads\//, "");
    const filePath = path.join(this.baseDir, fileName);
    try {
      await fs.promises.unlink(filePath);
      const metaPath = `${filePath}.meta.json`;
      if (fs.existsSync(metaPath)) await fs.promises.unlink(metaPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(objectPath: string): string {
    return objectPath.startsWith("/") ? objectPath : `${this.publicPrefix}/${objectPath}`;
  }
}

/**
 * ObjectStore CDN adapter — read-only, fetches from GitHub Pages.
 */
export class ObjectStoreCDNAdapter implements IStorageAdapter {
  private baseUrl: string;
  private cache: Map<string, { data: Buffer; contentType: string; fetchedAt: number }>;
  private cacheTtlMs: number;

  constructor(baseUrl?: string, cacheTtlMs?: number) {
    this.baseUrl = baseUrl || "https://molochdagod.github.io/ObjectStore";
    this.cache = new Map();
    this.cacheTtlMs = cacheTtlMs || 5 * 60 * 1000; // 5 min default
  }

  async upload(): Promise<string> {
    throw new Error("ObjectStore CDN is read-only. Cannot upload.");
  }

  async download(objectPath: string): Promise<StorageFile> {
    const cleanPath = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
    const cacheKey = cleanPath;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return {
        name: path.basename(cleanPath),
        contentType: cached.contentType,
        size: cached.data.length,
        data: cached.data,
      };
    }

    const url = `${this.baseUrl}/${cleanPath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ObjectStore CDN fetch failed: ${response.status} ${response.statusText} for ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    this.cache.set(cacheKey, { data: buffer, contentType, fetchedAt: Date.now() });

    return {
      name: path.basename(cleanPath),
      contentType,
      size: buffer.length,
      data: buffer,
    };
  }

  async exists(objectPath: string): Promise<boolean> {
    try {
      const cleanPath = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
      const url = `${this.baseUrl}/${cleanPath}`;
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async delete(): Promise<boolean> {
    throw new Error("ObjectStore CDN is read-only. Cannot delete.");
  }

  getPublicUrl(objectPath: string): string {
    const cleanPath = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
    return `${this.baseUrl}/${cleanPath}`;
  }
}

/**
 * Resolves the appropriate storage adapter based on environment.
 */
export function createStorageAdapter(): IStorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "local":
      return new LocalStorageAdapter();
    case "objectstore":
      return new ObjectStoreCDNAdapter(process.env.OBJECTSTORE_BASE_URL);
    default:
      console.warn(`Unknown STORAGE_PROVIDER "${provider}", falling back to local`);
      return new LocalStorageAdapter();
  }
}

/** CDN-only instance for reading ObjectStore assets (always available) */
export const objectStoreCDN = new ObjectStoreCDNAdapter();

/** Primary upload/download adapter */
export const storageAdapter = createStorageAdapter();
