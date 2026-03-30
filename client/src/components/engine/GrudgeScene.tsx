/**
 * GrudgeScene.tsx
 * Babylon.js scene that loads the Grudge Warlords MOBILE world (GLTF/GLB).
 * Engine: Babylon.js (unified with the rest of the project)
 */

import { useEffect, useRef, useState } from 'react';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial, SceneLoader,
  ShadowGenerator, DynamicTexture, Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Loader2, Map, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GRUDGE_SCENE_URL = '/assets/scenes/grudge-mobile/scene.glb';
const PLACEHOLDER_TERRAIN = true;

const FACTION_CITIES = [
  { name: 'Human Village',  position: [ 30, 0,  30] as const, color: '#c8a06e' },
  { name: 'Orc Village',    position: [-40, 0,  20] as const, color: '#6b8c3d' },
  { name: 'Elf City',       position: [ 10, 0, -50] as const, color: '#8ebc9e' },
  { name: 'Dwarven City',   position: [-30, 0, -40] as const, color: '#8c7d6e' },
  { name: 'Barbarian City', position: [ 60, 0, -10] as const, color: '#9c4a2c' },
  { name: 'Undead City',    position: [-60, 0,  60] as const, color: '#5c4e6e' },
];

function hexToColor3(hex: string): Color3 {
  return new Color3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );
}

function buildPlaceholderScene(scene: Scene, shadows: ShadowGenerator) {
  const ground = MeshBuilder.CreateGround('terrain', { width: 500, height: 500, subdivisions: 32 }, scene);
  const gMat = new StandardMaterial('groundMat', scene);
  gMat.diffuseColor = new Color3(0.29, 0.49, 0.35);
  ground.material = gMat;
  ground.receiveShadows = true;

  for (let i = 0; i < 20; i++) {
    const x = Math.sin(i * 1.7) * 80;
    const z = Math.cos(i * 1.3) * 80;
    const h = 2 + Math.sin(i * 2.3) * 4;
    const r = 15 + Math.cos(i * 1.1) * 10;
    const hill = MeshBuilder.CreateCylinder(`hill_${i}`, { height: h, diameterTop: r * 0.6, diameterBottom: r * 2, tessellation: 8 }, scene);
    hill.position = new Vector3(x, h / 2, z);
    const hMat = new StandardMaterial(`hillMat_${i}`, scene);
    hMat.diffuseColor = new Color3(0.24, 0.42, 0.29);
    hill.material = hMat;
    hill.receiveShadows = true;
    shadows.addShadowCaster(hill);
  }

  FACTION_CITIES.forEach(({ name, position, color }) => {
    const [x, , z] = position;
    const c = hexToColor3(color);
    const hall = MeshBuilder.CreateBox(`${name}_hall`, { width: 8, height: 6, depth: 8 }, scene);
    hall.position = new Vector3(x, 3, z);
    const hm = new StandardMaterial(`${name}_hm`, scene);
    hm.diffuseColor = c;
    hall.material = hm;
    shadows.addShadowCaster(hall);
    const tower = MeshBuilder.CreateCylinder(`${name}_tower`, { height: 4, diameterTop: 3, diameterBottom: 4, tessellation: 8 }, scene);
    tower.position = new Vector3(x, 8, z);
    const tm = new StandardMaterial(`${name}_tm`, scene);
    tm.diffuseColor = c.scale(0.8);
    tower.material = tm;
    shadows.addShadowCaster(tower);
    const label = MeshBuilder.CreatePlane(`${name}_label`, { width: 12, height: 2 }, scene);
    label.position = new Vector3(x, 12, z);
    label.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tex = new DynamicTexture(`${name}_tex`, { width: 256, height: 64 }, scene);
    tex.drawText(name, null, 44, 'bold 26px Arial', '#FFD700', '#00000099');
    const lm = new StandardMaterial(`${name}_lm`, scene);
    lm.diffuseTexture = tex;
    lm.emissiveColor = Color3.White();
    lm.backFaceCulling = false;
    lm.useAlphaFromDiffuseTexture = true;
    label.material = lm;
  });
}

interface GrudgeSceneProps {
  selection?: import('@/lib/grudge-characters').CharacterSelection;
  onBack?: () => void;
}

export function GrudgeScene({ onBack }: GrudgeSceneProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const playerRef = useRef<Mesh | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true);
    engineRef.current = engine;
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.15, 0.2, 0.3, 1);
    const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 80, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 300;
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new Color3(0.15, 0.15, 0.2);
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), scene);
    sun.intensity = 0.8;
    sun.position = new Vector3(100, 200, 100);
    const shadows = new ShadowGenerator(2048, sun);
    shadows.useBlurExponentialShadowMap = true;
    const player = MeshBuilder.CreateCapsule('player', { radius: 0.5, height: 2 }, scene);
    player.position = new Vector3(0, 1, 0);
    const pm = new StandardMaterial('playerMat', scene);
    pm.diffuseColor = new Color3(0.3, 0.6, 1.0);
    player.material = pm;
    player.isVisible = false;
    playerRef.current = player;
    shadows.addShadowCaster(player);
    setLoading(true);
    SceneLoader.ImportMeshAsync('', '/assets/scenes/grudge-mobile/', 'scene.glb', scene)
      .then((result) => {
        result.meshes.forEach(m => { m.receiveShadows = true; shadows.addShadowCaster(m); });
        setNodeCount(result.meshes.length);
        setSceneLoaded(true);
        setLoading(false);
      })
      .catch(() => {
        if (PLACEHOLDER_TERRAIN) buildPlaceholderScene(scene, shadows);
        setNodeCount(FACTION_CITIES.length * 3 + 21);
        setSceneLoaded(true);
        setLoading(false);
      });
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    engine.runRenderLoop(() => {
      const p = playerRef.current;
      if (p?.isVisible) {
        const speed = keysRef.current['ShiftLeft'] ? 12 : 5;
        const dt = engine.getDeltaTime() / 1000;
        const cam = scene.activeCamera as ArcRotateCamera;
        const forward = new Vector3(-Math.sin(cam.alpha), 0, -Math.cos(cam.alpha));
        const right = new Vector3(Math.cos(cam.alpha), 0, -Math.sin(cam.alpha));
        const move = Vector3.Zero();
        if (keysRef.current['KeyW']) move.addInPlace(forward);
        if (keysRef.current['KeyS']) move.subtractInPlace(forward);
        if (keysRef.current['KeyA']) move.subtractInPlace(right);
        if (keysRef.current['KeyD']) move.addInPlace(right);
        if (move.length() > 0) { move.normalize().scaleInPlace(speed * dt); p.position.addInPlace(move); cam.target = p.position.clone(); }
      }
      setFps(Math.round(engine.getFps()));
      scene.render();
    });
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    const next = !isPlaying;
    p.isVisible = next;
    setIsPlaying(next);
  };

  const resetCamera = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const scene = engine.scenes[0];
    const cam = scene?.activeCamera as ArcRotateCamera;
    if (cam) { cam.alpha = -Math.PI / 2; cam.beta = Math.PI / 3; cam.radius = 80; cam.target = Vector3.Zero(); }
  };

  return (
    <div className="relative w-full h-full bg-gray-950">
      <canvas ref={canvasRef} className="w-full h-full outline-none" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-3 bg-gray-900 px-6 py-4 rounded-lg border border-gray-700">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
            <span className="text-sm text-gray-200">Loading Grudge World...</span>
          </div>
        </div>
      )}
      <div className="absolute top-3 left-3 flex gap-2">
        <Button size="sm" variant={isPlaying ? 'secondary' : 'outline'} onClick={togglePlay} className="h-8">
          {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {isPlaying ? 'Stop' : 'Play'}
        </Button>
        <Button size="sm" variant="outline" onClick={resetCamera} className="h-8">
          <RotateCcw className="w-4 h-4 mr-1" />Reset
        </Button>
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        {sceneLoaded && <Badge variant="outline" className="bg-black/60 text-xs"><Map className="w-3 h-3 mr-1" />{nodeCount} objects</Badge>}
        <Badge variant="outline" className="bg-black/60 text-xs font-mono">{fps} FPS</Badge>
        <Badge variant="outline" className="bg-black/60 text-xs">Babylon.js</Badge>
      </div>
      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-gray-300 text-xs px-4 py-2 rounded-full border border-gray-600">
          WASD move · Shift sprint · Mouse orbit
        </div>
      )}
    </div>
  );
}
