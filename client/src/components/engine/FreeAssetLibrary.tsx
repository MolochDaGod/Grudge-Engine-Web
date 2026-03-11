import { useState, useMemo } from 'react';
import { Search, Download, ExternalLink, Box, FileImage, Music, Layers, Filter, Star, Globe, Swords, Shield, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { FACTIONS, type FactionId } from '@/lib/faction-assets';

type FactionTag = 'orc' | 'elf' | 'human' | 'neutral';

interface FreeAsset {
  id: string;
  name: string;
  type: 'model' | 'texture' | 'audio' | 'hdri';
  source: string;
  sourceUrl: string;
  previewUrl?: string;
  downloadUrl?: string;
  tags: string[];
  license: 'CC0' | 'CC-BY' | 'Free';
  factionTags?: FactionTag[];
}

const FREE_ASSET_SOURCES: FreeAsset[] = [
  // Poly Haven HDRIs & Textures
  { id: 'ph-1', name: 'Studio Small 09', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/studio_small_09', tags: ['studio', 'lighting', 'indoor'], license: 'CC0' },
  { id: 'ph-2', name: 'Kloppenheim 06', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/kloppenheim_06', tags: ['outdoor', 'sky', 'sunset'], license: 'CC0' },
  { id: 'ph-3', name: 'Forest Path 01', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/forest_path_01', tags: ['nature', 'forest', 'outdoor'], license: 'CC0' },
  { id: 'ph-4', name: 'Brick Wall 001', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/brick_wall_001', tags: ['brick', 'wall', 'urban'], license: 'CC0' },
  { id: 'ph-5', name: 'Wooden Planks', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/wooden_planks', tags: ['wood', 'floor', 'planks'], license: 'CC0' },
  { id: 'ph-6', name: 'Ground Grass', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/ground_grass', tags: ['grass', 'ground', 'nature'], license: 'CC0' },
  
  // AmbientCG Textures
  { id: 'acg-1', name: 'Metal 001', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Metal001', tags: ['metal', 'industrial', 'shiny'], license: 'CC0' },
  { id: 'acg-2', name: 'Concrete 022', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Concrete022', tags: ['concrete', 'wall', 'urban'], license: 'CC0' },
  { id: 'acg-3', name: 'Fabric 032', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Fabric032', tags: ['fabric', 'cloth', 'soft'], license: 'CC0' },
  { id: 'acg-4', name: 'Tiles 074', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Tiles074', tags: ['tiles', 'floor', 'bathroom'], license: 'CC0' },
  
  // Kenney Assets
  { id: 'k-1', name: 'Platformer Pack', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/platformer-kit', tags: ['platformer', 'game', 'lowpoly'], license: 'CC0' },
  { id: 'k-2', name: 'Space Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/space-kit', tags: ['space', 'scifi', 'ships'], license: 'CC0' },
  { id: 'k-3', name: 'Nature Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/nature-kit', tags: ['nature', 'trees', 'rocks'], license: 'CC0' },
  { id: 'k-4', name: 'City Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/city-kit-commercial', tags: ['city', 'buildings', 'urban'], license: 'CC0' },
  { id: 'k-5', name: 'Tower Defense Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/tower-defense-kit', tags: ['tower', 'defense', 'game'], license: 'CC0' },
  { id: 'k-6', name: 'UI Pack', type: 'texture', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/ui-pack', tags: ['ui', 'buttons', 'interface'], license: 'CC0' },
  
  // Quaternius 3D Models
  { id: 'q-1', name: 'Ultimate Characters', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/ultimatecharacters.html', tags: ['characters', 'humanoid', 'animated'], license: 'CC0', factionTags: ['human', 'neutral'] },
  { id: 'q-2', name: 'Low Poly Vehicles', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/lowpolyvehicles.html', tags: ['vehicles', 'cars', 'lowpoly'], license: 'CC0' },
  { id: 'q-3', name: 'Fantasy Town', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/fantasytown.html', tags: ['fantasy', 'buildings', 'medieval'], license: 'CC0', factionTags: ['human', 'neutral'] },
  { id: 'q-4', name: 'Animated Animals', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/animatedanimals.html', tags: ['animals', 'animated', 'nature'], license: 'CC0' },

  // CraftPix Low-Poly RTS Packs
  { id: 'cp-1', name: 'Low Poly Orc Buildings', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-orc-buildings-3d-low-poly-pack/', tags: ['orc', 'buildings', 'lowpoly', 'rts'], license: 'Free', factionTags: ['orc'] },
  { id: 'cp-2', name: 'Low Poly Elf Buildings', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-elf-buildings-3d-low-poly-pack/', tags: ['elf', 'buildings', 'lowpoly', 'rts'], license: 'Free', factionTags: ['elf'] },
  { id: 'cp-3', name: 'Low Poly Castle Buildings', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-castle-buildings-3d-low-poly-pack/', tags: ['human', 'castle', 'buildings', 'lowpoly', 'rts'], license: 'Free', factionTags: ['human'] },
  { id: 'cp-4', name: 'Low Poly Siege Weapons', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-siege-weapons-3d-low-poly-models/', tags: ['siege', 'weapons', 'catapult', 'lowpoly'], license: 'Free', factionTags: ['orc', 'elf', 'human'] },
  { id: 'cp-5', name: 'Low Poly Nature Props', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-nature-props-3d-low-poly-pack/', tags: ['nature', 'trees', 'rocks', 'terrain'], license: 'Free', factionTags: ['neutral'] },
  { id: 'cp-6', name: 'Low Poly Medieval Weapons', type: 'model', source: 'CraftPix', sourceUrl: 'https://craftpix.net/freebies/free-medieval-weapons-3d-low-poly-pack/', tags: ['weapons', 'sword', 'axe', 'medieval'], license: 'Free', factionTags: ['orc', 'elf', 'human'] },

  // KayKit Game Assets
  { id: 'kk-1', name: 'KayKit Adventurers', type: 'model', source: 'KayKit', sourceUrl: 'https://kaylousberg.itch.io/kaykit-adventurers', tags: ['characters', 'adventurer', 'animated', 'lowpoly'], license: 'CC0', factionTags: ['human', 'neutral'] },
  { id: 'kk-2', name: 'KayKit Skeletons', type: 'model', source: 'KayKit', sourceUrl: 'https://kaylousberg.itch.io/kaykit-skeletons', tags: ['skeleton', 'undead', 'animated', 'lowpoly'], license: 'CC0', factionTags: ['orc', 'neutral'] },
  { id: 'kk-3', name: 'KayKit Medieval Builder', type: 'model', source: 'KayKit', sourceUrl: 'https://kaylousberg.itch.io/kaykit-medieval-builder-pack', tags: ['medieval', 'buildings', 'walls', 'lowpoly'], license: 'CC0', factionTags: ['human', 'neutral'] },
  { id: 'kk-4', name: 'KayKit Dungeon Remastered', type: 'model', source: 'KayKit', sourceUrl: 'https://kaylousberg.itch.io/kaykit-dungeon-remastered', tags: ['dungeon', 'tiles', 'interior', 'lowpoly'], license: 'CC0', factionTags: ['neutral'] },

  // Toon_RTS (local asset pack)
  { id: 'trts-1', name: 'Toon RTS — Orc Pack', type: 'model', source: 'Toon_RTS (Local)', sourceUrl: 'file:///D:/Games/Models/Toon_RTS', tags: ['orc', 'characters', 'cavalry', 'animated', 'rts'], license: 'Free', factionTags: ['orc'] },
  { id: 'trts-2', name: 'Toon RTS — Elf Pack', type: 'model', source: 'Toon_RTS (Local)', sourceUrl: 'file:///D:/Games/Models/Toon_RTS', tags: ['elf', 'characters', 'cavalry', 'animated', 'rts'], license: 'Free', factionTags: ['elf'] },
  { id: 'trts-3', name: 'Toon RTS — WesternKingdoms Pack', type: 'model', source: 'Toon_RTS (Local)', sourceUrl: 'file:///D:/Games/Models/Toon_RTS', tags: ['human', 'characters', 'cavalry', 'animated', 'rts'], license: 'Free', factionTags: ['human'] },

  // Free Audio
  { id: 'a-1', name: 'Retro Sound Effects', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/voiceover-pack', tags: ['retro', 'sfx', '8bit'], license: 'CC0' },
  { id: 'a-2', name: 'Impact Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/impact-sounds', tags: ['impact', 'sfx', 'action'], license: 'CC0' },
  { id: 'a-3', name: 'Interface Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/interface-sounds', tags: ['ui', 'click', 'interface'], license: 'CC0' },
  { id: 'a-4', name: 'RPG Audio', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/rpg-audio', tags: ['rpg', 'fantasy', 'game'], license: 'CC0' },
];

function getAssetIcon(type: string) {
  switch (type) {
    case 'model': return <Box className="w-4 h-4 text-blue-400" />;
    case 'texture': return <FileImage className="w-4 h-4 text-green-400" />;
    case 'audio': return <Music className="w-4 h-4 text-yellow-400" />;
    case 'hdri': return <Globe className="w-4 h-4 text-cyan-400" />;
    default: return <Layers className="w-4 h-4 text-muted-foreground" />;
  }
}

export function FreeAssetLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'model' | 'texture' | 'audio' | 'hdri'>('all');
  const [factionFilter, setFactionFilter] = useState<'all' | FactionTag>('all');
  const [selectedAsset, setSelectedAsset] = useState<FreeAsset | null>(null);
  const { addConsoleLog, addAsset } = useEngineStore();

  const filteredAssets = useMemo(() => {
    return FREE_ASSET_SOURCES.filter(asset => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        asset.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
      const matchesFaction = factionFilter === 'all' || !asset.factionTags || asset.factionTags.includes(factionFilter);
      return matchesSearch && matchesFilter && matchesFaction;
    });
  }, [searchQuery, activeFilter, factionFilter]);

  const handleDownload = (asset: FreeAsset) => {
    window.open(asset.sourceUrl, '_blank');
    addConsoleLog({
      type: 'info',
      message: `Opened ${asset.name} from ${asset.source}`,
      source: 'Asset Library'
    });
  };

  const handleAddToProject = (asset: FreeAsset) => {
    const assetType = asset.type === 'hdri' ? 'texture' : asset.type;
    addAsset({
      id: crypto.randomUUID(),
      name: asset.name,
      type: assetType as any,
      path: `/assets/external/${asset.name.toLowerCase().replace(/\s+/g, '-')}`
    });
    addConsoleLog({
      type: 'info',
      message: `Added ${asset.name} reference to project`,
      source: 'Asset Library'
    });
  };

  const handleImportToFaction = (asset: FreeAsset, faction: FactionId) => {
    const assetType = asset.type === 'hdri' ? 'texture' : asset.type;
    addAsset({
      id: crypto.randomUUID(),
      name: `[${FACTIONS[faction].name}] ${asset.name}`,
      type: assetType as any,
      path: `/assets/factions/${faction}/${assetType === 'model' ? 'units' : 'buildings'}/${asset.name.toLowerCase().replace(/\s+/g, '-')}`
    });
    addConsoleLog({
      type: 'info',
      message: `Imported ${asset.name} → ${FACTIONS[faction].name} faction`,
      source: 'Asset Library'
    });
  };

  const sources = [
    { name: 'Poly Haven', url: 'https://polyhaven.com', description: 'CC0 HDRIs, textures, and 3D models' },
    { name: 'AmbientCG', url: 'https://ambientcg.com', description: 'CC0 PBR materials' },
    { name: 'Kenney', url: 'https://kenney.nl', description: 'CC0 game assets and audio' },
    { name: 'Quaternius', url: 'https://quaternius.com', description: 'CC0 low-poly 3D models' },
    { name: 'CraftPix', url: 'https://craftpix.net/freebies/', description: 'Free low-poly RTS buildings, weapons, props' },
    { name: 'KayKit', url: 'https://kaylousberg.itch.io/', description: 'CC0 low-poly game asset packs' },
    { name: 'Toon_RTS', url: 'file:///D:/Games/Models/Toon_RTS', description: 'Local FBX packs — Orc, Elf, Human factions' },
    { name: 'Mixamo', url: 'https://mixamo.com', description: 'Free character animations (requires account)' },
    { name: 'Sketchfab', url: 'https://sketchfab.com/features/free-3d-models', description: 'Free 3D models (various licenses)' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search free assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
              data-testid="input-library-search"
            />
          </div>
        </div>
        
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
          <TabsList className="h-7 w-full">
            <TabsTrigger value="all" className="text-xs h-6 flex-1" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="model" className="text-xs h-6 flex-1" data-testid="tab-models">Models</TabsTrigger>
            <TabsTrigger value="texture" className="text-xs h-6 flex-1" data-testid="tab-textures">Textures</TabsTrigger>
            <TabsTrigger value="audio" className="text-xs h-6 flex-1" data-testid="tab-audio">Audio</TabsTrigger>
            <TabsTrigger value="hdri" className="text-xs h-6 flex-1" data-testid="tab-hdri">HDRI</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Faction filter row */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] text-muted-foreground mr-1"><Swords className="w-3 h-3 inline" /> Faction:</span>
          {(['all', 'orc', 'elf', 'human', 'neutral'] as const).map(f => (
            <Button
              key={f}
              variant={factionFilter === f ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-5 text-[10px] px-1.5", factionFilter === f && f !== 'all' && f !== 'neutral' && 'text-white')}
              style={factionFilter === f && f !== 'all' && f !== 'neutral' ? { backgroundColor: FACTIONS[f as FactionId].color } : undefined}
              onClick={() => setFactionFilter(f)}
              data-testid={`faction-filter-${f}`}
            >
              {f === 'all' ? 'All' : f === 'neutral' ? '⚪' : FACTIONS[f as FactionId].icon} {f !== 'all' && f !== 'neutral' ? FACTIONS[f as FactionId].name.split(' ')[0] : f === 'neutral' ? 'Neutral' : ''}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer",
                selectedAsset?.id === asset.id && "bg-primary/20"
              )}
              onClick={() => setSelectedAsset(asset)}
              data-testid={`asset-${asset.id}`}
            >
              {getAssetIcon(asset.type)}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{asset.name}</div>
                <div className="text-[10px] text-muted-foreground">{asset.source}</div>
              </div>
              {asset.factionTags && asset.factionTags.length > 0 && (
                <div className="flex gap-0.5 shrink-0">
                  {asset.factionTags.filter(t => t !== 'neutral').map(t => (
                    <span key={t} className="text-[9px] px-1 rounded" style={{ backgroundColor: FACTIONS[t as FactionId]?.color + '30', color: FACTIONS[t as FactionId]?.color }}>
                      {FACTIONS[t as FactionId]?.icon}
                    </span>
                  ))}
                </div>
              )}
              <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                {asset.license}
              </Badge>
              {asset.factionTags && asset.type === 'model' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-primary"
                  title="Import to active faction"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetFaction = (asset.factionTags?.find(t => t !== 'neutral') ?? 'human') as FactionId;
                    handleImportToFaction(asset, targetFaction);
                  }}
                  data-testid={`button-faction-import-${asset.id}`}
                >
                  <Shield className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToProject(asset);
                }}
                data-testid={`button-add-${asset.id}`}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(asset);
                }}
                data-testid={`button-open-${asset.id}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-sidebar-border mt-2">
          <div className="text-xs font-medium mb-2 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            Recommended Sources
          </div>
          <div className="space-y-1">
            {sources.map(source => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md hover-elevate text-xs"
                data-testid={`source-${source.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Globe className="w-3.5 h-3.5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{source.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{source.description}</div>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
