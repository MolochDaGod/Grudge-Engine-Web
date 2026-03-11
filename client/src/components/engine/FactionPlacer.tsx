import { useEffect, useRef, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import {
  FACTIONS,
  type FactionId,
  type FactionBuildingDef,
  type TerrainPropDef,
} from '@/lib/faction-assets';

export interface PlacementResult {
  defId: string;
  position: BABYLON.Vector3;
  mesh: BABYLON.AbstractMesh;
}

interface FactionPlacerProps {
  scene: BABYLON.Scene | null;
  shadowGenerator: BABYLON.ShadowGenerator | null;
  activeFaction: FactionId;
  selectedDef: FactionBuildingDef | TerrainPropDef | null;
  gridSize?: number;
  onPlace: (result: PlacementResult) => void;
  onCancel: () => void;
  enabled: boolean;
}

/**
 * FactionPlacer manages ghost-preview + click-to-place for buildings and terrain.
 * Attach to a BabylonJS scene; it renders a translucent ghost mesh that snaps to
 * the grid and turns red when overlapping existing objects.
 */
export function useFactionPlacer({
  scene,
  shadowGenerator,
  activeFaction,
  selectedDef,
  gridSize = 5,
  onPlace,
  onCancel,
  enabled,
}: FactionPlacerProps) {
  const ghostRef = useRef<BABYLON.AbstractMesh | null>(null);
  const placedMeshesRef = useRef<Set<BABYLON.AbstractMesh>>(new Set());
  const validRef = useRef(true);

  // Build ghost mesh matching the selected definition
  const createGhost = useCallback((def: FactionBuildingDef | TerrainPropDef, s: BABYLON.Scene): BABYLON.AbstractMesh => {
    let mesh: BABYLON.Mesh;
    const scale = def.scale;
    switch (def.fallbackMesh) {
      case 'cylinder':
        mesh = BABYLON.MeshBuilder.CreateCylinder('ghost', { diameter: 3 * scale, height: 6 * scale }, s);
        break;
      case 'sphere':
        mesh = BABYLON.MeshBuilder.CreateSphere('ghost', { diameter: 2 * scale }, s);
        break;
      default:
        mesh = BABYLON.MeshBuilder.CreateBox('ghost', { width: 4 * scale, height: 5 * scale, depth: 4 * scale }, s);
    }

    const faction = FACTIONS[activeFaction];
    const mat = new BABYLON.StandardMaterial('ghostMat', s);
    const c = BABYLON.Color3.FromHexString(faction.color);
    mat.diffuseColor = c;
    mat.alpha = 0.4;
    mat.wireframe = false;
    mat.disableLighting = true;
    mat.emissiveColor = c.scale(0.6);
    mesh.material = mat;
    mesh.isPickable = false;

    return mesh;
  }, [activeFaction]);

  // Update ghost position on pointer move
  useEffect(() => {
    if (!scene || !enabled || !selectedDef) {
      // Dispose ghost when not placing
      if (ghostRef.current) {
        ghostRef.current.dispose();
        ghostRef.current = null;
      }
      return;
    }

    const ghost = createGhost(selectedDef, scene);
    ghostRef.current = ghost;

    const onPointerMove = () => {
      const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => m.name === 'terrain');
      if (pick?.hit && pick.pickedPoint) {
        const snapped = new BABYLON.Vector3(
          Math.round(pick.pickedPoint.x / gridSize) * gridSize,
          selectedDef.scale * 2.5,
          Math.round(pick.pickedPoint.z / gridSize) * gridSize
        );
        ghost.position = snapped;

        // Overlap check — turn ghost red if too close to placed objects
        let overlap = false;
        const threshold = selectedDef.scale * 3;
        placedMeshesRef.current.forEach(m => {
          if (BABYLON.Vector3.Distance(m.position, snapped) < threshold) overlap = true;
        });
        validRef.current = !overlap;
        const mat = ghost.material as BABYLON.StandardMaterial;
        if (overlap) {
          mat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
          mat.emissiveColor = new BABYLON.Color3(0.6, 0.1, 0.1);
        } else {
          const c = BABYLON.Color3.FromHexString(FACTIONS[activeFaction].color);
          mat.diffuseColor = c;
          mat.emissiveColor = c.scale(0.6);
        }
      }
    };

    const onPointerDown = (evtData: BABYLON.IPointerEvent) => {
      if (evtData.button !== 0) return; // left click only
      if (!validRef.current || !ghostRef.current) return;

      // Place the real mesh
      const pos = ghostRef.current.position.clone();
      const realMesh = createRealMesh(selectedDef, scene, pos, activeFaction, shadowGenerator);
      placedMeshesRef.current.add(realMesh);

      onPlace({ defId: selectedDef.id, position: pos, mesh: realMesh });
    };

    const onKeyDown = (kbInfo: BABYLON.KeyboardInfo) => {
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key === 'Escape') {
        onCancel();
      }
    };

    const moveObs = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) onPointerMove();
    });
    const downObs = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event) {
        onPointerDown(pointerInfo.event);
      }
    });
    const kbObs = scene.onKeyboardObservable.add(onKeyDown);

    return () => {
      scene.onPointerObservable.remove(moveObs);
      scene.onPointerObservable.remove(downObs);
      scene.onKeyboardObservable.remove(kbObs);
      ghost.dispose();
      ghostRef.current = null;
    };
  }, [scene, enabled, selectedDef, gridSize, activeFaction, createGhost, onPlace, onCancel, shadowGenerator]);

  return { placedMeshes: placedMeshesRef };
}

function createRealMesh(
  def: FactionBuildingDef | TerrainPropDef,
  scene: BABYLON.Scene,
  position: BABYLON.Vector3,
  faction: FactionId,
  shadowGen: BABYLON.ShadowGenerator | null
): BABYLON.AbstractMesh {
  const scale = def.scale;
  let mesh: BABYLON.Mesh;
  switch (def.fallbackMesh) {
    case 'cylinder':
      mesh = BABYLON.MeshBuilder.CreateCylinder(`bld_${def.id}_${Date.now()}`, { diameter: 3 * scale, height: 6 * scale }, scene);
      break;
    case 'sphere':
      mesh = BABYLON.MeshBuilder.CreateSphere(`bld_${def.id}_${Date.now()}`, { diameter: 2 * scale }, scene);
      break;
    default:
      mesh = BABYLON.MeshBuilder.CreateBox(`bld_${def.id}_${Date.now()}`, { width: 4 * scale, height: 5 * scale, depth: 4 * scale }, scene);
  }
  mesh.position = position;

  const mat = new BABYLON.StandardMaterial(`${mesh.name}_mat`, scene);
  const c = BABYLON.Color3.FromHexString(def.fallbackColor);
  mat.diffuseColor = c;
  mesh.material = mat;
  mesh.receiveShadows = true;

  if (shadowGen) shadowGen.addShadowCaster(mesh);
  return mesh;
}
