import { useState, useRef } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, Plus, Trash2, Search, Box, Sun, Camera, Sparkles, Volume2, Copy, Tag, Layers, Play, Film, Wand2, Code, Zap } from 'lucide-react';
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
}

function TreeItem({ object, level, allObjects, expandedIds, toggleExpanded, draggedId, setDraggedId, dropTargetId, setDropTargetId }: TreeItemProps) {
  const { 
    selectedObjectId, 
    selectObject, 
    updateGameObject, 
    deleteGameObject, 
    addConsoleLog,
    duplicateObject,
    setParent,
    setVisibilityRecursive,
    setLayer,
    animationRegistry,
    setCurrentAnimation,
    focusOnObject
  } = useEngineStore();
  
  const isSelected = selectedObjectId === object.id;
  const hasChildren = object.children.length > 0;
  const animationInfo = animationRegistry.get(object.id);
  const hasAnimations = animationInfo && animationInfo.animations.length > 0;
  const isExpanded = expandedIds.has(object.id);
  const childObjects = allObjects.filter(o => object.children.includes(o.id));
  const isDragging = draggedId === object.id;
  const isDropTarget = dropTargetId === object.id && draggedId !== object.id;

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
              isDragging && "opacity-50",
              isDropTarget && "bg-primary/30 ring-1 ring-primary"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => selectObject(object.id)}
            onDoubleClick={() => {
              selectObject(object.id);
              focusOnObject(object.id);
            }}
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

            <span className={cn(
              "flex-1 text-xs truncate",
              !object.visible && "text-muted-foreground"
            )}>
              {object.name}
            </span>
            
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
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => duplicateObject(object.id)}>
            <Copy className="w-4 h-4 mr-2" /> Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setParent(object.id, null)} disabled={!object.parentId}>
            Unparent
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
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
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setVisibilityRecursive(object.id, true)}>
            Show All Children
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setVisibilityRecursive(object.id, false)}>
            Hide All Children
          </ContextMenuItem>
          {isPuterAvailable() && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Wand2 className="w-4 h-4 mr-2 text-primary" /> AI Assist
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem onClick={async () => {
                    const response = await aiAssistant.suggestAsset(`3D ${object.name} game object with components`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI: ${response.content?.slice(0, 200)}...`, source: 'AI' });
                    }
                  }}>
                    <Sparkles className="w-4 h-4 mr-2" /> Suggest Enhancements
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => {
                    const meshType = object.components.find(c => c.type === 'mesh')?.properties?.meshType || 'cube';
                    const response = await aiAssistant.generateCode(`Add physics to a ${meshType} in Babylon.js`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Code: ${response.content?.slice(0, 300)}...`, source: 'AI' });
                    }
                  }}>
                    <Code className="w-4 h-4 mr-2" /> Generate Physics Code
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => {
                    const response = await aiAssistant.generateCode(`Animate a ${object.name} with smooth movement in Babylon.js`);
                    if (response.success) {
                      addConsoleLog({ type: 'info', message: `AI Code: ${response.content?.slice(0, 300)}...`, source: 'AI' });
                    }
                  }}>
                    <Play className="w-4 h-4 mr-2" /> Generate Animation Code
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
  const { project, addGameObject, addConsoleLog, setParent } = useEngineStore();
  
  const scene = project?.scenes[0];
  const objects = scene?.objects || [];
  const rootObjects = objects.filter(o => !o.parentId);
  
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

  return (
    <div className="h-full flex flex-col bg-sidebar" data-testid="scene-hierarchy">
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
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
