# Grudge Engine - Game Development Studio

## Overview
Grudge Engine is a browser-based game development studio built with React and Babylon.js. It offers a professional game engine interface, similar to Unity or Unreal Engine, featuring a 3D viewport, scene hierarchy, asset browser, inspector panel, and console. The application integrates cloud storage via Puter.js and includes AI-powered tools to assist game development. The project aims to provide a comprehensive and accessible platform for creating 3D games directly within a web browser, leveraging modern web technologies and AI for enhanced productivity and creative potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Routing**: React 18 with TypeScript, Wouter for routing, Vite for build and HMR.
- **State Management**: Zustand for global state, TanStack React Query for server state and caching.
- **3D Rendering**: Babylon.js for the 3D viewport, supporting PBR, wireframe, and debug modes. Includes GridMaterial and GizmoManager for transform operations (move, rotate, scale) with QWER keyboard shortcuts.
- **UI Components**: shadcn/ui with Radix UI primitives, Tailwind CSS for styling (dark mode default), Inter font for UI, JetBrains Mono for code. Features a resizable panel layout.
- **Editor Layout**: Top toolbar (play controls, save/load, cloud sync), Left sidebar (Scene hierarchy, asset browser), Center (3D viewport), Right sidebar (Inspector), Bottom panel (Console, AI assistant).
- **RPG Game Systems Integration**: Includes a Scene Registry for multi-scene management (Builder, Outdoor, Town, Night, Inn), an Admin Panel for scene navigation and debug options, and a Character Prefab System with animation support.
- **Unity-like Features**: Parent-child hierarchy with drag-drop, Tags & Layers system, ScriptableObject framework for data-driven configuration, and enhanced GameObjects with `isStatic`, `tags`, `layer`, `prefabId`.
- **Sketchbook-style Character Controller** (`client/src/lib/character-controller.ts`): State machine with idle, walk, run, jump, fall, land states. Features spring-based velocity and rotation simulators for smooth movement, camera-relative WASD controls, Shift to run, Space to jump. Ground detection via raycasting with gravity physics.
- **Grass Environment** (`client/src/lib/grass-environment.ts`): Procedural play mode starting area with grass ground, gradient sky with clouds, simple trees/rocks, and shadow system.
- **AI Auto-Rigging** (`client/src/lib/ai-auto-rig.ts`): Uses Puter.js vision AI (GPT-4o) to analyze model screenshots and automatically generate skeletal rigs. Supports humanoid (21 bones) and quadruped (19 bones) templates with AI-suggested proportions. Accessible via toolbar Wand2 button or context menu. Creates visualization skeleton aligned to mesh bounding box.
- **AI NPC Behaviors** (`client/src/lib/ai-behaviors.ts`, `warbear-behavior.ts`, `dragon-behavior.ts`):
  - **Base AIBehavior class**: State machine, target tracking, patrol logic, animation blending, smooth rotation.
  - **WarBearBehavior**: Ground NPC with idle/patrol/chase/attack/return states. Animations: stand, move, attack00, attack01, activeSkill, hit, stun, die. Features aggro range, attack cooldown, roar on detection.
  - **DragonBehavior**: Flying NPC with fly_idle/fly_circle/fly_swoop/fly_hover/attack states. Features: altitude control with bob, banking during turns, swoop attacks, breath attacks, circling around targets. Full 3D flight physics.
- **Viewport Performance Metrics**: Real-time FPS, draw calls, vertex count, and render time display.
- **Spawn Player Button**: Quick-access User icon button in viewport toolbar to spawn the player character prefab.
- **Example Scenes**: Includes "Character Fight Scene" with two armored knights, environment (trees, grass, house), and combat animation. Access via Examples browser in toolbar.
- **Default Scene Assets**: Features high-quality 3D models:
  - **Lizard Warrior** (`/assets/characters/lizard/scene.gltf`): Main playable character with animations
  - **War Bear** (`/assets/characters/warbear/scene.gltf`): NPC companion with animations
  - **Dragon** (`/assets/characters/dragon/scene.gltf`): Flying creature with fly animations
  - **Realistic Trees** (`/assets/environment/trees/scene.gltf`): Environment decoration
- **Units System** (`client/src/lib/units.ts`): Standard measurement system where 1 Babylon unit = 1 meter. Features:
  - **Character Heights**: Default 6ft (~1.83m), with presets for child (4ft), short/average/tall adults, giant (10ft).
  - **Standard Sizes**: Door (7ft), table (2.5ft), chair (1.5ft seat), step (7in).
  - **Auto-Scaling**: Imported character models automatically scaled to 6ft height based on bounding box.
  - **Poly Budget**: Guidelines for vertices per object type (character: 5K-30K, props: 500-2K, scenes: 100K-2M).
  - **Conversion Functions**: feetToUnits(), unitsToFeet(), metersToUnits(), formatHeight(), autoScaleToRealWorld(), getSizeReference().
  - **Dimension Display**: Shows imported model dimensions in feet (W x H x D) in console.
  - **Comprehensive Real-World Standards**: 
    - **ARCHITECTURE**: Walls (8-15ft), doors (3x7ft), windows, stairs (7in rise), room sizes.
    - **FURNITURE**: Chairs, tables, sofas, beds (single to king), storage, desks.
    - **VEHICLES**: Cars (compact to pickup), trucks, motorcycles, medieval carts/wagons.
    - **NATURE**: Trees (4m small to 40m giant), bushes, rocks, grass heights.
    - **PROPS**: Weapons (daggers to halberds), firearms, tools, containers, books, lighting.
    - **CREATURES**: Real animals (cat to elephant), fantasy (goblin to dragon), undead.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript for RESTful API endpoints.
- **API Design**: RESTful endpoints for project, scene, asset, and game object management. Includes XCF file processing for GIMP layer extraction and FBX to GLB conversion.
- **Storage Layer**: Interface-based design (IStorage) for swappable backends, with an in-memory implementation (MemStorage) and Drizzle ORM configured for PostgreSQL.
- **Database Schema**: Zod-validated schemas for Users, Projects, Scenes, and Game Objects.

### Cloud Integration
- **Puter.js Integration**: Provides AI chat (GPT-4o, Claude, Gemini), image generation (DALL-E 3), text-to-speech, cloud filesystem for project storage, key-value storage, and file pickers.
- **Replit Object Storage**: Used for persistent file storage of assets (textures, models), supporting presigned URL uploads.
- **AI Assistant Service** (`client/src/lib/ai-assistant.ts`): Unified AI service with game dev context, streaming responses, quick actions, and model selection. All AI is free via Puter.js - no API keys required.

### Puter Backend Services (`server/puter-services/`)
The project is prepared for deployment as a Puter app with full server-side integration:
- **Cloud Storage Service** (`puter-cloud.ts`): Server-side file operations via `puter.fs` - write, read, mkdir, readdir, delete, stat, copy, move, getPublicUrl.
- **AI Workers** (`ai-workers.ts`): Server-side AI processing with multiple models (GPT-4o, Claude, Gemini). Features:
  - `aiChat()`: General AI chat with model selection
  - `generateCode()`: Code generation with language/framework context
  - `gameDevAssistant()`: Game dev specialized prompts for Babylon.js
  - `generateImage()`: DALL-E image generation
  - `processBatch()`: Batch AI processing for multiple tasks
  - `analyzeContent()`: Code review, asset analysis, scene analysis, performance analysis
- **Debug Worker** (`ai-workers.ts`): Live error detection and AI-powered bug fixing. Features:
  - `reportError()`: Collect errors from frontend/backend with auto-classification
  - `analyzeError()`: AI analysis of errors with root cause and fix suggestions
  - `getQuickFix()`: Instant pattern-based fixes for common errors
  - `startDebugSession()/endDebugSession()`: Session-based error tracking
  - Error types: runtime, compile, network, babylon, react, unknown
  - Generates code change suggestions with old/new code diffs
- **Frontend Debug Hook** (`client/src/hooks/use-debug-worker.ts`): React hook for error capture. Features:
  - Auto-capture of window errors, unhandled rejections, console.error
  - React Error Boundary integration
  - Real-time error reporting to backend
  - AI analysis on demand
- **Auto Setup** (`auto-setup.ts`): Automatic cloud directory initialization on startup. Creates:
  - `grudge-engine/projects` - Project data
  - `grudge-engine/assets/{textures,models,audio,scripts}` - Asset storage
  - `grudge-engine/prefabs` - Prefab data
  - `grudge-engine/exports` - Exported games
  - `grudge-engine/temp` - Temporary files with auto-cleanup
- **KV Store**: Puter's key-value storage for app configuration and user preferences.
- **Puter API Endpoints**: Express routes at `/api/puter/*` for cloud storage, KV store, and AI workers.
- **Environment**: Requires `PUTER_AUTH_TOKEN` environment variable for server-side Puter API access.

- **glTF Import Knowledge** (`client/src/lib/gltf-import-knowledge.ts`): Comprehensive Babylon.js import knowledge base for AI assistance including:
  - Supported formats: glTF/GLB (recommended), OBJ, STL, FBX (requires conversion)
  - Loading functions: LoadAssetContainerAsync, AppendSceneAsync, ImportMeshAsync
  - Auto-scaling patterns for proper real-world sizing
  - Animation access and control patterns
  - Skinning/skeleton handling (glTF-specific bone linking)
  - Material handling (PBR materials from glTF)
  - Compression support (Draco, KTX2/Basis, Meshopt)
  - Progressive loading with MSFT_lod extension
  - Common error diagnosis and fixes

### Build System
- **Vite**: Client-side bundling.
- **esbuild**: Server-side bundling.
- **Deployment**: Optimized for deployment to Puter Hosted Service or Replit.

## External Dependencies
- **3D Engine**: @babylonjs/core, @babylonjs/gui, @babylonjs/loaders, @babylonjs/materials, @babylonjs/inspector, @babylonjs/havok.
- **Code Editing**: @monaco-editor/react.
- **Audio**: howler.js.
- **Cloud Services**: Puter.js (CDN), @replit/object-storage.
- **Database**: PostgreSQL (via Drizzle ORM).
- **UI Libraries**: Radix UI primitives, react-resizable-panels, Lucide React.
- **Fonts**: Inter, JetBrains Mono (Google Fonts).
- **Conversion**: fbx2gltf, @gltf-transform/cli, multer.