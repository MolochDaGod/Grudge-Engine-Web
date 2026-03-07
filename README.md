# Grudge Engine Web

A browser-based 3D game engine built on **Babylon.js** with a Unity-inspired editor, component architecture, and real-time play mode. Built by [Grudge Studio](https://grudgestudio.com).

## Features

### Editor
- **3D Viewport** — Orbit camera, transform gizmos (translate/rotate/scale), grid, wireframe & debug views
- **Scene Hierarchy** — Tree view with drag-to-reparent, visibility toggles, layers
- **Inspector** — Per-object transform, component editing, tag/layer management
- **Asset Browser** — Models, textures, materials, prefabs, scripts, audio, animations
- **Bottom Panel** — Console, timeline, animation controls, AI assistant, script editor, asset library
- **Toolbar** — Play/Pause/Stop, save/load, undo/redo, export/import, fullscreen

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

### Architecture
- **Renderer Abstraction** — `IRenderer` interface supports both Babylon.js and Three.js backends
- **State Management** — Zustand store with project/scene/object hierarchy
- **Prefab System** — Create, instantiate, and manage reusable object templates
- **Scriptable Objects** — Data containers for game config, enemy data, weapon stats, dialogue
- **Cloud Save** — Puter.js integration for cloud storage
- **Scene Serialization** — Export/import projects as `.grudge` JSON files

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
│   │   ├── components/engine/   # Editor UI panels
│   │   │   ├── Editor.tsx       # Main layout (resizable panels)
│   │   │   ├── Viewport.tsx     # 3D viewport (BabylonJS)
│   │   │   ├── Toolbar.tsx      # Top toolbar
│   │   │   ├── SceneHierarchy   # Object tree
│   │   │   ├── Inspector.tsx    # Property editor
│   │   │   ├── AssetBrowser.tsx # Asset management
│   │   │   └── BottomPanel.tsx  # Console/timeline/AI
│   │   ├── lib/
│   │   │   ├── engine/          # Core engine modules
│   │   │   │   ├── renderer-interface.ts  # IRenderer abstraction
│   │   │   │   ├── renderer-factory.ts    # Backend factory
│   │   │   │   ├── combat-controller.ts   # Combat system
│   │   │   │   ├── damage-system.ts       # Damage pipeline
│   │   │   │   ├── particle-system.ts     # GPU particles
│   │   │   │   ├── shader-lib.ts          # GLSL chunks
│   │   │   │   ├── material-factory.ts    # Material creation
│   │   │   │   ├── anim-controller.ts     # Animation state
│   │   │   │   └── tween-manager.ts       # Tweening
│   │   │   ├── scenes/          # Scene templates
│   │   │   ├── prefabs/         # Prefab definitions
│   │   │   ├── rpg/             # RPG-specific logic
│   │   │   ├── engine-store.ts  # Zustand state
│   │   │   ├── character-controller.ts  # 3rd person control
│   │   │   ├── ai-auto-rig.ts  # AI model rigging
│   │   │   └── ai-behaviors.ts # AI behavior trees
│   │   └── pages/
│   │       └── editor.tsx       # Editor page route
│   └── public/assets/           # Static game assets
├── server/                      # Express backend
│   ├── index.ts                 # Server entry
│   ├── routes.ts                # API routes
│   └── puter-services/          # Puter cloud integration
├── shared/
│   └── schema.ts                # Zod schemas + Drizzle ORM
└── package.json
```

## Tech Stack

- **Rendering**: Babylon.js 8 (primary), Three.js (secondary backend)
- **UI**: React 18, Radix UI, Tailwind CSS, Framer Motion
- **State**: Zustand
- **Server**: Express, Drizzle ORM, PostgreSQL
- **Build**: Vite 7, TypeScript 5.6
- **Physics**: Havok (dependency available)
- **Cloud**: Puter.js, Google Cloud Storage
- **3D Formats**: glTF, GLB, OBJ, STL, FBX (with server-side conversion)

## Deployment

### Vercel (Frontend)
```bash
vercel
```
The included `vercel.json` handles SPA routing and asset caching.

### Full Stack
The Express server serves both the API and the built client:
```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=        # PostgreSQL connection string
SESSION_SECRET=      # Random secret for sessions
OPENAI_API_KEY=      # Optional: for AI features
```

## License

MIT — [Grudge Studio](https://grudgestudio.com)
