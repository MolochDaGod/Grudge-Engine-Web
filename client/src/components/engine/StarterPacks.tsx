import { useState } from 'react';
import { Package, Download, ExternalLink, Search, Box, FileImage, Music, Sun, Loader2, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useEngineStore } from '@/lib/engine-store';
import { STARTER_ASSET_PACKS, type ManifestAsset, type AssetPack } from '@/lib/asset-manifest';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@shared/schema';

function getCategoryIcon(category: ManifestAsset['category']) {
  switch (category) {
    case 'model': return <Box className="w-4 h-4 text-cyan-400" />;
    case 'texture': return <FileImage className="w-4 h-4 text-green-400" />;
    case 'material': return <FileImage className="w-4 h-4 text-purple-400" />;
    case 'hdri': return <Sun className="w-4 h-4 text-yellow-400" />;
    case 'audio': return <Music className="w-4 h-4 text-orange-400" />;
    case 'sprite': return <FileImage className="w-4 h-4 text-pink-400" />;
    default: return <Package className="w-4 h-4 text-muted-foreground" />;
  }
}

function mapManifestCategoryToAssetType(category: ManifestAsset['category']): AssetType {
  switch (category) {
    case 'model': return 'model';
    case 'texture': return 'texture';
    case 'material': return 'material';
    case 'hdri': return 'texture';
    case 'audio': return 'audio';
    case 'sprite': return 'texture';
    default: return 'texture';
  }
}

interface AssetCardProps {
  asset: ManifestAsset;
  onImport: (asset: ManifestAsset) => void;
  isImporting: boolean;
  isImported: boolean;
}

function AssetCard({ asset, onImport, isImporting, isImported }: AssetCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 hover-elevate" data-testid={`asset-card-${asset.id}`}>
      <div className="w-12 h-12 rounded-md bg-sidebar flex items-center justify-center overflow-hidden shrink-0">
        {asset.thumbnailUrl.startsWith('http') ? (
          <img 
            src={asset.thumbnailUrl} 
            alt={asset.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          getCategoryIcon(asset.category)
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{asset.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">{asset.license}</Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{asset.description}</div>
        <div className="flex items-center gap-2 mt-1">
          {getCategoryIcon(asset.category)}
          <span className="text-xs text-muted-foreground capitalize">{asset.category}</span>
          <span className="text-xs text-muted-foreground">• {asset.format}</span>
          {asset.size && <span className="text-xs text-muted-foreground">• {asset.size}</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.open(asset.downloadUrl, '_blank')}
          data-testid={`button-view-${asset.id}`}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant={isImported ? "secondary" : "default"}
          size="sm"
          className="h-8"
          onClick={() => onImport(asset)}
          disabled={isImporting || isImported}
          data-testid={`button-import-${asset.id}`}
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isImported ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Added
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface PackSectionProps {
  pack: AssetPack;
  onImport: (asset: ManifestAsset) => void;
  importingAssets: Set<string>;
  importedAssets: Set<string>;
  searchQuery: string;
}

function PackSection({ pack, onImport, importingAssets, importedAssets, searchQuery }: PackSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const filteredAssets = pack.assets.filter(asset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.name.toLowerCase().includes(query) ||
      asset.tags.some(tag => tag.toLowerCase().includes(query)) ||
      asset.description?.toLowerCase().includes(query)
    );
  });
  
  if (filteredAssets.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover-elevate" data-testid={`pack-toggle-${pack.id}`}>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Package className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium flex-1 text-left">{pack.name}</span>
        <Badge variant="outline" className="text-xs">{filteredAssets.length} assets</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-2 pb-2 space-y-2">
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          {pack.description}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-primary underline-offset-4 hover:underline"
            onClick={() => window.open(pack.sourceUrl, '_blank')}
          >
            Visit {pack.source}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
        {filteredAssets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onImport={onImport}
            isImporting={importingAssets.has(asset.id)}
            isImported={importedAssets.has(asset.id)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StarterPacks() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingAssets, setImportingAssets] = useState<Set<string>>(new Set());
  const [importedAssets, setImportedAssets] = useState<Set<string>>(new Set());
  
  const { addAsset, addConsoleLog, project } = useEngineStore();
  const { toast } = useToast();
  
  const handleImportAsset = async (manifestAsset: ManifestAsset) => {
    setImportingAssets(prev => new Set(prev).add(manifestAsset.id));
    
    try {
      addConsoleLog({
        type: 'info',
        message: `Importing "${manifestAsset.name}" from ${manifestAsset.source}...`,
        source: 'Assets'
      });
      
      // Use server-side proxy to download and store the asset (bypasses CORS)
      const response = await fetch('/api/assets/import-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: manifestAsset.downloadUrl,
          name: manifestAsset.name,
          type: mapManifestCategoryToAssetType(manifestAsset.category),
          projectId: project?.id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      
      const result = await response.json();
      
      if (result.fallback) {
        addConsoleLog({
          type: 'warning',
          message: `Using remote URL for "${manifestAsset.name}" (storage unavailable)`,
          source: 'Assets'
        });
      } else {
        addConsoleLog({
          type: 'info',
          message: `Stored "${manifestAsset.name}" (${(result.size / 1024).toFixed(1)} KB)`,
          source: 'Assets'
        });
      }
      
      const newAsset: Asset = {
        id: result.asset?.id || crypto.randomUUID(),
        name: manifestAsset.name,
        type: mapManifestCategoryToAssetType(manifestAsset.category),
        path: result.path,
        thumbnail: manifestAsset.thumbnailUrl,
        metadata: {
          objectId: result.objectId,
          sourceUrl: manifestAsset.downloadUrl,
          contentType: result.contentType,
          size: result.size,
          source: manifestAsset.source,
          license: manifestAsset.license,
        }
      };
      
      addAsset(newAsset);
      addConsoleLog({
        type: 'info',
        message: `Added "${manifestAsset.name}" to project assets`,
        source: 'Assets'
      });
      
      setImportedAssets(prev => new Set(prev).add(manifestAsset.id));
      
      // Show success toast
      toast({
        title: "Asset imported",
        description: `"${manifestAsset.name}" added to your project. Check the Assets panel on the left.`,
      });
    } catch (error) {
      addConsoleLog({
        type: 'error',
        message: `Failed to import "${manifestAsset.name}": ${error}`,
        source: 'Assets'
      });
      
      toast({
        title: "Import failed",
        description: `Could not import "${manifestAsset.name}". Check console for details.`,
        variant: "destructive",
      });
    } finally {
      setImportingAssets(prev => {
        const next = new Set(prev);
        next.delete(manifestAsset.id);
        return next;
      });
    }
  };
  
  const totalAssets = STARTER_ASSET_PACKS.reduce((sum, pack) => sum + pack.assets.length, 0);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-starter-packs">
          <Package className="w-3.5 h-3.5" />
          <span className="text-xs">Free Assets</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Free Asset Library
            <Badge variant="secondary" className="ml-2">{totalAssets} assets</Badge>
            {importedAssets.size > 0 && (
              <Badge className="ml-2 bg-green-600">
                <Check className="w-3 h-3 mr-1" />
                {importedAssets.size} imported
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Curated collection of free CC0 and royalty-free assets from trusted sources. Click any asset to add it to your project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets by name, tag, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-assets"
          />
        </div>
        
        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-2">
            {STARTER_ASSET_PACKS.map(pack => (
              <PackSection
                key={pack.id}
                pack={pack}
                onImport={handleImportAsset}
                importingAssets={importingAssets}
                importedAssets={importedAssets}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
          <span>All assets are CC0 or royalty-free licensed</span>
          <span>{importedAssets.size} assets added to project</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
