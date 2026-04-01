/**
 * GrudgeScene.tsx
 * Babylon.js scene with Havok physics character controller.
 * Race model + weapon animation set driven by CharacterSelection.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Engine, Scene, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial,
  SceneLoader, ShadowGenerator, DynamicTexture, Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Loader2, Map, Sword, Crosshair, Swords, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { spawnGrudgeCharacter, type HavokCharacterController } from '@/lib/havok-character-controller';
import { type WeaponSlot, CLASS_WEAPON_SLOTS } from '@/lib/animation-manifest';

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

const WEAPON_ICONS: Partial<Record<WeaponSlot, React.ReactNode>> = {
  unarmed:     <Swords className="w-3 h-3" />,
  sword:       <Sword className="w-3 h-3" />,
  sword_shield:<Shield className="w-3 h-3" />,
  two_handed:  <Swords className="w-3 h-3" />,
  staff:       <Zap className="w-3 h-3" />,
  bow:         <Crosshair className="w-3 h-3" />,
  gun:         <Crosshair className="w-3 h-3" />,
};

export function GrudgeScene({ selection, onBack }: GrudgeSceneProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const ctrlRef   = useRef<HavokCharacterController | null>(null);

  const [loading, setLoading]     = useState(true);
  const [loadMsg, setLoadMsg]     = useState('Initialising Havok physics...');
  const [nodeCount, setNodeCount] = useState(0);
  const [fps, setFps]             = useState(0);
  const [mode, setMode]           = useState<'harvest' | 'combat'>('harvest');
  const [weapon, setWeapon]       = useState<WeaponSlot>('unarmed');

  const race      = selection?.race          ?? 'human';
  const charClass = selection?.characterClass ?? 'warrior';
  const availWeapons: WeaponSlot[] = [
    ...CLASS_WEAPON_SLOTS[charClass as keyof typeof CLASS_WEAPON_SLOTS] ?? ['unarmed'],
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    engineRef.current = engine;
    const grudgeScene = new Scene(engine);
    grudgeScene.clearColor = new Color4(0.12, 0.16, 0.25, 1);

    // Lighting
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), grudgeScene);
    hemi.intensity = 0.5;
    hemi.groundColor = new Color3(0.1, 0.1, 0.18);
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), grudgeScene);
    sun.intensity = 1.0;
    sun.position  = new Vector3(60, 120, 60);
    const shadows = new ShadowGenerator(2048, sun);
    shadows.useBlurExponentialShadowMap = true;

    // World geometry
    setLoadMsg('Building world...');
    SceneLoader.ImportMeshAsync('', '/assets/scenes/grudge-mobile/', 'scene.glb', grudgeScene)
      .then(r => { r.meshes.forEach(m => { m.receiveShadows = true; shadows.addShadowCaster(m); }); setNodeCount(r.meshes.length); })
      .catch(() => { buildPlaceholderScene(grudgeScene, shadows); setNodeCount(FACTION_CITIES.length * 3 + 21); });

    // Spawn Havok character
    setLoadMsg(`Spawning ${race} ${charClass}...`);
    spawnGrudgeCharacter(
      grudgeScene, canvas,
      { race: race as any, charClass: charClass as any, walkSpeed: 6, runSpeed: 13 },
      shadows,
    ).then(ctrl => {
      ctrlRef.current = ctrl;
      setLoading(false);
      setMode(ctrl.getMode());
      setWeapon(ctrl.getWeapon());
    }).catch(err => {
      console.error('[GrudgeScene] spawn error:', err);
      setLoadMsg('Failed to spawn character. Check console.');
    });

    // FPS counter
    engine.runRenderLoop(() => { setFps(Math.round(engine.getFps())); grudgeScene.render(); });
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
      grudgeScene.dispose();
      engine.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, charClass]);

  const handleEquip = (w: WeaponSlot) => {
    setWeapon(w);
    ctrlRef.current?.equip(w);
  };

  const handleModeToggle = () => {
    ctrlRef.current?.toggleMode();
    setMode(prev => prev === 'harvest' ? 'combat' : 'harvest');
  };

  return (
    <div className="relative w-full h-full bg-gray-950">
      <canvas ref={canvasRef} className="w-full h-full outline-none" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3 bg-gray-900 px-8 py-6 rounded-xl border border-gray-700">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
            <span className="text-sm text-gray-200">{loadMsg}</span>
            <span className="text-xs text-gray-500">Havok physics + {race} model</span>
          </div>
        </div>
      )}

      {/* Top-left: back + reset */}
      {!loading && (
        <div className="absolute top-3 left-3 flex gap-2">
          {onBack && (
            <Button size="sm" variant="outline" onClick={onBack} className="h-8">
              ← Back
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleModeToggle} className={`h-8 ${mode === 'combat' ? 'border-red-500 text-red-400' : 'border-green-600 text-green-400'}`}>
            {mode === 'combat' ? <Crosshair className="w-3.5 h-3.5 mr-1" /> : <Map className="w-3.5 h-3.5 mr-1" />}
            {mode === 'combat' ? 'Combat' : 'Harvest'}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => { ctrlRef.current?.playAction('harvest'); }}>
            ⛏ Harvest
          </Button>
        </div>
      )}

      {/* Top-right: stats */}
      <div className="absolute top-3 right-3 flex gap-2">
        {nodeCount > 0 && <Badge variant="outline" className="bg-black/60 text-xs"><Map className="w-3 h-3 mr-1" />{nodeCount} objs</Badge>}
        <Badge variant="outline" className="bg-black/60 text-xs font-mono">{fps} FPS</Badge>
        <Badge variant="outline" className="bg-black/60 text-xs capitalize" style={{ borderColor: '#d4af37' }}>{race}</Badge>
      </div>

      {/* Bottom weapon bar */}
      {!loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 border border-gray-700 rounded-full px-3 py-1.5">
          {availWeapons.map(w => (
            <button
              key={w}
              onClick={() => handleEquip(w)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                weapon === w
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title={w.replace(/_/g, ' ')}
            >
              {WEAPON_ICONS[w] ?? <Sword className="w-3 h-3" />}
              <span className="hidden sm:inline capitalize">{w.replace(/_/g, ' ')}</span>
            </button>
          ))}
          <span className="ml-2 text-gray-600 text-[10px] border-l border-gray-700 pl-2">Tab = {mode} mode</span>
        </div>
      )}
    </div>
  );
}
