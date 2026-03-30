import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, Plus, Trash2, Search, Box, Sun, Camera, Sparkles, Volume2, Copy, Tag, Layers, Play, Film, Wand2, Code, Zap, FolderOpen, MoreHorizontal, Edit2, Pencil, Group, ArrowUp, Lock, Unlock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { DEFAULT_LAYERS } from '@shared/schema';
import { isPuterAvailable } from '@/lib/puter';
import { aiAssistant } from '@/lib/ai-assistant';
import type { GameObject } from '@shared/schema';

function getObjectIcon(object: GameObject) {
  const meshComp = object.components.find(c => c.type === 'mesh');
  const lightComp = object.components.find(c => c.type === 'light');
  const cameraComp = object.components.find(c => c.type === 'camera');
  const audioComp = object.components.find(c => c.type === 'audio');
  const particleComp = object.components.find(c => c.type === 'particle');
  
  if (cameraComp) return <Camera className="w-3.5 h-3.5 text-purple-400" />;
  if (lightComp) return <Sun className="w-3.5 h-3.5 text-yellow-400" />;
  if (particleComp) return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
  if (audioComp) return <Volume2 className="w-3.5 h-3.5 text-green-400" />;
  if (meshComp) return <Box className="w-3.5 h-3.5 text-blue-400" />;
  return <Box className="w-3.5 h-3.5 text-muted-foreground" />;
}

interface TreeItemProps {
  object: GameObject;
  level: number;
  allObjects: GameObject[];
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
  selectedIds: Set<string>;
  onMultiSelect: (id: string, addToSelection: boolean) => void;
  onGroupSelected: () => void;
}

function TreeItem({ object, level, allObjects, expandedIds, toggleExpanded, draggedId, setDraggedId, dropTargetId, setDropTargetId, selectedIds, onMultiSelect, onGroupSelected }: TreeItemProps) {
  const { 
    selectedObjectId, 
    selectObject, 
    updateGameObject, 
    deleteGameObject, 
    addConsoleLog,
    addGameObject,
    duplicateObject,
    setParent,
    setVisibilityRecursive,
    setLayer,
    animationRegistry,
    meshCountRegistry,
    setCurrentAnimation,
    focusOnObject,
    getDescendants
  } = useEngineStore();
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(object.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  const isSelected = selectedObjectId === object.id;
  const isMultiSelected = selectedIds.has(object.id);
  const hasChildren = object.children.length > 0;
  const animationInfo = animationRegistry.get(object.id);
  const hasAnimations = animationInfo && animationInfo.animations.length > 0;
  const meshCount = meshCountRegistry.get(object.id);
  const hasMeshes = meshCount && meshCount > 1;
  const isExpanded = expandedIds.has(object.id);
  const childObjects = allObjects.filter(o => object.children.includes(o.id));
  const isDragging = draggedId === object.id;
  const isDropTarget = dropTargetId === object.id && draggedId !== object.id;
  
  const startRenaming = () => {
    setRenameValue(object.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 10);
  };
  
  const commitRename = () => {
    const newName = renameValue.trim();
    if (newName && newName !== object.name) {
      updateGameObject(object.id, { name: newName });
      addConsoleLog({ type: 'info', message: `Renamed "${object.name}" to "${newName}"`, source: 'Scene' });
    }
    setIsRenaming(false);
  };
  
  const cancelRename = () => {
    setRenameValue(object.name); // Restore original name on cancel
    setIsRenaming(false);
  };
  
  // Sync rename value if object name changes externally
  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(object.name);
    }
  }, [object.name, isRenaming]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibilityRecursive(object.id, !object.visible);
  };

  const handleDelete = () => {
    deleteGameObject(object.id);
    addConsoleLog({ type: 'info', message: `Deleted object: ${object.name}`, source: 'Scene' });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedId(object.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', object.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== object.id) {
      setDropTargetId(object.id);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== object.id) {
      setParent(draggedId, object.id);
      if (!isExpanded) toggleExpanded(object.id);
    }
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 cursor-pointer group hover-elevate rounded-sm transition-colors",
              isSelected && "bg-primary/20",
              isMultiSelected && !isSelected && "bg-primary/10 ring-1 ring-primary/30",
              isDragging && "opacity-50",
              isDropTarget && "bg-primary/30 ring-1 ring-primary"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={(e) => {
              if (isRenaming) return;
              if (e.ctrlKey || e.metaKey) {
                onMultiSelect(object.id, true);
              } else {
                onMultiSelect(object.id, false);
                selectObject(object.id);
              }
            }}
            onDoubleClick={(e) => {
              if (isRenaming) return;
              e.preventDefault();
              selectObject(object.id);
              focusOnObject(object.id);
            }}
            onContextMenu={() => {
              // Auto-select on right-click if not already selected
              if (!isSelected && !isMultiSelected) {
                onMultiSelect(object.id, false);
                selectObject(object.id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'F2' && isSelected && !isRenaming) {
                e.preventDefault();
                startRenaming();
              } else if (e.key === 'Enter' && isSelected && !isRenaming) {
                e.preventDefault();
                focusOnObject(object.id);
              } else if (e.key === 'Delete' && isSelected && !isRenaming) {
                e.preventDefault();
                handleDelete();
              }
            }}
            tabIndex={0}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            data-testid={`tree-item-${object.id}`}
          >
            <button
              className={cn(
                "w-4 h-4 flex items-center justify-center",
                !hasChildren && "invisible"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(object.id);
              }}
              data-testid={`button-toggle-expand-${object.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {getObjectIcon(object)}

            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                className="flex-1 text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none"
                onClick={(e) => e.stopPropagation()}
                data-testid={`input-rename-${object.id}`}
              />
            ) : (
              <span className={cn(
                "flex-1 text-xs truncate",
                !object.visible && "text-muted-foreground"
              )}>
                {object.name}
              </span>
            )}
            
            {hasAnimations && (
              <Select 
                value={animationInfo?.currentAnimation || 'none'} 
                onValueChange={(value) => {
                  const animName = value === 'none' ? null : value;
                  setCurrentAnimation(object.id, animName);
                  if (animName) {
                    addConsoleLog({ 
                      type: 'info', 
                      message: `Playing animation: ${animName} on ${object.name}`, 
                      source: 'Animation' 
                    });
                  } else {
                    addConsoleLog({ 
                      type: 'info', 
                      message: `Stopped animation on ${object.name} (T-pose)`, 
                      source: 'Animation' 
                    });
                  }
                }}
              >
                <SelectTrigger 
                  className="h-5 w-24 text-[10px] px-1 py-0 bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`select-animation-${object.id}`}
                >
                  <Film className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="T-Pose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    <div className="flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      T-Pose
                    </div>
                  </SelectItem>
                  {animationInfo?.animations.map((anim) => (
                    <SelectItem key={anim} value={anim} className="text-xs">
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {anim}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {(object.tags?.length ?? 0) > 0 && (
              <Tag className="w-2.5 h-2.5 text-muted-foreground" />
            )}
            
            {hasMeshes && (
              <span 
                className="text-[9px] px-1 py-0 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-sm"
                title={`${meshCount} meshes in model`}
              >
                {meshCount}m
              </span>
            )}

            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover-elevate rounded"
              onClick={handleToggleVisibility}
              data-testid={`button-toggle-visibility-${object.id}`}
            >
              {object.visible ? (
                <Eye className="w-3 h-3 text-muted-foreground" />
              ) : (
                <EyeOff className="w-3 h-3 text-muted-foreground" />
              )}
            </button>

            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover-elevate rounded text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              data-testid={`button-delete-object-${object.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={startRenaming} data-testid={`ctx-rename-${object.id}`}>
            <Edit2 className="w-4 h-4 mr-2" /> Rename <kbd className="ml-auto text-[10px] text-muted-foreground">F2</kbd>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateObject(object.id)} data-testid={`ctx-duplicate-${object.id}`}>
            <Copy className="w-4 h-4 mr-2" /> Duplicate <kbd className="ml-auto text-[10px] text-muted-foreground">Ctrl+D</kbd>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="text-destructive" data-testid={`ctx-delete-${object.id}`}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete <kbd className="ml-auto text-[10px] text-muted-foreground">Del</kbd>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => { selectObject(object.id); focusOnObject(object.id); }} data-testid={`ctx-focus-${object.id}`}>
            <Camera className="w-4 h-4 mr-2" /> Focus in Viewport <kbd className="ml-auto text-[10px] text-muted-foreground">Enter</kbd>
          </ContextMenuItem>
          {hasChildren && (
            <ContextMenuItem onClick={() => toggleExpanded(object.id)} data-testid={`ctx-expand-${object.id}`}>
              {isExpanded
                ? <><ChevronDown className="w-4 h-4 mr-2" /> Collapse Children</>
                : <><ChevronRight className="w-4 h-4 mr-2" /> Expand Children</>}
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => updateGameObject(object.id, { isStatic: !object.isStatic })} data-testid={`ctx-lock-${object.id}`}>
            {object.isStatic ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {object.isStatic ? 'Unlock Object' : 'Lock Object (Static)'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={onGroupSelected}
            disabled={selectedIds.size < 2}
            title={selectedIds.size < 2 ? 'Ctrl+click to select multiple objects first' : ''}
            data-testid={`ctx-group-${object.id}`}
          >
            <Group className="w-4 h-4 mr-2" />
            {selectedIds.size >= 2 ? `Group Selected (${selectedIds.size})` : 'Group Selected…'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            // Wrap this single object in a new Empty parent
            const emptyId = crypto.randomUUID();
            const emptyObj: GameObject = {
              id: emptyId, name: 'Group', visible: true, isStatic: false,
              transform: { ...object.transform },
              components: [],
              children: [object.id], parentId: object.parentId ?? null, tags: ['group'], layer: 0
            };
            addGameObject(emptyObj);
            setParent(object.id, emptyId);
            addConsoleLog({ type: 'info', message: `Wrapped "${object.name}" in Empty parent`, source: 'Scene' });
          }} data-testid={`ctx-wrap-${object.id}`}>
            <FolderOpen className="w-4 h-4 mr-2" /> Create Empty Parent
          </ContextMenuItem>
          {hasChildren && (
            <ContextMenuItem onClick={() => {
              const descendants = getDescendants(object.id);
              const ids = [object.id, ...descendants.map(d => d.id)];
              ids.forEach(id => onMultiSelect(id, true));
              addConsoleLog({ type: 'info', message: `Selected ${ids.length} objects`, source: 'Scene' });
            }} data-testid={`ctx-select-children-${object.id}`}>
              <ChevronDown className="w-4 h-4 mr-2" /> Select With Children
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setParent(object.id, null)} disabled={!object.parentId} data-testid={`ctx-unparent-${object.id}`}>
            <ArrowUp className="w-4 h-4 mr-2" /> Unparent
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger data-testid={`ctx-visibility-${object.id}`}>
              <Eye className="w-4 h-4 mr-2" /> Visibility
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => setVisibilityRecursive(object.id, true)}>
                <Eye className="w-4 h-4 mr-2" /> Show All Children
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setVisibilityRecursive(object.id, false)}>
                <EyeOff className="w-4 h-4 mr-2" /> Hide All Children
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger data-testid={`ctx-layer-${object.id}`}>
              <Layers className="w-4 h-4 mr-2" /> Set Layer
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              {DEFAULT_LAYERS.map(layer => (
                <ContextMenuItem 
                  key={layer.id} 
                  onClick={() => setLayer(object.id, layer.id)}
                  className={cn((object.layer ?? 0) === layer.id && "bg-accent")}
                >
                  {layer.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          {isPuterAvailable() && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger data-testid={`ctx-ai-${object.id}`}>
                  <Wand2 className="w-4 h-4 mr-2 text-primary" /> AI Assist
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-52">
                  <ContextMenuItem onClick={async () => {
                    addConsoleLog({ type: 'info', message: `AI: Analyzing "${object.name}"...`, source: 'AI' });
                    const response = await aiAssistant.suggestAsset(`3D ${object.name} game object with components: ${JSON.stringify(object.components.map(c => c.type))}`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Suggestion for ${object.name}: ${response.content?.slice(0, 300)}`, source: 'AI' });
                    }
                  }}>
                    <Sparkles className="w-4 h-4 mr-2" /> Suggest Enhancements
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => {
                    const meshType = object.components.find(c => c.type === 'mesh')?.properties?.type || 'mesh';
                    addConsoleLog({ type: 'info', message: `AI: Generating physics code for ${object.name}...`, source: 'AI' });
                    const response = await aiAssistant.generateCode(`Add physics collision to a "${meshType}" named "${object.name}" in Babylon.js. Include mass, restitution, and friction.`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Physics Code:\n${response.content?.slice(0, 400)}`, source: 'AI' });
                    }
                  }}>
                    <Code className="w-4 h-4 mr-2" /> Generate Physics Code
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => {
                    addConsoleLog({ type: 'info', message: `AI: Generating animation code for ${object.name}...`, source: 'AI' });
                    const response = await aiAssistant.generateCode(`Create a smooth looping animation for a game object named "${object.name}" in Babylon.js using BABYLON.Animation.`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Animation Code:\n${response.content?.slice(0, 400)}`, source: 'AI' });
                    }
                  }}>
                    <Play className="w-4 h-4 mr-2" /> Generate Animation Code
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => {
                    addConsoleLog({ type: 'info', message: `AI: Analyzing components on ${object.name}...`, source: 'AI' });
                    const componentList = object.components.map(c => `${c.type}: ${JSON.stringify(c.properties)}`).join(', ');
                    const response = await aiAssistant.chat(`Analyze these game object components and suggest improvements: ${componentList || 'empty object'}`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Component Analysis:\n${response.content?.slice(0, 400)}`, source: 'AI' });
                    }
                  }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Analyze Components
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && childObjects.map(child => (
        <TreeItem
          key={child.id}
          object={child}
          level={level + 1}
          allObjects={allObjects}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
          draggedId={draggedId}
          setDraggedId={setDraggedId}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          selectedIds={selectedIds}
          onMultiSelect={onMultiSelect}
          onGroupSelected={onGroupSelected}
        />
      ))}
    </div>
  );
}

export function SceneHierarchy() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isRenamingScene, setIsRenamingScene] = useState(false);
  const [sceneRenameValue, setSceneRenameValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const sceneRenameInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    project, 
    addGameObject, 
    addConsoleLog, 
    setParent,
    getCurrentScene,
    currentSceneId,
    setCurrentSceneId,
    addScene,
    deleteScene,
    renameScene,
    duplicateScene,
    groupObjects,
    selectObject
  } = useEngineStore();

  const handleMultiSelect = (id: string, addToSelection: boolean) => {
    if (addToSelection) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const handleGroupSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length < 2) return;
    groupObjects(ids, 'Group');
    addConsoleLog({ type: 'info', message: `Grouped ${ids.length} objects`, source: 'Scene' });
    setSelectedIds(new Set());
  };
  
  const scene = getCurrentScene();
  const objects = scene?.objects || [];
  const rootObjects = objects.filter(o => !o.parentId);
  const activeSceneId = currentSceneId || project?.scenes[0]?.id;
  
  const filteredObjects = searchQuery
    ? objects.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : rootObjects;

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(objects.map(o => o.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId) {
      setParent(draggedId, null);
    }
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleAddObject = (type: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'light' | 'camera' | 'empty') => {
    const newObject: GameObject = {
      id: crypto.randomUUID(),
      name: type.charAt(0).toUpperCase() + type.slice(1),
      visible: true,
      isStatic: false,
      transform: {
        position: { x: 0, y: type === 'light' ? 5 : 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: type === 'light' 
        ? [{ id: crypto.randomUUID(), type: 'light', enabled: true, properties: { type: 'point', color: '#ffffff', intensity: 1 } }]
        : type === 'camera'
        ? [{ id: crypto.randomUUID(), type: 'camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } }]
        : type === 'empty'
        ? []
        : [{ id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type, color: '#6366f1' } }],
      children: [],
      parentId: null,
      tags: [],
      layer: 0
    };
    addGameObject(newObject);
    addConsoleLog({ type: 'info', message: `Created new ${type}`, source: 'Scene' });
  };

  const startSceneRename = () => {
    if (scene) {
      setSceneRenameValue(scene.name);
      setIsRenamingScene(true);
      setTimeout(() => sceneRenameInputRef.current?.select(), 10);
    }
  };
  
  const commitSceneRename = () => {
    if (scene && sceneRenameValue.trim()) {
      renameScene(scene.id, sceneRenameValue.trim());
      addConsoleLog({ type: 'info', message: `Renamed scene to "${sceneRenameValue.trim()}"`, source: 'Scene' });
    }
    setIsRenamingScene(false);
  };
  
  const handleSceneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSceneRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsRenamingScene(false);
    }
  };
  
  const handleCreateScene = () => {
    const newScene = addScene();
    addConsoleLog({ type: 'info', message: `Created new scene: ${newScene.name}`, source: 'Scene' });
  };
  
  const handleDuplicateScene = () => {
    if (scene) {
      const newScene = duplicateScene(scene.id);
      if (newScene) {
        addConsoleLog({ type: 'info', message: `Duplicated scene: ${newScene.name}`, source: 'Scene' });
      }
    }
  };
  
  const handleDeleteScene = () => {
    if (scene && project && project.scenes.length > 1) {
      deleteScene(scene.id);
      addConsoleLog({ type: 'info', message: `Deleted scene: ${scene.name}`, source: 'Scene' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar" data-testid="scene-hierarchy">
      {/* Scene Selector */}
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scenes
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5" 
            onClick={handleCreateScene}
            title="New Scene"
            data-testid="button-new-scene"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Select 
            value={activeSceneId || ''} 
            onValueChange={(id) => setCurrentSceneId(id)}
          >
            <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-scene">
              <FolderOpen className="w-3 h-3 mr-1.5 text-primary" />
              <SelectValue placeholder="Select scene" />
            </SelectTrigger>
            <SelectContent>
              {project?.scenes.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-scene-menu">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={startSceneRename}>
                <Edit2 className="w-4 h-4 mr-2" /> Rename Scene
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicateScene}>
                <Copy className="w-4 h-4 mr-2" /> Duplicate Scene
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDeleteScene} 
                className="text-destructive"
                disabled={!project || project.scenes.length <= 1}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Scene
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isRenamingScene && (
          <input
            ref={sceneRenameInputRef}
            type="text"
            value={sceneRenameValue}
            onChange={(e) => setSceneRenameValue(e.target.value)}
            onBlur={commitSceneRename}
            onKeyDown={handleSceneKeyDown}
            className="mt-1 w-full text-xs bg-background border border-primary rounded px-2 py-1 outline-none"
            placeholder="Scene name..."
            data-testid="input-rename-scene"
          />
        )}
      </div>
      
      {/* Multi-select status bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 border-b border-primary/20 text-xs">
          <span className="text-primary font-medium">{selectedIds.size} selected</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-primary hover:bg-primary/20"
            onClick={handleGroupSelected}
            disabled={selectedIds.size < 2}
            data-testid="button-group-selected"
          >
            Group
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-destructive hover:bg-destructive/10 ml-auto"
            onClick={() => setSelectedIds(new Set())}
            data-testid="button-clear-selection"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Hierarchy Header */}
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hierarchy
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={expandAll} title="Expand All">
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={collapseAll} title="Collapse All">
              <ChevronRight className="w-3 h-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-add-object">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleAddObject('cube')} data-testid="menu-add-cube">
                  <Box className="w-4 h-4 mr-2" /> Cube
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddObject('sphere')} data-testid="menu-add-sphere">
                  <Box className="w-4 h-4 mr-2" /> Sphere
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddObject('cylinder')} data-testid="menu-add-cylinder">
                  <Box className="w-4 h-4 mr-2" /> Cylinder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddObject('plane')} data-testid="menu-add-plane">
                  <Box className="w-4 h-4 mr-2" /> Plane
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddObject('light')} data-testid="menu-add-light">
                  <Sun className="w-4 h-4 mr-2" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddObject('camera')} data-testid="menu-add-camera">
                  <Camera className="w-4 h-4 mr-2" /> Camera
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddObject('empty')} data-testid="menu-add-empty">
                  <Box className="w-4 h-4 mr-2" /> Empty Object
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
            data-testid="input-hierarchy-search"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div 
          className="py-1 min-h-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleRootDrop}
        >
          {filteredObjects.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              {searchQuery ? 'No objects found' : 'Scene is empty'}
            </div>
          ) : (
            filteredObjects.map(object => (
              <TreeItem
                key={object.id}
                object={object}
                level={0}
                allObjects={objects}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
                dropTargetId={dropTargetId}
                setDropTargetId={setDropTargetId}
                selectedIds={selectedIds}
                onMultiSelect={handleMultiSelect}
                onGroupSelected={handleGroupSelected}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
