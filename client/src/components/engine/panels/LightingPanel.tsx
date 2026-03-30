import { Sun } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useEngineStore } from '@/lib/engine-store';

export function LightingPanel() {
  const { lightingSettings, setLightingSettings, getCurrentScene } = useEngineStore();
  const { ambientIntensity, sunIntensity, shadowStrength } = lightingSettings;

  const sceneLights = getCurrentScene()?.objects.filter(o =>
    o.components.some(c => c.type === 'light')
  ) || [];

  return (
    <div className="h-full flex">
      <div className="flex-1 p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">Ambient (Hemispheric)</span>
            <span className="text-xs font-mono text-primary">{ambientIntensity.toFixed(2)}</span>
          </div>
          <Slider
            value={[ambientIntensity]}
            min={0} max={1} step={0.01}
            onValueChange={([v]) => setLightingSettings({ ambientIntensity: v })}
            data-testid="slider-ambient-intensity"
          />
          <div className="text-xs text-muted-foreground mt-1">Controls sky/ground ambient fill light</div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">Sun (Directional)</span>
            <span className="text-xs font-mono text-yellow-400">{sunIntensity.toFixed(2)}</span>
          </div>
          <Slider
            value={[sunIntensity]}
            min={0} max={2} step={0.01}
            onValueChange={([v]) => setLightingSettings({ sunIntensity: v })}
            data-testid="slider-sun-intensity"
          />
          <div className="text-xs text-muted-foreground mt-1">Main directional light for shadows</div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">Shadow Darkness</span>
            <span className="text-xs font-mono text-muted-foreground">{shadowStrength.toFixed(2)}</span>
          </div>
          <Slider
            value={[shadowStrength]}
            min={0} max={1} step={0.01}
            onValueChange={([v]) => setLightingSettings({ shadowStrength: v })}
            data-testid="slider-shadow-strength"
          />
          <div className="text-xs text-muted-foreground mt-1">0 = no shadow, 1 = full black</div>
        </div>
        <div className="text-xs text-muted-foreground/60 border-t border-sidebar-border pt-2">
          Changes apply live to the 3D viewport
        </div>
      </div>
      <div className="w-52 border-l border-sidebar-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scene Lights</span>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-xs p-1.5 rounded hover-elevate bg-sidebar-accent/50">
            <Sun className="w-3 h-3 text-yellow-400" />
            <span className="flex-1">Hemispheric Light</span>
            <span className="font-mono text-muted-foreground">{(ambientIntensity * 4).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs p-1.5 rounded hover-elevate bg-sidebar-accent/50">
            <Sun className="w-3 h-3 text-orange-400" />
            <span className="flex-1">Directional Light</span>
            <span className="font-mono text-muted-foreground">{(sunIntensity * 1.5).toFixed(1)}</span>
          </div>
          {sceneLights.map(light => {
            const comp = light.components.find(c => c.type === 'light');
            return (
              <div key={light.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover-elevate">
                <Sun className="w-3 h-3 text-blue-400" />
                <span className="flex-1 truncate">{light.name}</span>
                <span className="font-mono text-muted-foreground">{comp?.properties?.intensity?.toFixed(1) ?? '1.0'}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground/60">Settings auto-saved</div>
      </div>
    </div>
  );
}
