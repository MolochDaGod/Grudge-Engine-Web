import { useState, useMemo } from 'react';
import { Search, Download, ExternalLink, Box, FileImage, Music, Layers, Filter, Star, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

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
}

const FREE_ASSET_SOURCES: FreeAsset[] = [
  // === INSTALLED IN ENGINE ===
  { id: 'inst-1', name: 'Kenney Pirate Kit (66 models)', type: 'model', source: 'Kenney • Installed', sourceUrl: 'https://kenney.nl/assets/pirate-kit', tags: ['pirate', 'ships', 'barrels', 'treasure', 'installed'], license: 'CC0' },
  { id: 'inst-2', name: 'Kenney Medieval Kit (105 models)', type: 'model', source: 'Kenney • Installed', sourceUrl: 'https://kenney.nl/assets/medieval-rts', tags: ['medieval', 'buildings', 'props', 'castle', 'installed'], license: 'CC0' },
  { id: 'inst-3', name: 'Kenney Dungeon Kit (37 models)', type: 'model', source: 'Kenney • Installed', sourceUrl: 'https://kenney.nl/assets/dungeon-kit', tags: ['dungeon', 'corridors', 'rooms', 'gates', 'installed'], license: 'CC0' },
  { id: 'inst-4', name: 'Kenney Prototype Kit (145 models)', type: 'model', source: 'Kenney • Installed', sourceUrl: 'https://kenney.nl/assets/prototype-kit', tags: ['prototype', 'blocks', 'shapes', 'grey', 'installed'], license: 'CC0' },
  { id: 'inst-5', name: 'Quaternius Monster Pack (4 animated)', type: 'model', source: 'Quaternius • Installed', sourceUrl: 'https://quaternius.com/', tags: ['monster', 'bat', 'dragon', 'skeleton', 'slime', 'installed'], license: 'CC0' },
  { id: 'inst-6', name: 'Easy Enemies Pack (6 creatures)', type: 'model', source: 'Installed', sourceUrl: 'https://quaternius.com/', tags: ['enemy', 'frog', 'rat', 'snake', 'spider', 'wasp', 'installed'], license: 'CC0' },
  { id: 'inst-7', name: 'Men Characters Pack (8 animated)', type: 'model', source: 'Installed', sourceUrl: 'https://quaternius.com/', tags: ['character', 'humanoid', 'male', 'animated', 'installed'], license: 'CC0' },
  { id: 'inst-8', name: 'KayKit Adventurers', type: 'model', source: 'KayKit • Installed', sourceUrl: 'https://kaylousberg.com/', tags: ['adventurer', 'character', 'animated', 'installed'], license: 'CC0' },
  { id: 'inst-9', name: 'KayKit Animations (Large/Medium Rig)', type: 'model', source: 'KayKit • Installed', sourceUrl: 'https://kaylousberg.com/', tags: ['animation', 'combat', 'melee', 'ranged', 'installed'], license: 'CC0' },
  { id: 'inst-10', name: 'Action Adventure Animations (22 clips)', type: 'model', source: 'Mixamo • Installed', sourceUrl: 'https://mixamo.com/', tags: ['stealth', 'sneak', 'roll', 'cover', 'animation', 'installed'], license: 'Free' },
  { id: 'inst-11', name: 'Warrior Character + 52 Animations', type: 'model', source: 'Racalvin • Installed', sourceUrl: 'https://sketchfab.com/', tags: ['warrior', 'orc', 'combat', 'sword', 'player', 'installed'], license: 'Free' },
  { id: 'inst-12', name: 'Survival Props Pack (59 items)', type: 'model', source: 'Installed', sourceUrl: 'https://quaternius.com/', tags: ['survival', 'tools', 'camping', 'food', 'weapons', 'installed'], license: 'CC0' },
  { id: 'inst-13', name: 'Environment Scenes (4 GLTF scenes)', type: 'model', source: 'Installed', sourceUrl: '', tags: ['environment', 'floating', 'pirate', 'fantasy', 'island', 'installed'], license: 'Free' },

  // === POLY HAVEN ===
  { id: 'ph-1', name: 'Studio Small 09', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/studio_small_09', tags: ['studio', 'lighting', 'indoor'], license: 'CC0' },
  { id: 'ph-2', name: 'Kloppenheim 06', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/kloppenheim_06', tags: ['outdoor', 'sky', 'sunset'], license: 'CC0' },
  { id: 'ph-3', name: 'Forest Path', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/forest_path_01', tags: ['nature', 'forest', 'outdoor'], license: 'CC0' },
  { id: 'ph-4', name: 'Leadenhall Market', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/leadenhall_market', tags: ['indoor', 'architecture', 'warm'], license: 'CC0' },
  { id: 'ph-5', name: 'Rogland Clear Noon', type: 'hdri', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/rogland_clear_noon', tags: ['outdoor', 'daytime', 'bright'], license: 'CC0' },
  { id: 'ph-6', name: 'Brick Wall 001', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/brick_wall_001', tags: ['brick', 'wall', 'urban'], license: 'CC0' },
  { id: 'ph-7', name: 'Wooden Planks', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/wooden_planks', tags: ['wood', 'floor', 'planks'], license: 'CC0' },
  { id: 'ph-8', name: 'Ground Grass', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/ground_grass', tags: ['grass', 'ground', 'nature'], license: 'CC0' },
  { id: 'ph-9', name: 'Rock Ground 01', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/rock_ground_01', tags: ['rock', 'stone', 'ground'], license: 'CC0' },
  { id: 'ph-10', name: 'Sand 01', type: 'texture', source: 'Poly Haven', sourceUrl: 'https://polyhaven.com/a/sand_01', tags: ['sand', 'beach', 'desert'], license: 'CC0' },

  // === AMBIENTCG ===
  { id: 'acg-1', name: 'Metal 001', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Metal001', tags: ['metal', 'industrial', 'shiny'], license: 'CC0' },
  { id: 'acg-2', name: 'Concrete 022', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Concrete022', tags: ['concrete', 'wall', 'urban'], license: 'CC0' },
  { id: 'acg-3', name: 'Fabric 032', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Fabric032', tags: ['fabric', 'cloth', 'soft'], license: 'CC0' },
  { id: 'acg-4', name: 'Tiles 074', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Tiles074', tags: ['tiles', 'floor', 'bathroom'], license: 'CC0' },
  { id: 'acg-5', name: 'Leather 008', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Leather008', tags: ['leather', 'armor', 'brown'], license: 'CC0' },
  { id: 'acg-6', name: 'Ice 001', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Ice001', tags: ['ice', 'snow', 'winter'], license: 'CC0' },
  { id: 'acg-7', name: 'Lava 002', type: 'texture', source: 'AmbientCG', sourceUrl: 'https://ambientcg.com/view?id=Lava002', tags: ['lava', 'fire', 'volcanic'], license: 'CC0' },

  // === KENNEY (MORE PACKS) ===
  { id: 'k-1', name: 'Platformer Pack', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/platformer-kit', tags: ['platformer', 'game', 'lowpoly'], license: 'CC0' },
  { id: 'k-2', name: 'Space Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/space-kit', tags: ['space', 'scifi', 'ships'], license: 'CC0' },
  { id: 'k-3', name: 'Nature Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/nature-kit', tags: ['nature', 'trees', 'rocks'], license: 'CC0' },
  { id: 'k-4', name: 'City Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/city-kit-commercial', tags: ['city', 'buildings', 'urban'], license: 'CC0' },
  { id: 'k-5', name: 'Tower Defense Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/tower-defense-kit', tags: ['tower', 'defense', 'game'], license: 'CC0' },
  { id: 'k-6', name: 'Castle Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/castle-kit', tags: ['castle', 'fortress', 'medieval'], license: 'CC0' },
  { id: 'k-7', name: 'Furniture Kit', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/furniture-kit', tags: ['furniture', 'interior', 'props'], license: 'CC0' },
  { id: 'k-8', name: 'Mini Dungeon', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/mini-dungeon', tags: ['dungeon', 'rpg', 'lowpoly'], license: 'CC0' },
  { id: 'k-9', name: 'Sci-Fi RTS', type: 'model', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/sci-fi-rts', tags: ['scifi', 'rts', 'units'], license: 'CC0' },
  { id: 'k-10', name: 'UI Pack', type: 'texture', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/ui-pack', tags: ['ui', 'buttons', 'interface'], license: 'CC0' },
  { id: 'k-11', name: 'Game Icons', type: 'texture', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/game-icons', tags: ['icons', 'ui', 'hud'], license: 'CC0' },

  // === QUATERNIUS ===
  { id: 'q-1', name: 'Ultimate Characters', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/ultimatecharacters.html', tags: ['characters', 'humanoid', 'animated'], license: 'CC0' },
  { id: 'q-2', name: 'Low Poly Vehicles', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/lowpolyvehicles.html', tags: ['vehicles', 'cars', 'lowpoly'], license: 'CC0' },
  { id: 'q-3', name: 'Fantasy Town', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/fantasytown.html', tags: ['fantasy', 'buildings', 'medieval'], license: 'CC0' },
  { id: 'q-4', name: 'Animated Animals', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/animatedanimals.html', tags: ['animals', 'animated', 'nature'], license: 'CC0' },
  { id: 'q-5', name: 'Tropical Jungle', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/tropicaljungle.html', tags: ['jungle', 'tropical', 'trees'], license: 'CC0' },
  { id: 'q-6', name: 'Zombie Pack', type: 'model', source: 'Quaternius', sourceUrl: 'https://quaternius.com/packs/zombiepack.html', tags: ['zombie', 'horror', 'animated'], license: 'CC0' },

  // === SKETCHFAB ===
  { id: 'sf-1', name: 'Sketchfab Free Models', type: 'model', source: 'Sketchfab', sourceUrl: 'https://sketchfab.com/features/free-3d-models', tags: ['various', 'community', 'glb'], license: 'Free' },

  // === MIXAMO ===
  { id: 'mx-1', name: 'Mixamo Character Animations', type: 'model', source: 'Mixamo', sourceUrl: 'https://mixamo.com/', tags: ['animation', 'humanoid', 'rigged', 'combat'], license: 'Free' },

  // === AUDIO ===
  { id: 'a-1', name: 'Impact Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/impact-sounds', tags: ['impact', 'sfx', 'action'], license: 'CC0' },
  { id: 'a-2', name: 'Interface Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/interface-sounds', tags: ['ui', 'click', 'interface'], license: 'CC0' },
  { id: 'a-3', name: 'RPG Audio', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/rpg-audio', tags: ['rpg', 'fantasy', 'music'], license: 'CC0' },
  { id: 'a-4', name: 'Survival Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/survival-sounds', tags: ['nature', 'ambient', 'survival'], license: 'CC0' },
  { id: 'a-5', name: 'Sci-Fi Sounds', type: 'audio', source: 'Kenney', sourceUrl: 'https://kenney.nl/assets/sci-fi-sounds', tags: ['scifi', 'laser', 'tech'], license: 'CC0' },
  { id: 'a-6', name: 'Freesound.org', type: 'audio', source: 'Freesound', sourceUrl: 'https://freesound.org/', tags: ['sfx', 'ambient', 'community'], license: 'Free' },
  { id: 'a-7', name: 'OpenGameArt Music', type: 'audio', source: 'OpenGameArt', sourceUrl: 'https://opengameart.org/content/browse-by-type/music', tags: ['music', 'loops', 'bgm'], license: 'Free' },
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
  const [selectedAsset, setSelectedAsset] = useState<FreeAsset | null>(null);
  const { addConsoleLog, addAsset } = useEngineStore();

  const filteredAssets = useMemo(() => {
    return FREE_ASSET_SOURCES.filter(asset => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        asset.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const isInstalled = (asset: FreeAsset) => asset.tags.includes('installed');

  const handleDownload = (asset: FreeAsset) => {
    if (!asset.sourceUrl) {
      addConsoleLog({ type: 'info', message: `${asset.name} is already installed in the Asset Browser`, source: 'Asset Library' });
      return;
    }
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

  const sources = [
    { name: 'Poly Haven', url: 'https://polyhaven.com', description: 'CC0 HDRIs, textures, and 3D models' },
    { name: 'AmbientCG', url: 'https://ambientcg.com', description: 'CC0 PBR materials' },
    { name: 'Kenney', url: 'https://kenney.nl', description: 'CC0 game assets and audio' },
    { name: 'Quaternius', url: 'https://quaternius.com', description: 'CC0 low-poly 3D models' },
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
                <div className="text-[10px] text-muted-foreground truncate">{asset.source}</div>
              </div>
              {isInstalled(asset) ? (
                <Badge className="text-[10px] h-5 shrink-0 bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">
                  Installed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                  {asset.license}
                </Badge>
              )}
              {!isInstalled(asset) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToProject(asset);
                  }}
                  data-testid={`button-add-${asset.id}`}
                  title="Add reference to project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(asset);
                }}
                data-testid={`button-open-${asset.id}`}
                title={isInstalled(asset) ? 'View source' : 'Open download page'}
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
