import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, Grid3X3, List, Upload, FolderPlus, FileImage, FileCode, FileAudio, Box, Paintbrush, Film, ChevronRight, ChevronDown, Folder, FolderOpen, Music, Layers, Plus, Copy, Trash2, Edit2, ExternalLink, Eye, Cloud, RefreshCw, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { ObjectUploader } from '@/components/ObjectUploader';
import { ColorCurvesEditor } from './ColorCurvesEditor';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@shared/schema';

interface AssetFolder {
  name: string;
  path: string;
  assets: Asset[];
  subfolders: AssetFolder[];
  icon?: string;
}

const FOLDER_ICONS: Record<string, { icon: typeof FileCode; color: string }> = {
  'scripts': { icon: FileCode, color: 'text-orange-400' },
  'core': { icon: FileCode, color: 'text-orange-400' },
  'player': { icon: FileCode, color: 'text-blue-400' },
  'camera': { icon: FileCode, color: 'text-cyan-400' },
  'ai': { icon: FileCode, color: 'text-purple-400' },
  'physics': { icon: FileCode, color: 'text-red-400' },
  'utility': { icon: FileCode, color: 'text-yellow-400' },
  'materials': { icon: Paintbrush, color: 'text-purple-400' },
  'textures': { icon: FileImage, color: 'text-green-400' },
  'defaults': { icon: FileImage, color: 'text-gray-400' },
  'environment': { icon: FileImage, color: 'text-green-400' },
  'skybox': { icon: FileImage, color: 'text-blue-400' },
  'models': { icon: Box, color: 'text-blue-400' },
  'primitives': { icon: Box, color: 'text-cyan-400' },
  'audio': { icon: Music, color: 'text-yellow-400' },
  'ui': { icon: FileAudio, color: 'text-yellow-400' },
  'sfx': { icon: FileAudio, color: 'text-orange-400' },
  'ambient': { icon: FileAudio, color: 'text-green-400' },
  'music': { icon: Music, color: 'text-pink-400' },
  'prefabs': { icon: Layers, color: 'text-cyan-400' },
  'animations': { icon: Film, color: 'text-pink-400' },
  'humanoid': { icon: Film, color: 'text-pink-400' },
};

function getAssetIcon(type: AssetType) {
  switch (type) {
    case 'model': return <Box className="w-4 h-4 text-blue-400" />;
    case 'texture': return <FileImage className="w-4 h-4 text-green-400" />;
    case 'material': return <Paintbrush className="w-4 h-4 text-purple-400" />;
    case 'audio': return <FileAudio className="w-4 h-4 text-yellow-400" />;
    case 'script': return <FileCode className="w-4 h-4 text-orange-400" />;
    case 'animation': return <Film className="w-4 h-4 text-pink-400" />;
    case 'prefab': return <Layers className="w-4 h-4 text-cyan-400" />;
    default: return <Box className="w-4 h-4 text-muted-foreground" />;
  }
}

function buildFolderTree(assets: Asset[]): AssetFolder[] {
  const root: Map<string, AssetFolder> = new Map();
  
  const getOrCreateFolder = (folders: Map<string, AssetFolder> | AssetFolder[], pathParts: string[], currentPath: string): AssetFolder => {
    const folderName = pathParts[0];
    const fullPath = `${currentPath}/${folderName}`;
    
    if (folders instanceof Map) {
      if (!folders.has(folderName)) {
        folders.set(folderName, {
          name: folderName.charAt(0).toUpperCase() + folderName.slice(1),
          path: fullPath,
          assets: [],
          subfolders: []
        });
      }
      return folders.get(folderName)!;
    } else {
      let folder = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
      if (!folder) {
        folder = {
          name: folderName.charAt(0).toUpperCase() + folderName.slice(1),
          path: fullPath,
          assets: [],
          subfolders: []
        };
        folders.push(folder);
      }
      return folder;
    }
  };
  
  for (const asset of assets) {
    const pathParts = asset.path.split('/').filter(Boolean);
    if (pathParts.length < 2) continue;
    
    let currentFolder = getOrCreateFolder(root, [pathParts[0]], '');
    let currentPath = `/${pathParts[0]}`;
    
    for (let i = 1; i < pathParts.length - 1; i++) {
      currentPath = `${currentPath}/${pathParts[i]}`;
      let subfolder = currentFolder.subfolders.find(sf => sf.name.toLowerCase() === pathParts[i].toLowerCase());
      
      if (!subfolder) {
        subfolder = {
          name: pathParts[i].charAt(0).toUpperCase() + pathParts[i].slice(1),
          path: currentPath,
          assets: [],
          subfolders: []
        };
        currentFolder.subfolders.push(subfolder);
      }
      currentFolder = subfolder;
    }
    
    currentFolder.assets.push(asset);
  }
  
  return Array.from(root.values()).sort((a, b) => {
    const order = ['scripts', 'materials', 'textures', 'models', 'audio', 'prefabs', 'animations'];
    const aIndex = order.indexOf(a.name.toLowerCase());
    const bIndex = order.indexOf(b.name.toLowerCase());
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

interface AssetItemWithMenuProps {
  asset: Asset;
  depth: number;
  isSelected: boolean;
  onSelectAsset: (id: string) => void;
  onAddToScene: (asset: Asset) => void;
}

function AssetItemWithMenu({ asset, depth, isSelected, onSelectAsset, onAddToScene }: AssetItemWithMenuProps) {
  const { deleteAsset, updateAsset, addAsset, addConsoleLog } = useEngineStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(asset.name);
  const renameRef = useRef<HTMLInputElement>(null);

  const startRename = () => {
    setRenameValue(asset.name);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.select(), 10);
  };

  const commitRename = () => {
    const name = renameValue.trim();
    if (name && name !== asset.name) {
      updateAsset(asset.id, { name });
      addConsoleLog({ type: 'info', message: `Renamed asset "${asset.name}" to "${name}"`, source: 'Assets' });
    }
    setIsRenaming(false);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(asset.path).then(() => {
      addConsoleLog({ type: 'info', message: `Copied path: ${asset.path}`, source: 'Assets' });
    });
  };

  const handleDuplicate = () => {
    const dup: Asset = {
      ...asset,
      id: crypto.randomUUID(),
      name: `${asset.name} (copy)`,
    };
    addAsset(dup);
    addConsoleLog({ type: 'info', message: `Duplicated asset: ${asset.name}`, source: 'Assets' });
  };

  const handleDelete = () => {
    deleteAsset(asset.id);
    addConsoleLog({ type: 'warning', message: `Deleted asset: ${asset.name}`, source: 'Assets' });
  };

  const handleViewFile = () => {
    if (asset.path.startsWith('http') || asset.path.startsWith('/')) {
      window.open(asset.path, '_blank');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1 cursor-pointer hover-elevate rounded-sm text-xs group",
            isSelected && "bg-primary/20"
          )}
          style={{ paddingLeft: `${20 + depth * 12}px` }}
          onClick={() => onSelectAsset(asset.id)}
          onDoubleClick={() => onAddToScene(asset)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/grudge-asset', JSON.stringify({ id: asset.id, name: asset.name, type: asset.type, path: asset.path }));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          data-testid={`asset-item-${asset.id}`}
        >
          {getAssetIcon(asset.type)}
          {isRenaming ? (
            <input
              ref={renameRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                if (e.key === 'Escape') { setIsRenaming(false); }
              }}
              className="flex-1 text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none"
              onClick={(e) => e.stopPropagation()}
              data-testid={`input-rename-asset-${asset.id}`}
            />
          ) : (
            <span className="truncate flex-1">{asset.name}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={(e) => { e.stopPropagation(); onAddToScene(asset); }}
            data-testid={`button-add-asset-${asset.id}`}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onAddToScene(asset)} data-testid={`ctx-asset-add-${asset.id}`}>
          <Plus className="w-4 h-4 mr-2" /> Add to Scene
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSelectAsset(asset.id)} data-testid={`ctx-asset-select-${asset.id}`}>
          <Eye className="w-4 h-4 mr-2" /> Select Asset
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={startRename} data-testid={`ctx-asset-rename-${asset.id}`}>
          <Edit2 className="w-4 h-4 mr-2" /> Rename <kbd className="ml-auto text-[10px] text-muted-foreground">F2</kbd>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate} data-testid={`ctx-asset-duplicate-${asset.id}`}>
          <Copy className="w-4 h-4 mr-2" /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyPath} data-testid={`ctx-asset-copy-path-${asset.id}`}>
          <ExternalLink className="w-4 h-4 mr-2" /> Copy Path
        </ContextMenuItem>
        <ContextMenuItem onClick={handleViewFile} data-testid={`ctx-asset-view-${asset.id}`}>
          <ExternalLink className="w-4 h-4 mr-2" /> Open File URL
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive" data-testid={`ctx-asset-delete-${asset.id}`}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete Asset
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface FolderItemProps {
  folder: AssetFolder;
  depth?: number;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onAddToScene: (asset: Asset) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  searchQuery: string;
}

function folderHasMatchingAssets(folder: AssetFolder, searchQuery: string): boolean {
  if (folder.assets.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
    return true;
  }
  return folder.subfolders.some(sf => folderHasMatchingAssets(sf, searchQuery));
}

function FolderItem({ folder, depth = 0, selectedAssetId, onSelectAsset, onAddToScene, expandedFolders, onToggleFolder, searchQuery }: FolderItemProps) {
  const isExpanded = expandedFolders.has(folder.path);
  const hasContent = folder.assets.length > 0 || folder.subfolders.length > 0;
  
  const filteredAssets = searchQuery 
    ? folder.assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folder.assets;
  
  const filteredSubfolders = searchQuery
    ? folder.subfolders.filter(sf => folderHasMatchingAssets(sf, searchQuery))
    : folder.subfolders;
  
  if (searchQuery && filteredAssets.length === 0 && filteredSubfolders.length === 0) {
    return null;
  }
  
  const folderKey = folder.name.toLowerCase();
  const folderConfig = FOLDER_ICONS[folderKey] || { icon: Folder, color: 'text-muted-foreground' };
  const FolderIcon = isExpanded ? FolderOpen : folderConfig.icon;
  
  const countAllAssets = (f: AssetFolder): number => {
    return f.assets.length + f.subfolders.reduce((acc, sf) => acc + countAllAssets(sf), 0);
  };
  const totalAssets = countAllAssets(folder);
  
  return (
    <div data-testid={`folder-${folder.name.toLowerCase()}`}>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover-elevate rounded-sm",
          "text-xs"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onToggleFolder(folder.path)}
      >
        {hasContent ? (
          isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        ) : (
          <div className="w-3" />
        )}
        <FolderIcon className={cn("w-4 h-4 shrink-0", folderConfig.color)} />
        <span className="font-medium truncate flex-1">{folder.name}</span>
        <span className="text-muted-foreground text-[10px]">{totalAssets}</span>
      </div>
      
      {isExpanded && (
        <div>
          {filteredSubfolders.map(subfolder => (
            <FolderItem
              key={subfolder.path}
              folder={subfolder}
              depth={depth + 1}
              selectedAssetId={selectedAssetId}
              onSelectAsset={onSelectAsset}
              onAddToScene={onAddToScene}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              searchQuery={searchQuery}
            />
          ))}
          {filteredAssets.map(asset => (
            <AssetItemWithMenu
              key={asset.id}
              asset={asset}
              depth={depth}
              isSelected={selectedAssetId === asset.id}
              onSelectAsset={onSelectAsset}
              onAddToScene={onAddToScene}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  viewMode: 'grid' | 'list';
}

function AssetCard({ asset, isSelected, onClick, onDoubleClick, viewMode }: AssetCardProps) {
  const { addAsset, addConsoleLog, deleteAsset } = useEngineStore();
  const [converting, setConverting] = useState(false);
  const assetDragData = JSON.stringify({ id: asset.id, name: asset.name, type: asset.type, path: asset.path });
  const isConvertible = asset.type === 'model' && /\.(fbx|obj|dae|stl|ply)$/i.test(asset.path || asset.name);

  const handleConvertToGlb = async () => {
    setConverting(true);
    try {
      const ext = (asset.path || asset.name).split('.').pop()?.toLowerCase();
      let endpoint = '/api/convert/to-glb';
      let body: Record<string, string> = { filePath: asset.path || '', fileName: asset.name };
      if (ext === 'fbx') endpoint = '/api/convert/fbx-upload';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Conversion failed');
      const data = await res.json();
      const glbName = asset.name.replace(/\.[^.]+$/, '.glb');
      addAsset({ id: crypto.randomUUID(), name: glbName, type: 'model', path: data.outputPath });
      addConsoleLog({ type: 'success' as any, message: `Converted to GLB: ${glbName}`, source: 'Convert' });
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Conversion failed: ${err.message}`, source: 'Convert' });
    }
    setConverting(false);
  };

  const menuContent = (
    <ContextMenuContent className="w-48" data-testid={`context-menu-asset-${asset.id}`}>
      <ContextMenuItem onClick={() => onDoubleClick()} data-testid={`ctx-add-${asset.id}`}>
        <Plus className="w-4 h-4 mr-2" /> Add to Scene
      </ContextMenuItem>
      <ContextMenuItem onClick={() => navigator.clipboard.writeText(asset.path || '')} data-testid={`ctx-copy-${asset.id}`}>
        <Copy className="w-4 h-4 mr-2" /> Copy Path
      </ContextMenuItem>
      {isConvertible && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleConvertToGlb} disabled={converting} data-testid={`ctx-convert-${asset.id}`}>
            {converting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
            Convert to GLB
          </ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => deleteAsset(asset.id)} className="text-destructive" data-testid={`ctx-delete-${asset.id}`}>
        <Trash2 className="w-4 h-4 mr-2" /> Remove Asset
      </ContextMenuItem>
    </ContextMenuContent>
  );

  if (viewMode === 'list') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate rounded-sm group",
              isSelected && "bg-primary/20"
            )}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/grudge-asset', assetDragData);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            data-testid={`asset-item-${asset.id}`}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {converting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : getAssetIcon(asset.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{asset.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{asset.type}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
              data-testid={`button-add-asset-${asset.id}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </ContextMenuTrigger>
        {menuContent}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "flex flex-col items-center p-3 cursor-pointer hover-elevate rounded-md border border-transparent relative group",
            isSelected && "bg-primary/20 border-primary/50"
          )}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/grudge-asset', assetDragData);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          data-testid={`asset-item-${asset.id}`}
        >
          <Button
            variant="secondary"
            size="icon"
            className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
            data-testid={`button-add-asset-grid-${asset.id}`}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <div className="w-14 h-14 rounded-md bg-sidebar-accent flex items-center justify-center mb-2">
            {converting ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : asset.thumbnail ? (
              <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover rounded-md" />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                {getAssetIcon(asset.type)}
              </div>
            )}
          </div>
          <div className="text-xs text-center truncate w-full">{asset.name}</div>
        </div>
      </ContextMenuTrigger>
      {menuContent}
    </ContextMenu>
  );
}

interface CloudAsset {
  id: string;
  name: string;
  type: string;
  objectPath: string;
  size?: number;
  uploadedAt: string;
}

export function AssetBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'folder'>('folder');
  const [activeFilter, setActiveFilter] = useState<AssetType | 'all'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([
    '/scripts', '/scripts/core', '/scripts/player', '/scripts/camera', '/scripts/ai', '/scripts/physics', '/scripts/utility',
    '/materials', 
    '/textures', '/textures/defaults', '/textures/environment', '/textures/skybox',
    '/models', '/models/primitives',
    '/audio', '/audio/ui', '/audio/sfx', '/audio/ambient', '/audio/music',
    '/prefabs', 
    '/animations', '/animations/humanoid'
  ]));
  const [cloudAssets, setCloudAssets] = useState<CloudAsset[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const uploadURLMap = useRef<Record<string, string>>({});
  
  const { project, selectedAssetId, selectAsset, addAsset, addConsoleLog, addAssetToScene } = useEngineStore();
  const assets = project?.assets || [];

  const fetchCloudAssets = useCallback(async () => {
    setCloudLoading(true);
    try {
      const res = await fetch('/api/assets/cloud');
      if (res.ok) {
        const data = await res.json();
        setCloudAssets(data);
      }
    } catch {
    } finally {
      setCloudLoading(false);
    }
  }, []);

  useEffect(() => { fetchCloudAssets(); }, [fetchCloudAssets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [assets, searchQuery, activeFilter]);
  
  const folderTree = useMemo(() => buildFolderTree(filteredAssets), [filteredAssets]);

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      for (const file of result.successful) {
        const assetType = getAssetTypeFromMimeType(file.type);
        const rawUploadURL = uploadURLMap.current[file.name] || file.uploadURL || '';
        let objectPath = `/objects/uploads/${file.name}`;
        try {
          const regRes = await fetch('/api/assets/cloud/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, type: assetType, uploadURL: rawUploadURL, size: file.size }),
          });
          if (regRes.ok) {
            const reg = await regRes.json();
            objectPath = reg.objectPath;
            await fetchCloudAssets();
          }
        } catch {}
        const newAsset: Asset = {
          id: crypto.randomUUID(),
          name: file.name,
          type: assetType,
          path: objectPath,
          metadata: { cloudUploaded: true, size: file.size }
        };
        addAsset(newAsset);
        addConsoleLog({ type: 'info', message: `Uploaded to cloud: ${file.name}`, source: 'Assets' });
      }
    }
  };

  const getUploadParameters = async (file: { name: string; size: number | null; type?: string }) => {
    const res = await fetch('/api/uploads/request-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        size: file.size ?? 0,
        contentType: file.type || 'application/octet-stream',
      }),
    });
    const { uploadURL } = await res.json();
    uploadURLMap.current[file.name] = uploadURL;
    return {
      method: 'PUT' as const,
      url: uploadURL,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    };
  };

  const handleImport = () => {
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: `New Asset ${assets.length + 1}`,
      type: 'texture',
      path: '/assets/new-asset.png'
    };
    addAsset(newAsset);
    addConsoleLog({ type: 'info', message: `Imported asset: ${newAsset.name}`, source: 'Assets' });
  };

  function getAssetTypeFromMimeType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return 'texture';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.endsWith('/json')) return 'script';
    if (mimeType.includes('gltf') || mimeType.includes('glb') || mimeType.includes('fbx') || mimeType.includes('obj')) return 'model';
    return 'texture';
  }
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-t border-sidebar-border" data-testid="asset-browser">
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
              data-testid="input-asset-search"
            />
          </div>
          <ObjectUploader
            maxNumberOfFiles={10}
            maxFileSize={52428800}
            onGetUploadParameters={getUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="h-7 w-7 p-0"
          >
            <Upload className="w-3.5 h-3.5" />
          </ObjectUploader>
          <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-new-folder">
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <ColorCurvesEditor 
            onApply={(adjustments) => {
              addConsoleLog({ 
                type: 'info', 
                message: `Applied color adjustments: brightness=${adjustments.brightness}, contrast=${adjustments.contrast}`, 
                source: 'Color Curves' 
              });
            }}
          />
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'folder' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7 rounded-none"
              onClick={() => setViewMode('folder')}
              data-testid="button-view-folder"
            >
              <Folder className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7 rounded-none"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7 rounded-none"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['all', 'script', 'material', 'texture', 'model', 'audio', 'prefab', 'animation'] as const).map(filter => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs shrink-0"
              onClick={() => setActiveFilter(filter)}
              data-testid={`button-filter-${filter}`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Box className="w-12 h-12 text-muted-foreground mb-3" />
            <div className="text-xs text-muted-foreground">
              {searchQuery || activeFilter !== 'all' ? 'No assets found' : 'No assets in project'}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleImport} data-testid="button-import-first">
              <Upload className="w-3.5 h-3.5 mr-2" />
              Import Asset
            </Button>
          </div>
        ) : viewMode === 'folder' ? (
          <div className="py-1">
            {folderTree.map(folder => (
              <FolderItem
                key={folder.path}
                folder={folder}
                selectedAssetId={selectedAssetId}
                onSelectAsset={selectAsset}
                onAddToScene={addAssetToScene}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-2 p-2">
            {filteredAssets.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                onClick={() => selectAsset(asset.id)}
                onDoubleClick={() => addAssetToScene(asset)}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="py-1">
            {filteredAssets.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                onClick={() => selectAsset(asset.id)}
                onDoubleClick={() => addAssetToScene(asset)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cloud Assets Section */}
      {cloudAssets.length > 0 && (
        <div className="border-t border-sidebar-border shrink-0">
          <div className="flex items-center justify-between px-2 py-1 bg-sidebar">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Cloud className="w-3 h-3 text-blue-400" />
              Cloud Uploads ({cloudAssets.length})
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={fetchCloudAssets}
              disabled={cloudLoading}
              data-testid="button-refresh-cloud"
              title="Refresh cloud assets"
            >
              <RefreshCw className={`w-3 h-3 ${cloudLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <ScrollArea className="max-h-32">
            {cloudAssets.map(ca => {
              const ext = ca.name.split('.').pop()?.toLowerCase() || '';
              const assetType: AssetType = ['glb','gltf','obj','fbx'].includes(ext) ? 'model'
                : ['png','jpg','jpeg','webp','svg'].includes(ext) ? 'texture'
                : ['mp3','wav','ogg'].includes(ext) ? 'audio'
                : ['ts','js'].includes(ext) ? 'script' : 'model';
              return (
                <div
                  key={ca.id}
                  className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-sidebar-accent cursor-pointer group"
                  title={ca.objectPath}
                  onClick={() => {
                    const asset: Asset = { id: ca.id, name: ca.name, type: assetType, path: ca.objectPath, metadata: { cloudUploaded: true } };
                    addAssetToScene(asset);
                    addConsoleLog({ type: 'info', message: `Added cloud asset "${ca.name}" to scene`, source: 'Assets' });
                  }}
                  data-testid={`cloud-asset-${ca.id}`}
                >
                  {getAssetIcon(assetType)}
                  <span className="flex-1 truncate">{ca.name}</span>
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100">Add</span>
                </div>
              );
            })}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
