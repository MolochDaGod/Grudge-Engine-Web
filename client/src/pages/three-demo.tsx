/**
 * three-demo.tsx — Three.js Game Systems Demo Page
 *
 * Three interactive demos showcasing the Three.js backend:
 *  1. Terrain Explorer — Procedural terrain with instanced trees, orbit camera
 *  2. Combat Arena — Animated character with attack FSM, Cannon-ES physics
 *  3. Character Showcase — Load race models from R2 CDN with animation playback
 *
 * CANONICAL for engine demos + controller wiring + Q&A training area.
 * THE GrudgeController (see CANONICAL_MAP.md "The Grudge Controller") is the single one used for all 3D in Grudge Studio.
 * Primary: grudgedot-launcher/client/src/lib/grudge-controller.ts
 * Uses only Grudge 6 race characters + 25-bone Meshy controller (no other groups' assets).
 */

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'; // useRef for cameraRef in optimal R3F camera system
import { grudgeSDK } from '@/lib/grudge-sdk';
import { normalizeMixamoBoneNames, retargetMixamoAnimation } from '@/lib/animation-manifest';

// Consume grudge_token / Grudge ID when launched from Hydra launcher or id.grudge (for GSC account sync)
// Matches pattern used in GCS Main.jsx, launcher, GrudgeWarlords etc.
(function consumeGrudgeAuthForTraining() {
  try {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    let token: string | null = null;
    let gid: string | null = null;

    const mHash = hash.match(/[?#&](?:grudge_token|token)=([^&]+)/i);
    const mSearch = search.match(/[?#&](?:grudge_token|token)=([^&]+)/i);
    token = (mHash && mHash[1]) || (mSearch && mSearch[1]) || null;

    // Also look for grudge_id
    const idHash = hash.match(/[?#&]grudge_id=([^&]+)/i);
    const idSearch = search.match(/[?#&]grudge_id=([^&]+)/i);
    gid = (idHash && idHash[1]) || (idSearch && idSearch[1]) || null;

    if (token) {
      localStorage.setItem('grudge_auth_token', decodeURIComponent(token));
      localStorage.setItem('grudge_token', decodeURIComponent(token));
    }
    if (gid) {
      localStorage.setItem('grudge_id', decodeURIComponent(gid));
    }
    if (token || gid) {
      // Clean url
      const clean = window.location.pathname + window.location.search.replace(/([?#&])(grudge_token|token|grudge_id)=[^&]*/g, '$1').replace(/[?#&]$/, '');
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, clean || '/');
      }
    }
  } catch {}
})();
import { Link, useSearch } from 'wouter';
import { ArrowLeft, TreePine, Sword, Users, Play, Loader2, Info, Sword as SwordIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, useAnimations, CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { GrudgeController, SimpleNpcAI, HAND_SITUATION_OFFSETS } from '@/lib/character-animation-controller';
// Note: for full game flow use launcher version of GrudgeController which has bullets + deterministic hits.
import { WEAPON_ANIM_MAP, BASE_LOCOMOTION, EXTRA_ANIM_PATHS, WeaponSlot, LocomotionState } from '@/lib/animation-manifest';
import * as THREE from 'three';
import { useEngineStore } from '@/lib/engine-store';

// Configure Draco for all useGLTF calls (critical for grudge6 compressed models)
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  createThreeScene,
  createTerrain,
  scatterInstancedTrees,
  addForestLighting,
  addArenaLighting,
  loadGLB,
} from '@/lib/three/engine';

// Global Draco for R3F / drei (correct meshes load fast)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
if (typeof (window as any).DRACO_LOADER === 'undefined') {
  (window as any).DRACO_LOADER = dracoLoader;
}

// Note: drei/useGLTF will use the decoder path set above for any Draco-compressed grudge6 GLBs.

// Real Grudge character UI types (from One Truth / grudge-characters)
import {
  GRUDGE_RACES,
  GRUDGE_CLASSES,
  type RaceId,
  type ClassId,
} from '@/lib/grudge-characters';

// Grudge 6 source for real characters (mesh armours + weapons) — used by training and GSC save.
const GRUDGE6_BASE = 'https://grudge6.grudge-studio.com/models/characters/';
const LOCAL_BASE = '/assets/characters/races/';  // local fallback
const CDN = 'https://assets.grudge-studio.com/models/characters/rts';

type DemoId = 'terrain' | 'combat' | 'character' | 'training'; // 'training' is special for ?mode=training / grudge6 R3F view

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
    id: 'training',
    name: 'Training (Grudge6)',
    description: 'Real Grudge6 character with correct meshes + full character UI (R3F + Draco)',
    icon: <Users className="w-5 h-5" />,
    badge: 'R3F + Real UI',
    color: 'text-purple-400',
  },
];

const RACE_MODELS: Record<string, { file: string; label: string; grudge6?: boolean; basePath?: string }> = {
  // Characters from grudge6.grudge-studio.com for real Grudge6 models (mesh armours + weapons).
  human:     { file: 'human.glb',     label: 'Human (Grudge6)',     grudge6: true, basePath: GRUDGE6_BASE },
  barbarian: { file: 'barbarian.glb', label: 'Barbarian (Grudge6)', grudge6: true, basePath: GRUDGE6_BASE },
  undead:    { file: 'undead.glb',    label: 'Undead (Grudge6)',    grudge6: true, basePath: GRUDGE6_BASE },
  orc:       { file: 'orc.glb',       label: 'Orc (Grudge6)',       grudge6: true, basePath: GRUDGE6_BASE },
  elf:       { file: 'elf.glb',       label: 'Elf (Grudge6)',       grudge6: true, basePath: GRUDGE6_BASE },
  dwarf:     { file: 'dwarf.glb',     label: 'Dwarf (Grudge6)',     grudge6: true, basePath: GRUDGE6_BASE },
  // grudge6 alias
  grudge6:   { file: 'barbarian.glb', label: 'Grudge6 (correct meshes)', grudge6: true, basePath: GRUDGE6_BASE },
};

// (GRUDGE6_BASE / LOCAL_BASE declared earlier for RACE_MODELS)

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

// ── R3F Grudge Character (real meshes + Draco) ───────────────────────────────
function GrudgeCharacterModel({ modelPath, scale = 1.8, onLoaded }: { modelPath: string; scale?: number; onLoaded?: (scene: THREE.Group) => void }) {
  const gltf = useGLTF(modelPath, true);
  const { scene, animations = [] } = gltf || {};
  const { actions: baseActions } = useAnimations(animations, scene);

  // Wire extra animations from manifest (all deterministic actions)
  // These get merged so setState can use attack_axe, harvest, cast, etc.
  const extraGltfs = Object.values(EXTRA_ANIM_PATHS).map(path => {
    try {
      return useGLTF(path, true);
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (!scene) return;

    scene.scale.setScalar(scale);

    // Use the central asset bridge for skeleton/anim sharing, feet root, grips, Mixamo retarget
    const processed = postProcessGrudgeRaceModel(scene, animations, scale);

    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const n = child.name.toLowerCase();
        // Map to UI slot names for "correct meshes" support on grudge6 exports
        if (n.match(/head|helmet|hair|face/)) child.userData.slot = 'head';
        if (n.match(/chest|torso|body_upper|cuirass|shirt/)) child.userData.slot = 'chest';
        if (n.match(/leg|pants|body_lower|skirt|greave/)) child.userData.slot = 'legs';
        if (n.match(/shoulder|pauldron/)) child.userData.slot = 'shoulders';
        if (n.match(/weapon|sword|axe|staff|bow|dagger|mace/)) child.userData.slot = 'mainHand';
        if (n.match(/shield|offhand|off_hand/)) child.userData.slot = 'offHand';
      }
    });

    // Hand bone setup (now also done in postProcess, but keep for compat)
    setupHandBoneAttachments(scene, scale);

    // Wire full manifest animations using postProcess bridge (skeleton sharing, Mixamo retarget, normalized for guns/weapons)
    const mixer = new THREE.AnimationMixer(scene);
    const actionsMap: Record<string, THREE.AnimationAction> = {};

    // Prefer processed.normalizedAnimations for sharing across rigs
    const animsToUse = processed.normalizedAnimations.length > 0 ? processed.normalizedAnimations : (animations || []);
    animsToUse.forEach((clip: any) => {
      actionsMap[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    // Merge extras (retarget handled in manifest utils / postProcess)
    extraGltfs.forEach(extraGltf => {
      if (extraGltf?.animations?.length) {
        extraGltf.animations.forEach((clip: any) => {
          const key = clip.name.toLowerCase();
          if (!actionsMap[key]) actionsMap[key] = mixer.clipAction(clip);
        });
      }
    });

    // Full manifest population (incl. gun aim/shoot)
    const allNames = new Set<string>();
    Object.values(WEAPON_ANIM_MAP).forEach(m => Object.values(m).forEach(n => n && allNames.add(n)));
    Object.values(BASE_LOCOMOTION).forEach(n => n && allNames.add(n));
    Object.values(EXTRA_ANIM_PATHS).forEach(p => {
      const bn = p.split('/').pop()?.replace('.glb','').toLowerCase() || '';
      allNames.add(bn);
    });
    allNames.forEach(name => {
      const clip = animsToUse.find((c: any) => c.name.toLowerCase() === name || c.name.toLowerCase().includes(name));
      if (clip && !actionsMap[name]) actionsMap[name] = mixer.clipAction(clip);
    });

    const ctrl = new GrudgeController(scene, mixer, actionsMap, 'unarmed' as any);
    (scene as any).userData.grudgeController = ctrl;  // canonical name
    (scene as any).userData.controller = ctrl;

    onLoaded?.(scene);

    // Auto-play first (idle)
    if (actionsMap['idle']) actionsMap['idle'].reset().play();
    else if (Object.keys(actionsMap).length) Object.values(actionsMap)[0].reset().play();
  }, [scene, scale, animations, onLoaded, actions]);

  if (!scene) return null;
  return <primitive object={scene} />;
}

// Helper to get model URL - characters from grudge6.grudge-studio.com .
// Falls back to local races bases.
function getCharacterUrl(raceId: string) {
  const entry = RACE_MODELS[raceId] ?? RACE_MODELS['grudge6'] ?? RACE_MODELS['barbarian'];
  if (entry.basePath && entry.basePath.startsWith('http')) {
    return `${entry.basePath}${entry.file}`;
  }
  if (entry.basePath) {
    return `${entry.basePath}${entry.file}`;
  }
  // local fallback
  return `${LOCAL_BASE}${raceId}/${raceId}-base.glb`;
}

// Q&A AI NPCs Opening Character Area - large stage model provided by user
// Copy your D:\Games\Models\propuesta_cot-1634_25.12mts_x_8_mts.glb to:
// D:\GitHub\Grudge-Engine-Web\public\assets\environments\qa-stage.glb
// (or update the path below)
// One of each race positioned on the stage for training hand bone attachments in Q&A situations.
const QA_STAGE_PATH = '/assets/environments/qa-stage.glb';

// Separate component so useGLTF is at top level (R3F rules)
function QaStage() {
  const gltf = useGLTF(QA_STAGE_PATH, true);
  const { scene } = gltf || {};
  useEffect(() => {
    if (scene) {
      scene.scale.setScalar(1);
      scene.position.set(0, 0, 0);
      scene.traverse((c: any) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
    }
  }, [scene]);
  if (!scene) {
    // Fallback platform matching approx 25x8m size
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[26, 10]} />
        <meshStandardMaterial color="#2a2f3e" />
      </mesh>
    );
  }
  return <primitive object={scene} />;
}

// Best practice hand bone attachment setup for different situations/animations
// Call after model load. Supports Q&A (talk/gesture), combat, idle etc.
// Uses intermediate Object3D grips parented to bones so attachments follow animations perfectly.
// Adjust offsets per model/race/animation for perfect grip (test in T-pose then animations).
function setupHandBoneAttachments(scene: THREE.Group, scale = 1) {
  const grips: Record<string, THREE.Object3D> = {};

  scene.traverse((obj: any) => {
    if (obj.isBone) {
      const n = obj.name.toLowerCase().replace(/mixamorig:|_| /g, '');
      // Optimized for 25-bone Meshy skeletons (no fingers).
      // Looks for terminal hand bones: LeftHand, RightHand, etc.
      if ((n.includes('left') || n.startsWith('l')) && (n.includes('hand') || n.includes('wrist'))) {
        if (!grips.left) {
          const grip = new THREE.Object3D();
          grip.name = 'leftHandGrip';
          // Best practice: small forward offset from the hand bone for natural weapon grip.
          // These are tuned for Meshy exports + your animations. Test per weapon type.
          grip.position.set(0, 0.015 * scale, 0.07 * scale);
          grip.rotation.set(-0.25, 0.05, 0);
          obj.add(grip);
          grips.left = grip;
        }
      }
      if ((n.includes('right') || n.startsWith('r')) && (n.includes('hand') || n.includes('wrist'))) {
        if (!grips.right) {
          const grip = new THREE.Object3D();
          grip.name = 'rightHandGrip';
          grip.position.set(0, 0.015 * scale, 0.07 * scale);
          grip.rotation.set(-0.25, -0.05, 0);
          obj.add(grip);
          grips.right = grip;
        }
      }
    }
  });

  // Store for later use (e.g. attach weapon/item based on current animation/situation)
  (scene as any).userData.handGrips = grips;

  // Helper exposed on scene for AI/training code to attach in different situations
  (scene as any).attachToHand = (item: THREE.Group, hand: 'left'|'right' = 'right', customOffset?: {pos?: [number,number,number], rot?: [number,number,number]}) => {
    const grip = grips[hand];
    if (grip) {
      if (customOffset?.pos) item.position.set(...customOffset.pos);
      if (customOffset?.rot) item.rotation.set(...customOffset.rot);
      grip.add(item);
      item.userData.attachedHand = hand;
    } else {
      // Fallback: add to scene root (will not follow animation well)
      scene.add(item);
      console.warn('No hand bone grip found for', hand, ' - using root fallback. Fix rig/names in GLB.');
    }
  };

  return grips;
}

// Example configs for different Q&A / animation situations (use with attachToHand or switch grips)
export const HAND_SITUATION_OFFSETS = {
  qaIdleTalk: {
    left: { pos: [0, 0.01, 0.06], rot: [-0.2, 0.1, 0] }, // relaxed open for gesturing
    right: { pos: [0, 0.01, 0.06], rot: [-0.2, -0.1, 0] }
  },
  qaAnswer: {
    left: { pos: [0.01, 0.02, 0.05], rot: [0, 0, 0] }, // holding "notes" or mic
    right: { pos: [0, 0.02, 0.07], rot: [-0.4, 0, 0] }
  },
  combatGrip: {
    left: { pos: [0, 0, 0.09], rot: [0, 0, 0] },
    right: { pos: [0, 0, 0.09], rot: [0, 0, 0] }
  },
  // Add more per animation needed positions
};

// ── Training Mode Character UI (real Grudge6 + equipment) ─────────────────────
function TrainingCharacterUI({ 
  race, onRaceChange, 
  charClass, onClassChange,
  equipment, onEquip 
}: any) {
  // Pull real data
  const raceInfo = GRUDGE_RACES[race as RaceId] || GRUDGE_RACES.human;
  const classInfo = GRUDGE_CLASSES[charClass as ClassId] || GRUDGE_CLASSES.warrior;

  // Simple stat preview (in real system this would come from character-stats + equipment bonuses)
  const baseStats = {
    str: 12, dex: 10, con: 11, int: 9, wis: 8, cha: 10
  };

  // Save real character to GSC / user account (Grudge ID primary).
  // Characters persist in user accounts at GSC (Grudge Character Studio).
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const saveToGSC = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_token') || localStorage.getItem('access_token');
      const gId = localStorage.getItem('grudge_id') || grudgeSDK.currentIdentity?.grudgeId;

      if (!gId && !token) {
        setSaveMsg('Login with Grudge ID (via launcher SSO or id.grudge-studio.com) first');
        setSaving(false);
        return;
      }

      const charName = `${(raceInfo?.name || race).toUpperCase()} ${classInfo.name}`;

      // Use the shared SDK create (same as GSC grudgeAPI) so the character appears in the user's GSC account.
      // model3d carries the grudge6 URL (from grudge6.grudge-studio.com) + equipment so GSC/games see the real mesh-armour character.
      const created = await grudgeSDK.createCharacter({
        name: charName,
        raceId: race,
        classId: charClass,
        model3d: {
          equippedMeshes: Object.fromEntries(
            Object.entries(equipment).filter(([, v]) => v).map(([k]) => [k, true])
          ),
          weaponSlots: {},
          sourceUrl: getCharacterUrl(race),  // real Grudge 6 from grudge6.grudge-studio.com
          grudge6: true,
        },
        source: 'training-three-port',
      });

      setSaveMsg(`Saved "${charName}" to GSC account ✓ ID: ${created?.id || created?.uuid || 'linked to Grudge ID'}`);
      try {
        localStorage.setItem('last_saved_character_id', created?.id || '');
      } catch {}
    } catch (e: any) {
      setSaveMsg('Save error: ' + (e?.message || 'check token/network'));
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 5000);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-900/80 rounded-lg border border-gray-800 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-amber-400">GRUDGE6 CHARACTER</div>
          <div className="text-xs text-gray-500">Correct meshes • R3F + Draco</div>
        </div>
        <Badge className="bg-purple-600/20 text-purple-300 border-purple-700">Training</Badge>
      </div>

      {/* Race */}
      <div>
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">Race</div>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(RACE_MODELS).map(([id, info]) => (
            <button
              key={id}
              onClick={() => onRaceChange(id)}
              className={`text-xs py-1.5 rounded border ${race === id ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-gray-700 hover:bg-gray-800'}`}
            >
              {info.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">{raceInfo?.description || ''}</div>
      </div>

      {/* Class */}
      <div>
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">Class</div>
        <div className="flex flex-wrap gap-1">
          {Object.keys(GRUDGE_CLASSES).map((c: any) => {
            const cls = GRUDGE_CLASSES[c as ClassId];
            return (
              <button
                key={c}
                onClick={() => onClassChange(c)}
                className={`text-xs px-2 py-1 rounded border ${charClass === c ? 'border-amber-400 bg-amber-500/10' : 'border-gray-700 hover:bg-gray-800'}`}
              >
                {cls.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment - correct meshes */}
      <div>
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">Equipment (toggle meshes)</div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {['mainHand', 'offHand', 'head', 'chest', 'legs', 'shoulders'].map((slot) => (
            <button
              key={slot}
              onClick={() => onEquip(slot)}
              className={`px-2 py-1 rounded border flex items-center justify-between ${equipment[slot] ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300' : 'border-gray-700'}`}
            >
              <span>{slot}</span>
              <span>{equipment[slot] ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          Your grudge6 GLB must export equipment as separate meshes (e.g. "armor_chest", "weapon_1h_sword") for this to work perfectly.
        </div>
      </div>

      {/* Stats preview */}
      <div className="pt-2 border-t border-gray-800">
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Stats (preview)</div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs font-mono">
          {Object.entries(baseStats).map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span>{v}</span></div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-emerald-400/70">R3F + drei + Draco • No Babylon</div>

      {/* Save to GSC / user account - real characters go into GSC accounts */}
      <div className="pt-3 border-t border-gray-800">
        <button
          onClick={saveToGSC}
          disabled={saving}
          className="w-full text-xs py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Character to GSC Account'}
        </button>
        {saveMsg && <div className="text-[10px] text-center mt-1 text-emerald-400">{saveMsg}</div>}
        <div className="text-[10px] text-gray-500 mt-1 text-center">Persists to your Grudge ID in GSC</div>
      </div>
    </div>
  );
}

// R3F Training Scene – uses central ONE SOURCE OF TRUTH from engine-store for camera/controller/editing
function TrainingScene({ raceId, equipment, currentWeapon: propWeapon = 'sword' }: { raceId: string; equipment: Record<string, boolean>; currentWeapon?: string }) {
  const url = getCharacterUrl(raceId);
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const [mainController, setMainController] = useState<GrudgeController | null>(null);

  // Local canonical weapon + skill state (TrainingScene owns the runtime per map)
  const [localWeapon, setLocalWeapon] = useState<'sword'|'axe'|'staff'|'bow'|'dagger'|'unarmed'>(propWeapon as any || 'sword');
  const [localLog, setLocalLog] = useState('');
  const localPressed = useRef<Set<string>>(new Set());

  const T0 = {
    sword:{1:'Slash',2:'Power Strike',3:'Sidestep',4:'Cleave',5:'Blade Storm'},
    axe:{1:'Cleave',2:'Crushing Blow',3:'Savage Leap',4:'Rampage',5:'Annihilation'},
    staff:{1:'Fireball',2:'Lightning',3:'Blink',4:'Shield',5:'Armageddon'},
    bow:{1:'Quick Shot',2:'Poison',3:'Evasive Roll',4:'Trap',5:'Sniper'},
    dagger:{1:'Backstab',2:'Throw Knife',3:'Shadow Step',4:'Envenom',5:'Death Mark'},
    default:{1:'Attack',2:'Skill',3:'Maneuver',4:'Heavy',5:'Unique'}
  } as const;

  // Self-contained hotkeys + directional dodge inside the canonical training scene
  useEffect(() => {
    if (!mainController) return;
    const down = (e: KeyboardEvent) => {
      localPressed.current.add(e.code);
      const k = e.key.toLowerCase();

      if (k==='q'||k==='e') {
        const ord = ['sword','axe','staff','bow','dagger','unarmed'] as const;
        let i = ord.indexOf(localWeapon); i = (i + (k==='e'?1:-1) + ord.length)%ord.length;
        const nw = ord[i]; setLocalWeapon(nw); mainController.setWeapon(nw as any);
        setLocalLog('WEAPON ' + nw); return;
      }
      const s = (k==='1'?1:k==='2'?2:k==='3'?3:k==='4'?4:k==='5'?5:null) as 1|2|3|4|5|null;
      if (s) {
        e.preventDefault();
        const lbls = T0[localWeapon] || T0.default;
        const nm = lbls[s];
        const r = mainController.performSkill(s, localWeapon as any);
        setLocalLog(`${localWeapon} ${s}: ${nm}`);
        if (s===3) {
          let d:any='backward'; if(localPressed.current.has('KeyW'))d='forward'; if(localPressed.current.has('KeyA'))d='left';if(localPressed.current.has('KeyD'))d='right';
          mainController.dodge(d);
        }
      }
      if (e.code==='Space' || k==='x' || e.key==='Shift') {
        e.preventDefault();
        let d:any='backward'; if(localPressed.current.has('KeyW'))d='forward'; if(localPressed.current.has('KeyA'))d='left';if(localPressed.current.has('KeyD'))d='right';
        mainController.dodge(d); setLocalLog('DODGE '+d);
      }
    };
    const up = (e:KeyboardEvent)=> localPressed.current.delete(e.code);
    window.addEventListener('keydown', down, {capture:true});
    window.addEventListener('keyup', up);
    return ()=>{ window.removeEventListener('keydown',down,{capture:true}); window.removeEventListener('keyup',up); };
  }, [mainController, localWeapon]);

  // keep in sync with prop if parent drives
  useEffect(() => { if (propWeapon && propWeapon !== localWeapon) setLocalWeapon(propWeapon as any); }, [propWeapon]);

  // Local locomotion + controller update (inside canonical training scene)
  useFrame((_, delta) => {
    if (mainController) {
      const gunAim = mainController.getWeapon && mainController.getWeapon() === 'gun' ? 
        new THREE.Vector3(0, 1.5, -4) : undefined;
      mainController.update(delta, undefined, gunAim); // gun IK + asset bridges for sharing
      const w = localPressed.current.has('KeyW');
      const s = localPressed.current.has('KeyS');
      const aOrD = localPressed.current.has('KeyA') || localPressed.current.has('KeyD');
      if (w || s || aOrD) {
        const sprint = localPressed.current.has('ShiftLeft') || localPressed.current.has('ShiftRight');
        mainController.setState(sprint ? 'run' : 'walk', 0.12);
      } else {
        const st = mainController.getState?.();
        if (st === 'walk' || st === 'run') mainController.setState('idle', 0.18);
      }
    }
  });

  // Demo: drive the controller with simple deterministic AI for Q&A feel (low cost)
  useEffect(() => {
    if (!mainController) return;
    const interval = setInterval(() => {
      const states: any[] = ['idle', 'talk', 'answer', 'gesture'];
      const next = states[Math.floor(Math.random() * states.length)];
      mainController.setState(next);
    }, 4500);
    return () => clearInterval(interval);
  }, [mainController]);

  // Wire equipment + currentWeapon (canonical) to controller + grips
  useEffect(() => {
    if (!mainController) return;
    if (equipment.mainHand) {
      const weapon = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
      );
      box.position.z = 0.3;
      weapon.add(box);
      mainController.equip(weapon, 'right', currentWeapon as any);
    } else {
      mainController.unequip('right');
      mainController.setWeapon('unarmed');
    }
  }, [equipment.mainHand, currentWeapon, mainController]);

  // === CANONICAL HOTKEY + SKILL SYSTEM (per CANONICAL_MAP.md) ===
  // T0 weapons: 1=main attack, 2=first skill, 3=maneuver/trap/teleport, 4=heavy/combo, 5=unique
  // Definitions: grudgedot-launcher/shared/wcs/definitions/weaponSkills.ts (Working in the Right Places)
  // Controller: THE GrudgeController (Grudge-Engine-Web client/src/lib/...) — use this everywhere for 3D games
  const T0_SKILL_LABELS: Record<string, Record<1|2|3|4|5, string>> = {
    sword:   {1:'Slash', 2:'Power Strike', 3:'Sidestep / Tele', 4:'Overhead Cleave', 5:'Blade Storm'},
    axe:     {1:'Cleave', 2:'Crushing Blow', 3:'Savage Leap', 4:'Rampage', 5:'Annihilation'},
    staff:   {1:'Fireball', 2:'Lightning Bolt', 3:'Blink', 4:'Arcane Shield', 5:'Armageddon'},
    bow:     {1:'Quick Shot', 2:'Poison Arrow', 3:'Evasive Roll', 4:'Hunter Trap', 5:'Sniper Shot'},
    dagger:  {1:'Backstab', 2:'Throwing Knife', 3:'Shadow Step', 4:'Envenom', 5:'Death Mark'},
    unarmed: {1:'Punch', 2:'Kick', 3:'Roll', 4:'Heavy Strike', 5:'Taunt'},
    default: {1:'Attack', 2:'Skill', 3:'Maneuver', 4:'Heavy', 5:'Unique'},
  };

  // (states hoisted to top of ThreeDemoPage for correct hook order)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mainController) return;
      const k = e.key.toLowerCase();
      pressedKeys.current.add(e.code);

      // Quick weapon cycle (Q/E) — stays deterministic per map
      if (k === 'q' || k === 'e') {
        e.preventDefault();
        const order = ['sword','axe','staff','bow','dagger','unarmed'] as const;
        let idx = order.indexOf(currentWeapon as any);
        idx = (idx + (k === 'e' ? 1 : -1) + order.length) % order.length;
        const nextW = order[idx];
        setCurrentWeapon(nextW);
        mainController.setWeapon(nextW as any);
        setLastSkillLog(`WEAPON → ${nextW}`);
        return;
      }

      let slot: 1 | 2 | 3 | 4 | 5 | null = null;
      if (k === '1') slot=1; if (k==='2') slot=2; if (k==='3') slot=3; if (k==='4') slot=4; if (k==='5') slot=5;

      if (slot != null) {
        e.preventDefault();
        const labels = T0_SKILL_LABELS[currentWeapon] || T0_SKILL_LABELS.default;
        const skillName = labels[slot];
        const res = mainController.performSkill(slot, currentWeapon as any);

        const msg = `${currentWeapon.toUpperCase()} [${slot}] ${skillName}`;
        setLastSkillLog(msg);
        console.log('[CANONICAL]', msg, res);

        if (slot === 3) {
          // directional dodge using pressed keys
          let dir: any = 'backward';
          if (pressedKeys.current.has('KeyW')) dir='forward';
          if (pressedKeys.current.has('KeyS')) dir='backward';
          if (pressedKeys.current.has('KeyA')) dir='left';
          if (pressedKeys.current.has('KeyD')) dir='right';
          mainController.dodge(dir);
        }
      }

      // Dodge (Space / X / Shift) — respects movement keys for direction (best UX from reference)
      if (e.code === 'Space' || k === 'x' || e.key === 'Shift') {
        e.preventDefault();
        let dir: any = 'backward';
        if (pressedKeys.current.has('KeyW')) dir = 'forward';
        if (pressedKeys.current.has('KeyS')) dir = 'backward';
        if (pressedKeys.current.has('KeyA')) dir = 'left';
        if (pressedKeys.current.has('KeyD')) dir = 'right';
        const d = mainController.dodge(dir);
        setLastSkillLog(`DODGE ${dir}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.code);

    window.addEventListener('keydown', handleKeyDown, {capture: true});
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, {capture: true});
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mainController, currentWeapon]);

  // Consume THE single source of truth (engine-store) for all camera/controller/editing settings.
  // These are inherent "terms and services" – defined/used only once across any project use (training, editor, grudge scenes).
  const { cameraSettings, controllerSettings, editingSettings } = useEngineStore();

  // Simple equipment visibility (works if your grudge6 GLB has named meshes for "correct meshes")
  useEffect(() => {
    if (!modelScene) return;
    modelScene.traverse((child: any) => {
      if (child.isMesh && child.userData.slot) {
        const slot = child.userData.slot;
        const key = slot === 'weapon' ? 'mainHand' : slot;
        child.visible = equipment[key] !== false;
      }
    });
  }, [modelScene, equipment]);

  // Optimal R3F camera driven by central cameraSettings (one source)
  // Supports orbit (default), follow, etc. – clear system, reusable across projects
  const cameraRef = useRef<any>(null);

  // Update controller (and thus all wired animations) every frame - zero heavy cost
  useFrame((_, delta) => {
    if (mainController) {
      const gunAim = mainController.getWeapon && mainController.getWeapon() === 'gun' ? 
        new THREE.Vector3(0, 1.5, -4) : undefined;
      mainController.update(delta, undefined, gunAim); // gun IK + asset bridges for sharing

      // Basic locomotion states driven by keys (cheap deterministic, follows controller + map)
      const hasW = pressedKeys.current.has('KeyW');
      const hasS = pressedKeys.current.has('KeyS');
      const hasA = pressedKeys.current.has('KeyA') || pressedKeys.current.has('KeyD');
      if (hasW || hasS || hasA) {
        const movingFast = pressedKeys.current.has('ShiftLeft') || pressedKeys.current.has('ShiftRight');
        mainController.setState(movingFast ? 'run' : 'walk', 0.15);
      } else if (mainController.getState() === 'walk' || mainController.getState() === 'run') {
        mainController.setState('idle', 0.2);
      }
    }
  });

  // Demo: for the Q&A AI NPCs on the stage, attach example "items" to hand grips using best practice configs
  // In real AI training, the NPCs (or your agent code) call scene.attachToHand(loadedItem, 'right', HAND_SITUATION_OFFSETS.qaIdleTalk.right)
  // for different situations (talking, answering, gesturing) and animation poses.
  useEffect(() => {
    if (!modelScene) return;
    // Example debug attach: small box as "mic" or "prop" on right hand in qa position
    // Remove in production; shows the system works for all races loaded above.
    const rightGrip = (modelScene as any).userData?.handGrips?.right;
    if (rightGrip && !rightGrip.children.some((c: any) => c.name === 'qaDemoProp')) {
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: 0x4444ff }));
      prop.name = 'qaDemoProp';
      rightGrip.add(prop);
      // Apply a situation offset
      const off = HAND_SITUATION_OFFSETS.qaAnswer.right;
      if (off.pos) prop.position.set(...off.pos);
      if (off.rot) prop.rotation.set(...off.rot);
    }
  }, [modelScene]);

  useEffect(() => {
    // Example: react to central settings changes (e.g. from editing panel or controller)
    if (cameraRef.current && cameraSettings.mode === 'orbit') {
      // Could lerp or switch controls here
    }
  }, [cameraSettings]);

  return (
    <Canvas
      camera={{ 
        position: [0, 2.2, 5.5], 
        fov: cameraSettings.fov || 48,
        near: cameraSettings.near || 0.1,
        far: cameraSettings.far || 1000,
      }}
      style={{ background: '#0a0c14' }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      shadows
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-4, 5, -3]} intensity={0.35} />

      {/* Q&A AI NPCs Opening Character Area stage - user provided large platform (25.12m x 8m) */}
      {/* ACTION: copy \\?\D:\Games\Models\propuesta_cot-1634_25.12mts_x_8_mts.glb to D:\GitHub\Grudge-Engine-Web\public\assets\environments\qa-stage.glb */}
      {/* This is the "opening character area" for the Q&A AI NPCs (one per race). */}
      <Suspense fallback={null}>
        <QaStage />
      </Suspense>

      {/* Main controlled character */}
      <Suspense fallback={<Html center className="text-xs text-gray-400">Loading Grudge6 character (Draco)...</Html>}>
        <GrudgeCharacterModel
          modelPath={url}
          scale={1.75}
          onLoaded={(s) => {
            setModelScene(s);
            // Controller is now created inside GrudgeCharacterModel with full manifest wiring
            // Access via (s as any).userData.controller if needed for parent
            // For demo, the useEffect below sets mainController from the main load
            if (s?.userData?.grudgeController || s?.userData?.controller) {
              setMainController(s.userData.grudgeController || s.userData.controller);
            }
          }}
        />
      </Suspense>

      {/* Q&A AI NPCs: one of each race positioned on the stage for hand bone training */}
      {/* These are "trained" with the hand attachment setup above for different Q&A situations/animations */}
      {Object.keys(RACE_MODELS).filter(r => r !== raceId).map((r, idx) => {
        const rUrl = getCharacterUrl(r);
        const xPos = (idx - 2.5) * 4.5; // spread across the 25m stage
        return (
          <group key={r} position={[xPos, 0.1, 4 - (idx % 2) * 1.5]}>
            <GrudgeCharacterModel modelPath={rUrl} scale={1.5} />
          </group>
        );
      })}

      {/* Optimal camera using central settings + drei CameraControls for clear system */}
      <CameraControls 
        ref={cameraRef}
        minDistance={cameraSettings.orbitMinDistance || 1.8} 
        maxDistance={cameraSettings.orbitMaxDistance || 9} 
        // Follow logic could react to cameraSettings.targetObjectId + controllerSettings
        // One place for all camera "terms"
      />

      {/* Optimal Controller: controllerSettings from the ONE source drives movement.
          In full R3F: <GrudgeR3FController settings={controllerSettings} /> using drei + Rapier.
          Inherent service, only one setup. */}
    </Canvas>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function ThreeDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<ReturnType<typeof createThreeScene> | null>(null);
  const [activeDemo, setActiveDemo] = useState<DemoId | null>(null);
  const [loading, setLoading] = useState(false);
  const [fps, setFps] = useState(0);
  const [selectedRace, setSelectedRace] = useState<string>('grudge6');
  const [selectedClass, setSelectedClass] = useState<string>('warrior');
  const [equipment, setEquipment] = useState<Record<string, boolean>>({ 
    mainHand: true, offHand: false, head: true, chest: true, legs: true, shoulders: false 
  });

  // Canonical current weapon for T0 skills (1-5) - drives controller + HUD
  const [currentWeapon, setCurrentWeapon] = useState<'sword'|'axe'|'staff'|'bow'|'dagger'|'unarmed'>('sword');
  const [lastSkillLog, setLastSkillLog] = useState<string>('');

  // Movement keys ref (for directional dodge relative to input, like reference controller)
  const pressedKeys = useRef<Set<string>>(new Set());

  const search = useSearch();
  const params = new URLSearchParams(search || '');
  const urlMode = params.get('mode');
  const isTrainingMode = urlMode === 'training' || activeDemo === 'training';

  // Support ?mode=training directly — loads the real characters UI + grudge6 model with correct meshes
  useEffect(() => {
    if (isTrainingMode && activeDemo !== 'training') {
      setActiveDemo('training');
      setSelectedRace('grudge6');
    }
  }, [urlMode, isTrainingMode]);

  const toggleEquip = (slot: string) => {
    setEquipment(prev => ({ ...prev, [slot]: !prev[slot] }));
  };

  // Example: sync local UI to central editing/controller settings (one source of truth)
  // In real use, TrainingCharacterUI would read from useEngineStore().editingSettings etc.
  const { setCameraSettings, setControllerSettings, setEditingSettings } = useEngineStore();

  const launchDemo = useCallback((id: DemoId) => {
    if (!canvasRef.current && id !== 'training') return;

    ctxRef.current?.dispose();
    ctxRef.current = null;

    setLoading(true);
    setActiveDemo(id);

    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      try {
        if (id === 'terrain' && canvas) ctxRef.current = buildTerrainDemo(canvas);
        else if (id === 'combat' && canvas) ctxRef.current = buildCombatDemo(canvas);
        else if (id === 'training') {
          // R3F training handles its own canvas
        }
      } catch (err) {
        console.error('Demo build error:', err);
      }
      setLoading(false);
    });
  }, []);

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

  // Special full-screen training mode for grudge-three-port/?mode=training
  if (isTrainingMode) {
    return (
      <div className="w-screen h-screen flex flex-col bg-gray-950 text-white">
        <header className="flex items-center gap-3 px-4 py-2 bg-gray-900/80 border-b border-gray-800 shrink-0">
          <span className="font-semibold text-sm">Grudge Training • R3F + Grudge6 Character from grudge6.grudge-studio.com (mesh armours + weapons)</span>
          <Badge variant="secondary" className="text-[10px]">No Babylon • Draco</Badge>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Real characters UI sidebar */}
          <aside className="w-80 shrink-0 bg-gray-900/70 border-r border-gray-800 p-4 overflow-y-auto">
            <TrainingCharacterUI 
              race={selectedRace} 
              onRaceChange={setSelectedRace} 
              charClass={selectedClass}
              onClassChange={setSelectedClass}
              equipment={equipment} 
              onEquip={toggleEquip} 
            />
            <div className="mt-4 text-[10px] text-gray-500">
              Select race (use grudge6 for the correct rig), class, and toggle equipment. 
              The 3D loads your grudge6 GLB and shows/hides the correct sub-meshes.
              Use central prefabs from store for stable game objects in agentic dev.
            </div>
          </aside>
          {/* R3F 3D view */}
          <main className="flex-1 relative">
            <TrainingScene raceId={selectedRace} equipment={equipment} currentWeapon={currentWeapon} onWeaponChange={setCurrentWeapon} />

            {/* Canonical T0 Action Bar / Hotkeys HUD */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-gray-700 rounded-lg px-4 py-2 flex flex-col items-center gap-1 text-xs font-mono z-50">
              <div className="flex items-center gap-2 text-emerald-400 mb-0.5">
                <span>WEAPON:</span>
                {(['sword','axe','staff','bow','dagger','unarmed'] as const).map(w => (
                  <button key={w} onClick={() => { setCurrentWeapon(w); }} className={`px-2 py-0.5 rounded ${currentWeapon===w ? 'bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}>
                    {w}
                  </button>
                ))}
                <span className="ml-3 text-[10px] text-gray-400">Q/E cycle</span>
              </div>

              <div className="flex gap-3 text-[11px]">
                {[1,2,3,4,5].map(s => {
                  const labels = T0_SKILL_LABELS[currentWeapon] || T0_SKILL_LABELS.default;
                  return (
                    <div key={s} className="flex flex-col items-center">
                      <div className="bg-gray-800 px-1.5 rounded">{s}</div>
                      <div className="text-[10px] text-amber-300 mt-px whitespace-nowrap">{labels[s as 1|2|3|4|5]}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">1-5 skills • SPACE/X/SHIFT = directional dodge (WASD relative) • Grudge6 only</div>
              {lastSkillLog && <div className="text-emerald-300 mt-0.5 text-center">{lastSkillLog}</div>}
            </div>

            <div className="absolute top-2 right-2 text-[10px] bg-black/60 px-2 py-0.5 rounded border border-gray-700">
              CANONICAL • see docs/CANONICAL_MAP.md
            </div>
          </main>
        </div>
      </div>
    );
  }

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

      {/* Demo picker + canvas (non-training) */}
      <div className="flex flex-1 overflow-hidden">
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

        {/* Canvas area - only for non-R3F demos; training uses its own early-return R3F layout */}
        <main className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full outline-none block"
          />

          {!activeDemo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
              <div className="text-center space-y-3">
                <Play className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-gray-400 text-sm">Select a demo (open with <b>?mode=training</b> for real Grudge6 character UI + correct meshes in R3F)</p>
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
