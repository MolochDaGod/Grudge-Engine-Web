/**
 * PipelinePanel.tsx — Grudge Pipeline Studio integration
 *
 * Connects the engine editor to https://grudge-pipeline.vercel.app
 *
 * Tabs:
 *   Text → 3D   Claude AI optimises your prompt → Meshy generates model →
 *               auto-rig → load GLB directly into the current Babylon.js scene
 *
 *   Tools       Quick Retexture / Remesh operations on any URL or selected asset
 *
 *   Generated   History of pipeline jobs; re-load any finished model
 */

import { useState, useRef, useCallback } from 'react';
import {
  Loader2, Send, Sparkles, RotateCcw, Download,
  ChevronRight, Check, AlertCircle, Layers, Paintbrush,
  Box, Workflow, ImagePlus, RefreshCw,
} from 'lucide-react';
import { Button }       from '@/components/ui/button';
import { Input }        from '@/components/ui/input';
import { ScrollArea }   from '@/components/ui/scroll-area';
import { Badge }        from '@/components/ui/badge';
import { useEngineStore } from '@/lib/engine-store';
import {
  pipeline,
  type ChatMessage,
  type MeshyJobPoll,
  type MeshyStatus,
} from '@/lib/pipeline-client';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab   = 'generate' | 'tools' | 'history';
type Stage = 'idle' | 'chatting' | 'generating' | 'rigging' | 'done' | 'error';

interface GeneratedAsset {
  id:           string;
  name:         string;
  glbUrl:       string;
  fbxUrl?:      string;
  thumbnailUrl?: string;
  taskId:       string;
  createdAt:    Date;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Stage badge ───────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<Stage, string> = {
  idle:       '',
  chatting:   'Optimising prompt…',
  generating: 'Generating 3D model…',
  rigging:    'Rigging character…',
  done:       'Done!',
  error:      'Error',
};

// ── Main component ────────────────────────────────────────────────────────────

export function PipelinePanel() {
  const { addConsoleLog, addAsset } = useEngineStore();
  const [activeTab, setActiveTab] = useState<Tab>('generate');

  // ── Text → 3D state ─────────────────────────────────────────────────────────
  const [userPrompt, setUserPrompt]         = useState('');
  const [chatHistory, setChatHistory]       = useState<ChatMessage[]>([]);
  const [stage, setStage]                   = useState<Stage>('idle');
  const [stageLabel, setStageLabel]         = useState('');
  const [progress, setProgress]             = useState(0);
  const [optimisedParams, setOptimisedParams] = useState<any>(null);
  const [lastResult, setLastResult]         = useState<GeneratedAsset | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [withRefine, setWithRefine]         = useState(false);
  const [history, setHistory]               = useState<GeneratedAsset[]>([]);

  // ── Tools state ─────────────────────────────────────────────────────────────
  const [toolModelUrl,   setToolModelUrl]   = useState('');
  const [toolPrompt,     setToolPrompt]     = useState('');
  const [toolJob,        setToolJob]        = useState<MeshyJobPoll | null>(null);
  const [toolLoading,    setToolLoading]    = useState(false);
  const [toolError,      setToolError]      = useState<string | null>(null);

  const abortRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const onStep = useCallback((label: string, pct: number) => {
    setStageLabel(label);
    setProgress(pct);
  }, []);

  const reset = () => {
    abortRef.current = false;
    setStage('idle');
    setProgress(0);
    setStageLabel('');
    setError(null);
    setOptimisedParams(null);
  };

  // Load GLB into the Babylon.js scene via the engine store
  const loadIntoScene = useCallback((asset: GeneratedAsset) => {
    addAsset({
      id:        asset.taskId,
      name:      asset.name,
      type:      'mesh',
      path:      asset.glbUrl,
      thumbnail: asset.thumbnailUrl,
    });
    addConsoleLog({
      type:    'info',
      message: `Pipeline: loaded "${asset.name}" → ${asset.glbUrl}`,
      source:  'Pipeline',
    });
  }, [addAsset, addConsoleLog]);

  // ── Chat step: get optimised params ─────────────────────────────────────────
  const handleOptimise = async () => {
    if (!userPrompt.trim() || stage !== 'idle') return;
    setError(null);
    setStage('chatting');
    setStageLabel('Asking AI to optimise prompt…');

    const msg: ChatMessage = { role: 'user', content: userPrompt };
    const newHistory       = [...chatHistory, msg];
    setChatHistory(newHistory);

    try {
      const resp = await pipeline.chat(newHistory);
      const aiMsg: ChatMessage = { role: 'assistant', content: resp.reply };
      setChatHistory(prev => [...prev, aiMsg]);

      if (resp.extractedParams) {
        setOptimisedParams(resp.extractedParams);
        addConsoleLog({ type: 'info', message: 'Pipeline: prompt optimised by Claude', source: 'Pipeline' });
      }
      setStage('idle');
      setStageLabel('');
    } catch (e: any) {
      setError(e.message);
      setStage('error');
      addConsoleLog({ type: 'error', message: `Pipeline chat error: ${e.message}`, source: 'Pipeline' });
    }
  };

  // ── Full generate → rig pipeline ─────────────────────────────────────────────
  const handleGenerate = async () => {
    const prompt = optimisedParams?.prompt ?? userPrompt.trim();
    if (!prompt || stage !== 'idle') return;

    abortRef.current = false;
    setError(null);
    setStage('generating');
    setProgress(0);

    try {
      const result = await pipeline.generateCharacter(
        prompt,
        (label, pct) => {
          onStep(label, pct);
          if (label.includes('Rig')) setStage('rigging');
          else setStage('generating');
        },
        withRefine,
      );

      const asset: GeneratedAsset = {
        id:           crypto.randomUUID(),
        name:         prompt.slice(0, 32),
        glbUrl:       result.glbUrl,
        fbxUrl:       result.fbxUrl,
        thumbnailUrl: result.thumbnailUrl,
        taskId:       result.taskId,
        createdAt:    new Date(),
      };

      setLastResult(asset);
      setHistory(prev => [asset, ...prev]);
      setStage('done');
      setProgress(100);
      addConsoleLog({ type: 'info', message: `Pipeline: model ready — ${result.glbUrl}`, source: 'Pipeline' });

      // Auto-load into scene
      loadIntoScene(asset);
    } catch (e: any) {
      if (abortRef.current) return;
      setError(e.message);
      setStage('error');
      addConsoleLog({ type: 'error', message: `Pipeline error: ${e.message}`, source: 'Pipeline' });
    }
  };

  // ── Retexture tool ────────────────────────────────────────────────────────────
  const handleRetexture = async () => {
    if (!toolModelUrl.trim()) return;
    setToolLoading(true);
    setToolError(null);
    setToolJob(null);
    try {
      const job = await pipeline.retexture({
        model_url:         toolModelUrl,
        text_style_prompt: toolPrompt || undefined,
      });
      // Poll
      const result = await pipeline.pollUntilDone(job.result.id, 'retexture', (pct) => {
        setToolJob(prev => prev ? { ...prev, progress: pct } : { id: job.result.id, status: 'IN_PROGRESS', progress: pct });
      });
      setToolJob(result);
      addConsoleLog({ type: 'info', message: `Retexture done: ${result.model_urls?.glb}`, source: 'Pipeline' });
    } catch (e: any) {
      setToolError(e.message);
    } finally {
      setToolLoading(false);
    }
  };

  // ── Remesh tool ──────────────────────────────────────────────────────────────
  const handleRemesh = async () => {
    if (!toolModelUrl.trim()) return;
    setToolLoading(true);
    setToolError(null);
    setToolJob(null);
    try {
      const job    = await pipeline.remesh({ model_url: toolModelUrl, topology: 'quad', target_polycount: 30_000 });
      const result = await pipeline.pollUntilDone(job.result.id, 'remesh', (pct) => {
        setToolJob(prev => prev ? { ...prev, progress: pct } : { id: job.result.id, status: 'IN_PROGRESS', progress: pct });
      });
      setToolJob(result);
      addConsoleLog({ type: 'info', message: `Remesh done: ${result.model_urls?.glb}`, source: 'Pipeline' });
    } catch (e: any) {
      setToolError(e.message);
    } finally {
      setToolLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const isRunning = stage === 'chatting' || stage === 'generating' || stage === 'rigging';

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground text-xs">

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-sidebar-border shrink-0">
        {([
          { id: 'generate', icon: Sparkles,   label: 'Text → 3D' },
          { id: 'tools',    icon: Paintbrush, label: 'Tools' },
          { id: 'history',  icon: Layers,     label: 'Generated' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1 px-2 h-6 rounded-sm text-xs transition-colors ${
              activeTab === id
                ? 'bg-sidebar-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" className="h-4 text-[10px] px-1.5 border-primary/40 text-primary">
          <Workflow className="w-2.5 h-2.5 mr-0.5" />pipeline
        </Badge>
      </div>

      {/* ── Tab: Text → 3D ───────────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Chat / AI area */}
          <ScrollArea className="flex-1 px-2 py-1">
            {chatHistory.length === 0 && (
              <div className="text-center py-6 text-muted-foreground/60">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary/60" />
                <div className="font-medium text-xs text-muted-foreground">Grudge Pipeline Studio</div>
                <div className="text-[10px] mt-1">Powered by Meshy AI + Claude claude-haiku-4-5</div>
                <div className="mt-3 space-y-1 text-[10px] text-left max-w-xs mx-auto">
                  <div className="bg-sidebar-accent/40 rounded px-2 py-1 cursor-pointer hover:bg-sidebar-accent"
                    onClick={() => setUserPrompt('Orc warrior in heavy plate armor for Grudge Warlords, fantasy MMO style')}>
                    ⚔ Orc warrior in heavy plate armor
                  </div>
                  <div className="bg-sidebar-accent/40 rounded px-2 py-1 cursor-pointer hover:bg-sidebar-accent"
                    onClick={() => setUserPrompt('Elf ranger with longbow, leather armor, Grudge Warlords game style')}>
                    🏹 Elf ranger with longbow
                  </div>
                  <div className="bg-sidebar-accent/40 rounded px-2 py-1 cursor-pointer hover:bg-sidebar-accent"
                    onClick={() => setUserPrompt('Dwarf warrior with battle axe and shield, stocky build, fantasy RPG')}>
                    🪓 Dwarf warrior with axe & shield
                  </div>
                  <div className="bg-sidebar-accent/40 rounded px-2 py-1 cursor-pointer hover:bg-sidebar-accent"
                    onClick={() => setUserPrompt('Undead mage with staff, necrotic aura, dark robes, Grudge Warlords')}>
                    💀 Undead mage with staff
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {chatHistory.map((m, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded ${
                  m.role === 'user'
                    ? 'bg-primary/15 ml-4 text-foreground'
                    : 'bg-sidebar-accent mr-4 text-muted-foreground'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans text-[10px] leading-relaxed">{m.content}</pre>
                </div>
              ))}
            </div>

            {/* Progress */}
            {isRunning && (
              <div className="mt-3 space-y-2">
                <ProgressBar pct={progress} label={stageLabel || STAGE_LABEL[stage]} />
              </div>
            )}

            {/* Result */}
            {stage === 'done' && lastResult && (
              <div className="mt-3 bg-green-950/40 border border-green-800/50 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Model ready
                </div>
                {lastResult.thumbnailUrl && (
                  <img src={lastResult.thumbnailUrl} alt="preview" className="w-full max-h-32 object-contain rounded border border-green-800/30" />
                )}
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-6 text-[10px] bg-green-700 hover:bg-green-600"
                    onClick={() => loadIntoScene(lastResult)}>
                    <Box className="w-3 h-3 mr-1" />Load into Scene
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]"
                    onClick={() => window.open(lastResult.glbUrl, '_blank')}>
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {stage === 'error' && error && (
              <div className="mt-2 bg-red-950/40 border border-red-800/50 rounded p-2 text-[10px] text-red-400">
                <AlertCircle className="w-3 h-3 inline mr-1" />{error}
              </div>
            )}

            {/* Optimised params preview */}
            {optimisedParams && stage === 'idle' && (
              <div className="mt-2 bg-primary/10 border border-primary/30 rounded p-2 space-y-1.5">
                <div className="text-[10px] text-primary font-medium">AI-optimised params ready</div>
                <pre className="text-[9px] text-muted-foreground overflow-x-auto">
                  {JSON.stringify(optimisedParams, null, 2)}
                </pre>
              </div>
            )}
          </ScrollArea>

          {/* Input row */}
          <div className="border-t border-sidebar-border p-2 space-y-1.5 shrink-0">
            <div className="flex gap-1">
              <Input
                placeholder="Describe a character (e.g. orc warrior, T-pose)…"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && stage === 'idle') handleOptimise(); }}
                className="flex-1 h-7 text-xs"
                disabled={isRunning}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                disabled={!userPrompt.trim() || isRunning}
                onClick={handleOptimise}
                title="Ask Claude to optimise the prompt"
              >
                {stage === 'chatting' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={withRefine}
                  onChange={e => setWithRefine(e.target.checked)}
                  className="w-3 h-3"
                />
                Refine textures (slower, better quality)
              </label>
              <div className="flex-1" />
              {(stage === 'done' || stage === 'error') && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={reset}>
                  <RotateCcw className="w-3 h-3 mr-1" />New
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!userPrompt.trim() && !optimisedParams || isRunning}
                onClick={handleGenerate}
              >
                {isRunning
                  ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  : <ChevronRight className="w-3 h-3 mr-1" />}
                {isRunning ? stageLabel || 'Working…' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Tools ───────────────────────────────────────────────────────── */}
      {activeTab === 'tools' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Model URL</div>
            <Input
              placeholder="https://assets.meshy.ai/… or assets.grudge-studio.com/…"
              value={toolModelUrl}
              onChange={e => setToolModelUrl(e.target.value)}
              className="h-7 text-xs mb-1.5"
            />
            <Input
              placeholder="Style prompt for retexture (optional)"
              value={toolPrompt}
              onChange={e => setToolPrompt(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
              disabled={toolLoading || !toolModelUrl.trim()} onClick={handleRetexture}>
              {toolLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Paintbrush className="w-3 h-3 mr-1" />}
              Retexture
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
              disabled={toolLoading || !toolModelUrl.trim()} onClick={handleRemesh}>
              {toolLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Remesh
            </Button>
          </div>

          {toolJob && (
            <div className="bg-sidebar-accent rounded p-2 space-y-1.5">
              <ProgressBar pct={toolJob.progress ?? 0} label={toolJob.status} />
              {toolJob.status === 'SUCCEEDED' && (
                <div className="space-y-1">
                  {toolJob.model_urls?.glb && (
                    <Button size="sm" className="w-full h-6 text-[10px]"
                      onClick={() => {
                        addAsset({ id: crypto.randomUUID(), name: 'Tool result', type: 'mesh', path: toolJob.model_urls!.glb! });
                        addConsoleLog({ type: 'info', message: `Tool result loaded: ${toolJob.model_urls!.glb}`, source: 'Pipeline' });
                      }}>
                      <Box className="w-3 h-3 mr-1" />Load GLB into Scene
                    </Button>
                  )}
                  <a href={toolJob.model_urls?.glb} target="_blank" rel="noreferrer"
                    className="text-[10px] text-primary underline break-all block">
                    {toolJob.model_urls?.glb}
                  </a>
                </div>
              )}
            </div>
          )}
          {toolError && (
            <div className="bg-red-950/40 border border-red-800/40 rounded p-2 text-[10px] text-red-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />{toolError}
            </div>
          )}

          <div className="border-t border-sidebar-border pt-2">
            <div className="text-[10px] text-muted-foreground mb-1">Quick actions</div>
            <div className="space-y-1">
              <button className="w-full text-left text-[10px] px-2 py-1 rounded hover:bg-sidebar-accent text-muted-foreground"
                onClick={() => window.open('https://grudge-pipeline.vercel.app', '_blank')}>
                🔗 Open Pipeline Studio
              </button>
              <button className="w-full text-left text-[10px] px-2 py-1 rounded hover:bg-sidebar-accent text-muted-foreground"
                onClick={() => window.open('https://assets.grudge-studio.com', '_blank')}>
                📦 Browse Asset CDN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: History ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <ScrollArea className="flex-1 p-2">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/50">
              <ImagePlus className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs">No models generated yet</div>
              <div className="text-[10px] mt-1">Use the Text → 3D tab to generate</div>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(asset => (
                <div key={asset.id}
                  className="bg-sidebar-accent/60 border border-sidebar-border rounded-lg p-2 space-y-1.5">
                  {asset.thumbnailUrl && (
                    <img src={asset.thumbnailUrl} alt="" className="w-full max-h-24 object-contain rounded" />
                  )}
                  <div className="text-xs font-medium text-foreground truncate">{asset.name}</div>
                  <div className="text-[10px] text-muted-foreground">{asset.createdAt.toLocaleTimeString()}</div>
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 h-6 text-[10px]" onClick={() => loadIntoScene(asset)}>
                      <Box className="w-3 h-3 mr-1" />Load
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => window.open(asset.glbUrl, '_blank')}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
