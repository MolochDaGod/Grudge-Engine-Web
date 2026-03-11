import { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  FACTIONS, FACTION_BUILDINGS, FACTION_UNITS, SIEGE_VEHICLES, TERRAIN_PROPS,
  getBuildingsForFaction, getUnitsForFaction, getAllFactionIds,
  type FactionId, type FactionBuildingDef, type FactionUnitDef, type SiegeVehicleDef, type TerrainPropDef
} from '@/lib/faction-assets';
import { RTSEconomy, type FactionResources } from '@/lib/rts-economy';
import { RTSAICommander } from '@/lib/rts-ai-commander';
import { damageSystem } from '@/lib/engine/damage-system';
import { RTSMinimap } from './RTSMinimap';

interface PlacedObject {
  id: string;
  defId: string;
  name: string;
  faction?: FactionId;
  type: 'building' | 'unit' | 'siege' | 'terrain';
  position: { x: number; y: number; z: number };
  mesh: BABYLON.AbstractMesh | null;
}

interface ConsoleEntry {
  type: 'info' | 'warning' | 'error';
  message: string;
  time: string;
}

export function RTSEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const cameraRef = useRef<BABYLON.ArcRotateCamera | null>(null);
  const shadowGenRef = useRef<BABYLON.ShadowGenerator | null>(null);
  const ghostMeshRef = useRef<BABYLON.AbstractMesh | null>(null);
  const economyRef = useRef<RTSEconomy | null>(null);
  const commandersRef = useRef<Map<FactionId, RTSAICommander>>(new Map());
  const lastTimeRef = useRef(0);

  const [activeFaction, setActiveFaction] = useState<FactionId>('orc');
  const [activeTab, setActiveTab] = useState<'buildings' | 'units' | 'siege' | 'terrain'>('buildings');
  const [selectedDef, setSelectedDef] = useState<string | null>(null);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [fps, setFps] = useState(0);
  const [objectCount, setObjectCount] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [resources, setResources] = useState<FactionResources>({ gold: 500, wood: 300, stone: 100, food: 50, supply: 5, supplyMax: 15 });
  const [aiActive, setAiActive] = useState<Record<string, boolean>>({});
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const log = useCallback((type: ConsoleEntry['type'], message: string) => {
    setConsoleEntries(prev => [...prev.slice(-50), {
      type, message, time: new Date().toLocaleTimeString()
    }]);
  }, []);

  // Create fallback mesh for an asset def
  const createFallbackMesh = useCallback((
    id: string,
    meshType: 'box' | 'cylinder' | 'capsule' | 'sphere',
    color: string,
    scale: number,
    scene: BABYLON.Scene
  ): BABYLON.AbstractMesh => {
    let mesh: BABYLON.Mesh;
    switch (meshType) {
      case 'cylinder':
        mesh = BABYLON.MeshBuilder.CreateCylinder(id, { diameter: 3 * scale, height: 6 * scale }, scene);
        break;
      case 'capsule':
        mesh = BABYLON.MeshBuilder.CreateCapsule(id, { radius: 0.5 * scale, height: 2 * scale }, scene);
        break;
      case 'sphere':
        mesh = BABYLON.MeshBuilder.CreateSphere(id, { diameter: 2 * scale }, scene);
        break;
      default:
        mesh = BABYLON.MeshBuilder.CreateBox(id, { width: 4 * scale, height: 5 * scale, depth: 4 * scale }, scene);
    }
    const mat = new BABYLON.StandardMaterial(`${id}_mat`, scene);
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    mat.diffuseColor = new BABYLON.Color3(r, g, b);
    mesh.material = mat;
    return mesh;
  }, []);

  // Try loading GLB, fall back to primitive
  const loadOrFallback = useCallback(async (
    defId: string,
    modelPath: string,
    fallbackMesh: string,
    fallbackColor: string,
    scale: number,
    scene: BABYLON.Scene
  ): Promise<BABYLON.AbstractMesh> => {
    try {
      const folder = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
      const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', folder, filename, scene);
      if (result.meshes.length > 0) {
        const root = result.meshes[0];
        root.scaling = new BABYLON.Vector3(scale, scale, scale);
        result.meshes.forEach(m => {
          m.receiveShadows = true;
          if (shadowGenRef.current && m.getTotalVertices() > 0) {
            shadowGenRef.current.addShadowCaster(m);
          }
        });
        log('info', `Loaded model: ${modelPath}`);
        return root;
      }
    } catch {
      log('warning', `Model not found: ${modelPath} — using fallback`);
    }
    return createFallbackMesh(defId, fallbackMesh as any, fallbackColor, scale, scene);
  }, [log, createFallbackMesh]);

  // Place an object in the scene
  const placeObject = useCallback(async (
    def: FactionBuildingDef | FactionUnitDef | SiegeVehicleDef | TerrainPropDef,
    type: PlacedObject['type'],
    position: BABYLON.Vector3
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const id = `placed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const faction = 'faction' in def ? (def as any).faction : undefined;

    const mesh = await loadOrFallback(
      id,
      def.modelPath,
      def.fallbackMesh,
      def.fallbackColor,
      def.scale,
      scene
    );

    mesh.position = position.clone();
    mesh.position.y = type === 'building' ? def.scale * 2.5 : def.scale;
    mesh.name = id;

    const placed: PlacedObject = {
      id, defId: def.id, name: def.name, faction, type,
      position: { x: position.x, y: mesh.position.y, z: position.z },
      mesh
    };

    setPlacedObjects(prev => [...prev, placed]);
    setObjectCount(prev => prev + 1);
    log('info', `Placed ${def.name} at (${position.x.toFixed(0)}, ${position.z.toFixed(0)})`);
  }, [loadOrFallback, log]);

  // Handle canvas click for placement
  const handleCanvasClick = useCallback((evt: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedDef || !sceneRef.current) return;

    const scene = sceneRef.current;
    const pickResult = scene.pick(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);

    if (pickResult?.hit && pickResult.pickedPoint) {
      // Snap to grid (5 unit grid)
      const snapped = new BABYLON.Vector3(
        Math.round(pickResult.pickedPoint.x / 5) * 5,
        0,
        Math.round(pickResult.pickedPoint.z / 5) * 5
      );

      // Find the definition
      const allDefs = [...FACTION_BUILDINGS, ...FACTION_UNITS, ...SIEGE_VEHICLES, ...TERRAIN_PROPS];
      const def = allDefs.find(d => d.id === selectedDef);
      if (!def) return;

      const type: PlacedObject['type'] =
        FACTION_BUILDINGS.some(b => b.id === selectedDef) ? 'building' :
        FACTION_UNITS.some(u => u.id === selectedDef) ? 'unit' :
        SIEGE_VEHICLES.some(s => s.id === selectedDef) ? 'siege' : 'terrain';

      placeObject(def, type, snapped);
    }
  }, [selectedDef, placeObject]);

  // Initialize BabylonJS scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.45, 0.6, 0.85, 1);
    scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.35);
    sceneRef.current = scene;

    // RTS Camera
    const camera = new BABYLON.ArcRotateCamera('rtsCamera', -Math.PI / 4, Math.PI / 3.2, 300, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 50;
    camera.upperRadiusLimit = 800;
    camera.lowerBetaLimit = 0.3;
    camera.upperBetaLimit = Math.PI / 2.5;
    camera.panningSensibility = 20;
    camera.wheelPrecision = 10;
    camera.maxZ = 12000;
    cameraRef.current = camera;

    // Lighting
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.4, -1, 0.3), scene);
    sun.intensity = 1.3;
    sun.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);
    sun.position = new BABYLON.Vector3(200, 400, 200);

    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.4;

    // Shadows
    const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;
    shadowGenRef.current = shadowGen;

    // Terrain
    const ground = BABYLON.MeshBuilder.CreateGround('terrain', { width: 800, height: 800, subdivisions: 64 }, scene);
    const groundMat = new BABYLON.StandardMaterial('terrainMat', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.35, 0.45, 0.2);
    groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Faction base zones
    const zones = [
      { pos: [-250, -250], color: [0.3, 0.5, 0.25], label: 'Orc Base' },
      { pos: [250, -250], color: [0.18, 0.55, 0.43], label: 'Elf Base' },
      { pos: [0, 280], color: [0.23, 0.35, 0.6], label: 'Human Base' },
    ];
    zones.forEach(({ pos, color }, i) => {
      const pad = BABYLON.MeshBuilder.CreateGround(`basePad_${i}`, { width: 120, height: 120 }, scene);
      pad.position = new BABYLON.Vector3(pos[0], 0.05, pos[1]);
      const mat = new BABYLON.StandardMaterial(`baseMat_${i}`, scene);
      mat.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
      mat.alpha = 0.5;
      pad.material = mat;
    });

    // Gold mines
    const goldMat = new BABYLON.StandardMaterial('goldMat', scene);
    goldMat.diffuseColor = new BABYLON.Color3(0.85, 0.7, 0.2);
    goldMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.0);
    [[-120, -120], [120, -120], [0, 150]].forEach(([x, z], i) => {
      const mine = BABYLON.MeshBuilder.CreateBox(`goldMine_${i}`, { width: 8, height: 6, depth: 8 }, scene);
      mine.position = new BABYLON.Vector3(x, 3, z);
      mine.material = goldMat;
      shadowGen.addShadowCaster(mine);
    });

    // Fog
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 500;
    scene.fogEnd = 3000;
    scene.fogColor = new BABYLON.Color3(0.45, 0.55, 0.7);

    // Economy system
    const allFactions = getAllFactionIds();
    const economy = new RTSEconomy(allFactions);
    economyRef.current = economy;

    const ecoUnsub = economy.on((event) => {
      if (event.type === 'build_complete') {
        log('info', `[${event.faction}] Building complete: ${event.data?.building}`);
      } else if (event.type === 'train_complete') {
        log('info', `[${event.faction}] Unit trained: ${event.data?.unit}`);
      } else if (event.type === 'insufficient_resources') {
        log('warning', `[${event.faction}] Insufficient resources`);
      } else if (event.type === 'supply_capped') {
        log('warning', `[${event.faction}] Supply cap reached`);
      }
    });

    // AI Commanders (one per non-player faction)
    const cmdUnsubs: (() => void)[] = [];
    allFactions.forEach(fid => {
      if (fid === 'orc') return; // player-controlled by default
      const commander = new RTSAICommander(fid, scene, economy, damageSystem);
      commandersRef.current.set(fid, commander);
      const unsub = commander.on((event) => {
        if (event.type === 'attack_wave') {
          log('warning', `[AI:${event.faction}] Attack wave! ${event.data?.unitCount} units`);
        } else if (event.type === 'phase_change') {
          log('info', `[AI:${event.faction}] Phase: ${event.data?.from} → ${event.data?.to}`);
        } else if (event.type === 'threat_detected') {
          log('error', `[AI:${event.faction}] Threat detected! Level: ${event.data?.level}`);
        }
      });
      cmdUnsubs.push(unsub);
    });

    // Right-click handler for move/attack commands
    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
      if ((pointerInfo.event as PointerEvent).button !== 2) return; // right click only

      const pickResult = scene.pick(scene.pointerX, scene.pointerY);
      if (!pickResult?.hit || !pickResult.pickedPoint) return;

      setSelectedUnits(prev => {
        if (prev.length === 0) return prev;
        const target = pickResult.pickedPoint!;
        prev.forEach(unitId => {
          const mesh = scene.getMeshByName(unitId);
          if (mesh) {
            // Move toward right-click target
            const dir = target.subtract(mesh.position);
            dir.y = 0;
            dir.normalize();
            mesh.metadata = { ...mesh.metadata, moveTarget: target.clone() };
            log('info', `Unit ${unitId.slice(0, 10)}.. moving to (${target.x.toFixed(0)}, ${target.z.toFixed(0)})`);
          }
        });
        return prev;
      });
    });

    // Render loop with economy + AI update
    lastTimeRef.current = performance.now();
    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1); // cap at 100ms
      lastTimeRef.current = now;

      // Update economy
      economy.update(dt);

      // Update AI commanders
      for (const commander of commandersRef.current.values()) {
        commander.update(dt);
      }

      // Move units with moveTarget metadata
      scene.meshes.forEach(mesh => {
        if (mesh.metadata?.moveTarget) {
          const target = mesh.metadata.moveTarget as BABYLON.Vector3;
          const dir = target.subtract(mesh.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist < 2) {
            mesh.metadata.moveTarget = null;
          } else {
            dir.normalize();
            mesh.position.addInPlace(dir.scale(5 * dt));
          }
        }
      });

      scene.render();
      setFps(Math.round(engine.getFps()));

      // Sync player resources HUD at ~4Hz
      if (Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250)) {
        setResources(economy.getResources(activeFaction));
      }
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    log('info', 'RTS Scene initialized — select a faction and place buildings/units');

    return () => {
      window.removeEventListener('resize', handleResize);
      ecoUnsub();
      cmdUnsubs.forEach(u => u());
      for (const cmd of commandersRef.current.values()) cmd.dispose();
      commandersRef.current.clear();
      economy.dispose();
      scene.dispose();
      engine.dispose();
    };
  }, [log]);

  // AI toggle
  const toggleAI = useCallback((fid: FactionId) => {
    const commander = commandersRef.current.get(fid);
    if (!commander) return;
    const active = !!aiActive[fid];
    if (active) {
      commander.stop();
      log('info', `AI Commander stopped for ${FACTIONS[fid].name}`);
    } else {
      commander.start();
      log('info', `AI Commander started for ${FACTIONS[fid].name}`);
    }
    setAiActive(prev => ({ ...prev, [fid]: !active }));
  }, [aiActive, log]);

  // Unit click selection
  const handleUnitSelect = useCallback((objId: string) => {
    setSelectedUnits(prev =>
      prev.includes(objId) ? prev.filter(u => u !== objId) : [...prev, objId]
    );
  }, []);

  // Build the sidebar item lists
  const buildings = getBuildingsForFaction(activeFaction);
  const units = getUnitsForFaction(activeFaction);

  // Minimap object list
  const minimapObjects = placedObjects.map(o => ({
    position: { x: o.position.x, z: o.position.z },
    faction: o.faction,
    type: o.type === 'siege' ? 'unit' as const : o.type,
  }));

  const categoryIcons: Record<string, string> = {
    production: '🏭', military: '⚔️', resource: '💰', defense: '🛡️', special: '✨',
    melee: '🗡️', ranged: '🏹', magic: '🔮', hero: '👑', worker: '⛏️'
  };

  return (
    <div className="h-screen flex bg-background text-foreground" data-testid="rts-editor">
      {/* ─── Left Sidebar: Faction & Asset Palette ─── */}
      <div className="w-72 flex flex-col border-r border-border bg-sidebar">
        {/* Faction Selector */}
        <div className="p-3 border-b border-border">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            GGE — Faction RTS Scene
          </div>
          <div className="flex gap-1 flex-wrap">
            {getAllFactionIds().map(fid => (
              <Button
                key={fid}
                variant={activeFaction === fid ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2"
                style={activeFaction === fid ? { backgroundColor: FACTIONS[fid].color } : undefined}
                onClick={() => { setActiveFaction(fid); setSelectedDef(null); }}
                data-testid={`btn-faction-${fid}`}
              >
                {FACTIONS[fid].icon} {FACTIONS[fid].name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Commander Controls */}
        <div className="p-2 border-b border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">AI Commanders</div>
          <div className="flex gap-1 flex-wrap">
            {getAllFactionIds().filter(f => f !== activeFaction).map(fid => (
              <Button
                key={fid}
                variant={aiActive[fid] ? 'default' : 'outline'}
                size="sm"
                className="text-[10px] h-6 px-2"
                style={aiActive[fid] ? { backgroundColor: FACTIONS[fid].color } : undefined}
                onClick={() => toggleAI(fid)}
              >
                {FACTIONS[fid].icon} {aiActive[fid] ? 'ON' : 'OFF'}
              </Button>
            ))}
          </div>
        </div>

        {/* Asset Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="mx-2 mt-2 h-8">
            <TabsTrigger value="buildings" className="text-xs flex-1 h-7">Buildings</TabsTrigger>
            <TabsTrigger value="units" className="text-xs flex-1 h-7">Units</TabsTrigger>
            <TabsTrigger value="siege" className="text-xs flex-1 h-7">Siege</TabsTrigger>
            <TabsTrigger value="terrain" className="text-xs flex-1 h-7">Terrain</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="buildings" className="p-2 space-y-1 mt-0">
              {buildings.map(b => (
                <AssetCard
                  key={b.id}
                  id={b.id}
                  name={b.name}
                  description={b.description}
                  category={b.category}
                  categoryIcon={categoryIcons[b.category] || '📦'}
                  cost={`${b.cost.gold}g ${b.cost.wood}w ${b.cost.stone}s`}
                  hp={b.hp}
                  isSelected={selectedDef === b.id}
                  color={FACTIONS[activeFaction].color}
                  onSelect={() => setSelectedDef(selectedDef === b.id ? null : b.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="units" className="p-2 space-y-1 mt-0">
              {units.map(u => (
                <AssetCard
                  key={u.id}
                  id={u.id}
                  name={u.name}
                  description={u.description}
                  category={u.category}
                  categoryIcon={categoryIcons[u.category] || '🧑'}
                  cost={`${u.cost.gold}g ${u.cost.food}f`}
                  hp={u.stats.hp}
                  extra={`DMG:${u.stats.damage} SPD:${u.stats.speed}`}
                  isSelected={selectedDef === u.id}
                  color={FACTIONS[activeFaction].color}
                  onSelect={() => setSelectedDef(selectedDef === u.id ? null : u.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="siege" className="p-2 space-y-1 mt-0">
              {SIEGE_VEHICLES.map(s => (
                <AssetCard
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  description={s.description}
                  category="siege"
                  categoryIcon="🏗️"
                  cost={`${s.cost.gold}g ${s.cost.wood}w`}
                  hp={s.stats.hp}
                  extra={`Siege DMG:${s.stats.siegeDamage}`}
                  isSelected={selectedDef === s.id}
                  color="#8a7a5a"
                  onSelect={() => setSelectedDef(selectedDef === s.id ? null : s.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="terrain" className="p-2 space-y-1 mt-0">
              {TERRAIN_PROPS.map(t => (
                <AssetCard
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  description={t.resourceYield ? `Yields ${t.resourceYield.amount} ${t.resourceYield.type}` : (t.isObstacle ? 'Obstacle' : 'Decorative')}
                  category={t.category}
                  categoryIcon={t.category === 'tree' ? '🌲' : t.category === 'rock' ? '🪨' : '🏗️'}
                  isSelected={selectedDef === t.id}
                  color="#5a7a3a"
                  onSelect={() => setSelectedDef(selectedDef === t.id ? null : t.id)}
                />
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Placed Objects Count */}
        <div className="p-2 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>Objects: {placedObjects.length}</span>
          <span>FPS: <span className={cn("font-mono", fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400")}>{fps}</span></span>
        </div>
      </div>

      {/* ─── Main Viewport ─── */}
      <div className="flex-1 flex flex-col">
        {/* Economy HUD */}
        <div className="h-8 bg-sidebar border-b border-border flex items-center px-3 gap-4 text-xs font-mono">
          <span className="text-muted-foreground text-[10px] uppercase font-semibold mr-1">Resources</span>
          <span title="Gold" className="text-yellow-400">💰 {resources.gold}</span>
          <span title="Wood" className="text-green-400">🪵 {resources.wood}</span>
          <span title="Stone" className="text-gray-300">🪨 {resources.stone}</span>
          <span title="Food" className="text-orange-300">🍖 {resources.food}</span>
          <span title="Supply" className="text-blue-300">👥 {resources.supply}/{resources.supplyMax}</span>
          <span className="ml-auto text-muted-foreground">{FACTIONS[activeFaction].icon} {FACTIONS[activeFaction].name}</span>
          <span className={cn("font-mono", fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400")}>{fps} FPS</span>
        </div>

        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            className="w-full h-full outline-none"
            onClick={handleCanvasClick}
            onContextMenu={(e) => e.preventDefault()}
            data-testid="rts-canvas"
          />

          {/* Placement indicator */}
          {selectedDef && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-sidebar/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-primary text-sm flex items-center gap-2">
              <span className="text-primary font-medium">Placing:</span>
              <span>{[...FACTION_BUILDINGS, ...FACTION_UNITS, ...SIEGE_VEHICLES, ...TERRAIN_PROPS].find(d => d.id === selectedDef)?.name}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedDef(null)}>Cancel (Esc)</Button>
            </div>
          )}

          {/* Selected units indicator */}
          {selectedUnits.length > 0 && (
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-sidebar/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-primary/50 text-xs flex items-center gap-2">
              <span className="text-primary">{selectedUnits.length} unit{selectedUnits.length > 1 ? 's' : ''} selected</span>
              <span className="text-muted-foreground">Right-click to move</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setSelectedUnits([])}>Deselect</Button>
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 bg-sidebar/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-border text-xs space-y-0.5">
            <div><span className="text-muted-foreground">Objects: </span><span className="font-mono">{placedObjects.length}</span></div>
            <div><span className="text-muted-foreground">Faction: </span><span className="font-mono" style={{ color: FACTIONS[activeFaction].color }}>{FACTIONS[activeFaction].name}</span></div>
          </div>

          {/* Minimap */}
          <RTSMinimap
            scene={sceneRef.current}
            camera={cameraRef.current}
            objects={minimapObjects}
            playerFaction={activeFaction}
          />
        </div>

        {/* ─── Bottom Console ─── */}
        <div className="h-32 border-t border-border bg-sidebar overflow-auto">
          <div className="px-3 py-1 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Console
          </div>
          <div className="px-3 py-1 space-y-0.5 text-xs font-mono">
            {consoleEntries.map((entry, i) => (
              <div key={i} className={cn(
                entry.type === 'error' ? 'text-red-400' :
                entry.type === 'warning' ? 'text-yellow-400' : 'text-muted-foreground'
              )}>
                <span className="opacity-50">[{entry.time}]</span> {entry.message}
              </div>
            ))}
            {consoleEntries.length === 0 && (
              <div className="text-muted-foreground">Select a faction and click an asset to place it on the map.</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Right Sidebar: Scene Hierarchy ─── */}
      <div className="w-56 border-l border-border bg-sidebar flex flex-col">
        <div className="p-2 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Scene Hierarchy
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {placedObjects.length === 0 ? (
              <div className="text-xs text-muted-foreground p-4 text-center">No assets placed</div>
            ) : (
              placedObjects.map(obj => (
                <div
                  key={obj.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer",
                    selectedUnits.includes(obj.id) ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-accent"
                  )}
                  onClick={() => (obj.type === 'unit' || obj.type === 'siege') && handleUnitSelect(obj.id)}
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    obj.type === 'building' ? 'bg-blue-400' :
                    obj.type === 'unit' ? 'bg-green-400' :
                    obj.type === 'siege' ? 'bg-orange-400' : 'bg-gray-400'
                  )} />
                  <span className="truncate flex-1">{obj.name}</span>
                  {obj.faction && (
                    <span className="text-[10px] opacity-50">{FACTIONS[obj.faction].icon}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* AI Status Panel */}
        <div className="p-2 border-t border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI Status</div>
          {getAllFactionIds().filter(f => f !== activeFaction).map(fid => {
            const commander = commandersRef.current.get(fid);
            const status = commander?.getStatus();
            return (
              <div key={fid} className="text-[10px] text-muted-foreground flex justify-between" style={{ borderLeft: `2px solid ${FACTIONS[fid].color}`, paddingLeft: 4, marginBottom: 2 }}>
                <span>{FACTIONS[fid].icon} {FACTIONS[fid].name.split(' ')[0]}</span>
                <span>{aiActive[fid] ? (status?.phase ?? 'off') : 'off'}</span>
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground">
            Toon_RTS models from D:\Games\Models\Toon_RTS
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Run <code className="bg-accent px-1 rounded">script/convert-toon-rts.ps1</code> to convert FBX→GLB
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Card Component ───────────────────────────────────────────────────

interface AssetCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryIcon: string;
  cost?: string;
  hp?: number;
  extra?: string;
  isSelected: boolean;
  color: string;
  onSelect: () => void;
}

function AssetCard({ id, name, description, category, categoryIcon, cost, hp, extra, isSelected, color, onSelect }: AssetCardProps) {
  return (
    <div
      className={cn(
        "p-2 rounded-md cursor-pointer transition-all border",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-transparent hover:bg-accent/50"
      )}
      onClick={onSelect}
      data-testid={`asset-${id}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{categoryIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{description}</div>
        </div>
      </div>
      {(cost || hp || extra) && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {cost && <Badge variant="outline" className="text-[9px] h-4 px-1">{cost}</Badge>}
          {hp && <Badge variant="outline" className="text-[9px] h-4 px-1">HP:{hp}</Badge>}
          {extra && <Badge variant="outline" className="text-[9px] h-4 px-1">{extra}</Badge>}
        </div>
      )}
    </div>
  );
}
