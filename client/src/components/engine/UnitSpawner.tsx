import { useRef, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {
  FACTIONS,
  type FactionId,
  type FactionUnitDef,
} from '@/lib/faction-assets';

// ─── Formation presets ──────────────────────────────────────────────────────

export type FormationType = 'line' | 'wedge' | 'square' | 'circle';

function getFormationOffsets(type: FormationType, count: number, spacing: number): BABYLON.Vector3[] {
  const offsets: BABYLON.Vector3[] = [];

  switch (type) {
    case 'line':
      for (let i = 0; i < count; i++) {
        offsets.push(new BABYLON.Vector3((i - (count - 1) / 2) * spacing, 0, 0));
      }
      break;

    case 'wedge': {
      offsets.push(BABYLON.Vector3.Zero());
      let row = 1;
      let placed = 1;
      while (placed < count) {
        for (let col = -row; col <= row && placed < count; col += 2) {
          offsets.push(new BABYLON.Vector3(col * spacing * 0.5, 0, -row * spacing));
          placed++;
        }
        row++;
      }
      break;
    }

    case 'square': {
      const side = Math.ceil(Math.sqrt(count));
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / side);
        const c = i % side;
        offsets.push(new BABYLON.Vector3(
          (c - (side - 1) / 2) * spacing,
          0,
          (r - (side - 1) / 2) * spacing
        ));
      }
      break;
    }

    case 'circle': {
      const radius = (count * spacing) / (2 * Math.PI);
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        offsets.push(new BABYLON.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ));
      }
      break;
    }
  }

  return offsets;
}

// ─── Spawned unit tracking ──────────────────────────────────────────────────

export interface SpawnedUnit {
  id: string;
  defId: string;
  faction: FactionId;
  mesh: BABYLON.AbstractMesh;
  animGroups: BABYLON.AnimationGroup[];
  position: BABYLON.Vector3;
}

export interface SpawnRequest {
  def: FactionUnitDef;
  faction: FactionId;
  origin: BABYLON.Vector3;
  count?: number;
  formation?: FormationType;
  spacing?: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useUnitSpawner(
  scene: BABYLON.Scene | null,
  shadowGenerator: BABYLON.ShadowGenerator | null,
) {
  const unitsRef = useRef<SpawnedUnit[]>([]);

  const spawnUnits = useCallback(async (req: SpawnRequest): Promise<SpawnedUnit[]> => {
    if (!scene) return [];

    const { def, faction, origin, count = 1, formation = 'line', spacing = 4 } = req;
    const offsets = getFormationOffsets(formation, count, spacing);
    const spawned: SpawnedUnit[] = [];

    for (const offset of offsets) {
      const pos = origin.add(offset);
      const unit = await spawnSingleUnit(def, faction, pos, scene, shadowGenerator);
      spawned.push(unit);
    }

    unitsRef.current = [...unitsRef.current, ...spawned];
    return spawned;
  }, [scene, shadowGenerator]);

  const despawnUnit = useCallback((unitId: string) => {
    const idx = unitsRef.current.findIndex(u => u.id === unitId);
    if (idx >= 0) {
      const unit = unitsRef.current[idx];
      unit.animGroups.forEach(ag => ag.stop());
      unit.mesh.dispose();
      unitsRef.current.splice(idx, 1);
    }
  }, []);

  const despawnAll = useCallback(() => {
    unitsRef.current.forEach(u => {
      u.animGroups.forEach(ag => ag.stop());
      u.mesh.dispose();
    });
    unitsRef.current = [];
  }, []);

  return { units: unitsRef, spawnUnits, despawnUnit, despawnAll };
}

// ─── Internal spawn helper ──────────────────────────────────────────────────

async function spawnSingleUnit(
  def: FactionUnitDef,
  faction: FactionId,
  position: BABYLON.Vector3,
  scene: BABYLON.Scene,
  shadowGen: BABYLON.ShadowGenerator | null
): Promise<SpawnedUnit> {
  const uid = `unit_${def.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  let root: BABYLON.AbstractMesh;
  let animGroups: BABYLON.AnimationGroup[] = [];

  try {
    const folder = def.modelPath.substring(0, def.modelPath.lastIndexOf('/') + 1);
    const filename = def.modelPath.substring(def.modelPath.lastIndexOf('/') + 1);
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', folder, filename, scene);

    if (result.meshes.length > 0) {
      root = result.meshes[0];
      root.scaling = new BABYLON.Vector3(def.scale, def.scale, def.scale);

      result.meshes.forEach(m => {
        m.receiveShadows = true;
        if (shadowGen && m.getTotalVertices() > 0) shadowGen.addShadowCaster(m);
      });

      animGroups = result.animationGroups;
      // Auto-play idle animation if available
      const idle = animGroups.find(ag =>
        ag.name.toLowerCase().includes('idle') || ag.name.toLowerCase().includes('stand')
      );
      if (idle) {
        idle.start(true);
      } else if (animGroups.length > 0) {
        animGroups[0].start(true);
      }
    } else {
      root = createFallbackUnit(uid, def, faction, scene);
    }
  } catch {
    root = createFallbackUnit(uid, def, faction, scene);
  }

  root.position = position.clone();
  root.position.y = def.scale;
  root.name = uid;

  // Faction indicator ring
  const ring = BABYLON.MeshBuilder.CreateTorus(`${uid}_ring`, {
    diameter: def.scale * 3,
    thickness: 0.15,
    tessellation: 24,
  }, scene);
  ring.position = position.clone();
  ring.position.y = 0.1;
  const ringMat = new BABYLON.StandardMaterial(`${uid}_ringMat`, scene);
  ringMat.diffuseColor = BABYLON.Color3.FromHexString(FACTIONS[faction].color);
  ringMat.emissiveColor = BABYLON.Color3.FromHexString(FACTIONS[faction].color).scale(0.5);
  ring.material = ringMat;
  ring.parent = root;

  return { id: uid, defId: def.id, faction, mesh: root, animGroups, position: root.position };
}

function createFallbackUnit(
  uid: string,
  def: FactionUnitDef,
  faction: FactionId,
  scene: BABYLON.Scene
): BABYLON.Mesh {
  const scale = def.scale;
  let mesh: BABYLON.Mesh;

  switch (def.fallbackMesh) {
    case 'cylinder':
      mesh = BABYLON.MeshBuilder.CreateCylinder(uid, { diameter: 1.2 * scale, height: 2 * scale }, scene);
      break;
    case 'sphere':
      mesh = BABYLON.MeshBuilder.CreateSphere(uid, { diameter: 1.5 * scale }, scene);
      break;
    default:
      mesh = BABYLON.MeshBuilder.CreateCapsule(uid, { radius: 0.5 * scale, height: 2 * scale }, scene);
  }

  const mat = new BABYLON.StandardMaterial(`${uid}_mat`, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(def.fallbackColor);
  mesh.material = mat;

  // Simple bobbing animation for fallback units
  const anim = new BABYLON.Animation(
    `${uid}_bob`, 'position.y', 30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  );
  anim.setKeys([
    { frame: 0, value: scale },
    { frame: 15, value: scale + 0.3 },
    { frame: 30, value: scale },
  ]);
  mesh.animations.push(anim);
  scene.beginAnimation(mesh, 0, 30, true);

  return mesh;
}
