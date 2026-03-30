import { useState, useRef, useCallback } from 'react';
import {
  FileUp, ArrowRightLeft, Package, FileImage, Box, FileAudio, FileCode,
  Loader2, Check, AlertCircle, Layers, Sparkles, X, ChevronDown,
  Zap, Download, RefreshCw, BarChart3, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@shared/schema';

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  ext: string;
  size: number;
  assetType: AssetType;
  status: 'pending' | 'uploading' | 'converting' | 'complete' | 'error';
  progress: number;
  error?: string;
  resultPath?: string;
}

interface ConvertResult {
  outputPath: string;
  inputSize: number;
  outputSize: number;
  savings: number;
  duration: number;
  filename?: string;
}

interface AIReport {
  formatAnalysis: string;
  recommendations: string[];
  suggestedCompress: 'draco' | 'meshopt' | 'none';
  suggestedTextureSize: '2048' | '1024' | '512' | '256' | 'original';
  estimatedSavings: string;
  performanceScore: number;
  warnings: string[];
}

const SUPPORTED_MODELS = ['.gltf', '.glb', '.obj', '.fbx', '.stl', '.ply', '.dae', '.3ds'];
const SUPPORTED_TEXTURES = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tga', '.hdr', '.exr', '.xcf'];
const SUPPORTED_AUDIO = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
const SUPPORTED_SCRIPTS = ['.js', '.ts', '.json'];
const ALL_SUPPORTED = [...SUPPORTED_MODELS, ...SUPPORTED_TEXTURES, ...SUPPORTED_AUDIO, ...SUPPORTED_SCRIPTS];

function getAssetType(filename: string): AssetType {
  const ext = ('.' + filename.split('.').pop()).toLowerCase();
  if (SUPPORTED_MODELS.includes(ext)) return 'model';
  if (SUPPORTED_TEXTURES.includes(ext)) return 'texture';
  if (SUPPORTED_AUDIO.includes(ext)) return 'audio';
  return 'script';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getExt(filename: string) {
  return ('.' + filename.split('.').pop()).toLowerCase();
}

function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export function AssetImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'convert' | 'ai'>('import');

  // Import tab state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert tab state
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [convertOpts, setConvertOpts] = useState({
    compress: 'draco',
    textureSize: '1024',
    textureCompress: 'webp',
  });
  const [isConverting, setIsConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<ConvertResult | null>(null);
  const convertDropRef = useRef<HTMLDivElement>(null);

  // AI tab state
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [aiConvertRunning, setAiConvertRunning] = useState(false);
  const [aiConvertResult, setAiConvertResult] = useState<ConvertResult | null>(null);
  const aiDropRef = useRef<HTMLDivElement>(null);

  const { addAsset, addConsoleLog } = useEngineStore();

  // ────────────────────── IMPORT TAB ──────────────────────

  const addFilesToQueue = (files: File[]) => {
    const newItems: QueuedFile[] = files
      .filter(f => ALL_SUPPORTED.includes(getExt(f.name)))
      .map(f => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        ext: getExt(f.name),
        size: f.size,
        assetType: getAssetType(f.name),
        status: 'pending',
        progress: 0,
      }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const handleDropImport = (e: React.DragEvent) => {
    e.preventDefault();
    addFilesToQueue(Array.from(e.dataTransfer.files));
  };

  const processFile = async (item: QueuedFile) => {
    const updateStatus = (patch: Partial<QueuedFile>) =>
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, ...patch } : f));

    updateStatus({ status: 'uploading', progress: 0 });

    try {
      if (item.ext === '.fbx') {
        updateStatus({ status: 'converting', progress: 20 });
        const fd = new FormData();
        fd.append('file', item.file);
        const res = await fetch('/api/convert/fbx-upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'FBX conversion failed');
        const data = await res.json();
        const glbName = item.name.replace(/\.fbx$/i, '.glb');
        addAsset({ id: crypto.randomUUID(), name: glbName, type: 'model', path: data.outputPath });
        addConsoleLog({ type: 'info', message: `Converted & imported: ${glbName} (${(data.fileSize / 1024 / 1024).toFixed(2)}MB, ${data.duration}ms)`, source: 'Import' });
        updateStatus({ status: 'complete', progress: 100, resultPath: data.outputPath });

      } else if (item.ext === '.xcf') {
        updateStatus({ status: 'converting', progress: 20 });
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(item.file);
        });
        const r = await fetch('/api/assets/process-xcf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData: b64, fileName: item.name }),
        });
        if (!r.ok) throw new Error('XCF processing failed');
        const result = await r.json();
        for (const layer of result.layers) {
          if (layer.path) addAsset({ id: crypto.randomUUID(), name: `${item.name} - ${layer.name}`, type: 'texture', path: layer.path });
        }
        updateStatus({ status: 'complete', progress: 100 });

      } else {
        // Presigned URL upload with real progress
        const urlRes = await fetch('/api/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name, size: item.size, contentType: item.file.type || 'application/octet-stream' }),
        });
        if (!urlRes.ok) throw new Error('Failed to get upload URL');
        const { uploadURL } = await urlRes.json();
        await uploadWithProgress(item.file, uploadURL, pct => updateStatus({ progress: pct }));

        // Register with cloud asset registry
        await fetch('/api/assets/cloud/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name, type: item.assetType, uploadURL }),
        });

        addAsset({ id: crypto.randomUUID(), name: item.name, type: item.assetType, path: uploadURL.split('?')[0] });
        addConsoleLog({ type: 'info', message: `Uploaded: ${item.name} (${fmtSize(item.size)})`, source: 'Import' });
        updateStatus({ status: 'complete', progress: 100 });
      }
    } catch (err: any) {
      updateStatus({ status: 'error', error: String(err.message || err) });
      addConsoleLog({ type: 'error', message: `Import failed: ${item.name} — ${err.message}`, source: 'Import' });
    }
  };

  const importAll = async () => {
    const pending = queue.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setIsImporting(true);
    await runWithConcurrency(pending, 3, processFile);
    setIsImporting(false);
  };

  const removeQueued = (id: string) => setQueue(prev => prev.filter(f => f.id !== id));
  const clearCompleted = () => setQueue(prev => prev.filter(f => f.status !== 'complete'));
  const retryErrors = () => setQueue(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'pending', progress: 0, error: undefined } : f));

  const pendingCount = queue.filter(f => f.status === 'pending').length;
  const completeCount = queue.filter(f => f.status === 'complete').length;
  const errorCount = queue.filter(f => f.status === 'error').length;
  const totalSize = queue.reduce((a, f) => a + f.size, 0);

  // ────────────────────── CONVERT TAB ──────────────────────

  const handleConvertDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (SUPPORTED_MODELS.includes(getExt(file.name)))) {
      setConvertFile(file);
      setConvertResult(null);
    }
  };

  const runConvert = async () => {
    if (!convertFile) return;
    setIsConverting(true);
    setConvertResult(null);
    try {
      const ext = getExt(convertFile.name);
      const fd = new FormData();
      fd.append('file', convertFile);

      let endpoint = '/api/convert/to-glb';
      if (ext === '.glb' || ext === '.gltf') {
        // For already-GLB files, run optimizer
        endpoint = '/api/convert/optimize-glb';
        fd.append('compress', convertOpts.compress);
        fd.append('textureSize', convertOpts.textureSize);
        fd.append('textureCompress', convertOpts.textureCompress);
      }

      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Conversion failed');
      const data = await res.json();
      setConvertResult(data);
      addConsoleLog({ type: 'info', message: `Converted ${convertFile.name} → ${data.outputPath} in ${data.duration}ms`, source: 'Convert' });
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Conversion failed: ${err.message}`, source: 'Convert' });
    }
    setIsConverting(false);
  };

  const importConverted = () => {
    if (!convertResult) return;
    const name = convertFile ? convertFile.name.replace(/\.[^.]+$/, '.glb') : 'converted.glb';
    addAsset({ id: crypto.randomUUID(), name, type: 'model', path: convertResult.outputPath });
    addConsoleLog({ type: 'info', message: `Imported converted model: ${name}`, source: 'Convert' });
  };

  // ────────────────────── AI TAB ──────────────────────

  const handleAiDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && SUPPORTED_MODELS.includes(getExt(file.name))) {
      setAiFile(file);
      setAiReport(null);
      setAiConvertResult(null);
    }
  };

  const runAiAnalysis = async () => {
    if (!aiFile) return;
    setAiAnalyzing(true);
    setAiReport(null);
    try {
      const sizeMB = (aiFile.size / 1024 / 1024).toFixed(2);
      const ext = getExt(aiFile.name);
      const prompt = `You are a 3D asset optimization expert for real-time game engines (Babylon.js).
Analyze this 3D model file and return optimization recommendations as JSON:

File: ${aiFile.name}
Format: ${ext}
Size: ${sizeMB} MB

Return ONLY a JSON object with this exact structure:
{
  "formatAnalysis": "brief description of the format and its characteristics",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "suggestedCompress": "draco" | "meshopt" | "none",
  "suggestedTextureSize": "2048" | "1024" | "512" | "256" | "original",
  "estimatedSavings": "e.g. 40-60% file size reduction",
  "performanceScore": 1-10 (current performance suitability, 10 = perfect),
  "warnings": ["any warnings about the file"]
}

Consider:
- FBX files should always be converted to GLB
- Files > 5MB need Draco compression
- Files > 10MB need aggressive texture downscaling
- Texture size should match use case (character=1024, prop=512, background=256)`;

      // Use Puter.js AI if available, otherwise use fetch to a local AI endpoint
      let report: AIReport | null = null;

      if ((window as any).puter?.ai) {
        const response = await (window as any).puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
        const text = typeof response === 'string' ? response : response?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) report = JSON.parse(jsonMatch[0]);
      }

      if (!report) {
        // Fallback: generate a local heuristic report
        const sizeMBNum = parseFloat(sizeMB);
        report = {
          formatAnalysis: ext === '.fbx'
            ? 'FBX is a proprietary Autodesk format. It must be converted to GLB for web/Babylon.js use.'
            : ext === '.glb' ? 'GLB is the optimal binary glTF format for web rendering.'
            : ext === '.obj' ? 'OBJ is a legacy format without animation support. Convert to GLB for best results.'
            : `${ext.toUpperCase()} format detected.`,
          recommendations: [
            ext !== '.glb' ? 'Convert to GLB for optimal web delivery' : 'Already in GLB format — apply optimization pass',
            sizeMBNum > 5 ? 'Apply Draco geometry compression (typically 40-80% size reduction)' : 'Meshopt compression suitable for this file size',
            sizeMBNum > 2 ? 'Downscale textures to 1024px max for game use' : 'Texture size looks reasonable for real-time use',
          ],
          suggestedCompress: sizeMBNum > 3 ? 'draco' : 'meshopt',
          suggestedTextureSize: sizeMBNum > 10 ? '512' : sizeMBNum > 5 ? '1024' : 'original',
          estimatedSavings: sizeMBNum > 5 ? '50-70% file size reduction' : sizeMBNum > 1 ? '20-40% file size reduction' : '10-20% file size reduction',
          performanceScore: ext === '.glb' ? (sizeMBNum < 2 ? 9 : sizeMBNum < 10 ? 7 : 5) : 4,
          warnings: [
            ...(ext === '.fbx' ? ['FBX requires server-side conversion before loading in Babylon.js'] : []),
            ...(sizeMBNum > 20 ? ['File is very large — aggressive optimization strongly recommended'] : []),
          ],
        };
      }

      setAiReport(report);
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `AI analysis failed: ${err.message}`, source: 'AI' });
    }
    setAiAnalyzing(false);
  };

  const runAiConvert = async () => {
    if (!aiFile || !aiReport) return;
    setAiConvertRunning(true);
    setAiConvertResult(null);
    try {
      const ext = getExt(aiFile.name);
      const fd = new FormData();
      fd.append('file', aiFile);

      let res;
      if (ext === '.fbx') {
        res = await fetch('/api/convert/fbx-upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'FBX conversion failed');
        const data = await res.json();
        setAiConvertResult({ outputPath: data.outputPath, inputSize: aiFile.size, outputSize: data.fileSize, savings: Math.round((1 - data.fileSize / aiFile.size) * 100), duration: data.duration });
      } else {
        const fd2 = new FormData();
        fd2.append('file', aiFile);
        fd2.append('compress', aiReport.suggestedCompress);
        fd2.append('textureSize', aiReport.suggestedTextureSize === 'original' ? '' : aiReport.suggestedTextureSize);
        fd2.append('textureCompress', 'webp');
        res = await fetch('/api/convert/optimize-glb', { method: 'POST', body: fd2 });
        if (!res.ok) throw new Error((await res.json()).error || 'Optimization failed');
        const data = await res.json();
        setAiConvertResult(data);
      }

      addConsoleLog({ type: 'info', message: `AI-optimized ${aiFile.name} with ${aiReport.suggestedCompress} compression`, source: 'AI Convert' });
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `AI convert failed: ${err.message}`, source: 'AI Convert' });
    }
    setAiConvertRunning(false);
  };

  const importAiResult = () => {
    if (!aiConvertResult || !aiFile) return;
    const name = aiFile.name.replace(/\.[^.]+$/, '.glb');
    addAsset({ id: crypto.randomUUID(), name, type: 'model', path: aiConvertResult.outputPath });
    addConsoleLog({ type: 'info', message: `Imported AI-optimized model: ${name}`, source: 'AI Convert' });
  };

  // ────────────────────── RENDER ──────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-asset-importer">
          <Package className="w-3.5 h-3.5" />
          <span className="text-xs">Import</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Asset Importer & Converter
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="import" className="gap-1.5 text-xs" data-testid="tab-import">
              <FileUp className="w-3.5 h-3.5" />
              Bulk Import
              {pendingCount > 0 && <Badge className="h-4 px-1 text-[10px] ml-1">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="convert" className="gap-1.5 text-xs" data-testid="tab-convert">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs" data-testid="tab-ai">
              <Sparkles className="w-3.5 h-3.5" />
              AI Analyze
            </TabsTrigger>
          </TabsList>

          {/* ─── IMPORT TAB ─── */}
          <TabsContent value="import" className="flex-1 overflow-hidden flex flex-col mt-3 gap-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors shrink-0",
                queue.length > 0 ? "border-muted py-4" : "border-primary/50 hover:border-primary"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDropImport}
              onDragOver={e => e.preventDefault()}
              data-testid="drop-zone-import"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => addFilesToQueue(Array.from(e.target.files || []))}
                accept={ALL_SUPPORTED.join(',')}
              />
              <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                3D models · textures · audio · scripts — any quantity
              </p>
            </div>

            {queue.length > 0 && (
              <>
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{queue.length} files · {fmtSize(totalSize)}</span>
                    {completeCount > 0 && <span className="text-green-400">{completeCount} done</span>}
                    {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
                  </div>
                  <div className="flex gap-1">
                    {errorCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={retryErrors} className="h-6 text-xs gap-1">
                        <RefreshCw className="w-3 h-3" />Retry
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearCompleted} className="h-6 text-xs" data-testid="button-clear-completed">
                      Clear Done
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-2 space-y-1">
                    {queue.map(file => (
                      <div key={file.id} className="rounded-md bg-sidebar-accent/50 overflow-hidden">
                        <div className="flex items-center gap-2 p-2">
                          {file.assetType === 'model' && <Box className="w-4 h-4 shrink-0 text-cyan-400" />}
                          {file.assetType === 'texture' && (file.ext === '.xcf'
                            ? <Layers className="w-4 h-4 shrink-0 text-purple-400" />
                            : <FileImage className="w-4 h-4 shrink-0 text-green-400" />)}
                          {file.assetType === 'audio' && <FileAudio className="w-4 h-4 shrink-0 text-yellow-400" />}
                          {file.assetType === 'script' && <FileCode className="w-4 h-4 shrink-0 text-orange-400" />}

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{fmtSize(file.size)}</div>
                          </div>

                          {/* Badges */}
                          {file.status === 'pending' && file.ext === '.fbx' && (
                            <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shrink-0">→ GLB</Badge>
                          )}
                          {file.status === 'pending' && file.ext === '.xcf' && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/50 shrink-0">Layers</Badge>
                          )}

                          {/* Status icons */}
                          {file.status === 'uploading' && <span className="text-[10px] text-muted-foreground shrink-0">{file.progress}%</span>}
                          {file.status === 'converting' && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />}
                          {file.status === 'complete' && <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />}
                          {file.status === 'error' && (
                            <div className="flex items-center gap-1 shrink-0" title={file.error}>
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            </div>
                          )}

                          {file.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeQueued(file.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {/* Progress bar */}
                        {(file.status === 'uploading' || file.status === 'converting') && (
                          <Progress value={file.status === 'converting' ? undefined : file.progress} className="h-1 rounded-none" />
                        )}
                        {file.status === 'error' && file.error && (
                          <div className="px-2 pb-1.5 text-[10px] text-destructive truncate">{file.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {queue.length === 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground shrink-0">
                <div><span className="text-cyan-400">Models:</span> {SUPPORTED_MODELS.join(' ')}</div>
                <div><span className="text-green-400">Textures:</span> {SUPPORTED_TEXTURES.filter(f => f !== '.xcf').join(' ')}</div>
                <div><span className="text-yellow-400">Audio:</span> {SUPPORTED_AUDIO.join(' ')}</div>
                <div><span className="text-purple-400">GIMP XCF:</span> extracts layers automatically</div>
              </div>
            )}

            <div className="shrink-0 flex justify-between items-center pt-1">
              <span className="text-xs text-muted-foreground">
                Parallel processing · 3 files at a time
              </span>
              <Button
                onClick={importAll}
                disabled={isImporting || pendingCount === 0}
                data-testid="button-import-assets"
                size="sm"
              >
                {isImporting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importing...</>
                ) : (
                  <><FileUp className="w-3.5 h-3.5 mr-1.5" />Import {pendingCount} {pendingCount === 1 ? 'File' : 'Files'}</>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ─── CONVERT TAB ─── */}
          <TabsContent value="convert" className="mt-3 space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleConvertDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = SUPPORTED_MODELS.join(',');
                inp.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) { setConvertFile(f); setConvertResult(null); }
                };
                inp.click();
              }}
              data-testid="drop-zone-convert"
            >
              {convertFile ? (
                <div className="flex items-center justify-center gap-3">
                  <Box className="w-8 h-8 text-cyan-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{convertFile.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtSize(convertFile.size)}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={e => { e.stopPropagation(); setConvertFile(null); setConvertResult(null); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop a 3D model to convert / optimize</p>
                  <p className="text-xs text-muted-foreground mt-1">FBX → GLB · GLTF → optimized GLB · OBJ → GLB</p>
                </>
              )}
            </div>

            {convertFile && (getExt(convertFile.name) === '.glb' || getExt(convertFile.name) === '.gltf') && (
              <div className="space-y-3 p-3 bg-sidebar-accent/30 rounded-md">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Optimization Options</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Compression</Label>
                    <Select value={convertOpts.compress} onValueChange={v => setConvertOpts(p => ({ ...p, compress: v }))}>
                      <SelectTrigger className="h-7 text-xs" data-testid="select-compress">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draco">Draco (best size)</SelectItem>
                        <SelectItem value="meshopt">MeshOpt (fast decode)</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texture Size</Label>
                    <Select value={convertOpts.textureSize} onValueChange={v => setConvertOpts(p => ({ ...p, textureSize: v }))}>
                      <SelectTrigger className="h-7 text-xs" data-testid="select-texture-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2048">2048px</SelectItem>
                        <SelectItem value="1024">1024px</SelectItem>
                        <SelectItem value="512">512px</SelectItem>
                        <SelectItem value="256">256px</SelectItem>
                        <SelectItem value="original">Original</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texture Format</Label>
                    <Select value={convertOpts.textureCompress} onValueChange={v => setConvertOpts(p => ({ ...p, textureCompress: v }))}>
                      <SelectTrigger className="h-7 text-xs" data-testid="select-texture-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webp">WebP (modern)</SelectItem>
                        <SelectItem value="jpeg">JPEG (universal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {convertResult && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Conversion complete
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  {convertResult.inputSize && <div>Input: <span className="text-foreground">{fmtSize(convertResult.inputSize)}</span></div>}
                  {convertResult.outputSize && <div>Output: <span className="text-foreground">{fmtSize(convertResult.outputSize)}</span></div>}
                  {convertResult.savings !== undefined && <div>Saved: <span className="text-green-400 font-medium">{convertResult.savings}%</span></div>}
                  {convertResult.duration && <div>Time: <span className="text-foreground">{convertResult.duration}ms</span></div>}
                </div>
                <Button size="sm" onClick={importConverted} className="w-full h-7 text-xs gap-1.5" data-testid="button-import-converted">
                  <Download className="w-3.5 h-3.5" />
                  Import to Asset Browser
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={runConvert}
                disabled={!convertFile || isConverting}
                className="flex-1"
                data-testid="button-convert-assets"
              >
                {isConverting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Converting...</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4 mr-2" />
                    {convertFile ? (getExt(convertFile.name) === '.glb' || getExt(convertFile.name) === '.gltf' ? 'Optimize GLB' : `Convert to GLB`) : 'Select a File'}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ─── AI ANALYZE TAB ─── */}
          <TabsContent value="ai" className="mt-3 space-y-3">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-violet-500 transition-colors"
              onDrop={handleAiDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = SUPPORTED_MODELS.join(',');
                inp.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) { setAiFile(f); setAiReport(null); setAiConvertResult(null); }
                };
                inp.click();
              }}
              data-testid="drop-zone-ai"
            >
              {aiFile ? (
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{aiFile.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtSize(aiFile.size)}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={e => { e.stopPropagation(); setAiFile(null); setAiReport(null); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-violet-400" />
                  <p className="text-sm font-medium">Drop a 3D model for AI analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">AI will recommend optimal conversion settings</p>
                </>
              )}
            </div>

            {aiReport && (
              <ScrollArea className="h-52">
                <div className="space-y-3 pr-1">
                  {/* Performance score */}
                  <div className="flex items-center justify-between p-3 bg-sidebar-accent/40 rounded-md">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium">Performance Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} className={cn('w-2 h-3 rounded-sm', i < aiReport.performanceScore ? 'bg-violet-400' : 'bg-sidebar-accent')} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-violet-400">{aiReport.performanceScore}/10</span>
                    </div>
                  </div>

                  {/* Format analysis */}
                  <div className="p-3 bg-sidebar-accent/30 rounded-md">
                    <div className="text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">Format Analysis</div>
                    <p className="text-xs">{aiReport.formatAnalysis}</p>
                  </div>

                  {/* AI recommendations */}
                  <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-md space-y-1.5">
                    <div className="text-xs font-medium text-violet-400">AI Recommendations</div>
                    {aiReport.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                        {r}
                      </div>
                    ))}
                  </div>

                  {/* Suggested settings */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-sidebar-accent/30 rounded text-center">
                      <div className="text-[10px] text-muted-foreground">Compression</div>
                      <div className="text-xs font-bold text-cyan-400 mt-0.5">{aiReport.suggestedCompress}</div>
                    </div>
                    <div className="p-2 bg-sidebar-accent/30 rounded text-center">
                      <div className="text-[10px] text-muted-foreground">Texture Size</div>
                      <div className="text-xs font-bold text-green-400 mt-0.5">{aiReport.suggestedTextureSize}px</div>
                    </div>
                    <div className="p-2 bg-sidebar-accent/30 rounded text-center">
                      <div className="text-[10px] text-muted-foreground">Est. Savings</div>
                      <div className="text-xs font-bold text-yellow-400 mt-0.5">{aiReport.estimatedSavings.split(' ')[0]}</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {aiReport.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md space-y-1">
                      {aiReport.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-300">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI convert result */}
                  {aiConvertResult && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
                        <CheckCircle2 className="w-4 h-4" />AI conversion complete
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                        {aiConvertResult.inputSize && <div>Input: <span className="text-foreground">{fmtSize(aiConvertResult.inputSize)}</span></div>}
                        {aiConvertResult.outputSize && <div>Output: <span className="text-foreground">{fmtSize(aiConvertResult.outputSize)}</span></div>}
                        {aiConvertResult.savings !== undefined && <div>Saved: <span className="text-green-400 font-medium">{aiConvertResult.savings}%</span></div>}
                      </div>
                      <Button size="sm" onClick={importAiResult} className="w-full h-7 text-xs gap-1.5" data-testid="button-import-ai-result">
                        <Download className="w-3.5 h-3.5" />Import to Asset Browser
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="flex gap-2">
              <Button
                onClick={runAiAnalysis}
                disabled={!aiFile || aiAnalyzing}
                variant="outline"
                className="flex-1 border-violet-500/50 text-violet-300 hover:bg-violet-500/10"
                data-testid="button-ai-analyze"
              >
                {aiAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />AI Analyze</>
                )}
              </Button>
              {aiReport && (
                <Button
                  onClick={runAiConvert}
                  disabled={aiConvertRunning}
                  className="flex-1"
                  data-testid="button-ai-convert"
                >
                  {aiConvertRunning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Converting...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />Auto-Convert</>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
