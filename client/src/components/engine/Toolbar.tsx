import { useState } from 'react';
import { Play, Pause, Square, Save, FolderOpen, Settings, Cloud, CloudOff, Undo2, Redo2, Download, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { ExamplesBrowser } from './ExamplesBrowser';
import { AssetImporter } from './AssetImporter';
import { StarterPacks } from './StarterPacks';
import { SceneBrowser } from './SceneBrowser';
import { isPuterAvailable } from '@/lib/puter';
import { aiAssistant } from '@/lib/ai-assistant';
import type { SceneExample } from '@/lib/babylon-examples';

interface ToolbarProps {
  onApplyExample?: (example: SceneExample) => void;
}

export function Toolbar({ onApplyExample }: ToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
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
    canUndo,
    canRedo,
    undo,
    redo,
    exportProject,
    importProject
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
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} data-testid="button-undo">
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} data-testid="button-redo">
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ExamplesBrowser onApplyExample={onApplyExample} />
        <SceneBrowser />
        <StarterPacks />
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
            <Button variant="ghost" size="icon" onClick={exportProject} data-testid="button-export">
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export Project (Ctrl+E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.grudge,.json';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) importProject(file);
              };
              input.click();
            }} data-testid="button-import">
              <FolderOpen className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import .grudge Project</TooltipContent>
        </Tooltip>

        <AssetImporter />

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
