import { useState } from 'react';
import { Gamepad2, Play, ChevronRight, Users, Sword, Tent, Shield, Mountain, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEngineStore } from '@/lib/engine-store';
import { PRESET_SCENES, type SceneConfig } from '@/lib/scene-builder';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SceneMeta {
  icon: React.ReactNode;
  genre: string;
  color: string;
  badge: string;
}

const SCENE_META: Record<string, SceneMeta> = {
  'forest-adventure': { icon: <TreePine className="w-5 h-5" />, genre: 'Adventure', color: 'text-green-400', badge: 'bg-green-500/20 text-green-300' },
  'combat-arena':     { icon: <Sword className="w-5 h-5" />, genre: 'Combat', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
  'warrior-battle':   { icon: <Sword className="w-5 h-5" />, genre: 'Action', color: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  'dragons-lair':     { icon: <Mountain className="w-5 h-5" />, genre: 'Fantasy', color: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  'demo-mmo':         { icon: <Users className="w-5 h-5" />, genre: 'MMO', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  'demo-fps':         { icon: <Gamepad2 className="w-5 h-5" />, genre: 'FPS', color: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
  'demo-survival':    { icon: <Tent className="w-5 h-5" />, genre: 'Survival', color: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
  'demo-rts':         { icon: <Shield className="w-5 h-5" />, genre: 'Strategy', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
};

interface SceneCardProps {
  scene: SceneConfig;
  isLoading: boolean;
  onLoad: (scene: SceneConfig) => void;
}

function SceneCard({ scene, isLoading, onLoad }: SceneCardProps) {
  const meta = SCENE_META[scene.id] || { icon: <Gamepad2 className="w-5 h-5" />, genre: 'Scene', color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
  const propCount = scene.props.length;
  const npcCount = scene.npcs.length;
  const isDemo = scene.id.startsWith('demo-');

  return (
    <div
      className={cn(
        "group flex items-start gap-4 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent/60 hover:border-primary/40 transition-all cursor-pointer",
        isLoading && "opacity-60 pointer-events-none"
      )}
      onClick={() => onLoad(scene)}
      data-testid={`scene-card-${scene.id}`}
    >
      <div className={cn("mt-0.5 shrink-0", meta.color)}>{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{scene.name}</span>
          <Badge className={cn("text-xs px-2 py-0 h-5 border-0", meta.badge)}>{meta.genre}</Badge>
          {isDemo && <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-primary border-primary/40">New Demo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{scene.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {npcCount} NPC{npcCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> {propCount} Props
          </span>
          <span className="capitalize">{scene.environment} env</span>
          <span className={cn("ml-auto font-medium", scene.lighting.enableShadows ? "text-yellow-400" : "text-muted-foreground")}>
            {scene.lighting.enableShadows ? `Shadows (${scene.lighting.shadowQuality})` : 'No shadows'}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 gap-1.5 text-primary hover:bg-primary/20 group-hover:opacity-100 opacity-60 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onLoad(scene); }}
        disabled={isLoading}
        data-testid={`button-load-scene-${scene.id}`}
      >
        <Play className="w-3.5 h-3.5" />
        Load
      </Button>
    </div>
  );
}

export function DemoScenes() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const { setPresetScene, addConsoleLog, setPlaying } = useEngineStore();
  const { toast } = useToast();

  const handleLoadScene = async (scene: SceneConfig) => {
    setLoadingSceneId(scene.id);

    try {
      setPresetScene(scene.id);
      addConsoleLog({ type: 'info', message: `Loading demo scene: "${scene.name}" — entering play mode...`, source: 'Demo' });
      setPlaying(true);
      setIsOpen(false);
      toast({
        title: `Loading "${scene.name}"`,
        description: 'Demo scene is being built. Check the Console tab for progress.',
      });
    } catch (err) {
      addConsoleLog({ type: 'error', message: `Failed to queue demo scene: ${err}`, source: 'Demo' });
    } finally {
      setLoadingSceneId(null);
    }
  };

  const classics = PRESET_SCENES.filter(s => !s.id.startsWith('demo-'));
  const demos = PRESET_SCENES.filter(s => s.id.startsWith('demo-'));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-demo-scenes">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span className="text-xs">Demo Scenes</span>
          <Badge className="ml-0.5 h-4 px-1.5 text-[10px] bg-primary/80">New</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Demo Scenes
            <Badge variant="secondary" className="ml-2">{PRESET_SCENES.length} scenes</Badge>
          </DialogTitle>
          <DialogDescription>
            Pre-built playable scenes to prototype different game genres. Click any scene to load it into the editor and enter Play Mode.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh] pr-3">
          <div className="space-y-4">
            {demos.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Demo Scenes</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {demos.map(scene => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      isLoading={loadingSceneId === scene.id}
                      onLoad={handleLoadScene}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classic Scenes</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {classics.map(scene => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isLoading={loadingSceneId === scene.id}
                    onLoad={handleLoadScene}
                  />
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            Press <kbd className="mx-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Space</kbd> to toggle play mode after loading
          </span>
          <span>{PRESET_SCENES.length} scenes available</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
