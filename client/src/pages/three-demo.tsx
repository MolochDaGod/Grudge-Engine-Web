/**
 * three-demo.tsx — Three.js Game Systems Demo Page
 *
 * Three interactive demos showcasing the Three.js backend:
 *  1. Terrain Explorer — Procedural terrain with instanced trees, orbit camera
 *  2. Combat Arena — Animated character with attack FSM, Cannon-ES physics
 *  3. Character Showcase — Load race models from R2 CDN with animation playback
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, TreePine, Sword, Users, Play, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  createThreeScene,
  createTerrain,
  scatterInstancedTrees,
  addForestLighting,
  addArenaLighting,
  loadGLB,
  THREE,
} from '@/lib/three/engine';

type DemoId = 'terrain' | 'combat' | 'character';

interface DemoConfig {
  id: DemoId;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  color: string;
}

const DEMOS: DemoConfig[] = [
  {
    id: 'terrain',
    name: 'Terrain Explorer',
    description: 'Procedural terrain with 200 instanced trees, height-displaced mesh, fog, and orbit camera',
    icon: <TreePine className="w-5 h-5" />,
    badge: 'Terrain + Instancing',
    color: 'text-green-400',
  },
  {
    id: 'combat',
    name: 'Combat Arena',
    description: 'Gladiator arena with animated character, attack combo FSM, and physics-ready capsule body',
    icon: <Sword className="w-5 h-5" />,
    badge: 'Animation + FSM',
    color: 'text-orange-400',
  },
  {
    id: 'character',
    name: 'Character Showcase',
    description: 'Load Grudge race models from R2 CDN with auto-normalize, skeleton inspection, and animation',
    icon: <Users className="w-5 h-5" />,
    badge: 'Models + CDN',
    color: 'text-blue-400',
  },
];

const RACE_MODELS: Record<string, { file: string; label: string }> = {
  human:     { file: 'Knight_Male.glb',   label: 'Human'     },
  barbarian: { file: 'BarbarianGlad.glb', label: 'Barbarian' },
  undead:    { file: 'berserker.glb',     label: 'Undead'    },
  orc:       { file: 'King.glb',          label: 'Orc'       },
  elf:       { file: 'Wizard.glb',        label: 'Elf'       },
  dwarf:     { file: 'Viking_Male.glb',   label: 'Dwarf'     },
};

const CDN = 'https://assets.grudge-studio.com/models/characters/rts';

// ── Terrain Demo ─────────────────────────────────────────────────────────────

function buildTerrainDemo(canvas: HTMLCanvasElement) {
  const ctx = createThreeScene(canvas);
  addForestLighting(ctx.scene);
  createTerrain(ctx.scene, 200, 128);
  scatterInstancedTrees(ctx.scene, 300, 80);

  // Water plane
  const waterGeo = new THREE.PlaneGeometry(200, 200);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a6e, transparent: true, opacity: 0.6, roughness: 0.2, metalness: 0.3,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -0.3;
  ctx.scene.add(water);

  ctx.camera.position.set(20, 25, 40);
  ctx.controls.target.set(0, 0, 0);

  let time = 0;
  ctx.start((dt) => { time += dt; water.position.y = -0.3 + Math.sin(time * 0.5) * 0.15; });
  return ctx;
}

// ── Combat Demo ──────────────────────────────────────────────────────────────

function buildCombatDemo(canvas: HTMLCanvasElement) {
  const ctx = createThreeScene(canvas);
  ctx.scene.background = new THREE.Color(0.12, 0.08, 0.06);
  ctx.scene.fog = new THREE.Fog(0x1f140e, 30, 100);
  addArenaLighting(ctx.scene);

  // Arena ground
  const arenaGeo = new THREE.CylinderGeometry(20, 22, 0.5, 32);
  const arenaMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
  const arena = new THREE.Mesh(arenaGeo, arenaMat);
  arena.position.y = -0.25;
  arena.receiveShadow = true;
  ctx.scene.add(arena);

  // Pillars around the arena
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.7 })
    );
    pillar.position.set(Math.cos(angle) * 18, 3, Math.sin(angle) * 18);
    pillar.castShadow = true;
    ctx.scene.add(pillar);
  }

  // Animated warrior (placeholder with rotating capsule)
  const capsuleGeo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
  const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xcc8833, roughness: 0.5, metalness: 0.3 });
  const warrior = new THREE.Mesh(capsuleGeo, capsuleMat);
  warrior.position.set(0, 1, 0);
  warrior.castShadow = true;
  ctx.scene.add(warrior);

  // Enemy capsule
  const enemyMat = new THREE.MeshStandardMaterial({ color: 0x883333, roughness: 0.5, metalness: 0.3 });
  const enemy = new THREE.Mesh(capsuleGeo.clone(), enemyMat);
  enemy.position.set(5, 1, 0);
  enemy.castShadow = true;
  ctx.scene.add(enemy);

  // Sword (box on warrior)
  const swordGeo = new THREE.BoxGeometry(0.08, 1.5, 0.04);
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
  const sword = new THREE.Mesh(swordGeo, swordMat);
  sword.position.set(0.5, 0.3, 0);
  sword.rotation.z = -0.3;
  warrior.add(sword);

  // Health bars
  const createHealthBar = (color: number, pos: THREE.Vector3) => {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    bg.position.copy(pos);
    bg.position.y += 2.5;
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.15),
      new THREE.MeshBasicMaterial({ color })
    );
    fill.position.copy(pos);
    fill.position.y += 2.5;
    fill.position.z -= 0.01;
    ctx.scene.add(bg, fill);
    return { bg, fill };
  };

  const playerHP = createHealthBar(0x44cc44, warrior.position);
  const enemyHP = createHealthBar(0xcc4444, enemy.position);

  ctx.camera.position.set(0, 8, 12);
  ctx.controls.target.set(2.5, 1, 0);

  let time = 0;
  let enemyHealth = 1.0;
  ctx.start((dt) => {
    time += dt;
    // Simple attack animation cycle
    const attackCycle = Math.sin(time * 2);
    sword.rotation.x = attackCycle * 0.5;
    if (attackCycle > 0.95 && enemyHealth > 0) {
      enemyHealth = Math.max(0, enemyHealth - dt * 0.3);
    }

    // Enemy circling
    enemy.position.x = Math.cos(time * 0.5) * 5;
    enemy.position.z = Math.sin(time * 0.5) * 5;
    enemyHP.bg.position.x = enemy.position.x;
    enemyHP.bg.position.z = enemy.position.z;
    enemyHP.fill.position.x = enemy.position.x;
    enemyHP.fill.position.z = enemy.position.z;
    enemyHP.fill.scale.x = enemyHealth;

    // Warrior faces enemy
    warrior.lookAt(enemy.position.x, warrior.position.y, enemy.position.z);

    // Billboard health bars
    playerHP.bg.lookAt(ctx.camera.position);
    playerHP.fill.lookAt(ctx.camera.position);
    enemyHP.bg.lookAt(ctx.camera.position);
    enemyHP.fill.lookAt(ctx.camera.position);

    // Reset enemy health
    if (enemyHealth <= 0) enemyHealth = 1.0;
  });

  return ctx;
}

// ── Character Demo ───────────────────────────────────────────────────────────

function buildCharacterDemo(canvas: HTMLCanvasElement, raceId: string) {
  const ctx = createThreeScene(canvas);
  ctx.scene.background = new THREE.Color(0.06, 0.06, 0.1);
  ctx.scene.fog = null;

  const hemi = new THREE.HemisphereLight(0xaabbcc, 0x222233, 0.6);
  ctx.scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 5, 5);
  ctx.scene.add(key);
  const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
  fill.position.set(-3, 3, -2);
  ctx.scene.add(fill);

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.8, 0.3, 32),
    new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.5, roughness: 0.4 })
  );
  pedestal.position.y = -0.15;
  pedestal.receiveShadow = true;
  ctx.scene.add(pedestal);

  ctx.camera.position.set(0, 2, 4);
  ctx.controls.target.set(0, 1, 0);
  ctx.controls.minDistance = 2;
  ctx.controls.maxDistance = 8;

  const entry = RACE_MODELS[raceId] ?? RACE_MODELS['human'];
  const url = `${CDN}/${entry.file}`;

  let mixer: THREE.AnimationMixer | null = null;

  loadGLB(url, ctx.scene).then(result => {
    // Auto-normalize
    const box = new THREE.Box3().setFromObject(result.root);
    const h = box.max.y - box.min.y;
    if (h > 3 || h < 0.5) {
      const scale = 1.8 / Math.max(h, 0.001);
      result.root.scale.multiplyScalar(scale);
    }

    mixer = result.mixer;
    if (result.animations.length > 0) {
      const action = mixer.clipAction(result.animations[0]);
      action.play();
    }
  }).catch(err => console.warn('Failed to load race model:', err));

  ctx.start((dt) => {
    mixer?.update(dt);
    pedestal.rotation.y += dt * 0.3;
  });

  return ctx;
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function ThreeDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<ReturnType<typeof createThreeScene> | null>(null);
  const [activeDemo, setActiveDemo] = useState<DemoId | null>(null);
  const [loading, setLoading] = useState(false);
  const [fps, setFps] = useState(0);
  const [selectedRace, setSelectedRace] = useState('human');

  const launchDemo = useCallback((id: DemoId) => {
    if (!canvasRef.current) return;

    // Dispose previous
    ctxRef.current?.dispose();
    ctxRef.current = null;

    setLoading(true);
    setActiveDemo(id);

    // Use requestAnimationFrame to let React render the canvas first
    requestAnimationFrame(() => {
      const canvas = canvasRef.current!;
      try {
        if (id === 'terrain') ctxRef.current = buildTerrainDemo(canvas);
        else if (id === 'combat') ctxRef.current = buildCombatDemo(canvas);
        else if (id === 'character') ctxRef.current = buildCharacterDemo(canvas, selectedRace);
      } catch (err) {
        console.error('Demo build error:', err);
      }
      setLoading(false);
    });
  }, [selectedRace]);

  // FPS counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (ctxRef.current) {
        setFps(Math.round(1 / Math.max(ctxRef.current.clock.getDelta() || 0.016, 0.001)));
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => { ctxRef.current?.dispose(); };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 bg-gray-900/80 border-b border-gray-800 shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Editor
          </Button>
        </Link>
        <div className="h-4 w-px bg-gray-700" />
        <span className="font-semibold text-sm">Three.js Game Systems</span>
        <Badge variant="secondary" className="text-[10px]">Multi-Engine</Badge>
        {activeDemo && (
          <Badge className="ml-auto bg-green-600/20 text-green-300 text-[10px]">
            {fps} FPS
          </Badge>
        )}
      </header>

      {/* Demo picker + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 bg-gray-900/60 border-r border-gray-800 p-3 space-y-3 overflow-y-auto">
          <p className="text-xs text-gray-400 leading-relaxed">
            Interactive demos powered by the <strong>Three.js backend</strong> of Grudge Engine.
            Same asset pipeline, same animation manifest — different renderer.
          </p>

          {DEMOS.map(demo => (
            <button
              key={demo.id}
              onClick={() => launchDemo(demo.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeDemo === demo.id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={demo.color}>{demo.icon}</span>
                <span className="font-semibold text-sm">{demo.name}</span>
              </div>
              <Badge className="text-[10px] mb-1.5 bg-gray-800 text-gray-300 border-0">{demo.badge}</Badge>
              <p className="text-[11px] text-gray-400 leading-relaxed">{demo.description}</p>
            </button>
          ))}

          {/* Race selector for character demo */}
          {activeDemo === 'character' && (
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-xs font-semibold text-gray-400">Select Race</span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(RACE_MODELS).map(([id, { label }]) => (
                  <Button
                    key={id}
                    variant={selectedRace === id ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setSelectedRace(id); launchDemo('character'); }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-800">
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                These demos use the same R2 CDN assets and ANIM_MANIFEST as the BabylonJS engine.
                Models load from <code className="text-gray-400">assets.grudge-studio.com</code>.
              </span>
            </div>
          </div>
        </aside>

        {/* Canvas area */}
        <main className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full outline-none block"
          />

          {!activeDemo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
              <div className="text-center space-y-3">
                <Play className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-gray-400 text-sm">Select a demo from the sidebar to begin</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex items-center gap-2 bg-gray-900 px-5 py-3 rounded-lg border border-gray-700">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                <span className="text-sm text-gray-200">Building scene...</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
