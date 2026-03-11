import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, FolderPlus, Trash2, Download, Copy, Plus,
  ChevronRight, ChevronDown, Folder, FolderOpen, FileImage, FileCode,
  FileAudio, Box, Film, File, Archive, RefreshCw, HardDrive, Cloud,
  ArrowLeft, Eye, X, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@shared/schema';

// ─── Types ───────────────────────────────────────────────────────────
interface StorageItem {
  key: string;
  size: number;
  lastModified: string | null;
  isFolder: boolean;
}

interface BrowseResult {
  items: StorageItem[];
  folders: string[];
  cursor: string | null;
  hasMore: boolean;
}

interface StorageStatus {
  provider: string;
  isS3: boolean;
  bucket: string | null;
  endpoint: string | null;
  healthy: boolean;
  error?: string;
  features: {
    presignedUpload: boolean;
    presignedDownload: boolean;
    browse: boolean;
    zipUpload: boolean;
    multiUpload: boolean;
  };
}

interface UploadProgress {
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(key: string) {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const modelExts = ['glb', 'gltf', 'fbx', 'obj'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
  const codeExts = ['js', 'ts', 'json', 'css', 'html', 'wasm'];
  const animExts = ['anim', 'animation'];

  if (imageExts.includes(ext)) return <FileImage className="w-4 h-4 text-green-400" />;
  if (modelExts.includes(ext)) return <Box className="w-4 h-4 text-blue-400" />;
  if (audioExts.includes(ext)) return <FileAudio className="w-4 h-4 text-yellow-400" />;
  if (codeExts.includes(ext)) return <FileCode className="w-4 h-4 text-orange-400" />;
  if (animExts.includes(ext)) return <Film className="w-4 h-4 text-pink-400" />;
  if (ext === 'zip') return <Archive className="w-4 h-4 text-purple-400" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function getAssetType(key: string): AssetType {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'texture';
  if (['glb', 'gltf', 'fbx', 'obj'].includes(ext)) return 'model';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['js', 'ts', 'json'].includes(ext)) return 'script';
  if (['anim'].includes(ext)) return 'animation';
  return 'texture';
}

function isPreviewable(key: string): string | null {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (['glb', 'gltf'].includes(ext)) return 'model';
  if (['json', 'js', 'ts', 'txt', 'css', 'html'].includes(ext)) return 'text';
  return null;
}

// ─── API Calls ───────────────────────────────────────────────────────
async function fetchStorageStatus(): Promise<StorageStatus> {
  const res = await fetch('/api/storage/status');
  return res.json();
}

async function fetchBrowse(prefix: string, cursor?: string): Promise<BrowseResult> {
  const params = new URLSearchParams({ prefix });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/storage/browse?${params}`);
  return res.json();
}

async function fetchDownloadUrl(key: string): Promise<string> {
  const res = await fetch(`/api/storage/download?key=${encodeURIComponent(key)}`);
  const data = await res.json();
  return data.url;
}

async function deleteObject(key: string): Promise<boolean> {
  const res = await fetch(`/api/storage/delete?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

async function uploadFile(file: globalThis.File, folder: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);
  const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
  return res.json();
}

async function uploadZip(file: globalThis.File, folder: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);
  const res = await fetch('/api/storage/upload-zip', { method: 'POST', body: formData });
  return res.json();
}

// ─── Preview Panel ───────────────────────────────────────────────────
function PreviewPanel({ itemKey, onClose }: { itemKey: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const type = isPreviewable(itemKey);

  useEffect(() => {
    setLoading(true);
    fetchDownloadUrl(itemKey).then(u => {
      setUrl(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [itemKey]);

  const fileName = itemKey.split('/').pop() || itemKey;

  return (
    <div className="border-t border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-xs font-medium truncate">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="truncate">{fileName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="p-3 max-h-[300px] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !url ? (
          <div className="text-xs text-muted-foreground text-center py-4">Failed to load preview</div>
        ) : type === 'image' ? (
          <img src={url} alt={fileName} className="max-w-full max-h-[250px] object-contain mx-auto rounded" />
        ) : type === 'audio' ? (
          <audio controls className="w-full" src={url} />
        ) : type === 'model' ? (
          <div className="text-center py-4">
            <Box className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <div className="text-xs text-muted-foreground mb-2">3D Model: {fileName}</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Open in new tab
            </a>
          </div>
        ) : (
          <div className="text-center py-4">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Download {fileName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function StorageManager() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const { addAsset, addConsoleLog } = useEngineStore();

  // Load status on mount
  useEffect(() => {
    fetchStorageStatus().then(setStatus).catch(() => {});
  }, []);

  // Browse whenever prefix changes
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBrowse(currentPrefix);
      setBrowseResult(result);
    } catch {
      setBrowseResult({ items: [], folders: [], cursor: null, hasMore: false });
    }
    setLoading(false);
  }, [currentPrefix]);

  useEffect(() => { refresh(); }, [refresh]);

  // Navigation
  const navigateTo = (prefix: string) => {
    setCurrentPrefix(prefix);
    setSelectedKey(null);
    setPreviewKey(null);
  };

  const navigateUp = () => {
    const parts = currentPrefix.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    navigateTo(parts.length > 0 ? parts.join('/') + '/' : '');
  };

  const breadcrumbs = currentPrefix.split('/').filter(Boolean);

  // Upload handlers
  const handleFiles = async (files: FileList | globalThis.File[]) => {
    const fileArr = Array.from(files);
    const newUploads: UploadProgress[] = fileArr.map(f => ({
      name: f.name,
      progress: 0,
      status: 'pending',
    }));
    setUploads(prev => [...prev, ...newUploads]);

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const idx = uploads.length + i;

      setUploads(prev => prev.map((u, j) =>
        j === idx ? { ...u, status: 'uploading', progress: 50 } : u
      ));

      try {
        const isZip = file.name.toLowerCase().endsWith('.zip');
        const result = isZip
          ? await uploadZip(file, currentPrefix)
          : await uploadFile(file, currentPrefix);

        setUploads(prev => prev.map((u, j) =>
          j === idx ? { ...u, status: 'done', progress: 100 } : u
        ));

        if (result.success) {
          addConsoleLog({
            type: 'info',
            message: isZip
              ? `Extracted ${result.uploaded} files from ${file.name}`
              : `Uploaded ${file.name}`,
            source: 'Storage',
          });
        }
      } catch (err: any) {
        setUploads(prev => prev.map((u, j) =>
          j === idx ? { ...u, status: 'error', error: err.message } : u
        ));
      }
    }

    // Refresh listing
    setTimeout(refresh, 500);
  };

  // Drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Actions
  const handleDelete = async () => {
    if (!selectedKey) return;
    const ok = await deleteObject(selectedKey);
    if (ok) {
      addConsoleLog({ type: 'info', message: `Deleted ${selectedKey}`, source: 'Storage' });
      setSelectedKey(null);
      setPreviewKey(null);
      refresh();
    }
  };

  const handleDownload = async () => {
    if (!selectedKey) return;
    const url = await fetchDownloadUrl(selectedKey);
    window.open(url, '_blank');
  };

  const handleCopyUrl = async () => {
    if (!selectedKey) return;
    const url = await fetchDownloadUrl(selectedKey);
    await navigator.clipboard.writeText(url);
    addConsoleLog({ type: 'info', message: `Copied URL for ${selectedKey}`, source: 'Storage' });
  };

  const handleAddToScene = () => {
    if (!selectedKey) return;
    const name = selectedKey.split('/').pop() || selectedKey;
    const asset: Asset = {
      id: crypto.randomUUID(),
      name,
      type: getAssetType(selectedKey),
      path: selectedKey,
    };
    addAsset(asset);
    addConsoleLog({ type: 'info', message: `Added ${name} to project assets`, source: 'Storage' });
  };

  // Filter items by search
  const filteredItems = browseResult?.items.filter(item => {
    if (!searchQuery) return true;
    const name = item.key.split('/').pop() || item.key;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const filteredFolders = browseResult?.folders.filter(f => {
    if (!searchQuery) return true;
    return f.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Clear finished uploads
  const clearUploads = () => setUploads([]);

  return (
    <div
      className="h-full flex flex-col bg-sidebar border-t border-sidebar-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="storage-manager"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {status?.isS3 ? (
              <Cloud className="w-4 h-4 text-blue-400" />
            ) : (
              <HardDrive className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs font-semibold">
              {status?.isS3 ? `S3: ${status.bucket || 'bucket'}` : 'Local Storage'}
            </span>
            {status && (
              <span className={cn("w-2 h-2 rounded-full", status.healthy ? "bg-green-500" : "bg-red-500")} />
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Breadcrumb nav */}
        <div className="flex items-center gap-1 text-xs mb-2 overflow-x-auto">
          {currentPrefix && (
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={navigateUp}>
              <ArrowLeft className="w-3 h-3" />
            </Button>
          )}
          <button
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => navigateTo('')}
          >
            root
          </button>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join('/') + '/')}
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fileInputRef.current?.click()}
            title="Upload files"
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => zipInputRef.current?.click()}
            title="Upload ZIP"
          >
            <Archive className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Uploads</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearUploads}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          {uploads.slice(-5).map((u, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              {u.status === 'done' ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : u.status === 'error' ? (
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
              )}
              <span className="text-xs truncate flex-1">{u.name}</span>
              {u.status === 'uploading' && (
                <Progress value={u.progress} className="w-16 h-1.5" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 z-50 flex items-center justify-center rounded">
          <div className="text-center">
            <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-sm font-medium text-blue-400">Drop files to upload</div>
            <div className="text-xs text-muted-foreground">ZIP files will be auto-extracted</div>
          </div>
        </div>
      )}

      {/* File listing */}
      <ScrollArea className="flex-1">
        {loading && !browseResult ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFolders.length === 0 && filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Folder className="w-12 h-12 text-muted-foreground mb-3" />
            <div className="text-xs text-muted-foreground">
              {searchQuery ? 'No matching files' : 'Empty folder'}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : (
          <div className="py-1">
            {/* Folders */}
            {filteredFolders.map(folder => {
              const name = folder.replace(/\/$/, '').split('/').pop() || folder;
              return (
                <div
                  key={folder}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover-elevate rounded-sm text-xs"
                  onDoubleClick={() => navigateTo(folder)}
                  onClick={() => navigateTo(folder)}
                >
                  <FolderOpen className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="font-medium truncate flex-1">{name}/</span>
                </div>
              );
            })}

            {/* Files */}
            {filteredItems.map(item => {
              const name = item.key.split('/').pop() || item.key;
              const isSelected = selectedKey === item.key;
              const canPreview = isPreviewable(item.key);

              return (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover-elevate rounded-sm text-xs group",
                    isSelected && "bg-primary/20"
                  )}
                  onClick={() => setSelectedKey(item.key)}
                  onDoubleClick={() => canPreview && setPreviewKey(item.key)}
                >
                  {getFileIcon(item.key)}
                  <span className="truncate flex-1">{name}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {formatBytes(item.size)}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    {canPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); setPreviewKey(item.key); }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={e => { e.stopPropagation(); setSelectedKey(item.key); handleAddToScene(); }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Selected file actions bar */}
      {selectedKey && (
        <div className="px-3 py-2 border-t border-sidebar-border flex items-center gap-1">
          <span className="text-xs truncate flex-1 text-muted-foreground">
            {selectedKey.split('/').pop()}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddToScene} title="Add to scene">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownload} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyUrl} title="Copy URL">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-400 hover:text-red-300"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Preview panel */}
      {previewKey && (
        <PreviewPanel itemKey={previewKey} onClose={() => setPreviewKey(null)} />
      )}
    </div>
  );
}
