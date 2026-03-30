# Unity → Grudge-Engine-Web Scene Export Guide

## Correct Unity Source
```
C:\Users\jonbe\OneDrive\Desktop\GRUDGE-sourse\GRUDGE-NFT-Island-2026\source
```
This project has **3 playable scenes** in `Assets/uMMORPG/GRUDGE SCENES/`:
- `MOBILE.unity` (59 MB) — Main overworld, 6 faction cities, 5 NavMeshes
- `The Island 1.unity` (79 MB) — The NFT Island
- `Dojo.unity` (0.4 MB) — Combat arena with PvP Vendor

Note: `FRESH GRUDGE` at `D:\Grudge\GRUDGE-NEW-GooglePlay\` is a copy but lacks `The Island 1` and `Dojo` scenes.

Converts each `.unity` scene into a GLB file that `GrudgeScene.tsx` loads via Three.js / @react-three/fiber.

---

## Why NOT the old UnityToThreeExporter

`tools/UnityToThreeExporter` (https://github.com/nickjanssen/UnityToThreeExporter) is archived
and has been **broken since Unity 5.5 (2017)**. It only outputs the legacy Three.js JSON format
(removed from Three.js r129). Do not use it for this project.

---

## Modern Pipeline: KhronosGroup/UnityGLTF

**UnityGLTF** (https://github.com/KhronosGroup/UnityGLTF) is the official, actively maintained
Unity → GLTF exporter. Last release: March 2026. Works with Unity 2021.3+.

---

## Step 1 — Install UnityGLTF in the Unity project

Open `FRESH GRUDGE` in Unity, then:

1. Open **Window → Package Manager**
2. Click **+** → **Add package from git URL**
3. Paste:
   ```
   https://github.com/KhronosGroup/UnityGLTF.git
   ```
4. Click **Add** and wait for import to finish.

---

## Step 2 — Prepare MOBILE.unity for export

Open the scene:
```
Assets/uMMORPG/GRUDGE SCENES/MOBILE.unity
```

**Pre-export checklist:**
- Set **Color Space** to **Linear** (Project Settings → Player → Color Space)
- Use **URP** or **Built-In** render pipeline (HDRP has limited support)
- Disable runtime-only objects (NetworkManager, Spawners) or mark them with a tag to exclude
- Make sure terrain is baked: the Unity terrain component does NOT export directly —
  you must **Right-click Terrain → Export Heightmap** then reimport as a mesh,
  OR use the terrain-to-mesh baker described below

### Terrain export workaround

The Unity terrain system is proprietary and cannot be exported as GLTF directly.
Options:

**Option A — Export as mesh (recommended):**
1. Install **Terrain To Mesh** from the Asset Store (free tier works)
2. Convert terrain to a static mesh
3. Export the mesh via UnityGLTF

**Option B — Heightmap texture:**
1. Right-click Terrain → **Export Heightmap** → save as `terrain_heightmap.png`
2. Place in `public/assets/scenes/grudge-mobile/terrain_heightmap.png`
3. The web loader uses it to reconstruct terrain geometry via Three.js `PlaneGeometry`

---

## Step 3 — Export the scene

**Method A — Whole scene:**
1. Go to **File → Export → glTF** (added by UnityGLTF)
2. Choose format: **GLB** (binary, single file — preferred)
3. Enable options:
   - ✅ Export animations
   - ✅ Export lights (KHR_lights_punctual)
   - ✅ Draco compression (requires `com.unity.cloud.draco` package)
4. Save to:
   ```
   D:\Grudge-Engine-Web\public\assets\scenes\grudge-mobile\scene.glb
   ```

**Method B — Per-prefab export (for large scenes):**

Right-click individual GameObjects in the Hierarchy:
- `Barbarian City` → **Export glTF** → `barbarian-city.glb`
- `Dwarve City` → **Export glTF** → `dwarve-city.glb`
- `Elf City` → **Export glTF** → `elf-city.glb`
- `Human Village` → **Export glTF** → `human-village.glb`
- `Orc Village` → **Export glTF** → `orc-village.glb`
- `Undead City` → **Export glTF** → `undead-city.glb`
- `Cemetary` → **Export glTF** → `cemetary.glb`
- `Crypt` → **Export glTF** → `crypt.glb`

Place all in: `public/assets/scenes/grudge-mobile/`

Update `GrudgeScene.tsx` → `GRUDGE_SCENE_URL` for each prefab if using per-file loading.

---

## Step 4 — Verify the export

Open the GLB in one of these free viewers to confirm correctness:
- **Babylon Sandbox**: https://sandbox.babylonjs.com/
- **gltf.report**: https://gltf.report/
- **Model Viewer**: https://modelviewer.dev/editor/

Check for:
- Correct scale (1 Unity unit = 1 metre in GLTF)
- Textures embedded or in `/textures/` subfolder
- Animations listed (character idle, NPC patrols, etc.)

---

## Step 5 — Optimize with @gltf-transform

`@gltf-transform/cli` is already installed in this project. Run from `Grudge-Engine-Web/`:

```bash
# Inspect
npx @gltf-transform/cli inspect public/assets/scenes/grudge-mobile/scene.glb

# Draco-compress meshes (70-90% smaller)
npx @gltf-transform/cli draco public/assets/scenes/grudge-mobile/scene.glb public/assets/scenes/grudge-mobile/scene.glb

# WebP-convert textures (smaller than PNG/JPG)
npx @gltf-transform/cli webp public/assets/scenes/grudge-mobile/scene.glb public/assets/scenes/grudge-mobile/scene.glb

# Full optimize pipeline
npx @gltf-transform/cli optimize public/assets/scenes/grudge-mobile/scene.glb public/assets/scenes/grudge-mobile/scene.glb
```

---

## Step 6 — Load in Grudge-Engine-Web

Navigate to:
```
http://localhost:5000/grudge
```

The `GrudgeScene.tsx` component will:
1. Detect the GLB file exists (via HEAD request)
2. Load it with `useGLTF` (drei, backed by Three.js GLTFLoader + DRACOLoader)
3. Auto-play all exported animations via `useAnimations`
4. Enable PCF soft shadows on all meshes
5. Apply ACES filmic tonemapping to match Unity's visual output

---

## Architecture reference

```
MOBILE.unity (Unity, uMMORPG)
    ↓  KhronosGroup/UnityGLTF export
scene.glb (GLTF binary)
    ↓  placed in
public/assets/scenes/grudge-mobile/scene.glb
    ↓  loaded by
client/src/lib/grudge-scene-loader.ts   ← loader utilities
client/src/components/engine/GrudgeScene.tsx  ← React Three Fiber renderer
    ↓  available at
/grudge  (route in App.tsx)

Legacy reference only (do NOT use for modern Unity):
tools/UnityToThreeExporter/  ← Unity 5.4 JSON format, broken since 2017
```

---

## NPC / Entity export notes

The Unity entities that need exporting for full scene recreation:

| Entity Type | Unity Prefab Location | Export Priority |
|---|---|---|
| Player (Warrior) | `uMMORPG/Bundle Configs/Prefabs/Entities/Players/` | High |
| Monsters | `uMMORPG/Bundle Configs/Prefabs/Entities/Monsters/` | High |
| NPCs (per faction) | `uMMORPG/Prefabs/Entities/GRUDGE NPCS/` | Medium |
| Mounts (Horse) | `uMMORPG/Bundle Configs/Prefabs/Entities/Mounts/` | Low |
| Harvestables | `uMMORPG/Prefabs/Entities/Harvestables/` | Medium |
| Skill Effects | `uMMORPG/Casting Effects/` | Low |

Export each as separate GLB and register in the engine store for runtime spawning.

---

## Coordinate system

Unity (left-handed, Z-forward) → GLTF → Three.js (right-handed, Z-backward):

UnityGLTF handles this conversion automatically. If loading the legacy JSON format
from `tools/UnityToThreeExporter`, use the helpers in `grudge-scene-loader.ts`:
- `unityPositionToThree(x, y, z)` → negate Z
- `unityRotationToThree(x, y, z, w)` → negate X and Y
