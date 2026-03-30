import { useState } from 'react';
import { Play, Pause, Square, Save, FolderOpen, Settings, Cloud, CloudOff, Undo2, Redo2, Download, Maximize2, Loader2, Sparkles, Rocket, Magnet, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { ExamplesBrowser } from './ExamplesBrowser';
import { AssetImporter } from './AssetImporter';
import { StarterPacks } from './StarterPacks';
import { DemoScenes } from './DemoScenes';
import { isPuterAvailable } from '@/lib/puter';
import { aiAssistant } from '@/lib/ai-assistant';
import { downloadExport } from '@/lib/game-exporter';
import type { SceneExample } from '@/lib/babylon-examples';

interface ToolbarProps {
  onApplyExample?: (example: SceneExample) => void;
  onCommandPalette?: () => void;
}

const TRANSLATE_SNAPS = [0.1, 0.25, 0.5, 1];
const ROTATE_SNAPS = [5, 15, 45, 90];
const SCALE_SNAPS = [0.1, 0.25, 0.5, 1];

export function Toolbar({ onApplyExample, onCommandPalette }: ToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  
  const { 
    project, 
    isPlaying, 
    isPaused, 
    isLoading,
    setPlaying, 
    setPaused, 
    cloudSyncStatus,
    addConsoleLog,
    saveToCloud,
    loadFromCloud,
    showGrid,
    showStats,
    toggleGrid,
    toggleStats,
    currentSceneId,
    snapSettings,
    setSnapSettings,
  } = useEngineStore();

  const handlePlay = () => {
    setPlaying(true);
    setPaused(false);
    addConsoleLog({ type: 'info', message: 'Game started', source: 'Engine' });
  };

  const handlePause = () => {
    setPaused(!isPaused);
    addConsoleLog({ type: 'info', message: isPaused ? 'Game resumed' : 'Game paused', source: 'Engine' });
  };

  const handleStop = () => {
    setPlaying(false);
    setPaused(false);
    addConsoleLog({ type: 'info', message: 'Game stopped', source: 'Engine' });
  };

  const handleSave = async () => {
    await saveToCloud();
  };

  const handleOpen = async () => {
    await loadFromCloud();
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        addConsoleLog({ type: 'error', message: `Fullscreen failed: ${e.message}`, source: 'Engine' });
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-3 gap-2" data-testid="toolbar">
      <div className="flex items-center gap-2 min-w-[200px]">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Grudge Engine" className="w-6 h-6 rounded" />
          <span className="text-sm font-semibold text-foreground tracking-wide">
            {project?.name || 'Grudge Engine'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleSave} data-testid="button-save">
              <Save className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save Project (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpen} disabled={isLoading} data-testid="button-open">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open Project</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-undo">
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-redo">
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ExamplesBrowser onApplyExample={onApplyExample} />
        <StarterPacks />
        <DemoScenes />
      </div>

      <div className="flex-1 flex items-center justify-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={isPlaying && !isPaused ? "default" : "ghost"} 
              size="icon"
              onClick={handlePlay}
              disabled={isPlaying && !isPaused}
              data-testid="button-play"
            >
              <Play className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Play (F5)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={isPaused ? "default" : "ghost"} 
              size="icon"
              onClick={handlePause}
              disabled={!isPlaying}
              data-testid="button-pause"
            >
              <Pause className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pause (F6)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleStop}
              disabled={!isPlaying}
              data-testid="button-stop"
            >
              <Square className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop (F7)</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (project) {
                  downloadExport(project, {}, currentSceneId || undefined);
                  addConsoleLog({ type: 'info', message: 'Exported current scene as HTML - ready for deployment!', source: 'Export' });
                }
              }}
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export as HTML (Deploy to web)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary"
              onClick={() => {
                if (project) {
                  downloadExport(project, { quality: 'high' }, currentSceneId || undefined);
                  addConsoleLog({ type: 'info', message: 'Exported high-quality build - ready for Puter deployment!', source: 'Export' });
                }
              }}
              data-testid="button-deploy"
            >
              <Rocket className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Deploy to Puter (High Quality)</TooltipContent>
        </Tooltip>

        <AssetImporter />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
              onClick={onCommandPalette}
              data-testid="button-command-palette"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs hidden md:inline text-muted-foreground">⌘K</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command Palette (Ctrl+K)</TooltipContent>
        </Tooltip>

        <Popover open={snapOpen} onOpenChange={setSnapOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={snapSettings.enabled ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 px-2 gap-1.5", snapSettings.enabled && "bg-primary/20 text-primary border border-primary/30")}
              data-testid="button-snap"
              title="Snap Settings"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span className="text-xs hidden lg:inline">Snap</span>
              {snapSettings.enabled && <span className="text-[10px] text-primary font-mono">{snapSettings.translate}m</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 space-y-4" side="bottom" align="start">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Snap Settings</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="snap-enabled" className="text-xs text-muted-foreground">Enabled</Label>
                <Switch
                  id="snap-enabled"
                  checked={snapSettings.enabled}
                  onCheckedChange={(v) => setSnapSettings({ enabled: v })}
                  data-testid="switch-snap-enabled"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Translate</Label>
                <div className="flex gap-1">
                  {TRANSLATE_SNAPS.map(v => (
                    <Button
                      key={v}
                      variant={snapSettings.translate === v ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setSnapSettings({ translate: v })}
                      data-testid={`snap-translate-${v}`}
                    >
                      {v}m
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rotate</Label>
                <div className="flex gap-1">
                  {ROTATE_SNAPS.map(v => (
                    <Button
                      key={v}
                      variant={snapSettings.rotate === v ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setSnapSettings({ rotate: v })}
                      data-testid={`snap-rotate-${v}`}
                    >
                      {v}°
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scale</Label>
                <div className="flex gap-1">
                  {SCALE_SNAPS.map(v => (
                    <Button
                      key={v}
                      variant={snapSettings.scale === v ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setSnapSettings({ scale: v })}
                      data-testid={`snap-scale-${v}`}
                    >
                      {v}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
              isPuterAvailable() ? "text-green-400" : "text-muted-foreground"
            )}>
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isPuterAvailable() ? 'AI Ready' : 'AI Offline'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isPuterAvailable() 
              ? `Free AI: ${aiAssistant.allModels.find(m => m.id === aiAssistant.currentModel)?.name || 'Gemini'}` 
              : 'AI requires Puter.js (access via puter.com)'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
              cloudSyncStatus === 'synced' && "text-green-400",
              cloudSyncStatus === 'syncing' && "text-yellow-400",
              cloudSyncStatus === 'offline' && "text-muted-foreground",
              cloudSyncStatus === 'error' && "text-red-400"
            )}>
              {cloudSyncStatus === 'offline' ? (
                <CloudOff className="w-4 h-4" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span className="hidden sm:inline capitalize">{cloudSyncStatus}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Cloud Sync Status</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} data-testid="button-settings">
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleFullscreen} data-testid="button-fullscreen">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fullscreen</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Engine Settings</DialogTitle>
            <DialogDescription>Configure viewport and editor preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-grid" className="flex flex-col gap-1">
                <span>Show Grid</span>
                <span className="text-xs text-muted-foreground font-normal">Display ground grid in viewport</span>
              </Label>
              <Switch id="show-grid" checked={showGrid} onCheckedChange={toggleGrid} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-stats" className="flex flex-col gap-1">
                <span>Show Stats</span>
                <span className="text-xs text-muted-foreground font-normal">Display FPS and render stats</span>
              </Label>
              <Switch id="show-stats" checked={showStats} onCheckedChange={toggleStats} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
