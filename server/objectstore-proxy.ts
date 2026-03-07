import type { Express, Request, Response } from "express";
import { objectStoreCDN } from "./storage-adapter";
import { log } from "./index";

const OBJECTSTORE_BASE = "https://molochdagod.github.io/ObjectStore";

// In-memory JSON cache for API files
const jsonCache = new Map<string, { data: any; fetchedAt: number }>();
const JSON_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchObjectStoreJSON(filePath: string): Promise<any> {
  const cached = jsonCache.get(filePath);
  if (cached && Date.now() - cached.fetchedAt < JSON_CACHE_TTL) {
    return cached.data;
  }

  const url = `${OBJECTSTORE_BASE}/api/v1/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ObjectStore fetch failed: ${response.status} for ${url}`);
  }

  const data = await response.json();
  jsonCache.set(filePath, { data, fetchedAt: Date.now() });
  return data;
}

export function registerObjectStoreProxyRoutes(app: Express) {
  // Proxy ObjectStore API v1 JSON files with server-side caching
  app.get("/api/objectstore/v1/:file", async (req: Request, res: Response) => {
    try {
      const file = req.params.file;
      if (!file.endsWith(".json")) {
        return res.status(400).json({ error: "Only .json files supported" });
      }

      const data = await fetchObjectStoreJSON(file);
      res.set("Cache-Control", "public, max-age=300");
      res.json(data);
    } catch (error: any) {
      log(`ObjectStore proxy error: ${error.message}`, "objectstore");
      res.status(502).json({ error: "Failed to fetch from ObjectStore", details: error.message });
    }
  });

  // Resolve asset by SPRT UUID from asset-registry
  app.get("/api/objectstore/assets/:uuid", async (req: Request, res: Response) => {
    try {
      const registry = await fetchObjectStoreJSON("asset-registry.json");
      const asset = registry.assets?.[req.params.uuid];

      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json(asset);
    } catch (error: any) {
      log(`ObjectStore asset lookup error: ${error.message}`, "objectstore");
      res.status(502).json({ error: "Failed to look up asset" });
    }
  });

  // Search across ObjectStore data
  app.get("/api/objectstore/search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string || "").toLowerCase();
      const category = req.query.category as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      if (!query && !category) {
        return res.status(400).json({ error: "Provide ?q= or ?category= parameter" });
      }

      const registry = await fetchObjectStoreJSON("asset-registry.json");
      const results: any[] = [];

      for (const [uuid, asset] of Object.entries(registry.assets || {})) {
        if (results.length >= limit) break;

        const a = asset as any;
        const matchesQuery = !query || 
          a.name?.toLowerCase().includes(query) ||
          a.filename?.toLowerCase().includes(query) ||
          a.category?.toLowerCase().includes(query);
        const matchesCategory = !category || a.category === category;

        if (matchesQuery && matchesCategory) {
          results.push({ uuid, ...a });
        }
      }

      res.json({
        query,
        category: category || null,
        total: results.length,
        results,
      });
    } catch (error: any) {
      log(`ObjectStore search error: ${error.message}`, "objectstore");
      res.status(502).json({ error: "Search failed" });
    }
  });

  // Proxy binary assets (icons, sprites) from ObjectStore CDN
  app.get("/api/objectstore/cdn/*", async (req: Request, res: Response) => {
    try {
      const assetPath = req.params[0];
      if (!assetPath) {
        return res.status(400).json({ error: "Asset path required" });
      }

      const file = await objectStoreCDN.download(assetPath);
      res.set({
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Cache-Control": "public, max-age=86400",
      });
      res.send(file.data);
    } catch (error: any) {
      log(`ObjectStore CDN proxy error: ${error.message}`, "objectstore");
      res.status(404).json({ error: "Asset not found on CDN" });
    }
  });

  // List available ObjectStore categories
  app.get("/api/objectstore/categories", async (_req: Request, res: Response) => {
    try {
      const registry = await fetchObjectStoreJSON("asset-registry.json");
      const categories = new Map<string, number>();

      for (const asset of Object.values(registry.assets || {})) {
        const cat = (asset as any).category || "unknown";
        categories.set(cat, (categories.get(cat) || 0) + 1);
      }

      const result = Array.from(categories.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      res.json({ totalAssets: registry.totalAssets, categories: result });
    } catch (error: any) {
      res.status(502).json({ error: "Failed to fetch categories" });
    }
  });

  // Game data endpoints (convenience wrappers)
  const gameDataFiles = [
    "weapons", "armor", "consumables", "materials", "classes",
    "races", "skills", "factions", "terrain", "rendering",
    "sprites", "spriteMaps", "animations", "bosses", "enemies",
    "professions", "effectSprites", "weaponSkills", "abilityEffects"
  ];

  app.get("/api/gamedata/:type", async (req: Request, res: Response) => {
    const type = req.params.type;
    if (!gameDataFiles.includes(type)) {
      return res.status(404).json({ error: `Unknown game data type: ${type}`, available: gameDataFiles });
    }

    try {
      const data = await fetchObjectStoreJSON(`${type}.json`);
      res.set("Cache-Control", "public, max-age=600");
      res.json(data);
    } catch (error: any) {
      res.status(502).json({ error: `Failed to fetch ${type} data` });
    }
  });

  log("ObjectStore proxy routes registered", "objectstore");
}
