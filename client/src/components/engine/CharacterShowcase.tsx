/**
 * CharacterShowcase.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive BabylonJS scene showcasing all 6 races with modular equipment.
 * Demonstrates the PlayerEquipment + MeshSwitcher system ported from Unity.
 *
 * Features:
 *   - 6 selectable races (Human, Orc, Elf, Undead, Barbarian, Dwarf)
 *   - Weapon attachment (Sword, Axe, Bow, Staff, Shield, Dagger, Mace)
 *   - Armor type switching (Cloth, Leather, Metal)
 *   - Tier color system (T1 Bronze → T8 Shimmer)
 *   - Animation playback with cross-fade blending
 *   - DefaultRenderingPipeline (SSAO, bloom, vignette)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial, ShadowGenerator,
  DefaultRenderingPipeline, SSAO2RenderingPipeline,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import {
  type ArmorType, type LoadedCharacter,
  RACE_MODELS, WEAPON_MODELS, TIER_COLORS,
  loadRaceCharacter, setArmorVisibility, setArmorTier,
  attachEquipment, removeEquipment, playAnimation, getAnimationNames,
} from '@/lib/modular-character';

import { GRUDGE_RACES, RACE_ORDER, type RaceId } from '@/lib/grudge-characters';

// ── Config ─────────────────────────────────────────────────────

const ARMOR_TYPES: { id: ArmorType | 'none'; label: string; color: string }[] = [
  { id: 'none',    label: 'None',    color: '#666' },
  { id: 'cloth',   label: 'Cloth',   color: '#4a6eb8' },
  { id: 'leather', label: 'Leather', color: '#8b6914' },
  { id: 'metal',   label: 'Metal',   color: '#7a7a8a' },
];

const WEAPON_KEYS = Object.keys(WEAPON_MODELS);

const ANIM_PRESETS = ['idle', 'run', 'attack', 'death', 'jump', 'hit'];

// ── Component ──────────────────────────────────────────────────

export function CharacterShowcase() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const characterRef = useRef<LoadedCharacter | null>(null);
  const shadowRef = useRef<ShadowGenerator | null>(null);

  const [selectedRace, setSelectedRace] = useState<RaceId>('human');
  const [armorType, setArmorType] = useState<ArmorType | 'none'>('none');
  const [armorTier, setArmorTier] = useState(1);
  const [weapon, setWeapon] = useState<string | null>(null);
  const [currentAnim, setCurrentAnim] = useState('idle');
  const [availableAnims, setAvailableAnims] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fps, setFps] = useState(0);

  // ── Scene setup ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    engineRef.current = engine;
    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0.06, 0.06, 0.1, 1);

    // Camera
    const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.8, 3.5, new Vector3(0, 0.8, 0), scene);
    camera.lowerRadiusLimit = 1.5;
    camera.upperRadiusLimit = 10;
    camera.wheelPrecision = 50;
    camera.attachControl(canvas, true);

    // Lighting
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5;
    hemi.groundColor = new Color3(0.15, 0.15, 0.2);

    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), scene);
    sun.intensity = 1.0;
    sun.position = new Vector3(5, 10, 5);

    // Shadows
    const shadows = new ShadowGenerator(2048, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 32;
    shadowRef.current = shadows;

    // Ground pedestal
    const ground = MeshBuilder.CreateDisc('pedestal', { radius: 1.5, tessellation: 64 }, scene);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 0;
    const gMat = new StandardMaterial('pedestalMat', scene);
    gMat.diffuseColor = new Color3(0.12, 0.12, 0.16);
    gMat.specularColor = new Color3(0.3, 0.3, 0.35);
    ground.material = gMat;
    ground.receiveShadows = true;

    // Post-processing (Grudge recommended settings)
    const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
    pipeline.samples = 4;
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;
    pipeline.imageProcessing.contrast = 1.3;
    pipeline.imageProcessing.exposure = 1.1;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 1.5;

    // Render loop
    engine.runRenderLoop(() => {
      setFps(Math.round(engine.getFps()));
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      characterRef.current?.dispose();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  // ── Load character when race changes ─────────────────────────
  const loadCharacter = useCallback(async (race: RaceId) => {
    const scene = sceneRef.current;
    if (!scene) return;

    setLoading(true);

    // Dispose previous character
    if (characterRef.current) {
      characterRef.current.dispose();
      characterRef.current = null;
    }

    try {
      const char = await loadRaceCharacter(race, scene);
      characterRef.current = char;

      // Add to shadow caster
      if (shadowRef.current) {
        char.meshLayers.all.forEach(m => shadowRef.current!.addShadowCaster(m));
      }

      // Get available animations
      const anims = getAnimationNames(char);
      setAvailableAnims(anims);

      // Apply current equipment state
      if (armorType !== 'none') {
        setArmorVisibility(char, armorType);
        setArmorTier(char, armorType, armorTier);
      }

      if (weapon && WEAPON_MODELS[weapon]) {
        await attachEquipment(char, 'weapon', WEAPON_MODELS[weapon], scene);
      }

      // Play idle
      playAnimation(char, 'idle');
      setCurrentAnim('idle');
    } catch (err) {
      console.error(`Failed to load ${race}:`, err);
    }

    setLoading(false);
  }, [armorType, armorTier, weapon]);

  useEffect(() => { loadCharacter(selectedRace); }, [selectedRace]);

  // ── Equipment handlers ───────────────────────────────────────
  const handleArmorChange = (type: ArmorType | 'none') => {
    setArmorType(type);
    const char = characterRef.current;
    if (!char) return;
    setArmorVisibility(char, type);
    if (type !== 'none') setArmorTier(char, type, armorTier);
  };

  const handleTierChange = (tier: number) => {
    setArmorTier(tier);
    const char = characterRef.current;
    if (!char || armorType === 'none') return;
    setArmorTier(char, armorType, tier);
  };

  const handleWeaponChange = async (key: string | null) => {
    setWeapon(key);
    const char = characterRef.current;
    const scene = sceneRef.current;
    if (!char || !scene) return;

    removeEquipment(char, 'weapon');
    if (key && WEAPON_MODELS[key]) {
      await attachEquipment(char, 'weapon', WEAPON_MODELS[key], scene);
    }
  };

  const handleAnimChange = (name: string) => {
    setCurrentAnim(name);
    const char = characterRef.current;
    if (!char) return;
    const loop = name !== 'death' && name !== 'hit';
    playAnimation(char, name, loop);
  };

  // ── Render ───────────────────────────────────────────────────
  const race = GRUDGE_RACES[selectedRace];

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">

      {/* LEFT: Race selector */}
      <div className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900/50 overflow-y-auto">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Race</h3>
        </div>
        <div className="p-2 space-y-1">
          {RACE_ORDER.map(raceId => {
            const r = GRUDGE_RACES[raceId];
            const active = selectedRace === raceId;
            return (
              <button
                key={raceId}
                onClick={() => setSelectedRace(raceId)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                  active ? 'bg-yellow-500/15 border border-yellow-500/40' : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                <img
                  src={r.iconPath}
                  alt={r.name}
                  className="w-8 h-8 rounded object-contain flex-shrink-0"
                  style={{ border: `1px solid ${active ? r.borderColor : 'transparent'}` }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="min-w-0">
                  <div className={`font-bold text-xs ${active ? 'text-yellow-400' : 'text-gray-300'}`}>{r.name}</div>
                  <div className="text-gray-500 text-xs truncate">{r.faction}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: 3D Viewport */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full outline-none" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-yellow-400 text-sm font-bold animate-pulse">Loading {race.name}...</div>
          </div>
        )}

        {/* HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="text-xs bg-black/60 px-2 py-1 rounded text-gray-400">{fps} FPS</span>
          <span className="text-xs bg-black/60 px-2 py-1 rounded" style={{ color: race.themeColor }}>{race.name}</span>
          {armorType !== 'none' && (
            <span className="text-xs bg-black/60 px-2 py-1 rounded" style={{ color: TIER_COLORS[armorTier]?.hex }}>
              T{armorTier} {armorType}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 text-xs text-gray-600">
          Grudge Engine Web · Character Showcase · 6 Races · Modular Equipment
        </div>
      </div>

      {/* RIGHT: Equipment controls */}
      <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-gray-900/50 overflow-y-auto">

        {/* Weapon */}
        <div className="p-3 border-b border-gray-800">
          <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">Weapon</h4>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => handleWeaponChange(null)}
              className={`px-2 py-1.5 rounded text-xs transition-all ${
                weapon === null ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-gray-800 text-gray-400 border border-transparent hover:border-gray-600'
              }`}
            >
              None
            </button>
            {WEAPON_KEYS.map(key => (
              <button
                key={key}
                onClick={() => handleWeaponChange(key)}
                className={`px-2 py-1.5 rounded text-xs capitalize transition-all ${
                  weapon === key ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-gray-800 text-gray-400 border border-transparent hover:border-gray-600'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Armor Type */}
        <div className="p-3 border-b border-gray-800">
          <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">Armor</h4>
          <div className="flex gap-1">
            {ARMOR_TYPES.map(at => (
              <button
                key={at.id}
                onClick={() => handleArmorChange(at.id)}
                className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                  armorType === at.id ? 'border border-yellow-500/40 text-white' : 'bg-gray-800 text-gray-400 border border-transparent hover:border-gray-600'
                }`}
                style={armorType === at.id ? { backgroundColor: at.color + '30', color: at.color } : undefined}
              >
                {at.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier */}
        <div className="p-3 border-b border-gray-800">
          <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">
            Tier <span className="normal-case font-normal text-gray-500">(T{armorTier} {TIER_COLORS[armorTier]?.name})</span>
          </h4>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(t => (
              <button
                key={t}
                onClick={() => handleTierChange(t)}
                className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${
                  armorTier === t ? 'ring-1 ring-white/40' : 'hover:ring-1 hover:ring-gray-600'
                }`}
                style={{ backgroundColor: TIER_COLORS[t].hex + '30', color: TIER_COLORS[t].hex }}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        {/* Animation */}
        <div className="p-3 border-b border-gray-800">
          <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">Animation</h4>
          <div className="grid grid-cols-2 gap-1">
            {ANIM_PRESETS.map(name => (
              <button
                key={name}
                onClick={() => handleAnimChange(name)}
                className={`px-2 py-1.5 rounded text-xs capitalize transition-all ${
                  currentAnim === name ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-gray-800 text-gray-400 border border-transparent hover:border-gray-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {availableAnims.length > 0 && (
            <details className="mt-2">
              <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">
                All clips ({availableAnims.length})
              </summary>
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {availableAnims.map(name => (
                  <button
                    key={name}
                    onClick={() => handleAnimChange(name)}
                    className="w-full text-left text-xs text-gray-400 hover:text-yellow-400 px-2 py-0.5 rounded hover:bg-gray-800 truncate"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Race info */}
        <div className="p-3">
          <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">Lore</h4>
          <p className="text-gray-500 text-xs leading-relaxed">{race.lore}</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Faction</span>
              <span style={{ color: race.themeColor }}>{race.faction}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">City</span>
              <span className="text-gray-300">{race.factionCity}</span>
            </div>
            {Object.entries(race.statBonus).map(([stat, val]) => val > 0 && (
              <div key={stat} className="flex justify-between text-xs">
                <span className="text-gray-500 capitalize">{stat}</span>
                <span className="text-green-400">+{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
