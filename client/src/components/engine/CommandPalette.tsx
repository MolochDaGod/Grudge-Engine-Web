import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Box, Sun, Camera, Play, Square, Pause, Grid3X3, Activity, Terminal, Film, Sparkles,
  FileCode, Volume2, Package, Settings, Download, Maximize2, Layers, Lightbulb,
  Cylinder, Trash2, Copy, Eye, EyeOff, FolderOpen, Save, Undo2, Redo2, Wand2,
  Library, ChevronRight, Circle
} from 'lucide-react';
import { useEngineStore } from '@/lib/engine-store';

interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  group: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    isPlaying, isPaused, setPlaying, setPaused,
    addGameObject, addConsoleLog, showGrid, showStats, toggleGrid, toggleStats,
    setActiveBottomTab, saveToCloud, getCurrentScene, selectedObjectId,
    deleteGameObject, duplicateObject, selectObject, project, currentSceneId,
  } = useEngineStore();

  const runAndClose = useCallback((fn: () => void) => {
    fn();
    onOpenChange(false);
  }, [onOpenChange]);

  const addObject = useCallback((type: string, label: string) => {
    const id = crypto.randomUUID();
    const typeMap: Record<string, string> = { box: 'box', sphere: 'sphere', cylinder: 'cylinder', plane: 'plane' };
    const meshType = typeMap[type] ?? type;
    const isLight = type === 'light';
    const isCamera = type === 'camera';
    const obj = {
      id, name: label, visible: true, parentId: null, isStatic: false,
      tags: [] as string[], layer: 0, prefabId: undefined as string | undefined, children: [] as string[],
      transform: { position: { x: 0, y: isLight ? 3 : 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [isLight
        ? { id: crypto.randomUUID(), type: 'light', enabled: true, properties: { type: 'point', intensity: 1, color: '#ffffff', range: 10 } }
        : isCamera
        ? { id: crypto.randomUUID(), type: 'camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } }
        : { id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type: meshType } }
      ] as any[],
    };
    addGameObject(obj);
    addConsoleLog({ type: 'info', message: `Created ${label}`, source: 'Command Palette' });
  }, [addGameObject, addConsoleLog]);

  const actions: PaletteAction[] = [
    // ── Create ──
    { id: 'create-box', label: 'Create Cube', description: 'Add a box mesh to the scene', icon: <Box className="w-4 h-4" />, group: 'Create', action: () => addObject('box', 'Cube') },
    { id: 'create-sphere', label: 'Create Sphere', description: 'Add a sphere mesh to the scene', icon: <Circle className="w-4 h-4" />, group: 'Create', action: () => addObject('sphere', 'Sphere') },
    { id: 'create-cylinder', label: 'Create Cylinder', description: 'Add a cylinder mesh', icon: <Cylinder className="w-4 h-4" />, group: 'Create', action: () => addObject('cylinder', 'Cylinder') },
    { id: 'create-plane', label: 'Create Plane', description: 'Add a flat plane mesh', icon: <Box className="w-4 h-4" />, group: 'Create', action: () => addObject('plane', 'Plane') },
    { id: 'create-empty', label: 'Create Empty Object', description: 'Add an empty transform node', icon: <Layers className="w-4 h-4" />, group: 'Create', shortcut: 'Ctrl+Shift+N', action: () => addObject('empty', 'Empty') },
    { id: 'create-light', label: 'Create Point Light', description: 'Add a point light', icon: <Lightbulb className="w-4 h-4" />, group: 'Create', action: () => addObject('light', 'Point Light') },
    { id: 'create-camera', label: 'Create Camera', description: 'Add a camera to the scene', icon: <Camera className="w-4 h-4" />, group: 'Create', action: () => addObject('camera', 'Camera') },
    // ── Playback ──
    { id: 'play', label: isPlaying ? 'Stop Playback' : 'Start Playback', description: 'Toggle play mode', icon: isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />, group: 'Playback', shortcut: 'F5', action: () => { if (isPlaying) { setPlaying(false); setPaused(false); } else { setPlaying(true); setPaused(false); } } },
    { id: 'pause', label: isPaused ? 'Resume' : 'Pause', description: 'Pause/resume playback', icon: <Pause className="w-4 h-4" />, group: 'Playback', shortcut: 'F6', action: () => setPaused(!isPaused) },
    // ── View ──
    { id: 'toggle-grid', label: showGrid ? 'Hide Grid' : 'Show Grid', description: 'Toggle viewport grid', icon: <Grid3X3 className="w-4 h-4" />, group: 'View', action: () => toggleGrid() },
    { id: 'toggle-stats', label: showStats ? 'Hide Stats' : 'Show Stats', description: 'Toggle performance stats overlay', icon: <Activity className="w-4 h-4" />, group: 'View', action: () => toggleStats() },
    { id: 'fullscreen', label: 'Toggle Fullscreen', icon: <Maximize2 className="w-4 h-4" />, group: 'View', shortcut: 'F11', action: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } },
    // ── Panels ──
    { id: 'open-console', label: 'Open Console', icon: <Terminal className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('console') },
    { id: 'open-animation', label: 'Open Animation Panel', icon: <Film className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('animation') },
    { id: 'open-ai', label: 'Open AI Studio', icon: <Sparkles className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('ai') },
    { id: 'open-scripts', label: 'Open Script Editor', icon: <FileCode className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('scripts') },
    { id: 'open-audio', label: 'Open Audio Mixer', icon: <Volume2 className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('audio') },
    { id: 'open-lighting', label: 'Open Lighting Panel', icon: <Sun className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('lighting') },
    { id: 'open-library', label: 'Open Asset Library', icon: <Library className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('library') },
    { id: 'open-build', label: 'Open Build Settings', icon: <Package className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('build') },
    { id: 'open-settings', label: 'Open Project Settings', icon: <Settings className="w-4 h-4" />, group: 'Panels', action: () => setActiveBottomTab('settings') },
    // ── Selection ──
    ...(selectedObjectId ? [
      { id: 'delete-selected', label: 'Delete Selected Object', icon: <Trash2 className="w-4 h-4 text-destructive" />, group: 'Selection', shortcut: 'Del', action: () => { deleteGameObject(selectedObjectId); selectObject(null); } },
      { id: 'duplicate-selected', label: 'Duplicate Selected Object', icon: <Copy className="w-4 h-4" />, group: 'Selection', shortcut: 'Ctrl+D', action: () => duplicateObject(selectedObjectId) },
    ] : []),
    // ── File ──
    { id: 'save', label: 'Save Project', icon: <Save className="w-4 h-4" />, group: 'File', shortcut: 'Ctrl+S', action: () => saveToCloud() },
    { id: 'export', label: 'Export as HTML', description: 'Build and download as a standalone web game', icon: <Download className="w-4 h-4" />, group: 'File', action: () => addConsoleLog({ type: 'info', message: 'Use the Export button in the toolbar', source: 'Command Palette' }) },
  ];

  const groups = Array.from(new Set(actions.map(a => a.group)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg gap-0 overflow-hidden" data-testid="command-palette">
        <Command className="rounded-lg border-0 shadow-none">
          <CommandInput
            placeholder="Type a command or search..."
            className="h-12 text-sm"
            data-testid="command-palette-input"
            autoFocus
          />
          <CommandList className="max-h-96">
            <CommandEmpty>No commands found.</CommandEmpty>
            {groups.map((group, gi) => (
              <span key={group}>
                {gi > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {actions.filter(a => a.group === group).map(action => (
                    <CommandItem
                      key={action.id}
                      value={`${action.label} ${action.description ?? ''} ${group}`}
                      onSelect={() => runAndClose(action.action)}
                      className="gap-3 cursor-pointer"
                      data-testid={`command-${action.id}`}
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground truncate">{action.description}</div>
                        )}
                      </div>
                      {action.shortcut && (
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60">
                          {action.shortcut}
                        </kbd>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-40" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </span>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
