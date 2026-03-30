# Grudge Engine - Game Development Studio Design Guidelines

## Design Approach
**System Selected:** Dark-themed productivity interface inspired by modern game engines (Unity, Unreal Engine, Godot)

**Justification:** Game development tools require maximum screen real estate for 3D viewport, precise control panels, and extended work sessions. Dark themes reduce eye strain and allow content to stand out.

## Core Design Elements

### A. Typography
- **Primary Font:** Inter (Google Fonts) - clean, technical readability
- **Monospace:** JetBrains Mono - for code editor, console, and technical values
- **Hierarchy:**
  - Panel headers: 13px semibold uppercase tracking-wide
  - Property labels: 12px medium
  - Values/inputs: 13px regular
  - Console/code: 12px monospace

### B. Layout System
**Spacing Primitives:** Tailwind units of 1, 2, 4, and 6 (tight technical layouts)
- Panel padding: p-4
- Section gaps: gap-2 to gap-4
- Icon spacing: p-1 to p-2
- Tight, efficient use of space - every pixel counts

**Core Layout Structure:**
```
[Top Toolbar (h-12)] - Play controls, build settings, account
[Main Workspace]
  [Left Sidebar (w-64)] - Scene hierarchy, assets
  [Center Viewport (flex-1)] - 3D rendering canvas
  [Right Sidebar (w-80)] - Inspector, properties
[Bottom Panel (h-48, collapsible)] - Console, timeline, animation
```

### C. Component Library

**Panels:**
- Semi-transparent dark backgrounds with subtle borders
- Collapsible/resizable with drag handles
- Tabs for multi-panel sections
- Icons: Material Icons (via CDN)

**Top Toolbar:**
- Play/Pause/Stop controls (centered)
- Project name (left)
- Build/Deploy/Settings (right)
- Account/help icons (far right)

**Viewport:**
- Full 3D rendering canvas with grid overlay toggle
- Floating toolbar (top-left): Transform tools, view modes
- Floating stats (top-right): FPS, draw calls, vertices
- Grid and axis gizmos

**Sidebars:**
- Left: Tree view of scene objects, search, filter by type
- Right: Multi-tab inspector (Transform, Material, Components, AI Studio)
- Nested property groups with expand/collapse

**Bottom Panel:**
- Tabbed interface: Console | Timeline | Animation | AI Studio
- Console: Monospace log with color-coded message types
- Timeline: Scrubber, keyframes, playback controls

**Forms & Inputs:**
- Compact labeled inputs with icons
- Number scrubbers with drag-to-adjust
- Vector fields (XYZ) in horizontal groups
- Color pickers, dropdown selects, toggle switches
- All inputs have subtle focus states (no color specified)

**Navigation:**
- Top toolbar remains fixed
- Tab-based navigation within panels
- Breadcrumb trail for nested settings

### D. Interactions & Animations
**Minimal Animation Strategy:**
- Panel resize/collapse: 150ms ease
- Tab switches: 100ms fade
- Dropdown menus: 120ms slide-down
- NO viewport animations (performance critical)
- NO decorative animations

## Images
**No hero images.** This is a professional development tool, not a marketing site.

**Asset Previews:**
- 3D model thumbnails in asset browser (128x128px grid)
- Material preview spheres (64x64px)
- Texture thumbnails with transparency checkerboard
- Scene thumbnails for saved scenes

## Special Considerations

**Game Engine Specific UI:**
- Transform gizmos (move, rotate, scale) in viewport
- Asset drag-and-drop from browser to scene/inspector
- Right-click context menus for scene objects
- Keyboard shortcuts displayed in tooltips
- Multi-selection support with shift/ctrl

**AI Studio Integration:**
- Dedicated tab in right sidebar
- Model selection dropdown
- Prompt input field
- Generation progress indicator
- Generated asset preview/import

**Puter.js Integration:**
- Cloud save indicator in top toolbar
- File browser integration for assets
- Project settings for deployment targets

**WickedEngine Specifics:**
- Rendering mode toggles (PBR, wireframe, debug views)
- Post-processing stack panel
- Particle system editor
- Physics simulation controls

**Critical UX:**
- All panels must be keyboard accessible
- Focus management for rapid workflow
- Undo/redo indicators
- Auto-save status indicator
- Performance metrics always visible