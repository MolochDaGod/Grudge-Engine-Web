# Grudge Engine Web

A browser-based 3D game engine and editor built on **Babylon.js 8** with a Unity-inspired interface, component architecture, real-time play mode, S3-compatible cloud storage, and RTS faction tools. Built by [Grudge Studio](https://grudgestudio.com).

## Features

### Editor
- **3D Viewport** — Orbit camera, transform gizmos (translate/rotate/scale), grid, wireframe & debug views
- **Scene Hierarchy** — Tree view with drag-to-reparent, visibility toggles, layers
- **Inspector** — Per-object transform, component editing, tag/layer management
- **Asset Browser** — Folder tree / grid / list views, search, type filters, Uppy upload
- **Storage Manager** — S3/local file browser with upload, ZIP extraction, preview, download, delete
- **Bottom Panel** — Console, timeline, animation controls, AI Studio, script editor, free asset library
- **Toolbar** — Play/Pause/Stop, save/load, undo/redo, export/import, fullscreen
- **Admin Panel** — Scene switcher, debug toggles, NPC placer, terrain editor
- **RTS Editor** — Faction placer, unit spawner, economy, AI commander, minimap, character animation preview

### Rendering
- PBR materials (metallic/roughness workflow)
- Shadow maps with exponential blur
- Post-processing: bloom, FXAA, tone mapping, exposure/contrast
- View modes: PBR, wireframe, debug
- Drag-and-drop model import: `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx`
- Auto character scaling (4ft default height with feet/meters display)
- Poly count validation per asset category

### Component System (Unity-like)
| Component | Description |
|---|---|
| **Mesh Renderer** | Box, sphere, cylinder, capsule, plane, cone, torus, or imported model |
| **Material** | PBR, standard, or unlit with albedo/normal/metallic maps, emissive, alpha |
| **Character Controller** | Third-person, first-person, top-down, or sidescroller movement |
| **Animator** | Animation state machine with blending and root motion |
| **Light** | Point, directional, spot, or hemispheric with shadow casting |
| **Camera** | FOV, near/far clip planes |
| **Rigidbody** | Mass, gravity, kinematic, friction, restitution, drag |
| **Collider** | Box, sphere, capsule, or mesh collision shapes |
| **Script** | Custom behavior attachment points |
| **Audio Source** | 3D spatial audio with distance falloff |
| **Particle System** | GPU particles with emit rate, lifetime, color/size curves |

### Game Systems
- **Combat Controller** — Attack phases (startup/active/recovery), combo chains, blocking, stun
- **Damage System** — Entity registry, resistances, weaknesses, armor, critical hits, heal pipeline
- **GPU Particle System** — Pool-based with velocity, gravity, drag, fade, color/size lerp
- **Shader Library** — Simplex noise, FBM, Blinn-Phong, Fresnel, rim lighting, dissolve, hologram, scanlines
- **Character Controller** — Sketchbook-style third-person with WASD movement, sprint, jump, animation blending
- **AI Auto-Rig** — Vision-based skeleton generation for imported models

### RTS Faction System (Phase 1–2)
- **6 Factions** — Human Alliance, Orc Horde, Elven Kingdom, Undead Legion, Dwarven Holds, Pirate Clans
- **Faction Placer** — Place and configure faction buildings/units with faction-colored materials
- **Unit Spawner** — Spawn units by type with faction association
- **RTS Economy** — Resource management (gold, wood, stone, food, iron, gems) with production rates
- **AI Commander** — AI-controlled faction strategy, aggression levels, formation management
- **RTS Minimap** — Real-time minimap with faction unit positions and colors

### Animation System (Phase 3)
- **Animation Slots** — 26 abstract slots, 4 weapon clip maps, Mixamo auto-detect
- **Weapon Styles** — Full weapon style type system (15+ interfaces), 4 weapon configs, registry
- **BabylonJS Anim Controller** — AnimationGroup weight-blend crossfade engine
- **Combat State Machine** — Lightweight ~40-state FSM
- **Character Base** — GLTF loader with physics capsule, skeleton, FSM wiring
- **Weapon Attachment** — Bone-synced hitbox with canDamage tag gating
- **FBX→GLB Converter** — Batch conversion script with manifest generation

### Storage & Asset Pipeline (Phase 4)
- **S3-Compatible Storage** — Works with Railway Buckets, AWS S3, MinIO, Cloudflare R2
- **Presigned Upload URLs** — Direct client-to-S3 uploads via presigned PUT
- **ZIP Upload + Extract** — Upload ZIP archives, server auto-extracts to storage
- **Storage Browser** — Browse bucket contents with prefix navigation, pagination
- **Asset Preview** — Inline preview for images, audio, 3D model info, text/JSON
- **Local Fallback** — Filesystem storage when S3 is not configured
- **ObjectStore CDN** — Read-only proxy to GitHub Pages game data (weapons, armor, terrain, etc.)

### Architecture
- **Renderer Abstraction** — `IRenderer` interface supports both Babylon.js and Three.js backends
- **State Management** — Zustand store with project/scene/object hierarchy
- **Prefab System** — Create, instantiate, and manage reusable object templates
- **Scriptable Objects** — Data containers for game config, enemy data, weapon stats, dialogue
- **Cloud Save** — Puter.js integration for cloud storage
- **Scene Serialization** — Export/import projects as `.grudge` JSON files
- **Auth System** — Puter.js SSO, credential login, guest mode with role-based access
- **Debug Worker** — Live error capture, quick-fix suggestions, AI-powered analysis
- **ObjectStore Client** — Typed SDK for fetching game data (terrain, rendering, assets, factions)

## Quick Start

```bash
# Clone
git clone https://github.com/MolochDaGod/Grudge-Engine-Web.git
cd Grudge-Engine-Web

# Install
npm install

# Development (Express server + Vite HMR)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The editor opens at `http://localhost:5000`.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Q` | Select tool |
| `W` | Move tool |
| `E` | Rotate tool |
| `R` | Scale tool |
| `F` | Focus on selected object |
| `Delete` | Delete selected object |
| `Ctrl+D` | Duplicate object |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save project |
| `Ctrl+E` | Export project |
| `Space` | Play/Stop |
| `Escape` | Deselect |

### Play Mode
| Key | Action |
|---|---|
| `WASD` | Move character |
| `Shift` | Sprint |
| `Space` | Jump |

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/engine/     # Editor UI panels
│   │   │   ├── Editor.tsx         # Main layout (resizable panels)
│   │   │   ├── Viewport.tsx       # 3D viewport (BabylonJS)
│   │   │   ├── Toolbar.tsx        # Top toolbar
│   │   │   ├── SceneHierarchy.tsx  # Object tree
│   │   │   ├── Inspector.tsx      # Property editor
│   │   │   ├── AssetBrowser.tsx   # Project asset browser
│   │   │   ├── StorageManager.tsx # S3/local storage file manager
│   │   │   ├── BottomPanel.tsx    # Console/timeline/AI/scripts/library
│   │   │   ├── RTSEditor.tsx      # RTS faction builder + character preview
│   │   │   ├── FactionPlacer.tsx  # Faction building/unit placement
│   │   │   ├── UnitSpawner.tsx    # Unit spawner UI
│   │   │   ├── AdminPanel.tsx     # Admin controls overlay
│   │   │   ├── ScriptEditor.tsx   # Monaco-based script editor
│   │   │   └── FreeAssetLibrary.tsx # CC0 asset catalog
│   │   ├── lib/
│   │   │   ├── engine/              # Core engine modules
│   │   │   │   ├── animation-slots.ts       # 26 abstract anim slots
│   │   │   │   ├── weapon-styles.ts         # Weapon style registry
│   │   │   │   ├── babylon-anim-controller.ts # Weight-blend crossfade
│   │   │   │   ├── combat-state-machine.ts  # ~40-state FSM
│   │   │   │   ├── babylon-character-base.ts # GLTF loader + physics
│   │   │   │   ├── babylon-weapon-attachment.ts # Bone-synced hitbox
│   │   │   │   ├── combat-controller.ts     # Attack phases/combos
│   │   │   │   ├── damage-system.ts         # Damage pipeline
│   │   │   │   ├── particle-system.ts       # GPU particles
│   │   │   │   ├── shader-lib.ts            # GLSL chunks
│   │   │   │   ├── material-factory.ts      # Material creation
│   │   │   │   └── tween-manager.ts         # Tweening
│   │   │   ├── scenes/              # Scene templates
│   │   │   ├── faction-assets.ts    # 6 factions, 27 buildings, 28 units
│   │   │   ├── objectstore-client.ts # ObjectStore SDK (game data)
│   │   │   ├── engine-store.ts      # Zustand state
│   │   │   ├── character-controller.ts # 3rd person control
│   │   │   ├── ai-auto-rig.ts      # AI model rigging
│   │   │   ├── ai-assistant.ts     # AI chat assistant
│   │   │   └── puter.ts            # Puter.js client SDK
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Auth provider (Puter/credentials/guest)
│   │   └── pages/
│   │       ├── editor.tsx           # Main editor route (/)
│   │       └── rts-scene.tsx        # RTS editor route (/gge-scene)
│   └── public/assets/               # Static game assets
├── server/
│   ├── index.ts                     # Express server entry
│   ├── routes.ts                    # Core API routes
│   ├── storage-adapter.ts           # IStorageAdapter (Local/S3/CDN)
│   ├── storage-routes.ts            # Storage API (upload/browse/delete)
│   ├── objectstore-proxy.ts         # ObjectStore CDN proxy
│   ├── puter-services.ts            # Puter cloud integration
│   └── storage.ts                   # DB storage layer
├── shared/
│   └── schema.ts                    # Zod schemas + Drizzle ORM
├── script/
│   └── convert-mixamo.js            # FBX→GLB batch converter
└── package.json
```

## Tech Stack

- **Rendering**: Babylon.js 8.45 (primary), Three.js (secondary backend)
- **UI**: React 18, Radix UI, Tailwind CSS, Framer Motion
- **State**: Zustand 5
- **Server**: Express 4, Drizzle ORM, PostgreSQL
- **Build**: Vite 7, TypeScript 5.6
- **Physics**: Havok
- **Storage**: AWS S3 SDK (Railway Buckets / S3 / MinIO / R2), local filesystem fallback
- **Cloud**: Puter.js (AI, cloud save, auth)
- **3D Formats**: glTF, GLB, OBJ, STL, FBX (with server-side fbx2gltf conversion)
- **Upload**: Uppy + AWS S3 presigned URLs, multer, adm-zip

## Deployment

### Vercel (Frontend)
```bash
vercel
```
The included `vercel.json` handles SPA routing and asset caching.

### Railway (Full Stack + Storage)
1. Deploy from GitHub
2. Add a **Bucket** to your Railway project
3. Link the bucket to your service — Railway auto-injects credentials
4. Set `STORAGE_PROVIDER=s3` in env vars

### Self-Hosted
```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL=              # PostgreSQL connection string
SESSION_SECRET=            # Random secret for sessions

# Storage ("local" or "s3")
STORAGE_PROVIDER=local
BUCKET_NAME=               # S3 bucket name
BUCKET_ENDPOINT=           # S3-compatible endpoint URL
BUCKET_ACCESS_KEY_ID=      # Access key
BUCKET_SECRET_ACCESS_KEY=  # Secret key
BUCKET_REGION=us-east-1    # Bucket region

# Optional
OPENAI_API_KEY=            # AI features
PUTER_AUTH_TOKEN=          # Puter cloud services
PUTER_APP_ID=              # Puter app ID
```

## API Endpoints

### Storage
- `POST /api/storage/upload-url` — Get presigned PUT URL for direct S3 upload
- `POST /api/storage/upload` — Multipart file upload
- `POST /api/storage/upload-zip` — Upload ZIP → auto-extract to storage
- `GET /api/storage/browse?prefix=` — Browse storage contents
- `GET /api/storage/download?key=` — Get signed download URL
- `DELETE /api/storage/delete?key=` — Delete object
- `GET /api/storage/status` — Storage health + provider info

### Projects & Scenes
- `GET/POST /api/projects` — List / create projects
- `GET/PATCH/DELETE /api/projects/:id` — Project CRUD
- `GET/POST /api/projects/:id/scenes` — Scene management
- `POST /api/projects/:id/scenes/:sid/objects` — Add objects to scene

### Game Data (ObjectStore)
- `GET /api/gamedata/:type` — weapons, armor, classes, races, factions, terrain, etc.
- `GET /api/objectstore/search?q=` — Search asset registry
- `GET /api/objectstore/categories` — List asset categories

## Routes

- `/` — Main editor
- `/gge-scene` — RTS faction editor

## License

MIT — [Grudge Studio](https://grudgestudio.com)
