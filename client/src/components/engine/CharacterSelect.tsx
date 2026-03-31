/**
 * CharacterSelect.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full character creation screen matching GRUDGE-NFT-Island-2026 Unity project.
 *
 * Races:    Human, Elf, Orc, Undead, Barbarian, Dwarf (with actual Unity icons)
 * Classes:  Warrior, Mage, Ranger, Worge
 * Scenes:   Grudge World (MOBILE.unity), The NFT Island, The Dojo
 *
 * Icons sourced from:
 *   Assets/uMMORPG/Prefabs/Entities/Players/[Race]Icon.png
 */

import { useState, useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color4, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {
  type RaceId, type ClassId, type SceneId, type CharacterSelection,
  GRUDGE_RACES, GRUDGE_CLASSES, GRUDGE_SCENES,
  RACE_ORDER, CLASS_ORDER, SCENE_ORDER,
  getAvailableClasses, getTotalStats, DEFAULT_SELECTION,
} from '@/lib/grudge-characters';

// ─── 3D Character Viewer (Babylon.js) ────────────────────────────────────────────────────

function CharacterViewer({ glbPath, scale, accentColor }: { glbPath: string; scale: number; accentColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);
    const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.5, 4, new Vector3(0, 0.5, 0), scene);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 8;
    camera.attachControl(canvas, true);
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), scene);
    sun.intensity = 1.2;
    SceneLoader.ImportMeshAsync('', '', glbPath, scene)
      .then(result => {
        result.meshes.forEach(m => { m.scaling.scaleInPlace(scale); });
        scene.registerBeforeRender(() => {
          result.meshes[0]?.rotate(Vector3.Up(), 0.01);
        });
      })
      .catch(() => {});
    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); scene.dispose(); engine.dispose(); };
  }, [glbPath, scale]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: '#0d0d14' }} />;
}

// ─── Stat Bar ──────────────────────────────────────────────────────────────────

function StatBar({ label, value, max = 15, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-xs w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold w-5 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Scene Selector ───────────────────────────────────────────────────────────

const SCENE_ICONS: Record<SceneId, string> = {
  mobile: '🗺',
  island: '🏝',
  dojo: '⚔',
};

function SceneCard({ id, selected, onClick }: { id: SceneId; selected: boolean; onClick: () => void }) {
  const scene = GRUDGE_SCENES[id];
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg border text-left transition-all ${
        selected
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-base">{SCENE_ICONS[id]}</span>
        <span className={`text-xs font-bold ${selected ? 'text-yellow-400' : 'text-gray-300'}`}>{scene.name}</span>
        {scene.fileSizeMB > 50 && (
          <span className="text-xs text-purple-400 ml-auto">LARGE</span>
        )}
      </div>
      <p className="text-gray-500 text-xs leading-tight">{scene.description.split(' — ')[0]}</p>
    </button>
  );
}

// ─── CharacterSelect component ────────────────────────────────────────────────

interface CharacterSelectProps {
  onEnterWorld: (selection: CharacterSelection) => void;
}

export function CharacterSelect({ onEnterWorld }: CharacterSelectProps) {
  const [selection, setSelection] = useState<CharacterSelection>({ ...DEFAULT_SELECTION });
  const [step, setStep] = useState<'race' | 'class' | 'scene' | 'confirm'>('race');

  const race = GRUDGE_RACES[selection.race];
  const cls = GRUDGE_CLASSES[selection.characterClass];
  const scene = GRUDGE_SCENES[selection.scene];
  const stats = getTotalStats(selection);
  const availableClasses = getAvailableClasses(selection.race);

  // If selected class isn't available for new race, reset to first available
  const handleRaceSelect = (raceId: RaceId) => {
    const available = GRUDGE_RACES[raceId].availableClasses;
    const classId = available.includes(selection.characterClass) ? selection.characterClass : available[0];
    setSelection(s => ({ ...s, race: raceId, characterClass: classId }));
  };

  const canProceed =
    step === 'race' ? true :
    step === 'class' ? true :
    step === 'scene' ? true :
    selection.characterName.trim().length >= 3;

  const stepLabels = ['Race', 'Class', 'Scene', 'Confirm'];
  const stepIndex = ['race', 'class', 'scene', 'confirm'].indexOf(step);

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="Grudge" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div className="text-yellow-400 font-black text-lg tracking-wider">GRUDGE WARLORDS</div>
            <div className="text-gray-500 text-xs">GRUDGE-NFT-Island-2026 · Character Creation</div>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
                i < stepIndex ? 'bg-green-600 text-white' :
                i === stepIndex ? 'bg-yellow-500 text-black' :
                'bg-gray-700 text-gray-400'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === stepIndex ? 'text-yellow-400' : 'text-gray-500'}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`w-6 h-px mx-0.5 ${i < stepIndex ? 'bg-green-600' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: 3D character viewer */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900/30">
          <div className="flex-1 relative">
            <CharacterViewer
              glbPath={`/assets/characters/races/${selection.race}/${selection.race}-base.fbx`}
              scale={1.0}
              accentColor={cls.accentColor}
            />
            {/* Race badge */}
            <div
              className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 rounded-lg px-2 py-1.5 border"
              style={{ borderColor: race.borderColor + '60' }}
            >
              <img
                src={race.iconPath}
                alt={race.name}
                className="w-8 h-8 object-contain rounded"
                style={{ border: `1px solid ${race.borderColor}40` }}
              />
              <div>
                <div className="text-white text-xs font-bold">{race.name}</div>
                <div className="text-gray-400 text-xs">{cls.name}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-3 border-t border-gray-800 space-y-1.5 flex-shrink-0">
            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Base Stats</div>
            <StatBar label="Strength" value={stats.strength} color="#e85c5c" />
            <StatBar label="Dexterity" value={stats.dexterity} color="#5cce5c" />
            <StatBar label="Intelligence" value={stats.intelligence} color="#5c9ee8" />
            <StatBar label="Endurance" value={stats.endurance} color="#e8b85c" />
          </div>
        </div>

        {/* CENTER: Step content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ── STEP: Race ── */}
          {step === 'race' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Choose Your Race</h2>
              <p className="text-gray-500 text-sm mb-4">Your race determines your starting faction city and stat bonuses.</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {RACE_ORDER.map(raceId => {
                  const r = GRUDGE_RACES[raceId];
                  const selected = selection.race === raceId;
                  return (
                    <button
                      key={raceId}
                      onClick={() => handleRaceSelect(raceId)}
                      className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                        selected ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <img
                          src={r.iconPath}
                          alt={r.name}
                          className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
                          style={{ border: `2px solid ${selected ? r.borderColor : r.borderColor + '40'}` }}
                        />
                        <div className="min-w-0">
                          <div className={`font-bold text-sm ${selected ? 'text-yellow-400' : 'text-white'}`}>{r.name}</div>
                          <div className="text-gray-400 text-xs mt-0.5" style={{ color: selected ? r.themeColor : undefined }}>{r.faction}</div>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs leading-snug">{r.description}</p>
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {r.availableClasses.map(c => (
                          <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{GRUDGE_CLASSES[c].name}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP: Class ── */}
          {step === 'class' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Choose Your Class</h2>
              <p className="text-gray-500 text-sm mb-4">
                Available for <span style={{ color: race.themeColor }}>{race.name}</span>. Your class determines weapons, abilities, and playstyle.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CLASS_ORDER.map(classId => {
                  if (!availableClasses.find(c => c.id === classId)) {
                    return (
                      <div key={classId} className="p-4 rounded-xl border-2 border-gray-800 bg-gray-900/30 opacity-40">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 font-bold text-sm">{GRUDGE_CLASSES[classId].name}</span>
                          <span className="text-xs text-red-500">Not available for {race.name}</span>
                        </div>
                      </div>
                    );
                  }
                  const c = GRUDGE_CLASSES[classId];
                  const selected = selection.characterClass === classId;
                  return (
                    <button
                      key={classId}
                      onClick={() => setSelection(s => ({ ...s, characterClass: classId }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.01] ${
                        selected ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${selected ? 'text-yellow-400' : 'text-white'}`}>{c.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: c.primaryColor + '40', color: c.accentColor }}>{c.role}</span>
                      </div>
                      <p className="text-gray-400 text-xs mb-2">{c.description}</p>
                      <div className="mb-2">
                        <div className="text-gray-500 text-xs mb-1">Weapons:</div>
                        <div className="flex flex-wrap gap-1">
                          {c.weapons.slice(0, 4).map(w => (
                            <span key={w} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{w}</span>
                          ))}
                          {c.weapons.length > 4 && <span className="text-xs text-gray-500">+{c.weapons.length - 4} more</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Abilities:</div>
                        <div className="flex flex-wrap gap-1">
                          {c.abilities.map(a => (
                            <span key={a} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: c.accentColor + '20', color: c.accentColor }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP: Scene ── */}
          {step === 'scene' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Choose Your Starting Zone</h2>
              <p className="text-gray-500 text-sm mb-4">Select which scene to enter. Scenes marked LARGE require a GLTF export from Unity first.</p>
              <div className="space-y-3">
                {SCENE_ORDER.map(sceneId => {
                  const s = GRUDGE_SCENES[sceneId];
                  const selected = selection.scene === sceneId;
                  return (
                    <button
                      key={sceneId}
                      onClick={() => setSelection(prev => ({ ...prev, scene: sceneId }))}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.005] ${
                        selected ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{SCENE_ICONS[sceneId]}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${selected ? 'text-yellow-400' : 'text-white'}`}>{s.name}</span>
                            {s.fileSizeMB > 50 && <span className="text-xs px-2 py-0.5 rounded bg-purple-800 text-purple-300">~{s.fileSizeMB}MB</span>}
                            {s.fileSizeMB < 1 && <span className="text-xs px-2 py-0.5 rounded bg-green-800 text-green-300">FAST</span>}
                          </div>
                          <div className="text-gray-400 text-xs">{s.unityScene}</div>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">{s.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP: Confirm ── */}
          {step === 'confirm' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Name Your Character</h2>
              <p className="text-gray-500 text-sm mb-4">Your name will appear above your character and in guilds/leaderboards.</p>

              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Enter character name (3-20 chars)"
                  value={selection.characterName}
                  onChange={e => setSelection(s => ({ ...s, characterName: e.target.value.slice(0, 20) }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-yellow-500 placeholder-gray-600"
                  autoFocus
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
                <div className="text-gray-400 text-xs font-bold uppercase mb-2">Character Summary</div>
                <div className="flex gap-4">
                  <img src={race.iconPath} alt={race.name} className="w-16 h-16 object-contain rounded-lg border border-gray-600" />
                  <div className="space-y-1">
                    <div className="text-white font-bold text-lg">{selection.characterName || <span className="text-gray-600">Unnamed</span>}</div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: race.themeColor }}>{race.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-black font-bold" style={{ backgroundColor: cls.accentColor }}>{cls.name}</span>
                    </div>
                    <div className="text-gray-400 text-sm">{SCENE_ICONS[selection.scene]} Starting in <span className="text-yellow-400">{scene.name}</span></div>
                    <div className="text-gray-500 text-xs">Faction: {race.faction} · City: {race.factionCity}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Lore + summary */}
        <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-gray-900/30 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-800">
            <div className="text-yellow-400 text-xs font-bold uppercase mb-2">{race.name} Lore</div>
            <p className="text-gray-400 text-xs leading-relaxed">{race.lore}</p>
          </div>
          <div className="p-4 border-b border-gray-800">
            <div className="text-yellow-400 text-xs font-bold uppercase mb-2">Faction</div>
            <div className="text-white text-sm font-bold">{race.faction}</div>
            <div className="text-gray-500 text-xs mt-1">Starting City: {race.factionCity}</div>
          </div>
          <div className="p-4">
            <div className="text-yellow-400 text-xs font-bold uppercase mb-2">Stat Bonuses</div>
            {Object.entries(race.statBonus).map(([stat, bonus]) => bonus > 0 && (
              <div key={stat} className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 capitalize">{stat}</span>
                <span className="text-green-400">+{bonus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-gray-900/80 flex-shrink-0">
        <button
          onClick={() => {
            const steps: typeof step[] = ['race', 'class', 'scene', 'confirm'];
            const idx = steps.indexOf(step);
            if (idx > 0) setStep(steps[idx - 1]);
          }}
          disabled={step === 'race'}
          className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm disabled:opacity-30 hover:border-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>

        <div className="text-gray-500 text-xs">
          {selection.race && <span style={{ color: race.themeColor }}>{race.name}</span>}
          {selection.characterClass && <span className="text-gray-600"> · </span>}
          {selection.characterClass && <span style={{ color: cls.accentColor }}>{cls.name}</span>}
        </div>

        {step !== 'confirm' ? (
          <button
            onClick={() => {
              const steps: typeof step[] = ['race', 'class', 'scene', 'confirm'];
              const idx = steps.indexOf(step);
              if (idx < steps.length - 1) setStep(steps[idx + 1]);
            }}
            disabled={!canProceed}
            className="px-6 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => onEnterWorld(selection)}
            disabled={selection.characterName.trim().length < 3}
            className="px-6 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
            style={{
              background: canProceed ? `linear-gradient(135deg, ${race.themeColor}, ${cls.accentColor})` : '#374151',
              color: canProceed ? 'black' : '#6b7280',
            }}
          >
            ⚔ Enter World
          </button>
        )}
      </div>
    </div>
  );
}

// Preload race base models (once converted from FBX to GLB via asset pipeline)
// TODO: Enable preloading after running scripts/convert-race-assets.mjs
