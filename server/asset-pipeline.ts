import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import type {
  GrudgePipelineAsset,
  PipelineManifest,
  PipelineAssetFormat,
  PipelineAssetSource,
} from '@shared/pipeline-schema';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssetMetadata {
  id: string;
  name: string;
  format: string;
  originalFormat: string;
  size: number;
  meshCount?: number;
  animationCount?: number;
  skeletons?: number;
  materials?: string[];
  textures?: string[];
  hasBones: boolean;
  processedAt: string;
}

export interface ProcessedAsset {
  metadata: AssetMetadata;
  outputPath: string;
  glbPath?: string;
  gltfPath?: string;
  manifestPath: string;
  pipelineAsset?: GrudgePipelineAsset;
}

export interface GenerateCharacterOptions {
  name?: string;
  stylePrompt?: string;
  tags?: string[];
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  poseMode?: string;
}

interface UploadResult {
  objectStoreUrl?: string;
  cdnUrl?: string;
  raw?: Record<string, unknown>;
}

interface ConversionResult {
  glbPath?: string;
  gltfPath?: string;
  source: PipelineAssetSource;
  pipelineTaskId?: string;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class AssetPipeline {
  private workDir: string;
  private outputDir: string;
  private pipelineManifestPath: string;
  private pipelineUrl: string;
  private objectStoreUrl: string;
  private objectStoreApiKey: string;
  private cdnBase: string;

  constructor(baseDir: string = path.join(process.cwd(), 'public', 'assets')) {
    this.workDir = path.join(baseDir, 'processing');
    this.outputDir = path.join(baseDir, 'processed');
    this.pipelineManifestPath = path.join(baseDir, 'pipeline-manifest.json');

    this.pipelineUrl = (process.env.GRUDGE_PIPELINE_URL || 'http://localhost:3001').replace(/\/$/, '');
    this.objectStoreUrl = (process.env.OBJECTSTORE_WORKER_URL || 'https://objectstore.grudge-studio.com').replace(/\/$/, '');
    this.objectStoreApiKey = process.env.OBJECTSTORE_API_KEY || process.env.INTERNAL_API_KEY || '';
    this.cdnBase = (process.env.PUBLIC_CDN_URL || this.objectStoreUrl).replace(/\/$/, '');

    [this.workDir, this.outputDir].forEach((d) => this.ensureDir(d));
  }

  // ---- helpers ------------------------------------------------------------

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Convert an absolute path under public/ to a web-root-relative path */
  private toPublicPath(filePath: string): string {
    const publicRoot = path.resolve(process.cwd(), 'public');
    const abs = path.resolve(filePath);
    if (!abs.startsWith(publicRoot)) return filePath.replace(/\\/g, '/');
    return '/' + path.relative(publicRoot, abs).replace(/\\/g, '/');
  }

  private guessType(filePath: string): 'model' | 'animation' | 'texture' | 'scene' {
    const norm = filePath.replace(/\\/g, '/').toLowerCase();
    const ext = path.extname(norm);
    if (norm.includes('/scenes/') || norm.endsWith('/scene.gltf') || norm.endsWith('/scene.glb')) return 'scene';
    if (norm.includes('/animations/') || /idle|walk|run|jump|turn|slash|attack|block|crouch|kick|cast|death|hit|draw|sheath|power-up/i.test(path.basename(norm))) return 'animation';
    if (['.png', '.jpg', '.jpeg', '.webp', '.tga', '.bmp', '.gif', '.hdr', '.exr'].includes(ext)) return 'texture';
    return 'model';
  }

  private guessFormat(filePath: string): PipelineAssetFormat {
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const valid: PipelineAssetFormat[] = ['glb', 'gltf', 'fbx', 'obj', 'dae', 'stl', 'ply', '3ds', 'zip'];
    return valid.includes(ext as PipelineAssetFormat) ? (ext as PipelineAssetFormat) : 'glb';
  }

  // ---- unzip --------------------------------------------------------------

  async unzipFile(zipPath: string): Promise<string> {
    const extractDir = path.join(this.workDir, `extract_${randomUUID()}`);
    this.ensureDir(extractDir);
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
      return extractDir;
    } catch (error) {
      throw new Error(`Failed to unzip file: ${error}`);
    }
  }

  // ---- local conversion helpers -------------------------------------------

  /** Copy a .gltf and all its sidecar .bin / texture files */
  private copyGltfBundle(inputPath: string, outputName: string): { gltfPath: string } {
    const outputDir = path.join(this.outputDir, outputName);
    this.ensureDir(outputDir);
    const gltfPath = path.join(outputDir, `${outputName}.gltf`);
    fs.copyFileSync(inputPath, gltfPath);

    for (const entry of fs.readdirSync(path.dirname(inputPath), { withFileTypes: true })) {
      if (entry.name === path.basename(inputPath)) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const isSidecar = ext === '.bin' || ['.png', '.jpg', '.jpeg', '.webp', '.tga'].includes(ext);
      if (!isSidecar) continue;
      const src = path.join(path.dirname(inputPath), entry.name);
      const dst = path.join(outputDir, entry.name);
      if (entry.isDirectory()) fs.cpSync(src, dst, { recursive: true, force: true });
      else fs.copyFileSync(src, dst);
    }
    return { gltfPath };
  }

  private async convertWithFbx2Gltf(inputPath: string, outputPath: string): Promise<void> {
    const convert = require('fbx2gltf');
    await convert(inputPath, outputPath, []);
  }

  private async convertWithObj2Gltf(inputPath: string, outputPath: string): Promise<void> {
    const obj2gltf = require('obj2gltf');
    const glb = await obj2gltf(inputPath, { binary: true });
    fs.writeFileSync(outputPath, Buffer.from(glb));
  }

  // ---- Grudge Pipeline REST helpers ---------------------------------------

  private async requestPipeline(pathname: string, options: RequestInit): Promise<Record<string, any>> {
    const resp = await fetch(`${this.pipelineUrl}${pathname}`, {
      ...options,
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`Pipeline request failed (${resp.status}): ${detail}`);
    }
    return (await resp.json()) as Record<string, any>;
  }

  private extractTaskId(payload: Record<string, any>): string | undefined {
    return [payload?.result?.id, payload?.result, payload?.id, payload?.task_id, payload?.taskId]
      .find((v) => typeof v === 'string' && v.length > 0);
  }

  private extractTaskStatus(payload: Record<string, any>): string | undefined {
    return [payload?.result?.status, payload?.status, payload?.data?.status]
      .find((v) => typeof v === 'string' && v.length > 0);
  }

  private extractModelUrl(payload: Record<string, any>): string | undefined {
    return [
      payload?.model_urls?.glb, payload?.result?.model_urls?.glb,
      payload?.data?.model_urls?.glb, payload?.assets?.glb,
      payload?.result?.assets?.glb, payload?.glb_url,
      payload?.result?.glb_url, payload?.modelUrl,
      payload?.result?.modelUrl, payload?.output?.glb,
      payload?.result?.output?.glb,
    ].find((v) => typeof v === 'string' && v.length > 0);
  }

  private isTerminal(status?: string): boolean {
    const s = status?.toLowerCase();
    return !!s && ['succeeded', 'success', 'completed', 'complete', 'failed', 'error', 'cancelled', 'canceled'].includes(s);
  }

  private isFailure(status?: string): boolean {
    const s = status?.toLowerCase();
    return !!s && ['failed', 'error', 'cancelled', 'canceled'].includes(s);
  }

  private async pollPipelineTask(pathname: string, timeoutMs = 20 * 60_000, intervalMs = 5_000): Promise<Record<string, any>> {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const payload = await this.requestPipeline(pathname, { method: 'GET' });
      const status = this.extractTaskStatus(payload);
      if (this.isFailure(status)) throw new Error(`Pipeline task failed: ${status}`);
      if (this.isTerminal(status)) return payload;
      await this.sleep(intervalMs);
    }
    throw new Error(`Timed out polling pipeline task: ${pathname}`);
  }

  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const resp = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!resp.ok) throw new Error(`Download failed (${resp.status}): ${url}`);
    fs.writeFileSync(outputPath, Buffer.from(await resp.arrayBuffer()));
  }

  // ---- ObjectStore upload --------------------------------------------------

  private async uploadToObjectStore(
    filePath: string,
    meta: { filename?: string; category?: string; tags?: string[]; visibility?: string; metadata?: Record<string, unknown> },
  ): Promise<UploadResult> {
    if (!this.objectStoreApiKey) return {};

    const boundary = `----GrudgePipeline${Date.now()}`;
    const fileBuffer = fs.readFileSync(filePath);
    const filename = meta.filename || path.basename(filePath);
    const contentType = this.guessFormat(filePath) === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary';

    const fields: Record<string, string> = {};
    if (meta.filename) fields.filename = meta.filename;
    if (meta.category) fields.category = meta.category;
    if (meta.tags?.length) fields.tags = JSON.stringify(meta.tags);
    if (meta.visibility) fields.visibility = meta.visibility;
    if (meta.metadata) fields.metadata = JSON.stringify(meta.metadata);

    const enc = new TextEncoder();
    const fileHeader = enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    );
    let fieldBody = '';
    for (const [k, v] of Object.entries(fields)) {
      fieldBody += `\r\n--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`;
    }
    const tail = enc.encode(`${fieldBody}\r\n--${boundary}--\r\n`);

    const body = new Uint8Array(fileHeader.length + fileBuffer.length + tail.length);
    body.set(fileHeader, 0);
    body.set(fileBuffer, fileHeader.length);
    body.set(tail, fileHeader.length + fileBuffer.length);

    const resp = await fetch(`${this.objectStoreUrl}/v1/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-API-Key': this.objectStoreApiKey,
      },
      body,
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`ObjectStore upload failed (${resp.status}): ${detail}`);
    }

    const payload = (await resp.json()) as Record<string, any>;
    const assetId = typeof payload.id === 'string' ? payload.id : undefined;

    return {
      objectStoreUrl: assetId ? `${this.objectStoreUrl}/v1/assets/${assetId}` : undefined,
      cdnUrl: typeof payload.url === 'string'
        ? payload.url
        : assetId
          ? `${this.cdnBase}/v1/assets/${assetId}/file`
          : undefined,
      raw: payload,
    };
  }

  // ---- Grudge Pipeline remote conversion (Meshy remesh) --------------------

  private async convertViaGrudgePipeline(inputPath: string, outputName: string): Promise<ConversionResult> {
    // 1. Upload source asset so the pipeline can reach it
    const upload = await this.uploadToObjectStore(inputPath, {
      filename: path.basename(inputPath),
      category: 'model',
      tags: ['pipeline-source', 'conversion'],
      metadata: { localPath: inputPath },
    });
    const modelUrl = upload.cdnUrl || upload.objectStoreUrl;
    if (!modelUrl) throw new Error('Unable to upload source asset for pipeline conversion');

    // 2. Start a Meshy remesh task
    const remesh = await this.requestPipeline('/api/meshy/remesh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_url: modelUrl,
        target_formats: ['glb'],
        topology: 'triangle',
        target_polycount: 30_000,
        convert_format_only: true,
      }),
    });
    const taskId = this.extractTaskId(remesh);
    if (!taskId) throw new Error('Pipeline remesh did not return a task ID');

    // 3. Poll until done
    const result = await this.pollPipelineTask(`/api/meshy/remesh/${taskId}`);
    const resultUrl = this.extractModelUrl(result);
    if (!resultUrl) throw new Error('Pipeline remesh completed without a downloadable GLB URL');

    // 4. Download the converted GLB
    const outputDir = path.join(this.outputDir, outputName);
    this.ensureDir(outputDir);
    const glbPath = path.join(outputDir, `${outputName}.glb`);
    await this.downloadFile(resultUrl, glbPath);

    return { glbPath, source: 'meshy', pipelineTaskId: taskId };
  }

  // ---- Core conversion (local first, pipeline fallback) --------------------

  async convertToGLTF(inputPath: string, outputName: string): Promise<ConversionResult> {
    const outputDir = path.join(this.outputDir, outputName);
    this.ensureDir(outputDir);
    const glbPath = path.join(outputDir, `${outputName}.glb`);
    const ext = path.extname(inputPath).toLowerCase();

    // ---- attempt local conversion first ----
    try {
      if (ext === '.glb') {
        fs.copyFileSync(inputPath, glbPath);
        return { glbPath, source: 'local' };
      }
      if (ext === '.gltf') {
        const { gltfPath } = this.copyGltfBundle(inputPath, outputName);
        return { gltfPath, source: 'local' };
      }
      if (ext === '.fbx') {
        await this.convertWithFbx2Gltf(inputPath, glbPath);
        return { glbPath, source: 'local' };
      }
      if (ext === '.obj') {
        await this.convertWithObj2Gltf(inputPath, glbPath);
        return { glbPath, source: 'local' };
      }
    } catch (err) {
      console.warn(`Local conversion failed for ${inputPath}: ${err}`);
    }

    // ---- fall back to Grudge Pipeline (Meshy) ----
    try {
      return await this.convertViaGrudgePipeline(inputPath, outputName);
    } catch (err) {
      console.warn(`Pipeline conversion fallback failed for ${inputPath}: ${err}`);
    }

    // ---- last resort: copy original + marker ----
    const fallback = path.join(outputDir, path.basename(inputPath));
    fs.copyFileSync(inputPath, fallback);
    this.createConversionMarker(glbPath, path.basename(inputPath));
    return { glbPath, source: 'upload' };
  }

  private createConversionMarker(outputPath: string, sourceName: string): void {
    try {
      const marker = outputPath.replace(/\.glb$/i, '.conversion-needed');
      fs.writeFileSync(marker, `Original file: ${sourceName}\nThis asset requires a GLB conversion pass.`);
    } catch (_) { /* non-critical */ }
  }

  // ---- metadata extraction -------------------------------------------------

  async extractMetadata(filePath: string, outputName: string): Promise<AssetMetadata> {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const metadata: AssetMetadata = {
      id: randomUUID(),
      name: outputName,
      format: ext.replace('.', '').toUpperCase(),
      originalFormat: ext.replace('.', '').toUpperCase(),
      size: stats.size,
      meshCount: 0,
      animationCount: 0,
      skeletons: 0,
      materials: [],
      textures: [],
      hasBones: false,
      processedAt: new Date().toISOString(),
    };

    if (ext === '.gltf') {
      try {
        const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, any>;
        metadata.meshCount = Array.isArray(json.meshes) ? json.meshes.length : 0;
        metadata.animationCount = Array.isArray(json.animations) ? json.animations.length : 0;
        metadata.skeletons = Array.isArray(json.skins) ? json.skins.length : 0;
        metadata.materials = Array.isArray(json.materials)
          ? json.materials.map((m: any, i: number) => m?.name || `material-${i}`)
          : [];
        metadata.textures = Array.isArray(json.textures)
          ? json.textures.map((_: any, i: number) => `texture-${i}`)
          : [];
        metadata.hasBones = (metadata.skeletons || 0) > 0;
      } catch (err) {
        console.warn(`Could not parse GLTF metadata for ${filePath}: ${err}`);
      }
    } else if (['.glb', '.fbx'].includes(ext)) {
      // Heuristic: guess bone presence from naming conventions
      metadata.hasBones = /character|warrior|knight|mage|rogue|barbarian|animation|idle|walk|run|attack|skeleton/i.test(outputName);
      metadata.animationCount = /idle|walk|run|attack|slash|jump|block|death|turn|cast/i.test(outputName) ? 1 : 0;
    }

    return metadata;
  }

  // ---- pipeline-asset builder ---------------------------------------------

  private buildPipelineAsset(
    metadata: AssetMetadata,
    primaryPath: string,
    manifestPath: string,
    source: PipelineAssetSource,
    extra: { objectStoreUrl?: string; cdnUrl?: string; pipelineTaskId?: string; tags?: string[] } = {},
  ): GrudgePipelineAsset {
    return {
      id: metadata.id,
      name: metadata.name,
      type: this.guessType(primaryPath),
      format: this.guessFormat(primaryPath),
      localPath: this.toPublicPath(primaryPath),
      manifestPath: this.toPublicPath(manifestPath),
      objectStoreUrl: extra.objectStoreUrl,
      cdnUrl: extra.cdnUrl,
      metadata: {
        meshCount: metadata.meshCount || 0,
        animationCount: metadata.animationCount || 0,
        hasBones: metadata.hasBones,
        materialCount: metadata.materials?.length || 0,
        textureCount: metadata.textures?.length || 0,
        fileSize: metadata.size,
      },
      source,
      pipelineTaskId: extra.pipelineTaskId,
      tags: extra.tags || [],
      createdAt: metadata.processedAt,
      updatedAt: new Date().toISOString(),
    };
  }

  // ---- manifest helpers ---------------------------------------------------

  private writeAssetManifest(outputDir: string, payload: Record<string, unknown>): string {
    const p = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(p, JSON.stringify(payload, null, 2));
    return p;
  }

  private collectPipelineAssets(dir = this.outputDir): GrudgePipelineAsset[] {
    const assets: GrudgePipelineAsset[] = [];
    if (!fs.existsSync(dir)) return assets;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { assets.push(...this.collectPipelineAssets(full)); continue; }
      if (entry.isFile() && entry.name === 'manifest.json') {
        try {
          const m = JSON.parse(fs.readFileSync(full, 'utf-8')) as Record<string, any>;
          if (m.pipelineAsset) assets.push(m.pipelineAsset as GrudgePipelineAsset);
        } catch (_) { /* skip bad manifests */ }
      }
    }
    return assets.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Re-scan all per-asset manifests and write the root pipeline-manifest.json */
  syncPipelineManifest(): PipelineManifest {
    const manifest: PipelineManifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      assets: this.collectPipelineAssets(),
    };
    fs.writeFileSync(this.pipelineManifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  }

  // ---- primary entry: process a single asset ------------------------------

  async processAsset(
    inputPath: string,
    assetName: string,
    options: { syncToObjectStore?: boolean; tags?: string[] } = {},
  ): Promise<ProcessedAsset> {
    console.log(`[pipeline] Processing asset: ${assetName}`);

    const conversion = await this.convertToGLTF(inputPath, assetName);
    const primaryPath = conversion.glbPath || conversion.gltfPath || inputPath;
    const metadata = await this.extractMetadata(primaryPath, assetName);
    const outputDir = path.dirname(primaryPath);

    // ---- optional ObjectStore sync ----
    let upload: UploadResult = {};
    if ((options.syncToObjectStore ?? !!this.objectStoreApiKey) && fs.existsSync(primaryPath)) {
      try {
        upload = await this.uploadToObjectStore(primaryPath, {
          filename: path.basename(primaryPath),
          category: this.guessType(primaryPath),
          tags: options.tags || [this.guessType(primaryPath)],
          visibility: 'public',
          metadata: { originalFormat: metadata.originalFormat, processedAt: metadata.processedAt },
        });
      } catch (err) {
        console.warn(`ObjectStore sync failed for ${assetName}: ${err}`);
      }
    }

    // ---- write per-asset manifest ----
    const manifestPath = path.join(outputDir, 'manifest.json');
    const pipelineAsset = this.buildPipelineAsset(
      metadata,
      primaryPath,
      manifestPath,
      upload.cdnUrl ? 'objectstore' : conversion.source,
      { objectStoreUrl: upload.objectStoreUrl, cdnUrl: upload.cdnUrl, pipelineTaskId: conversion.pipelineTaskId, tags: options.tags },
    );

    this.writeAssetManifest(outputDir, {
      metadata,
      glbPath: conversion.glbPath ? path.basename(conversion.glbPath) : undefined,
      gltfPath: conversion.gltfPath ? path.basename(conversion.gltfPath) : undefined,
      pipelineAsset,
      createdAt: new Date().toISOString(),
    });

    this.syncPipelineManifest();

    return { metadata, outputPath: outputDir, glbPath: conversion.glbPath, gltfPath: conversion.gltfPath, manifestPath, pipelineAsset };
  }

  // ---- process a zip archive (bulk) ---------------------------------------

  async processZipArchive(
    zipPath: string,
    assetName: string,
    options: { syncToObjectStore?: boolean; tags?: string[] } = {},
  ): Promise<ProcessedAsset[]> {
    const extractDir = await this.unzipFile(zipPath);
    const results: ProcessedAsset[] = [];
    const modelExts = ['.glb', '.gltf', '.fbx', '.obj', '.dae', '.stl', '.ply', '.3ds'];
    const files = this.findFilesRecursive(extractDir, modelExts);

    for (const filePath of files) {
      try {
        const fn = path.basename(filePath, path.extname(filePath));
        const uniqueName = `${assetName}_${this.slugify(fn || randomUUID())}_${randomUUID().slice(0, 8)}`;
        results.push(await this.processAsset(filePath, uniqueName, options));
      } catch (err) {
        console.error(`Failed to process ${filePath}: ${err}`);
      }
    }

    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) { /* ok */ }
    this.syncPipelineManifest();
    return results;
  }

  // ---- AI character generation via Meshy text-to-3d -----------------------

  async generateCharacter(
    prompt: string,
    options: GenerateCharacterOptions = {},
  ): Promise<ProcessedAsset> {
    const safeName = this.slugify(options.name || prompt.slice(0, 60) || `generated-${Date.now()}`) || `generated-${Date.now()}`;

    // 1. Preview pass
    const preview = await this.requestPipeline('/api/meshy/text-to-3d/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ai_model: 'latest',
        topology: options.topology || 'quad',
        target_polycount: options.targetPolycount || 30_000,
        pose_mode: options.poseMode || 't-pose',
        should_remesh: true,
        enable_pbr: true,
        target_formats: ['glb', 'fbx'],
      }),
    });
    const previewId = this.extractTaskId(preview);
    if (!previewId) throw new Error('Meshy preview did not return a task ID');
    await this.pollPipelineTask(`/api/meshy/text-to-3d/${previewId}`);

    // 2. Refine pass
    const refine = await this.requestPipeline('/api/meshy/text-to-3d/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preview_task_id: previewId,
        texture_prompt: options.stylePrompt,
        enable_pbr: true,
        ai_model: 'latest',
      }),
    });
    const refineId = this.extractTaskId(refine);
    if (!refineId) throw new Error('Meshy refine did not return a task ID');
    const finalTask = await this.pollPipelineTask(`/api/meshy/text-to-3d/${refineId}`);

    const resultUrl = this.extractModelUrl(finalTask);
    if (!resultUrl) throw new Error('Meshy finished without a downloadable GLB URL');

    // 3. Download result
    const outputDir = path.join(this.outputDir, safeName);
    this.ensureDir(outputDir);
    const glbPath = path.join(outputDir, `${safeName}.glb`);
    await this.downloadFile(resultUrl, glbPath);

    // 4. Metadata + ObjectStore sync
    const metadata = await this.extractMetadata(glbPath, safeName);
    let upload: UploadResult = {};
    if (this.objectStoreApiKey) {
      try {
        upload = await this.uploadToObjectStore(glbPath, {
          filename: `${safeName}.glb`,
          category: 'model',
          tags: options.tags || ['generated', 'meshy'],
          visibility: 'public',
          metadata: { prompt, refineTaskId: refineId },
        });
      } catch (err) {
        console.warn(`ObjectStore sync failed for generated asset ${safeName}: ${err}`);
      }
    }

    // 5. Per-asset manifest
    const manifestPath = path.join(outputDir, 'manifest.json');
    const pipelineAsset = this.buildPipelineAsset(
      metadata, glbPath, manifestPath,
      upload.cdnUrl ? 'objectstore' : 'meshy',
      { objectStoreUrl: upload.objectStoreUrl, cdnUrl: upload.cdnUrl, pipelineTaskId: refineId, tags: options.tags || ['generated', 'meshy'] },
    );

    this.writeAssetManifest(outputDir, {
      metadata,
      glbPath: path.basename(glbPath),
      pipelineAsset,
      createdAt: new Date().toISOString(),
      prompt,
    });

    this.syncPipelineManifest();
    return { metadata, outputPath: outputDir, glbPath, manifestPath, pipelineAsset };
  }

  // ---- file walker --------------------------------------------------------

  private findFilesRecursive(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (extensions.includes(path.extname(entry.name).toLowerCase())) files.push(full);
      }
    };
    walk(dir);
    return files;
  }

  // ---- registry / manifest readers ----------------------------------------

  getAssetRegistry(): Map<string, AssetMetadata> {
    const registry = new Map<string, AssetMetadata>();
    const manifest = this.getPipelineManifest();
    for (const asset of manifest.assets) {
      registry.set(asset.id, {
        id: asset.id,
        name: asset.name,
        format: asset.format.toUpperCase(),
        originalFormat: asset.format.toUpperCase(),
        size: asset.metadata.fileSize,
        meshCount: asset.metadata.meshCount,
        animationCount: asset.metadata.animationCount,
        hasBones: asset.metadata.hasBones,
        processedAt: asset.updatedAt || asset.createdAt,
      });
    }
    return registry;
  }

  getPipelineManifest(): PipelineManifest {
    if (fs.existsSync(this.pipelineManifestPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.pipelineManifestPath, 'utf-8')) as PipelineManifest;
      } catch (_) { /* regenerate */ }
    }
    return this.syncPipelineManifest();
  }

  // ---- cleanup ------------------------------------------------------------

  cleanup(): void {
    try {
      if (fs.existsSync(this.workDir)) fs.rmSync(this.workDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Could not cleanup work directory: ${err}`);
    }
  }
}
