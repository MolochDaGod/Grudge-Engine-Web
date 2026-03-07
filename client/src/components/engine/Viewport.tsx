import { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  HemisphericLight, 
  DirectionalLight, 
  MeshBuilder, 
  Vector3, 
  Color3, 
  Color4, 
  StandardMaterial, 
  PointLight, 
  TransformNode, 
  GizmoManager, 
  UtilityLayerRenderer, 
  BoundingBoxGizmo, 
  DefaultRenderingPipeline, 
  SceneLoader,
  Texture,
  ParticleSystem,
  SpriteManager,
  Sprite,
  PBRMaterial,
  CubeTexture,
  Animation,
  AnimationGroup,
  ShadowGenerator
} from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';
import '@babylonjs/inspector';
import { Move, RotateCw, Maximize, Eye, Grid3X3, Box, Layers, MousePointer2, Bug, Sparkles, Settings, MapIcon, Loader2, Clock, Circle, Cylinder, Square, Lightbulb, Sun, Video, Camera, Keyboard, HelpCircle, User, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { AdminPanel } from './AdminPanel';
import { sceneRegistry } from '@/lib/scenes/scene-registry';
import { CharacterController, findPlayerCharacter } from '@/lib/character-controller';
import { setupPlayModeEnvironment } from '@/lib/grass-environment';
import { autoRigModel } from '@/lib/ai-auto-rig';
import { CHARACTER_HEIGHTS, calculateScaleForUnits, formatHeight, getMeshDimensions, validatePolyCount, getTriangleCount } from '@/lib/units';

type GizmoMode = 'select' | 'move' | 'rotate' | 'scale';

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const meshMapRef = useRef<Map<string, BABYLON.AbstractMesh>>(new Map());
  const animationGroupsRef = useRef<Map<string, BABYLON.AnimationGroup[]>>(new Map());
  const controllerRef = useRef<CharacterController | null>(null);
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null);
  
  const [fps, setFps] = useState(0);
  const [drawCalls, setDrawCalls] = useState(0);
  const [vertices, setVertices] = useState(0);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('move');
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [postProcessEnabled, setPostProcessEnabled] = useState(true);
  const [adminPanelVisible, setAdminPanelVisible] = useState(false);
  const [currentRPGSceneId, setCurrentRPGSceneId] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<string[]>([]);
  const [renderTime, setRenderTime] = useState(0);
  const [sceneLoadTime, setSceneLoadTime] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const renderPipelineRef = useRef<DefaultRenderingPipeline | null>(null);
  const frameTimeRef = useRef<number[]>([]);
  
  const { project, selectedObjectId, selectObject, showGrid, showStats, viewMode, toggleGrid, toggleStats, setViewMode, addConsoleLog, pendingExample, clearPendingExample, updateTransform, isPlaying, setPlaying, registerAnimations, setCurrentAnimation, animationRegistry, addGameObject, deleteGameObject, duplicateObject, pendingFocusObjectId, clearPendingFocus } = useEngineStore();
  
  // Quick add object to scene
  const quickAddObject = useCallback((type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'pointLight' | 'directionalLight' | 'camera') => {
    const id = `obj_${Date.now()}`;
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    
    const baseObject = {
      id,
      name,
      visible: true,
      parentId: null,
      isStatic: false,
      tags: [] as string[],
      layer: 0,
      prefabId: undefined as string | undefined,
      children: [] as string[],
      transform: {
        position: { x: 0, y: type === 'plane' ? 0 : 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [] as any[]
    };

    if (type === 'pointLight') {
      baseObject.components = [{ id: `comp_${Date.now()}`, type: 'light', enabled: true, properties: { type: 'point', intensity: 1, color: '#ffffff', range: 10 } }];
    } else if (type === 'directionalLight') {
      baseObject.components = [{ id: `comp_${Date.now()}`, type: 'light', enabled: true, properties: { type: 'directional', intensity: 1, color: '#ffffff' } }];
    } else if (type === 'camera') {
      baseObject.components = [{ id: `comp_${Date.now()}`, type: 'camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } }];
    } else {
      baseObject.components = [{ id: `comp_${Date.now()}`, type: 'mesh', enabled: true, properties: { type } }];
    }

    addGameObject(baseObject);
    addConsoleLog({ type: 'info', message: `Created ${name}`, source: 'Scene' });
  }, [addGameObject, addConsoleLog]);

  // Spawn player character (Knight with animations)
  const spawnPlayerCharacter = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const id = `player_${Date.now()}`;
    setLoadingModels(prev => [...prev, 'Knight']);
    addConsoleLog({ type: 'info', message: 'Spawning player character...', source: 'Player' });

    try {
      const result = await SceneLoader.ImportMeshAsync(
        '',
        '/assets/characters/knight/',
        'KnightAndSword.glb',
        scene
      );

      if (result.meshes.length > 0) {
        const rootMesh = result.meshes[0];
        rootMesh.name = 'Player';
        rootMesh.position = new Vector3(0, 0, 0);
        
        // Calculate proper scale to make character 4ft tall (default character height)
        rootMesh.computeWorldMatrix(true);
        const boundingInfo = rootMesh.getHierarchyBoundingVectors();
        const currentHeight = boundingInfo.max.y - boundingInfo.min.y;
        const targetHeight = CHARACTER_HEIGHTS.DEFAULT; // 4ft = ~1.22 meters
        const scale = calculateScaleForUnits(currentHeight, targetHeight);
        rootMesh.scaling = new Vector3(scale, scale, scale);
        
        rootMesh.metadata = { tags: ['player'], isPlayer: true, layer: 5 };
        
        meshMapRef.current.set(id, rootMesh);
        
        const heightDisplay = formatHeight(targetHeight);
        addConsoleLog({ type: 'info', message: `Player scaled to ${heightDisplay} (scale: ${scale.toFixed(4)})`, source: 'Units' });

        if (result.animationGroups && result.animationGroups.length > 0) {
          const animationNames = result.animationGroups.map(ag => ag.name);
          registerAnimations(id, animationNames);
          animationGroupsRef.current.set(id, result.animationGroups);
          result.animationGroups.forEach(ag => ag.stop());
          addConsoleLog({ type: 'info', message: `Player has ${animationNames.length} animations: ${animationNames.join(', ')}`, source: 'Animation' });
        }

        const playerObject = {
          id,
          name: 'Player',
          visible: true,
          parentId: null,
          isStatic: false,
          tags: ['player'] as string[],
          layer: 5,
          prefabId: undefined as string | undefined,
          children: [] as string[],
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: scale, y: scale, z: scale }
          },
          components: [
            { id: `comp_${Date.now()}`, type: 'mesh', enabled: true, properties: { type: 'model', path: '/assets/characters/knight/KnightAndSword.glb' } }
          ] as any[]
        };

        addGameObject(playerObject);
        addConsoleLog({ type: 'info', message: 'Player character spawned! Press Play to control.', source: 'Player' });
      }
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Failed to spawn player: ${err.message}`, source: 'Player' });
    }

    setLoadingModels(prev => prev.filter(n => n !== 'Knight'));
  }, [addGameObject, addConsoleLog, registerAnimations]);

  // Auto-rig selected model using AI vision
  const autoRigSelectedModel = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene || !selectedObjectId) {
      addConsoleLog({ type: 'warning', message: 'Select a model to auto-rig', source: 'AutoRig' });
      return;
    }

    const mesh = meshMapRef.current.get(selectedObjectId);
    if (!mesh) {
      addConsoleLog({ type: 'warning', message: 'Selected object has no mesh', source: 'AutoRig' });
      return;
    }

    addConsoleLog({ type: 'info', message: 'Starting AI auto-rig analysis...', source: 'AutoRig' });

    try {
      const result = await autoRigModel(scene, mesh, (progress) => {
        addConsoleLog({ type: 'info', message: progress, source: 'AutoRig' });
      });

      if (result.success && result.suggestion) {
        addConsoleLog({ 
          type: 'info', 
          message: `Auto-rig complete! Created ${result.suggestion.rigType} skeleton with ${result.suggestion.bones.length} bones (${Math.round(result.suggestion.confidence * 100)}% confidence)`,
          source: 'AutoRig'
        });
        addConsoleLog({
          type: 'info',
          message: 'Skeleton visualization created. Note: Full skinning requires manual weight painting.',
          source: 'AutoRig'
        });
      } else {
        addConsoleLog({ type: 'error', message: result.error || 'Auto-rig failed', source: 'AutoRig' });
      }
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Auto-rig error: ${err.message}`, source: 'AutoRig' });
    }
  }, [selectedObjectId, addConsoleLog]);

  // Handle drag-and-drop model import
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const supportedExtensions = ['.glb', '.gltf', '.obj', '.stl', '.fbx'];
    
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedExtensions.includes(ext)) {
        addConsoleLog({ type: 'warning', message: `Unsupported file: ${file.name}`, source: 'Import' });
        continue;
      }

      const scene = sceneRef.current;
      if (!scene) continue;

      setLoadingModels(prev => [...prev, file.name]);
      addConsoleLog({ type: 'info', message: `Importing ${file.name}...`, source: 'Import' });

      try {
        if (ext === '.fbx') {
          // Upload FBX for conversion
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/convert/fbx-upload', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) throw new Error('FBX conversion failed');
          const result = await response.json();
          
          // Load converted GLB
          const loadResult = await SceneLoader.ImportMeshAsync('', '', result.outputPath, scene);
          handleImportedMesh(loadResult, file.name);
        } else {
          // Load directly via blob URL
          const url = URL.createObjectURL(file);
          const loadResult = await SceneLoader.ImportMeshAsync('', '', url, scene, undefined, ext);
          URL.revokeObjectURL(url);
          handleImportedMesh(loadResult, file.name);
        }
      } catch (err: any) {
        addConsoleLog({ type: 'error', message: `Failed to import ${file.name}: ${err.message}`, source: 'Import' });
      }
      
      setLoadingModels(prev => prev.filter(n => n !== file.name));
    }
  }, [addConsoleLog]);

  const handleImportedMesh = useCallback((result: BABYLON.ISceneLoaderAsyncResult, filename: string) => {
    if (result.meshes.length > 0) {
      const rootMesh = result.meshes[0];
      const id = `imported_${Date.now()}`;
      const name = filename.split('.')[0];
      
      rootMesh.name = id;
      rootMesh.id = id;
      rootMesh.position = new Vector3(0, 0, 0);
      
      // Calculate mesh dimensions and auto-scale characters to 4ft
      rootMesh.computeWorldMatrix(true);
      const boundingInfo = rootMesh.getHierarchyBoundingVectors();
      const currentHeight = boundingInfo.max.y - boundingInfo.min.y;
      const currentWidth = boundingInfo.max.x - boundingInfo.min.x;
      const currentDepth = boundingInfo.max.z - boundingInfo.min.z;
      
      // Auto-detect if this looks like a character (taller than wide, reasonable proportions)
      const isLikelyCharacter = currentHeight > currentWidth && currentHeight > currentDepth;
      let scale = 1;
      
      if (isLikelyCharacter && currentHeight > 0) {
        // Scale character to default 4ft height
        const targetHeight = CHARACTER_HEIGHTS.DEFAULT;
        scale = calculateScaleForUnits(currentHeight, targetHeight);
        rootMesh.scaling = new Vector3(scale, scale, scale);
        
        const heightDisplay = formatHeight(targetHeight);
        addConsoleLog({ type: 'info', message: `Character scaled to ${heightDisplay} (scale: ${scale.toFixed(4)})`, source: 'Units' });
      } else if (currentHeight > 0) {
        // Log dimensions for non-character objects
        const dims = getMeshDimensions({ minimum: boundingInfo.min, maximum: boundingInfo.max });
        addConsoleLog({ 
          type: 'info', 
          message: `Dimensions: ${dims.widthFeet.toFixed(1)}'W x ${dims.heightFeet.toFixed(1)}'H x ${dims.depthFeet.toFixed(1)}'D`, 
          source: 'Units' 
        });
      }
      
      // Validate polygon count using triangle count
      let totalTris = 0;
      result.meshes.forEach(m => {
        totalTris += getTriangleCount(m);
      });
      const polyCheck = validatePolyCount(totalTris, isLikelyCharacter ? 'CHARACTER_MED' : 'FOREGROUND_PROP');
      addConsoleLog({ 
        type: polyCheck.valid ? 'info' : 'warning', 
        message: polyCheck.message, 
        source: 'Poly' 
      });
      
      meshMapRef.current.set(id, rootMesh);

      // Register animations
      if (result.animationGroups && result.animationGroups.length > 0) {
        const animationNames = result.animationGroups.map(ag => ag.name);
        registerAnimations(id, animationNames);
        animationGroupsRef.current.set(id, result.animationGroups);
        result.animationGroups.forEach(ag => ag.stop());
        addConsoleLog({ type: 'info', message: `Found ${animationNames.length} animations`, source: 'Animation' });
      }

      // Add to scene hierarchy
      addGameObject({
        id,
        name,
        visible: true,
        parentId: null,
        isStatic: false,
        tags: isLikelyCharacter ? ['character'] as string[] : [] as string[],
        layer: 0,
        prefabId: undefined as string | undefined,
        children: [] as string[],
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: scale, y: scale, z: scale } },
        components: [{ id: `comp_${Date.now()}`, type: 'mesh', enabled: true, properties: { type: 'imported', modelPath: filename } }]
      });

      addConsoleLog({ type: 'info', message: `Imported: ${name} (${result.meshes.length} meshes)`, source: 'Import' });
    }
  }, [addGameObject, registerAnimations, addConsoleLog]);
  
  // Toggle Babylon.js Inspector
  const toggleInspector = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    if (inspectorVisible) {
      scene.debugLayer.hide();
      setInspectorVisible(false);
      addConsoleLog({ type: 'info', message: 'Inspector hidden', source: 'Viewport' });
    } else {
      scene.debugLayer.show({ embedMode: true, overlay: true });
      setInspectorVisible(true);
      addConsoleLog({ type: 'info', message: 'Inspector opened', source: 'Viewport' });
    }
  }, [inspectorVisible, addConsoleLog]);

  // Toggle post-processing effects
  const togglePostProcess = useCallback(() => {
    const pipeline = renderPipelineRef.current;
    if (!pipeline) return;
    
    const newState = !postProcessEnabled;
    pipeline.bloomEnabled = newState;
    pipeline.fxaaEnabled = newState;
    pipeline.imageProcessingEnabled = newState;
    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = newState;
    }
    setPostProcessEnabled(newState);
    addConsoleLog({ 
      type: 'info', 
      message: `Post-processing ${newState ? 'enabled' : 'disabled'}`, 
      source: 'Viewport' 
    });
  }, [postProcessEnabled, addConsoleLog]);
  
  // Update gizmo mode when tool changes
  const updateGizmoMode = useCallback((mode: GizmoMode) => {
    setGizmoMode(mode);
    const gm = gizmoManagerRef.current;
    if (!gm) return;
    
    gm.positionGizmoEnabled = mode === 'move';
    gm.rotationGizmoEnabled = mode === 'rotate';
    gm.scaleGizmoEnabled = mode === 'scale';
    gm.boundingBoxGizmoEnabled = false;
    
    if (mode === 'select') {
      gm.positionGizmoEnabled = false;
      gm.rotationGizmoEnabled = false;
      gm.scaleGizmoEnabled = false;
    }
  }, []);
  
  // Keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Handle Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            if (selectedObjectId) {
              duplicateObject(selectedObjectId);
              addConsoleLog({ type: 'info', message: 'Object duplicated', source: 'Scene' });
            }
            return;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              useEngineStore.getState().redo();
            } else {
              useEngineStore.getState().undo();
            }
            return;
          case 'e':
            e.preventDefault();
            useEngineStore.getState().exportProject();
            return;
          case 's':
            e.preventDefault();
            useEngineStore.getState().saveToCloud();
            return;
        }
      }
      
      switch (e.key.toLowerCase()) {
        case 'q':
          updateGizmoMode('select');
          break;
        case 'w':
          updateGizmoMode('move');
          break;
        case 'e':
          updateGizmoMode('rotate');
          break;
        case 'r':
          updateGizmoMode('scale');
          break;
        case 'delete':
        case 'backspace':
          if (selectedObjectId) {
            deleteGameObject(selectedObjectId);
            addConsoleLog({ type: 'info', message: 'Object deleted', source: 'Scene' });
            selectObject(null);
          }
          break;
        case 'f':
          // Focus on selected object
          if (selectedObjectId && sceneRef.current) {
            const mesh = meshMapRef.current.get(selectedObjectId);
            const camera = sceneRef.current.activeCamera as BABYLON.ArcRotateCamera;
            if (mesh && camera) {
              camera.setTarget(mesh.position);
              addConsoleLog({ type: 'info', message: `Focused on ${mesh.name || selectedObjectId}`, source: 'Viewport' });
            }
          }
          break;
        case ' ':
          e.preventDefault();
          setPlaying(!isPlaying);
          break;
        case 'escape':
          // Deselect current object
          const gm = gizmoManagerRef.current;
          if (gm) {
            gm.attachToMesh(null);
          }
          setSelectedMeshName(null);
          selectObject(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateGizmoMode, selectObject, selectedObjectId, deleteGameObject, duplicateObject, addConsoleLog, setPlaying, isPlaying]);

  useEffect(() => {
    if (pendingExample && sceneRef.current) {
      const scene = sceneRef.current;
      
      const meshesToDispose = scene.meshes.filter(m => m.name !== 'grid' && m.name !== 'skyBox');
      meshesToDispose.forEach(mesh => mesh.dispose());
      
      const lightsToDispose = scene.lights.filter(l => l.name !== 'hemisphericLight' && l.name !== 'directionalLight');
      lightsToDispose.forEach(light => light.dispose());
      
      try {
        pendingExample.create(scene);
        addConsoleLog({ 
          type: 'info', 
          message: `Example "${pendingExample.name}" applied to scene`, 
          source: 'Examples' 
        });
      } catch (error) {
        addConsoleLog({ 
          type: 'error', 
          message: `Failed to apply example: ${error}`, 
          source: 'Examples' 
        });
      }
      
      clearPendingExample();
    }
  }, [pendingExample]);

  // Handle animation playback when animation is selected from dropdown with smooth blending
  useEffect(() => {
    animationRegistry.forEach((info, objectId) => {
      const animGroups = animationGroupsRef.current.get(objectId);
      if (!animGroups) return;
      
      // Check if target animation should be playing
      if (info.currentAnimation) {
        const selectedAnim = animGroups.find(ag => ag.name === info.currentAnimation);
        if (selectedAnim && !selectedAnim.isPlaying) {
          // Blend transition: fade out others while fading in the new one
          const blendDuration = 0.25; // seconds for blend transition
          
          // Start new animation with weight 0, then ramp up
          selectedAnim.start(true, 1.0, selectedAnim.from, selectedAnim.to, false);
          selectedAnim.setWeightForAllAnimatables(0);
          
          // Animate weight from 0 to 1
          let startTime = performance.now();
          const blendIn = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / blendDuration, 1);
            selectedAnim.setWeightForAllAnimatables(t);
            
            // Fade out other animations
            animGroups.forEach(ag => {
              if (ag !== selectedAnim && ag.isPlaying) {
                ag.setWeightForAllAnimatables(1 - t);
                if (t >= 1) ag.stop();
              }
            });
            
            if (t < 1) {
              requestAnimationFrame(blendIn);
            }
          };
          requestAnimationFrame(blendIn);
        }
      } else {
        // No animation selected, stop all with fade out
        animGroups.forEach(ag => {
          if (ag.isPlaying) {
            ag.stop();
          }
        });
      }
    });
  }, [animationRegistry]);

  // Handle play mode - activate/deactivate third-person controller
  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    
    if (!scene || !canvas) return;
    
    if (isPlaying) {
      // Set up grass environment for play mode (like Sketchbook starting area)
      setupPlayModeEnvironment(scene);
      
      // Find a player character to control
      const { mesh: playerMesh, animationGroups } = findPlayerCharacter(scene);
      
      if (playerMesh) {
        // Dispose existing controller if any
        if (controllerRef.current) {
          controllerRef.current.dispose();
        }
        
        // Get animation groups from our registry if available
        let anims = animationGroups;
        if (anims.length === 0) {
          // Try to find animations from our stored map
          animationGroupsRef.current.forEach((storedAnims) => {
            if (anims.length === 0) {
              anims = storedAnims;
            }
          });
        }
        
        // Create new Sketchbook-style character controller
        const controller = new CharacterController({
          scene,
          canvas,
          characterMesh: playerMesh,
          animationGroups: anims,
          walkSpeed: 4,
          runSpeed: 8,
          jumpForce: 8,
          gravity: 20,
          cameraDistance: 6,
          cameraHeight: 2
        });
        
        controllerRef.current = controller;
        controller.activate();
        
        // Hide gizmos in play mode
        if (gizmoManagerRef.current) {
          gizmoManagerRef.current.attachToMesh(null);
        }
        
        addConsoleLog({
          type: 'info',
          message: `Sketchbook controller activated on "${playerMesh.name}" - WASD move, Shift run, Space jump`,
          source: 'Controller'
        });
      } else {
        addConsoleLog({
          type: 'warning',
          message: 'No character found in scene. Add a 3D model to control in play mode.',
          source: 'Controller'
        });
      }
    } else {
      // Deactivate controller when stopping
      if (controllerRef.current) {
        controllerRef.current.deactivate();
        addConsoleLog({
          type: 'info',
          message: 'Character controller deactivated',
          source: 'Controller'
        });
      }
    }
  }, [isPlaying, addConsoleLog]);

  // Handle focus on object from hierarchy double-click
  useEffect(() => {
    if (!pendingFocusObjectId || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const camera = scene.activeCamera as ArcRotateCamera;
    
    if (!camera) {
      clearPendingFocus();
      return;
    }
    
    // Try to find the node by ID - could be mesh, light, camera, or transform node
    let targetPosition: Vector3 | null = null;
    let targetRadius = 5;
    let nodeName = pendingFocusObjectId;
    
    // First try mesh map
    let mesh = meshMapRef.current.get(pendingFocusObjectId);
    if (!mesh) {
      mesh = scene.getMeshById(pendingFocusObjectId) as BABYLON.AbstractMesh;
    }
    
    if (mesh) {
      const boundingInfo = mesh.getBoundingInfo();
      targetPosition = boundingInfo.boundingBox.centerWorld.clone();
      targetRadius = Math.max(boundingInfo.boundingSphere.radiusWorld * 3, 5);
      nodeName = mesh.name;
    } else {
      // Try to find as a camera
      const cam = scene.getCameraById(pendingFocusObjectId);
      if (cam) {
        targetPosition = cam.position.clone();
        nodeName = cam.name;
      }
      
      // Try to find as a light
      if (!targetPosition) {
        const light = scene.getLightById(pendingFocusObjectId);
        if (light && light instanceof BABYLON.PointLight) {
          targetPosition = light.position.clone();
          nodeName = light.name;
        } else if (light && light instanceof BABYLON.DirectionalLight) {
          // For directional lights, focus on origin
          targetPosition = Vector3.Zero();
          nodeName = light.name;
        }
      }
      
      // Try to find as a transform node
      if (!targetPosition) {
        const node = scene.getNodeById(pendingFocusObjectId);
        if (node && node instanceof BABYLON.TransformNode) {
          targetPosition = node.getAbsolutePosition().clone();
          nodeName = node.name;
        }
      }
      
      // Try to find from project data
      if (!targetPosition) {
        const obj = project?.scenes[0]?.objects.find(o => o.id === pendingFocusObjectId);
        if (obj) {
          targetPosition = new Vector3(
            obj.transform.position.x,
            obj.transform.position.y,
            obj.transform.position.z
          );
          nodeName = obj.name;
        }
      }
    }
    
    if (targetPosition) {
      camera.setTarget(targetPosition);
      camera.radius = targetRadius;
      
      addConsoleLog({
        type: 'info',
        message: `Focused on ${nodeName}`,
        source: 'Viewport'
      });
    } else {
      addConsoleLog({
        type: 'warning',
        message: `Could not find object ${pendingFocusObjectId}`,
        source: 'Viewport'
      });
    }
    
    clearPendingFocus();
  }, [pendingFocusObjectId, clearPendingFocus, addConsoleLog, project]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let engine: Engine;
    try {
      engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });
      engineRef.current = engine;
    } catch (e) {
      setWebGLError('Failed to initialize Babylon.js engine. WebGL may not be supported.');
      return;
    }
    
    if (!engine) {
      setWebGLError('WebGL is not supported in this environment. The 3D viewport requires WebGL to render scenes.');
      return;
    }

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.08, 0.08, 0.12, 1);
    sceneRef.current = scene;

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      15,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;
    camera.panningSensibility = 100;

    const light = new HemisphericLight('hemisphericLight', new Vector3(0, 1, 0), scene);
    light.intensity = 0.6;
    light.groundColor = new Color3(0.2, 0.2, 0.25);

    const dirLight = new DirectionalLight('directionalLight', new Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.8;
    dirLight.position = new Vector3(10, 20, 10);
    
    // Create shadow generator for realistic shadows
    const shadowGenerator = new ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    shadowGenerator.darkness = 0.3;
    shadowGeneratorRef.current = shadowGenerator;

    // Initialize GizmoManager for transform handles
    const gizmoManager = new GizmoManager(scene);
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = false;
    gizmoManager.scaleGizmoEnabled = false;
    gizmoManager.boundingBoxGizmoEnabled = false;
    gizmoManager.usePointerToAttachGizmos = true;
    
    // Configure gizmo appearance
    if (gizmoManager.gizmos.positionGizmo) {
      gizmoManager.gizmos.positionGizmo.scaleRatio = 1.2;
    }
    if (gizmoManager.gizmos.rotationGizmo) {
      gizmoManager.gizmos.rotationGizmo.scaleRatio = 1.2;
    }
    if (gizmoManager.gizmos.scaleGizmo) {
      gizmoManager.gizmos.scaleGizmo.scaleRatio = 1.2;
    }
    
    gizmoManagerRef.current = gizmoManager;
    
    // Handle mesh selection and sync with store
    gizmoManager.onAttachedToMeshObservable.add((mesh) => {
      if (mesh) {
        setSelectedMeshName(mesh.name);
        selectObject(mesh.name);
        addConsoleLog({ 
          type: 'info', 
          message: `Selected: ${mesh.name}`, 
          source: 'Viewport' 
        });
      } else {
        setSelectedMeshName(null);
        selectObject(null);
      }
    });

    if (showGrid) {
      const ground = MeshBuilder.CreateGround('grid', { width: 20, height: 20, subdivisions: 20 }, scene);
      const gridMaterial = new GridMaterial('gridMaterial', scene);
      gridMaterial.majorUnitFrequency = 5;
      gridMaterial.minorUnitVisibility = 0.3;
      gridMaterial.gridRatio = 1;
      gridMaterial.backFaceCulling = false;
      gridMaterial.mainColor = new Color3(0.2, 0.2, 0.25);
      gridMaterial.lineColor = new Color3(0.3, 0.3, 0.35);
      gridMaterial.opacity = 0.98;
      ground.material = gridMaterial;
      ground.receiveShadows = true;
    }

    const sceneData = project?.scenes[0];
    if (sceneData) {
      sceneData.objects.forEach(obj => {
        const meshComp = obj.components.find(c => c.type === 'mesh');
        const materialComp = obj.components.find(c => c.type === 'material');
        const lightComp = obj.components.find(c => c.type === 'light');
        const controllerComp = obj.components.find(c => c.type === 'controller');
        const animatorComp = obj.components.find(c => c.type === 'animator');
        
        if (meshComp && meshComp.properties.type) {
          const meshType = meshComp.properties.type;
          
          if (meshType === 'imported' && meshComp.properties.modelPath) {
            const modelPath = meshComp.properties.modelPath;
            const folder = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
            const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
            
            const loadStartTime = performance.now();
            setLoadingModels(prev => [...prev, obj.name]);
            
            addConsoleLog({
              type: 'info',
              message: `Loading model: ${obj.name}...`,
              source: 'Viewport'
            });
            
            SceneLoader.ImportMeshAsync('', folder, filename, scene).then((result) => {
              const loadEndTime = performance.now();
              const loadDuration = (loadEndTime - loadStartTime).toFixed(2);
              
              if (result.meshes.length > 0) {
                const rootMesh = result.meshes[0];
                rootMesh.name = obj.id;
                rootMesh.id = obj.id;
                
                // Set metadata including tags for player detection
                rootMesh.metadata = {
                  gameObjectId: obj.id,
                  tags: obj.tags || [],
                  layer: obj.layer || 0
                };
                
                // Also set metadata on all child meshes for visibility and shadows
                result.meshes.forEach(m => {
                  m.metadata = rootMesh.metadata;
                  m.isVisible = obj.visible;
                  // Enable shadow casting and receiving
                  m.receiveShadows = true;
                  // Add as shadow caster if shadow generator exists
                  if (shadowGeneratorRef.current && m.getTotalVertices() > 0) {
                    shadowGeneratorRef.current.addShadowCaster(m);
                  }
                });
                
                rootMesh.position = new Vector3(
                  obj.transform.position.x,
                  obj.transform.position.y,
                  obj.transform.position.z
                );
                rootMesh.rotation = new Vector3(
                  obj.transform.rotation.x * Math.PI / 180,
                  obj.transform.rotation.y * Math.PI / 180,
                  obj.transform.rotation.z * Math.PI / 180
                );
                rootMesh.scaling = new Vector3(
                  obj.transform.scale.x,
                  obj.transform.scale.y,
                  obj.transform.scale.z
                );
                
                meshMapRef.current.set(obj.id, rootMesh);
                
                const meshCount = result.meshes.length;
                const vertexCount = result.meshes.reduce((acc, m) => acc + (m.getTotalVertices?.() || 0), 0);
                
                // Register animations if present
                if (result.animationGroups && result.animationGroups.length > 0) {
                  const animationNames = result.animationGroups.map(ag => ag.name);
                  registerAnimations(obj.id, animationNames);
                  
                  // Store animation groups for playback control
                  animationGroupsRef.current.set(obj.id, result.animationGroups);
                  
                  // Configure animation blending for smooth transitions
                  result.animationGroups.forEach(ag => {
                    ag.loopAnimation = true;
                  });
                  
                  // Enable blending on the scene for smooth animation transitions
                  if (!scene.animationPropertiesOverride) {
                    scene.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
                    scene.animationPropertiesOverride.enableBlending = true;
                    scene.animationPropertiesOverride.blendingSpeed = 0.05;
                  }
                  
                  // Stop all animations initially (T-pose)
                  result.animationGroups.forEach(ag => ag.stop());
                  
                  addConsoleLog({
                    type: 'info',
                    message: `Found ${animationNames.length} animations: ${animationNames.join(', ')}`,
                    source: 'Animation'
                  });
                }
                
                addConsoleLog({
                  type: 'info',
                  message: `Loaded model: ${obj.name} (${loadDuration}ms, ${meshCount} meshes, ${vertexCount.toLocaleString()} vertices)`,
                  source: 'Viewport'
                });
              }
              
              setLoadingModels(prev => prev.filter(n => n !== obj.name));
            }).catch((err) => {
              const loadEndTime = performance.now();
              const loadDuration = (loadEndTime - loadStartTime).toFixed(2);
              
              addConsoleLog({
                type: 'error',
                message: `Failed to load model ${modelPath} after ${loadDuration}ms: ${err.message}`,
                source: 'Viewport'
              });
              const placeholder = MeshBuilder.CreateBox(obj.id, { size: 1 }, scene);
              placeholder.position = new Vector3(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z);
              const errorMat = new StandardMaterial(`${obj.id}_error_mat`, scene);
              errorMat.diffuseColor = new Color3(1, 0, 0);
              placeholder.material = errorMat;
              
              setLoadingModels(prev => prev.filter(n => n !== obj.name));
            });
          } else {
            let mesh;
            switch (meshType) {
              case 'box':
              case 'cube':
                mesh = MeshBuilder.CreateBox(obj.id, { size: 1 }, scene);
                break;
              case 'sphere':
                mesh = MeshBuilder.CreateSphere(obj.id, { diameter: 1, segments: 32 }, scene);
                break;
              case 'cylinder':
                mesh = MeshBuilder.CreateCylinder(obj.id, { height: 1, diameter: 1 }, scene);
                break;
              case 'capsule':
                mesh = MeshBuilder.CreateCapsule(obj.id, { radius: 0.5, height: 2 }, scene);
                break;
              case 'plane':
                mesh = MeshBuilder.CreateGround(obj.id, { width: 1, height: 1 }, scene);
                break;
              case 'cone':
                mesh = MeshBuilder.CreateCylinder(obj.id, { height: 1, diameterTop: 0, diameterBottom: 1 }, scene);
                break;
              case 'torus':
                mesh = MeshBuilder.CreateTorus(obj.id, { diameter: 1, thickness: 0.3 }, scene);
                break;
              default:
                mesh = MeshBuilder.CreateBox(obj.id, { size: 1 }, scene);
            }
            
            mesh.position = new Vector3(
              obj.transform.position.x,
              obj.transform.position.y,
              obj.transform.position.z
            );
            mesh.rotation = new Vector3(
              obj.transform.rotation.x * Math.PI / 180,
              obj.transform.rotation.y * Math.PI / 180,
              obj.transform.rotation.z * Math.PI / 180
            );
            mesh.scaling = new Vector3(
              obj.transform.scale.x,
              obj.transform.scale.y,
              obj.transform.scale.z
            );

            // Apply material from material component (best practice: separate mesh and material)
            if (materialComp && materialComp.properties) {
              const matProps = materialComp.properties;
              const matType = matProps.type || 'pbr';
              
              if (matType === 'pbr') {
                const pbrMat = new PBRMaterial(`${obj.id}_mat`, scene);
                
                // Albedo color
                const albedoColor = matProps.albedoColor || '#6366f1';
                const ar = parseInt(albedoColor.slice(1, 3), 16) / 255;
                const ag = parseInt(albedoColor.slice(3, 5), 16) / 255;
                const ab = parseInt(albedoColor.slice(5, 7), 16) / 255;
                pbrMat.albedoColor = new Color3(ar, ag, ab);
                
                // Metallic and roughness
                pbrMat.metallic = matProps.metallic !== undefined ? matProps.metallic : 0;
                pbrMat.roughness = matProps.roughness !== undefined ? matProps.roughness : 0.5;
                
                // Emissive
                if (matProps.emissiveColor && matProps.emissiveColor !== '#000000') {
                  const er = parseInt(matProps.emissiveColor.slice(1, 3), 16) / 255;
                  const eg = parseInt(matProps.emissiveColor.slice(3, 5), 16) / 255;
                  const eb = parseInt(matProps.emissiveColor.slice(5, 7), 16) / 255;
                  pbrMat.emissiveColor = new Color3(er, eg, eb);
                  pbrMat.emissiveIntensity = matProps.emissiveIntensity || 1;
                }
                
                // Two-sided rendering
                if (matProps.twoSided) {
                  pbrMat.backFaceCulling = false;
                }
                
                mesh.material = pbrMat;
              } else {
                // Standard material fallback
                const stdMat = new StandardMaterial(`${obj.id}_mat`, scene);
                const color = matProps.albedoColor || '#6366f1';
                const r = parseInt(color.slice(1, 3), 16) / 255;
                const g = parseInt(color.slice(3, 5), 16) / 255;
                const b = parseInt(color.slice(5, 7), 16) / 255;
                stdMat.diffuseColor = new Color3(r, g, b);
                stdMat.specularColor = new Color3(0.2, 0.2, 0.2);
                mesh.material = stdMat;
              }
            } else {
              // Fallback: use color from mesh component if no material component
              const material = new StandardMaterial(`${obj.id}_mat`, scene);
              const color = meshComp.properties.color || '#6366f1';
              const r = parseInt(color.slice(1, 3), 16) / 255;
              const g = parseInt(color.slice(3, 5), 16) / 255;
              const b = parseInt(color.slice(5, 7), 16) / 255;
              material.diffuseColor = new Color3(r, g, b);
              material.specularColor = new Color3(0.2, 0.2, 0.2);
              mesh.material = material;
            }
            
            // Shadow settings from mesh component
            mesh.receiveShadows = meshComp.properties.receiveShadow !== false;
            if (meshComp.properties.castShadow !== false && shadowGeneratorRef.current) {
              shadowGeneratorRef.current.addShadowCaster(mesh);
            }
            
            mesh.isVisible = obj.visible;
            mesh.metadata = {
              gameObjectId: obj.id,
              tags: obj.tags || [],
              layer: obj.layer || 0,
              hasController: !!controllerComp,
              hasAnimator: !!animatorComp
            };
          }
        }
        
        if (lightComp) {
          const lightType = lightComp.properties.type || 'point';
          let sceneLight;
          if (lightType === 'point') {
            sceneLight = new PointLight(obj.id, new Vector3(
              obj.transform.position.x,
              obj.transform.position.y,
              obj.transform.position.z
            ), scene);
          } else {
            sceneLight = new DirectionalLight(obj.id, new Vector3(
              obj.transform.rotation.x,
              obj.transform.rotation.y,
              obj.transform.rotation.z
            ).normalize(), scene);
          }
          sceneLight.intensity = lightComp.properties.intensity || 1;
          const color = lightComp.properties.color || '#ffffff';
          const r = parseInt(color.slice(1, 3), 16) / 255;
          const g = parseInt(color.slice(3, 5), 16) / 255;
          const b = parseInt(color.slice(5, 7), 16) / 255;
          sceneLight.diffuse = new Color3(r, g, b);
        }
      });
    }

    // Add post-processing pipeline
    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    pipeline.fxaaEnabled = true;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.contrast = 1.1;
    pipeline.imageProcessing.exposure = 1.0;
    renderPipelineRef.current = pipeline;

    engine.runRenderLoop(() => {
      const frameStart = performance.now();
      scene.render();
      const frameEnd = performance.now();
      
      frameTimeRef.current.push(frameEnd - frameStart);
      if (frameTimeRef.current.length > 60) {
        frameTimeRef.current.shift();
      }
      const avgRenderTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
      setRenderTime(parseFloat(avgRenderTime.toFixed(2)));
      
      setFps(Math.round(engine.getFps()));
      
      const instrumentation = scene.getActiveMeshes().length;
      setDrawCalls(instrumentation);
      
      let totalVertices = 0;
      scene.getActiveMeshes().data.forEach((mesh) => {
        if (mesh.getTotalVertices) {
          totalVertices += mesh.getTotalVertices();
        }
      });
      setVertices(totalVertices);
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    addConsoleLog({ type: 'info', message: 'Viewport initialized', source: 'Renderer' });

    return () => {
      window.removeEventListener('resize', handleResize);
      // Dispose shadow generator
      if (shadowGeneratorRef.current) {
        shadowGeneratorRef.current.dispose();
        shadowGeneratorRef.current = null;
      }
      // Dispose controller if active
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
      scene.dispose();
      engine.dispose();
    };
  }, [project?.id, project?.scenes[0]?.objects?.length, showGrid]);

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
            <Badge variant="outline" className="text-xs font-mono">
              Babylon.js v7
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              WebGL Required
            </Badge>
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
            <p className="text-lg font-medium">Drop to Import</p>
            <p className="text-sm text-muted-foreground">GLB, GLTF, OBJ, STL, FBX</p>
          </div>
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <canvas
            ref={canvasRef}
            className="w-full h-full outline-none"
            data-testid="viewport-canvas"
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Box className="w-4 h-4 mr-2" />
              Add Mesh
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => quickAddObject('box')} data-testid="menu-add-box">
                <Box className="w-4 h-4 mr-2" />
                Cube
              </ContextMenuItem>
              <ContextMenuItem onClick={() => quickAddObject('sphere')} data-testid="menu-add-sphere">
                <Circle className="w-4 h-4 mr-2" />
                Sphere
              </ContextMenuItem>
              <ContextMenuItem onClick={() => quickAddObject('cylinder')} data-testid="menu-add-cylinder">
                <Cylinder className="w-4 h-4 mr-2" />
                Cylinder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => quickAddObject('plane')} data-testid="menu-add-plane">
                <Square className="w-4 h-4 mr-2" />
                Plane
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Lightbulb className="w-4 h-4 mr-2" />
              Add Light
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => quickAddObject('pointLight')} data-testid="menu-add-point-light">
                <Lightbulb className="w-4 h-4 mr-2" />
                Point Light
              </ContextMenuItem>
              <ContextMenuItem onClick={() => quickAddObject('directionalLight')} data-testid="menu-add-dir-light">
                <Sun className="w-4 h-4 mr-2" />
                Directional Light
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => quickAddObject('camera')} data-testid="menu-add-camera">
            <Camera className="w-4 h-4 mr-2" />
            Add Camera
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={spawnPlayerCharacter} data-testid="menu-spawn-player">
            <User className="w-4 h-4 mr-2" />
            Spawn Player Character
          </ContextMenuItem>
          <ContextMenuItem onClick={autoRigSelectedModel} data-testid="menu-auto-rig">
            <Wand2 className="w-4 h-4 mr-2" />
            AI Auto-Rig Model
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <div className="absolute top-3 left-3 flex flex-col gap-1 bg-sidebar/80 backdrop-blur-sm rounded-md p-1 border border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={gizmoMode === 'select' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => updateGizmoMode('select')}
              data-testid="button-tool-select"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Select (Q)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={gizmoMode === 'move' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => updateGizmoMode('move')}
              data-testid="button-tool-move"
            >
              <Move className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Move (W)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={gizmoMode === 'rotate' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => updateGizmoMode('rotate')}
              data-testid="button-tool-rotate"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Rotate (E)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={gizmoMode === 'scale' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => updateGizmoMode('scale')}
              data-testid="button-tool-scale"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Scale (R)</TooltipContent>
        </Tooltip>

        <div className="my-1 border-t border-sidebar-border" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={showGrid ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleGrid}
              data-testid="button-toggle-grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Grid</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={showStats ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleStats}
              data-testid="button-toggle-stats"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Stats</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={inspectorVisible ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleInspector}
              data-testid="button-toggle-inspector"
            >
              <Bug className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Inspector</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={postProcessEnabled ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={togglePostProcess}
              data-testid="button-toggle-postprocess"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle Post-Processing</TooltipContent>
        </Tooltip>
        
        <div className="h-px bg-sidebar-border my-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={spawnPlayerCharacter}
              data-testid="button-spawn-player"
            >
              <User className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Spawn Player Character</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={autoRigSelectedModel}
              data-testid="button-auto-rig"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">AI Auto-Rig (select model first)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={adminPanelVisible ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setAdminPanelVisible(!adminPanelVisible)}
              data-testid="button-toggle-admin"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Admin Panel</TooltipContent>
        </Tooltip>
      </div>

      <AdminPanel 
        isVisible={adminPanelVisible}
        onClose={() => setAdminPanelVisible(false)}
        onSceneChange={(sceneId) => {
          setCurrentRPGSceneId(sceneId);
          addConsoleLog({ type: 'info', message: `Switching to scene: ${sceneId}`, source: 'Admin' });
        }}
        currentSceneId={currentRPGSceneId || undefined}
      />

      <div className="absolute top-3 right-3 flex gap-1 bg-sidebar/80 backdrop-blur-sm rounded-md p-1 border border-sidebar-border">
        <Button 
          variant={viewMode === 'pbr' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => setViewMode('pbr')}
          data-testid="button-view-pbr"
        >
          PBR
        </Button>
        <Button 
          variant={viewMode === 'wireframe' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => setViewMode('wireframe')}
          data-testid="button-view-wireframe"
        >
          Wireframe
        </Button>
        <Button 
          variant={viewMode === 'debug' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => setViewMode('debug')}
          data-testid="button-view-debug"
        >
          Debug
        </Button>
      </div>

      {showStats && (
        <div className="absolute top-3 right-[180px] flex gap-2 bg-sidebar/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-sidebar-border">
          <div className="text-xs">
            <span className="text-muted-foreground">FPS: </span>
            <span className={cn(
              "font-mono font-medium",
              fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400"
            )}>
              {fps}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Draw: </span>
            <span className="font-mono font-medium">{drawCalls}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Verts: </span>
            <span className="font-mono font-medium">{vertices.toLocaleString()}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Objects: </span>
            <span className="font-mono font-medium">{project?.scenes[0]?.objects?.length || 0}</span>
          </div>
          <div className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className={cn(
              "font-mono font-medium",
              renderTime <= 8 ? "text-green-400" : renderTime <= 16 ? "text-yellow-400" : "text-red-400"
            )}>
              {renderTime}ms
            </span>
          </div>
        </div>
      )}
      
      {loadingModels.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-sidebar/90 backdrop-blur-sm rounded-md px-4 py-2 border border-sidebar-border flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <div className="text-sm">
            <span className="text-muted-foreground">Loading: </span>
            <span className="font-medium">{loadingModels.join(', ')}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex gap-2 items-center">
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm">
          Babylon.js v7
        </Badge>
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm">
          WebGL 2.0
        </Badge>
        <Badge variant="outline" className="text-xs font-mono bg-sidebar/80 backdrop-blur-sm capitalize">
          {gizmoMode} Tool
        </Badge>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 bg-sidebar/80 backdrop-blur-sm"
          onClick={() => setShowHelp(true)}
          data-testid="button-help"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>
      </div>
      
      {selectedMeshName && (
        <div className="absolute bottom-3 right-3 bg-sidebar/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-sidebar-border">
          <div className="text-xs">
            <span className="text-muted-foreground">Selected: </span>
            <span className="font-medium text-primary">{selectedMeshName}</span>
          </div>
        </div>
      )}

      {showHelp && (
        <div 
          className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-sidebar rounded-lg border border-sidebar-border p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowHelp(false)}>
                <span className="text-lg">&times;</span>
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Select Tool</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Q</kbd></div>
                <div className="text-muted-foreground">Move Tool</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">W</kbd></div>
                <div className="text-muted-foreground">Rotate Tool</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">E</kbd></div>
                <div className="text-muted-foreground">Scale Tool</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">R</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Focus Selected</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">F</kbd></div>
                <div className="text-muted-foreground">Delete Object</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Delete</kbd></div>
                <div className="text-muted-foreground">Duplicate</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl+D</kbd></div>
                <div className="text-muted-foreground">Deselect</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Esc</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Play/Stop</div>
                <div><kbd className="px-2 py-0.5 bg-muted rounded text-xs">Space</kbd></div>
              </div>
              <hr className="border-sidebar-border" />
              <div className="text-muted-foreground text-xs">
                <strong>Mouse:</strong> Left-click to select, Right-click for context menu, Scroll to zoom, Middle-click to pan
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
