import { useState, useRef, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

export function ProfilerPanel() {
  const { engineMetrics } = useEngineStore();
  const { fps, drawCalls, vertices, triangles, renderMs, memoryMB } = engineMetrics;
  const frameMs = fps > 0 ? (1000 / fps).toFixed(1) : '—';
  const frameBudget = fps > 0 ? Math.min(100, (1000 / fps) / 16.67 * 100) : 0;
  const fpsHistory = useRef<number[]>([]);
  const [fpsChart, setFpsChart] = useState<number[]>(Array(30).fill(0));

  useEffect(() => {
    fpsHistory.current = [...fpsHistory.current.slice(-29), fps];
    setFpsChart([...fpsHistory.current]);
  }, [fps]);

  const maxFps = Math.max(...fpsChart, 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", fps > 50 ? "bg-green-500" : fps > 30 ? "bg-yellow-500" : "bg-red-500")} />
          <span className="text-xs font-mono font-semibold">{fps} FPS</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono">{memoryMB > 0 ? `${memoryMB} MB` : '— MB'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Meshes:</span>
          <span className="text-xs font-mono">{drawCalls}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Triangles:</span>
          <span className="text-xs font-mono">{triangles.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Verts:</span>
          <span className="text-xs font-mono">{vertices.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex-1 p-3">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-sidebar-accent rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Frame Time</div>
            <div className="text-lg font-mono">{frameMs}ms</div>
            <div className="h-1 bg-sidebar-border rounded mt-1">
              <div className="h-full bg-primary rounded transition-all" style={{ width: `${frameBudget}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Budget: 16.67ms</div>
          </div>
          <div className="bg-sidebar-accent rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Delta Time</div>
            <div className="text-lg font-mono">{renderMs}ms</div>
            <div className="h-1 bg-sidebar-border rounded mt-1">
              <div className="h-full bg-blue-500 rounded transition-all" style={{ width: `${Math.min(100, renderMs / 33 * 100)}%` }} />
            </div>
          </div>
          <div className="bg-sidebar-accent rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Active Meshes</div>
            <div className="text-lg font-mono">{drawCalls}</div>
            <div className="text-xs text-muted-foreground">in view</div>
          </div>
          <div className="bg-sidebar-accent rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">JS Heap</div>
            <div className="text-lg font-mono">{memoryMB > 0 ? memoryMB : '—'}</div>
            <div className="text-xs text-muted-foreground">MB</div>
          </div>
        </div>
        <div className="bg-sidebar-accent rounded p-2">
          <div className="text-xs text-muted-foreground mb-2">FPS History (30s)</div>
          <div className="flex items-end gap-0.5 h-12">
            {fpsChart.map((f, i) => (
              <div
                key={i}
                className={cn("flex-1 rounded-sm transition-all", f > 50 ? "bg-green-500/70" : f > 30 ? "bg-yellow-500/70" : f > 0 ? "bg-red-500/70" : "bg-sidebar-border")}
                style={{ height: `${maxFps > 0 ? (f / maxFps) * 100 : 0}%`, minHeight: f > 0 ? '2px' : undefined }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>30s ago</span>
            <span className={cn("font-mono", fps > 50 ? "text-green-400" : fps > 30 ? "text-yellow-400" : "text-red-400")}>{fps} FPS now</span>
            <span>now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
