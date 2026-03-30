import { useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { Engine, Scene, GizmoManager, DefaultRenderingPipeline, ShadowGenerator } from '@babylonjs/core';
import { Move, RotateCw, Maximize, Grid3X3, Box, Layers, MousePointer2, Bug, Sparkles, Settings, Loader2, Circle, Cylinder, Square, Lightbulb, Sun, Camera, Keyboard, HelpCircle, User, Wand2 } from 'lucide-react';
import { getPhysicsWorld } from '@/lib/rapier-physics';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { AdminPanel } from './AdminPanel';
import { CombatUI } from './CombatUI';
import { CharacterController } from '@/lib/character-controller';
import { WarriorPlayerController } from '@/lib/warrior-controller';
import { WarBearBehavior } from '@/lib/warbear-behavior';
import { DragonBehavior } from '@/lib/dragon-behavior';
import { useViewportScene } from '@/hooks/useViewportScene';
import { useViewportPlayMode } from '@/hooks/useViewportPlayMode';
import { useViewportDragDrop } from '@/hooks/useViewportDragDrop';
import { useViewportEffects } from '@/hooks/useViewportEffects';
import { useViewportActions } from '@/hooks/useViewportActions';

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const meshMapRef = useRef<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>(new Map());
  const gizmoMeshRef = useRef<Map<string, BABYLON.AbstractMesh>>(new Map());
  const animationGroupsRef = useRef<Map<string, BABYLON.AnimationGroup[]>>(new Map());
  const controllerRef = useRef<CharacterController | WarriorPlayerController | null>(null);
  const warriorControllerRef = useRef<WarriorPlayerController | null>(null);
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null);
  const npcBehaviorsRef = useRef<Map<string, WarBearBehavior | DragonBehavior>>(new Map());
  const renderPipelineRef = useRef<DefaultRenderingPipeline | null>(null);

  const [fps, setFps] = useState(0);
  const [drawCalls, setDrawCalls] = useState(0);
  const [vertices, setVertices] = useState(0);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [adminPanelVisible, setAdminPanelVisible] = useState(false);
  const [currentRPGSceneId, setCurrentRPGSceneId] = useState<string | null>(null);

  const { showStats, viewMode, toggleGrid, toggleStats, setViewMode, showGrid, isPlaying, isPaused, setPlaying, setPaused, addConsoleLog, getCurrentScene } = useEngineStore();

  const { gizmoMode, inspectorVisible, postProcessEnabled, quickAddObject, spawnPlayerCharacter, autoRigSelectedModel, toggleInspector, togglePostProcess, updateGizmoMode } = useViewportActions({
    sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef,
    gizmoManagerRef, renderPipelineRef, setLoadingModels
  });

  useViewportScene({
    canvasRef, engineRef, sceneRef, gizmoManagerRef, meshMapRef, gizmoMeshRef,
    animationGroupsRef, shadowGeneratorRef, controllerRef, renderPipelineRef,
    setFps, setDrawCalls, setVertices, setWebGLError, setSelectedMeshName, setLoadingModels
  });

  const { combatStats } = useViewportPlayMode({
    sceneRef, canvasRef, meshMapRef, animationGroupsRef,
    controllerRef, warriorControllerRef, npcBehaviorsRef, gizmoManagerRef
  });

  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } = useViewportDragDrop({
    sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef, shadowGeneratorRef, setLoadingModels
  });

  useViewportEffects({
    sceneRef, canvasRef, meshMapRef, gizmoMeshRef, animationGroupsRef,
    gizmoManagerRef, shadowGeneratorRef, controllerRef,
    setSelectedMeshName, setLoadingModels, updateGizmoMode
  });

  if (webGLError) {
    return (
      <div className="relative h-full bg-background flex items-center justify-center" data-testid="viewport">
        <div className="text-center p-8 max-w-md">
          <Box className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">3D Viewport Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-4">{webGLError}</p>
          <p className="text-xs text-muted-foreground">
            The Grudge Engine requires WebGL support to render 3D scenes. When running locally or in a browser with GPU support, the full 3D viewport will be available.
          </p>
          <div className="mt-6 flex gap-2 justify-center">
            <Badge variant="outline" className="text-xs font-mono">Babylon.js v7</Badge>
            <Badge variant="outline" className="text-xs font-mono">WebGL Required</Badge>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div
      className="relative h-full bg-background"
      data-testid="viewport"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary/20 border-4 border-dashed border-primary flex items-center justify-center pointer-events-none">
          <div className="bg-sidebar/90 backdrop-blur-sm rounded-lg px-6 py-4 text-center">
            <Box className="w-12 h-12 text-primary mx-auto mb-2" />
            {isDragOver === 'asset' ? (
              <><p className="text-lg font-medium">Drop to Add to Scene</p><p className="text-sm text-muted-foreground">Asset will be placed in the scene</p></>
            ) : (
              <><p className="text-lg font-medium">Drop to Import</p><p className="text-sm text-muted-foreground">GLB, GLTF, OBJ, STL, FBX</p></>
            )}
          </div>
        </div>
      )}

      {!isPlaying && (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <canvas ref={canvasRef} className="w-full h-full outline-none" data-testid="viewport-canvas" />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuSub>
              <ContextMenuSubTrigger><Box className="w-4 h-4 mr-2" />Add Mesh</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-40">
                <ContextMenuItem onClick={() => quickAddObject('box')} data-testid="menu-add-box"><Box className="w-4 h-4 mr-2" />Cube</ContextMenuItem>
                <ContextMenuItem onClick={() => quickAddObject('sphere')} data-testid="menu-add-sphere"><Circle className="w-4 h-4 mr-2" />Sphere</ContextMenuItem>
                <ContextMenuItem onClick={() => quickAddObject('cylinder')} data-testid="menu-add-cylinder"><Cylinder className="w-4 h-4 mr-2" />Cylinder</ContextMenuItem>
                <ContextMenuItem onClick={() => quickAddObject('plane')} data-testid="menu-add-plane"><Square className="w-4 h-4 mr-2" />Plane</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger><Lightbulb className="w-4 h-4 mr-2" />Add Light</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-40">
                <ContextMenuItem onClick={() => quickAddObject('pointLight')} data-testid="menu-add-point-light"><Lightbulb className="w-4 h-4 mr-2" />Point Light</ContextMenuItem>
                <ContextMenuItem onClick={() => quickAddObject('directionalLight')} data-testid="menu-add-dir-light"><Sun className="w-4 h-4 mr-2" />Directional Light</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => quickAddObject('camera')} data-testid="menu-add-camera"><Camera className="w-4 h-4 mr-2" />Add Camera</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={spawnPlayerCharacter} data-testid="menu-spawn-player"><User className="w-4 h-4 mr-2" />Spawn Player Character</ContextMenuItem>
            <ContextMenuItem onClick={autoRigSelectedModel} data-testid="menu-auto-rig"><Wand2 className="w-4 h-4 mr-2" />AI Auto-Rig Model</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      {isPlaying && <canvas ref={canvasRef} className="w-full h-full outline-none" data-testid="viewport-canvas" />}

      {!isPlaying && (
        <div className="absolute top-3 left-3 flex flex-col gap-1 bg-sidebar/80 backdrop-blur-sm rounded-md p-1 border border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={gizmoMode === 'select' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateGizmoMode('select')} data-testid="button-tool-select">
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Select (Q)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={gizmoMode === 'move' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateGizmoMode('move')} data-testid="button-tool-move">
              <Move className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Move (W)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={gizmoMode === 'rotate' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateGizmoMode('rotate')} data-testid="button-tool-rotate">
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Rotate (E)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={gizmoMode === 'scale' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateGizmoMode('scale')} data-testid="button-tool-scale">
              <Maximize className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Scale (R)</TooltipContent>
        </Tooltip>

        <div className="my-1 border-t border-sidebar-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={showGrid ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={toggleGrid} data-testid="button-toggle-grid">
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Grid</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={showStats ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={toggleStats} data-testid="button-toggle-stats">
              <Layers className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Stats</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={inspectorVisible ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={toggleInspector} data-testid="button-toggle-inspector">
              <Bug className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Inspector</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={postProcessEnabled ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={togglePostProcess} data-testid="button-toggle-postprocess">
              <Sparkles className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Post-Processing</TooltipContent>
        </Tooltip>

        <div className="h-px bg-sidebar-border my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={spawnPlayerCharacter} data-testid="button-spawn-player">
              <User className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Spawn Player Character</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={autoRigSelectedModel} data-testid="button-auto-rig">
              <Wand2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">AI Auto-Rig (select model first)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={adminPanelVisible ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setAdminPanelVisible(!adminPanelVisible)} data-testid="button-toggle-admin">
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Admin Panel</TooltipContent>
        </Tooltip>
        </div>
      )}

      <AdminPanel
        isVisible={adminPanelVisible}
        onClose={() => setAdminPanelVisible(false)}
        onSceneChange={(sceneId) => { setCurrentRPGSceneId(sceneId); addConsoleLog({ type: 'info', message: `Switching to scene: ${sceneId}`, source: 'Admin' }); }}
        currentSceneId={currentRPGSceneId || undefined}
        scene={sceneRef.current}
        onPhysicsDebugToggle={(enabled) => {
          const world = getPhysicsWorld();
          if (world) {
            world.setDebugEnabled(enabled);
          }
        }}
      />

      <div className="absolute top-3 right-3 flex gap-1 bg-sidebar/80 backdrop-blur-sm rounded-md p-1 border border-sidebar-border">
        <Button variant={viewMode === 'pbr' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('pbr')} data-testid="button-view-pbr">PBR</Button>
        <Button variant={viewMode === 'wireframe' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('wireframe')} data-testid="button-view-wireframe">Wireframe</Button>
        <Button variant={viewMode === 'debug' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('debug')} data-testid="button-view-debug">Debug</Button>
      </div>

      {showStats && (
        <div className="absolute top-3 right-[180px] flex gap-2 bg-sidebar/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-sidebar-border">
          <div className="text-xs"><span className="text-muted-foreground">FPS: </span><span className={cn("font-mono font-medium", fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400")}>{fps}</span></div>
          <div className="text-xs"><span className="text-muted-foreground">Draw: </span><span className="font-mono font-medium">{drawCalls}</span></div>
          <div className="text-xs"><span className="text-muted-foreground">Verts: </span><span className="font-mono font-medium">{vertices.toLocaleString()}</span></div>
          <div className="text-xs"><span className="text-muted-foreground">Objects: </span><span className="font-mono font-medium">{getCurrentScene()?.objects?.length || 0}</span></div>
        </div>
      )}

      {loadingModels.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-sidebar/90 backdrop-blur-sm rounded-md px-4 py-2 border border-sidebar-border flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <div className="text-sm"><span className="text-muted-foreground">Loading: </span><span className="font-medium">{loadingModels.join(', ')}</span></div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex gap-2 items-center">
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm">Babylon.js v7</Badge>
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm">WebGL 2.0</Badge>
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm capitalize">{gizmoMode} Tool</Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6 bg-sidebar/80 backdrop-blur-sm" onClick={() => setShowHelp(true)} data-testid="button-help">
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>
      </div>

      {isPlaying && (
        <CombatUI
          playerStats={combatStats.player}
          enemyStats={combatStats.enemy || undefined}
          isPaused={isPaused}
          onResume={() => { setPaused(false); addConsoleLog({ type: 'info', message: 'Game resumed', source: 'Engine' }); }}
          onStop={() => { setPlaying(false); setPaused(false); addConsoleLog({ type: 'info', message: 'Game stopped', source: 'Engine' }); }}
        />
      )}

      {selectedMeshName && !isPlaying && (
        <div className="absolute bottom-3 right-3 bg-sidebar/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-sidebar-border">
          <div className="text-xs"><span className="text-muted-foreground">Selected: </span><span className="font-medium text-primary">{selectedMeshName}</span></div>
        </div>
      )}

      {showHelp && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowHelp(false)}>
          <div className="bg-sidebar rounded-lg border border-sidebar-border p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Keyboard className="w-5 h-5" />Keyboard Shortcuts</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowHelp(false)}><span className="text-lg">&times;</span></Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Select Tool</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Q</kbd></div>
                <div className="text-muted-foreground">Move Tool</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">W</kbd></div>
                <div className="text-muted-foreground">Rotate Tool</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">E</kbd></div>
                <div className="text-muted-foreground">Scale Tool</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">R</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Focus Selected</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">F</kbd></div>
                <div className="text-muted-foreground">Delete Object</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Delete</kbd></div>
                <div className="text-muted-foreground">Duplicate</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl+D</kbd></div>
                <div className="text-muted-foreground">Deselect</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Esc</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Play/Stop</div><div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Space</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="text-muted-foreground text-xs"><strong>Mouse:</strong> Left-click to select, Right-click for context menu, Scroll to zoom, Middle-click to pan</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
