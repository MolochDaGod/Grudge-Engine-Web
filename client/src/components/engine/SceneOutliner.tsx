import { useState } from 'react';
import { ChevronRight, ChevronDown, Box, Grid3X3, Lightbulb, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as BABYLON from '@babylonjs/core';

interface OutlinerNode {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'transform';
  icon: React.ReactNode;
  visible: boolean;
  children?: OutlinerNode[];
}

interface SceneOutlinerProps {
  scene?: BABYLON.Scene | null;
  onSelectObject?: (mesh: BABYLON.AbstractMesh | BABYLON.Light | BABYLON.Camera) => void;
}

export function SceneOutliner({ scene, onSelectObject }: SceneOutlinerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  if (!scene) return null;

  const toggleExpanded = (nodeId: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setExpanded(newSet);
  };

  const getNodeIcon = (node: OutlinerNode) => {
    switch (node.type) {
      case 'mesh': return <Box className="w-3 h-3" />;
      case 'light': return <Lightbulb className="w-3 h-3" />;
      case 'camera': return <Camera className="w-3 h-3" />;
      default: return <Grid3X3 className="w-3 h-3" />;
    }
  };

  const buildNodes = (): OutlinerNode[] => {
    const nodes: OutlinerNode[] = [];

    // Cameras
    if (scene.cameras.length > 0) {
      scene.cameras.forEach(cam => {
        nodes.push({
          id: `camera_${cam.name}`,
          name: cam.name || 'Camera',
          type: 'camera',
          icon: <Camera className="w-3 h-3" />,
          visible: scene.activeCamera === cam
        });
      });
    }

    // Lights
    if (scene.lights.length > 0) {
      scene.lights.forEach(light => {
        nodes.push({
          id: `light_${light.name}`,
          name: light.name || 'Light',
          type: 'light',
          icon: <Lightbulb className="w-3 h-3" />,
          visible: light.isEnabled()
        });
      });
    }

    // Meshes
    if (scene.meshes.length > 0) {
      scene.meshes
        .filter(m => !m.parent) // Only root meshes
        .forEach(mesh => {
          const node: OutlinerNode = {
            id: `mesh_${mesh.name}`,
            name: mesh.name || 'Mesh',
            type: 'mesh',
            icon: <Box className="w-3 h-3" />,
            visible: mesh.isVisible
          };

          // Add children
          const children = scene.meshes.filter(m => m.parent === mesh);
          if (children.length > 0) {
            node.children = children.map(child => ({
              id: `mesh_${child.name}_child`,
              name: child.name || 'Mesh',
              type: 'mesh' as const,
              icon: <Box className="w-3 h-3" />,
              visible: child.isVisible
            }));
          }

          nodes.push(node);
        });
    }

    return nodes;
  };

  const renderNode = (node: OutlinerNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-1 text-xs hover:bg-primary/10 rounded cursor-pointer group',
            'text-muted-foreground hover:text-foreground transition-colors'
          )}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => onSelectObject?.(scene?.getMeshByName(node.name) as any)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="p-0.5 hover:bg-primary/20 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {getNodeIcon(node)}
          <span className="flex-1 truncate">{node.name}</span>
          <span className={cn(
            'text-[9px] opacity-0 group-hover:opacity-100 transition-opacity',
            node.visible ? 'text-green-500' : 'text-red-500'
          )}>
            {node.visible ? '●' : '○'}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const nodes = buildNodes();

  return (
    <div className="space-y-1 text-xs">
      {nodes.length > 0 ? (
        nodes.map(node => renderNode(node))
      ) : (
        <div className="text-muted-foreground px-2 py-1">No objects in scene</div>
      )}
    </div>
  );
}
