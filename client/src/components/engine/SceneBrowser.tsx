import { useState } from 'react';
import { MapIcon, Play, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getScenesByGame, GAME_GROUPS, type RPGSceneConfig } from '@/lib/scenes/scene-registry';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

interface SceneBrowserProps {
  onLoadScene?: (sceneId: string) => void;
}

export function SceneBrowser({ onLoadScene }: SceneBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingScene, setLoadingScene] = useState<string | null>(null);
  const { addConsoleLog } = useEngineStore();

  const scenesByGame = getScenesByGame();

  const filteredByGame = Object.entries(scenesByGame).reduce<Record<string, RPGSceneConfig[]>>(
    (acc, [game, scenes]) => {
      const filtered = scenes.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.game.toLowerCase().includes(q) ||
          s.terrain?.toLowerCase().includes(q) ||
          s.skybox?.toLowerCase().includes(q)
        );
      });
      if (filtered.length > 0) acc[game] = filtered;
      return acc;
    },
    {}
  );

  const totalScenes = Object.values(filteredByGame).reduce((sum, s) => sum + s.length, 0);

  const handleLoadScene = async (scene: RPGSceneConfig) => {
    setLoadingScene(scene.id);
    addConsoleLog({
      type: 'info',
      message: `Loading scene: ${scene.name} (${scene.game})`,
      source: 'SceneBrowser',
    });

    onLoadScene?.(scene.id);
    setLoadingScene(null);
    setIsOpen(false);
  };

  const getGameIcon = (gameName: string): string => {
    const group = GAME_GROUPS.find(g => g.name === gameName);
    return group?.icon || '🎮';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-scene-browser">
          <MapIcon className="w-3.5 h-3.5" />
          <span className="text-xs">Scenes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Game Scene Browser
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search scenes by name, game, terrain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-scene-search"
          />
        </div>

        <ScrollArea className="h-[450px] pr-4">
          {Object.entries(filteredByGame).map(([game, scenes]) => (
            <GameSection
              key={game}
              game={game}
              icon={getGameIcon(game)}
              scenes={scenes}
              loadingScene={loadingScene}
              onLoadScene={handleLoadScene}
            />
          ))}

          {totalScenes === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MapIcon className="w-8 h-8 mb-2" />
              <span className="text-sm">No scenes found</span>
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground mt-2">
          {totalScenes} scenes across {Object.keys(filteredByGame).length} games
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GameSection({
  game,
  icon,
  scenes,
  loadingScene,
  onLoadScene,
}: {
  game: string;
  icon: string;
  scenes: RPGSceneConfig[];
  loadingScene: string | null;
  onLoadScene: (scene: RPGSceneConfig) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-sidebar-accent/50 transition-colors">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold flex-1 text-left">{game}</span>
        <Badge variant="outline" className="text-xs">{scenes.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-2 pr-1 space-y-2 mt-1">
        {scenes.map(scene => (
          <SceneCard
            key={scene.id}
            scene={scene}
            isLoading={loadingScene === scene.id}
            onLoad={() => onLoadScene(scene)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SceneCard({
  scene,
  isLoading,
  onLoad,
}: {
  scene: RPGSceneConfig;
  isLoading: boolean;
  onLoad: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-sidebar-accent/30',
        'hover:bg-sidebar-accent/60 cursor-pointer transition-colors'
      )}
      onClick={onLoad}
      data-testid={`scene-${scene.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{scene.name}</span>
          {scene.terrain && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {scene.terrain}
            </Badge>
          )}
          {scene.skybox && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {scene.skybox}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{scene.description}</p>
        {scene.mapSize && (
          <span className="text-[10px] text-muted-foreground/60">
            Map: {(scene.mapSize / 1000).toFixed(0)}km
          </span>
        )}
      </div>

      <div className="shrink-0">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Play className="w-4 h-4 text-primary" />
        )}
      </div>
    </div>
  );
}
