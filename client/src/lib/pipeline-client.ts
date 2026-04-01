/**
 * pipeline-client.ts — Grudge Pipeline API client
 *
 * Connects grudge-engine-web (and other editors) to https://grudge-pipeline.vercel.app
 *
 * Capabilities:
 *   Text → 3D model (Meshy AI, quad topology, T-pose, GLB+FBX)
 *   Auto-rig          (Meshy rigging API)
 *   Retexture / Remesh (Meshy optimisation)
 *   Text → Image      (Meshy image API)
 *   AI prompt chat    (Claude claude-haiku-4-5 optimises Meshy prompts)
 *   ObjectStore       (upload assets to Cloudflare R2 + D1 catalog)
 *
 * Usage:
 *   import { pipeline } from '@/lib/pipeline-client';
 *
 *   // Ask AI to optimise your prompt, then generate:
 *   const { extractedParams } = await pipeline.chat([{ role:'user', content:'orc warrior' }]);
 *   const job = await pipeline.textTo3dPreview(extractedParams);
 *   const result = await pipeline.pollUntilDone(job.result.id, 'text-to-3d');
 *   const rigged = await pipeline.rig({ input_task_id: result.id });
 *   const rigResult = await pipeline.pollUntilDone(rigged.result.id, 'rig');
 *   // rigResult.model_urls.glb is the download URL
 */

const PIPELINE_BASE = 'https://grudge-pipeline.vercel.app';
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1_000; // 5 min

// ── Types ─────────────────────────────────────────────────────────────────────

export type MeshyStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

export interface MeshyJobRef  { result: { id: string } }
export interface MeshyJobPoll {
  id:          string;
  status:      MeshyStatus;
  progress:    number;          // 0–100
  model_urls?: { glb?: string; fbx?: string; obj?: string };
  thumbnail_url?: string;
  error?:      { message?: string };
  // Rig-specific
  rig_urls?:   { glb?: string; fbx?: string };
}

export interface ChatMessage  { role: 'user' | 'assistant'; content: string }
export interface ChatResponse {
  reply:           string;
  extractedPrompt?: string;
  extractedParams?: TextTo3dPreviewParams;
}

export interface TextTo3dPreviewParams {
  prompt:          string;
  ai_model?:       string;
  topology?:       'quad' | 'triangle';
  target_polycount?: number;
  pose_mode?:      string;
  should_remesh?:  boolean;
  enable_pbr?:     boolean;
  target_formats?: string[];
}

export interface TextTo3dRefineParams {
  preview_task_id: string;
  texture_prompt?: string;
  enable_pbr?:     boolean;
  ai_model?:       string;
}

export interface RigParams {
  input_task_id?: string;
  model_url?:     string;
  height_meters?: number;
}

export interface RetextureParams {
  input_task_id?:    string;
  model_url?:        string;
  text_style_prompt?: string;
  image_style_url?:  string;
  enable_pbr?:       boolean;
  remove_lighting?:  boolean;
}

export interface RemeshParams {
  input_task_id?:    string;
  model_url?:        string;
  target_polycount?: number;
  topology?:         'quad' | 'triangle';
  resize_height?:    number;
  target_formats?:   string[];
}

export interface TextToImageParams {
  prompt:              string;
  ai_model?:           string;
  generate_multi_view?: boolean;
  pose_mode?:          string;
  aspect_ratio?:       string;
}

export interface PipelineError extends Error { status?: number; body?: unknown }

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function call<T>(
  path:    string,
  method:  'GET' | 'POST' = 'GET',
  body?:   unknown,
  token?:  string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${PIPELINE_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as any).error || `Pipeline API ${res.status}: ${path}`,
    ) as PipelineError;
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data as T;
}

// ── Pipeline API client ───────────────────────────────────────────────────────

export const pipeline = {

  // ── Health ─────────────────────────────────────────────────────────────────
  async health(): Promise<{ status: string }> {
    return call('/api/healthz');
  },

  // ── Meshy AI chat (Claude claude-haiku-4-5 prompt optimiser) ─────────────────────────
  /**
   * Ask the Claude-powered assistant to optimise a Meshy generation prompt.
   * Returns the assistant reply + parsed JSON params you can pass straight
   * to textTo3dPreview().
   */
  async chat(messages: ChatMessage[], token?: string): Promise<ChatResponse> {
    return call<ChatResponse>('/api/meshy/chat', 'POST', { messages }, token);
  },

  // ── Text → 3D ──────────────────────────────────────────────────────────────

  /** Start a text-to-3D preview generation job. Returns a job id. */
  async textTo3dPreview(
    params: TextTo3dPreviewParams,
    token?: string,
  ): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/text-to-3d/preview', 'POST', {
      prompt:          params.prompt,
      ai_model:        params.ai_model        ?? 'latest',
      topology:        params.topology        ?? 'quad',
      target_polycount: params.target_polycount ?? 30_000,
      pose_mode:       params.pose_mode        ?? 't-pose',
      should_remesh:   params.should_remesh    ?? true,
      enable_pbr:      params.enable_pbr       ?? true,
      target_formats:  params.target_formats   ?? ['glb', 'fbx'],
    }, token);
  },

  /** Refine a completed preview into a full-detail model. */
  async textTo3dRefine(params: TextTo3dRefineParams, token?: string): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/text-to-3d/refine', 'POST', params, token);
  },

  /** Get the current status / download URLs for a text-to-3D job. */
  async textTo3dStatus(id: string, token?: string): Promise<MeshyJobPoll> {
    return call<MeshyJobPoll>(`/api/meshy/text-to-3d/${id}`, 'GET', undefined, token);
  },

  // ── Auto-rig ───────────────────────────────────────────────────────────────

  /** Submit a Meshy auto-rig job on a completed model. */
  async rig(params: RigParams, token?: string): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/rig', 'POST', {
      height_meters: params.height_meters ?? 1.7,
      ...(params.input_task_id ? { input_task_id: params.input_task_id } : {}),
      ...(params.model_url     ? { model_url:     params.model_url     } : {}),
    }, token);
  },

  /** Poll a rig job. rig_urls.glb is the download URL when SUCCEEDED. */
  async rigStatus(id: string, token?: string): Promise<MeshyJobPoll> {
    return call<MeshyJobPoll>(`/api/meshy/rig/${id}`, 'GET', undefined, token);
  },

  // ── Retexture ──────────────────────────────────────────────────────────────

  async retexture(params: RetextureParams, token?: string): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/retexture', 'POST', params, token);
  },
  async retextureStatus(id: string, token?: string): Promise<MeshyJobPoll> {
    return call<MeshyJobPoll>(`/api/meshy/retexture/${id}`, 'GET', undefined, token);
  },

  // ── Remesh ────────────────────────────────────────────────────────────────

  async remesh(params: RemeshParams, token?: string): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/remesh', 'POST', params, token);
  },
  async remeshStatus(id: string, token?: string): Promise<MeshyJobPoll> {
    return call<MeshyJobPoll>(`/api/meshy/remesh/${id}`, 'GET', undefined, token);
  },

  // ── Text → Image ──────────────────────────────────────────────────────────

  async textToImage(params: TextToImageParams, token?: string): Promise<MeshyJobRef> {
    return call<MeshyJobRef>('/api/meshy/text-to-image', 'POST', params, token);
  },
  async textToImageStatus(id: string, token?: string): Promise<MeshyJobPoll> {
    return call<MeshyJobPoll>(`/api/meshy/text-to-image/${id}`, 'GET', undefined, token);
  },

  // ── Polling helper ─────────────────────────────────────────────────────────

  /**
   * Poll a Meshy job until it SUCCEEDS, FAILS, or times out.
   *
   * @param type  'text-to-3d' | 'rig' | 'retexture' | 'remesh' | 'text-to-image'
   * @param onProgress  Called with progress 0–100 on each tick
   */
  async pollUntilDone(
    id:          string,
    type:        'text-to-3d' | 'rig' | 'retexture' | 'remesh' | 'text-to-image',
    onProgress?: (pct: number, status: MeshyStatus) => void,
    token?:      string,
  ): Promise<MeshyJobPoll> {
    const statusFn: (id: string, t?: string) => Promise<MeshyJobPoll> = {
      'text-to-3d':   pipeline.textTo3dStatus,
      'rig':          pipeline.rigStatus,
      'retexture':    pipeline.retextureStatus,
      'remesh':       pipeline.remeshStatus,
      'text-to-image': pipeline.textToImageStatus,
    }[type];

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const job = await statusFn(id, token);
      onProgress?.(job.progress ?? 0, job.status);

      if (job.status === 'SUCCEEDED') return job;
      if (job.status === 'FAILED' || job.status === 'EXPIRED') {
        throw new Error(`Meshy ${type} job ${id} ${job.status}: ${job.error?.message ?? 'unknown error'}`);
      }

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }

    throw new Error(`Meshy ${type} job ${id} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
  },

  // ── Convenience: full text→3D→rig pipeline in one call ───────────────────

  /**
   * Full pipeline: text prompt → preview → (optional refine) → rig → GLB URL
   *
   * @param prompt       Character/object description
   * @param onStep       Called at each major step for UI feedback
   * @param refine       Run the expensive refine step (better textures, slower)
   * @param token        Grudge ID JWT for authenticated uploads
   */
  async generateCharacter(
    prompt:    string,
    onStep?:   (step: string, pct: number) => void,
    refine =   false,
    token?:    string,
  ): Promise<{ glbUrl: string; fbxUrl?: string; thumbnailUrl?: string; taskId: string }> {

    // 1. Preview
    onStep?.('Generating preview…', 5);
    const previewJob = await pipeline.textTo3dPreview({ prompt }, token);
    const previewId  = previewJob.result.id;

    const preview = await pipeline.pollUntilDone(previewId, 'text-to-3d',
      (pct) => onStep?.('Generating 3D model…', 5 + Math.round(pct * 0.45)),
      token,
    );

    let finalId = previewId;

    // 2. Refine (optional)
    if (refine) {
      onStep?.('Refining textures…', 50);
      const refineJob    = await pipeline.textTo3dRefine({ preview_task_id: previewId }, token);
      const refineResult = await pipeline.pollUntilDone(refineJob.result.id, 'text-to-3d',
        (pct) => onStep?.('Refining textures…', 50 + Math.round(pct * 0.2)),
        token,
      );
      finalId = refineResult.id;
    }

    // 3. Auto-rig
    onStep?.('Rigging character…', refine ? 70 : 55);
    const rigJob    = await pipeline.rig({ input_task_id: finalId }, token);
    const rigResult = await pipeline.pollUntilDone(rigJob.result.id, 'rig',
      (pct) => onStep?.('Rigging character…', (refine ? 70 : 55) + Math.round(pct * 0.3)),
      token,
    );

    const glbUrl = rigResult.rig_urls?.glb ?? rigResult.model_urls?.glb ?? '';
    if (!glbUrl) throw new Error('Rig succeeded but no GLB URL returned');

    onStep?.('Done!', 100);

    return {
      glbUrl,
      fbxUrl:       rigResult.rig_urls?.fbx ?? rigResult.model_urls?.fbx,
      thumbnailUrl: preview.thumbnail_url,
      taskId:       finalId,
    };
  },

  // ── ObjectStore upload ────────────────────────────────────────────────────

  /**
   * Upload a file blob to the Grudge ObjectStore via the pipeline proxy.
   * Returns the CDN URL of the uploaded asset.
   */
  async uploadAsset(
    file:       Blob,
    filename:   string,
    category?:  string,
    token?:     string,
  ): Promise<{ url: string; key: string }> {
    const form = new FormData();
    form.append('file', file, filename);
    if (category) form.append('category', category);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${PIPELINE_BASE}/api/objectstore/upload`, {
      method: 'POST',
      headers,
      body:   form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || 'Upload failed');
    return data as { url: string; key: string };
  },

  /**
   * Download a remote GLB (e.g. from Meshy CDN) and re-upload it to the
   * Grudge ObjectStore so it's served from assets.grudge-studio.com.
   */
  async storeRemoteGlb(
    remoteUrl:  string,
    name:       string,
    token?:     string,
  ): Promise<{ url: string; key: string }> {
    const blob = await fetch(remoteUrl).then(r => r.blob());
    return pipeline.uploadAsset(blob, `${name}.glb`, 'characters', token);
  },
};

export default pipeline;
