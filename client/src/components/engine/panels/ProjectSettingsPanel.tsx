import { useState } from 'react';
import { Activity, Layers, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';
import { DEFAULT_LAYERS } from '@shared/schema';
import { cn } from '@/lib/utils';

export function ProjectSettingsPanel() {
  const { projectSettings, setProjectSettings, project, audioSettings, setAudioSettings } = useEngineStore();
  const [activeCategory, setActiveCategory] = useState('General');
  const [gravity, setGravity] = useState(-9.81);
  const [physicsEngine, setPhysicsEngine] = useState('Rapier');
  const categories = ['General', 'Graphics', 'Physics', 'Input', 'Audio', 'Tags & Layers'];

  return (
    <div className="h-full flex">
      <div className="w-40 border-r border-sidebar-border p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</span>
        <div className="mt-2 space-y-1">
          {categories.map((cat) => (
            <div
              key={cat}
              className={cn("text-xs p-1.5 rounded hover-elevate cursor-pointer", activeCategory === cat ? "bg-sidebar-accent" : "")}
              onClick={() => setActiveCategory(cat)}
              data-testid={`settings-cat-${cat.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {activeCategory === 'General' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">General Settings</div>
            <div>
              <label className="text-xs text-muted-foreground">Project Name</label>
              <Input value={projectSettings.projectName} onChange={(e) => setProjectSettings({ projectName: e.target.value })} className="h-7 text-xs mt-1" data-testid="input-project-name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Company Name</label>
              <Input value={projectSettings.companyName} onChange={(e) => setProjectSettings({ companyName: e.target.value })} className="h-7 text-xs mt-1" data-testid="input-company-name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Version</label>
              <Input value={projectSettings.version} onChange={(e) => setProjectSettings({ version: e.target.value })} className="h-7 text-xs mt-1" data-testid="input-version" placeholder="1.0.0" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fullscreen" className="w-3.5 h-3.5" checked={projectSettings.defaultFullscreen} onChange={(e) => setProjectSettings({ defaultFullscreen: e.target.checked })} data-testid="checkbox-fullscreen" />
              <label htmlFor="fullscreen" className="text-xs cursor-pointer">Default Fullscreen</label>
            </div>
            {project && (
              <div className="pt-3 border-t border-sidebar-border space-y-1.5">
                <div className="text-xs text-muted-foreground">Project ID</div>
                <div className="text-xs font-mono text-muted-foreground/60">{project.id}</div>
                <div className="text-xs text-muted-foreground mt-2">Scenes</div>
                <div className="text-xs font-mono">{project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''}</div>
              </div>
            )}
            <div className="text-xs text-muted-foreground/60 pt-2">Settings are saved automatically</div>
          </div>
        )}
        {activeCategory === 'Graphics' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Graphics Settings</div>
            <div className="text-xs text-muted-foreground">Configure lighting in the Lighting tab. Viewport options are in the toolbar.</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: 'Renderer', value: 'Babylon.js v8' },
                { label: 'API', value: 'WebGL 2' },
                { label: 'Anti-alias', value: 'MSAA 4x' },
                { label: 'Post-FX', value: 'ACES Tone Map' },
                { label: 'Shadows', value: 'Poisson Sampling' },
                { label: 'Shadow Res', value: '512 px' },
              ].map(item => (
                <div key={item.label} className="bg-sidebar-accent rounded p-2">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-xs font-medium mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeCategory === 'Physics' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Physics Settings</div>
            <div>
              <label className="text-xs text-muted-foreground">Physics Engine</label>
              <Select value={physicsEngine} onValueChange={setPhysicsEngine}>
                <SelectTrigger className="h-7 text-xs mt-1" data-testid="select-physics-engine"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rapier" className="text-xs">Rapier (WASM, default)</SelectItem>
                  <SelectItem value="Havok" className="text-xs">Havok (Babylon.js native)</SelectItem>
                  <SelectItem value="Ammo.js" className="text-xs">Ammo.js (legacy)</SelectItem>
                  <SelectItem value="Cannon.js" className="text-xs">Cannon.js (lightweight)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Gravity (Y)</label>
                <span className="text-xs font-mono text-primary">{gravity.toFixed(2)} m/s²</span>
              </div>
              <Slider value={[gravity]} min={-20} max={0} step={0.01} onValueChange={([v]) => setGravity(v)} data-testid="slider-gravity" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { label: 'Collision Detection', value: 'Discrete' },
                { label: 'Iterations', value: '10' },
                { label: 'Fixed Timestep', value: '1/60s' },
                { label: 'Solver', value: 'PGS' },
              ].map(item => (
                <div key={item.label} className="bg-sidebar-accent rounded p-2">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-xs font-medium mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="phys-debug" className="w-3.5 h-3.5" data-testid="checkbox-physics-debug" />
              <label htmlFor="phys-debug" className="text-xs cursor-pointer">Show physics debug wireframes</label>
            </div>
          </div>
        )}
        {activeCategory === 'Input' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Input Bindings</div>
            <div className="text-xs text-muted-foreground mb-2">Default key mappings for the character controllers.</div>
            {[
              { action: 'Move Forward', key: 'W' },
              { action: 'Move Backward', key: 'S' },
              { action: 'Strafe Left', key: 'A' },
              { action: 'Strafe Right', key: 'D' },
              { action: 'Jump', key: 'Space' },
              { action: 'Sprint', key: 'Shift' },
              { action: 'Crouch', key: 'C' },
              { action: 'Dodge / Roll', key: 'Ctrl' },
              { action: 'Attack (Light)', key: 'LMB' },
              { action: 'Attack (Heavy)', key: 'RMB' },
              { action: 'Block', key: 'F' },
              { action: 'Camera Orbit', key: 'Mouse' },
              { action: 'Focus Object', key: 'F (editor)' },
              { action: 'Delete Object', key: 'Del (editor)' },
              { action: 'Rename Object', key: 'F2 (editor)' },
            ].map(({ action, key }) => (
              <div key={action} className="flex items-center justify-between py-1 border-b border-sidebar-border/40">
                <span className="text-xs text-muted-foreground">{action}</span>
                <kbd className="text-[10px] font-mono bg-sidebar-accent px-1.5 py-0.5 rounded border border-sidebar-border">{key}</kbd>
              </div>
            ))}
          </div>
        )}
        {activeCategory === 'Audio' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Audio Settings</div>
            <div className="text-xs text-muted-foreground mb-1">These mirror the Audio Mixer panel and are saved automatically.</div>
            {([
              { key: 'master' as const, label: 'Master Volume', color: 'text-primary' },
              { key: 'music' as const, label: 'Music', color: 'text-blue-400' },
              { key: 'sfx' as const, label: 'Sound Effects', color: 'text-green-400' },
              { key: 'ambient' as const, label: 'Ambient', color: 'text-purple-400' },
            ]).map(ch => (
              <div key={ch.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className={cn("text-xs font-medium", ch.color)}>{ch.label}</label>
                  <span className="text-xs font-mono text-muted-foreground">{audioSettings[ch.key]}%</span>
                </div>
                <Slider value={[audioSettings[ch.key]]} min={0} max={100} step={1} onValueChange={([v]) => setAudioSettings({ [ch.key]: v })} data-testid={`settings-slider-${ch.key}`} />
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-sidebar-border">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Audio Engine: Howler.js v2</span>
              </div>
            </div>
          </div>
        )}
        {activeCategory === 'Tags & Layers' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tags & Layers</div>
            <div className="text-xs text-muted-foreground mb-2">Layers control object visibility and raycasting. Assign via the Inspector.</div>
            <div className="space-y-0.5">
              {DEFAULT_LAYERS.map(layer => (
                <div key={layer.id} className="flex items-center gap-2 p-1.5 rounded hover-elevate">
                  <span className="text-xs font-mono text-muted-foreground w-5">{layer.id}</span>
                  <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs flex-1">{layer.name}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full", layer.visible ? "bg-green-500" : "bg-muted-foreground/40")} title={layer.visible ? 'Visible' : 'Hidden'} />
                  {layer.locked ? <Lock className="w-3 h-3 text-muted-foreground/50" /> : <Unlock className="w-3 h-3 text-muted-foreground/30" />}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-sidebar-border">
              <div className="text-[10px] text-muted-foreground/60">Layers 0-7 built-in. Collision masks use bitwise AND of layer IDs.</div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
