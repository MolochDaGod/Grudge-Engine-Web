import { useState, useEffect } from 'react';
import { Film, Play, Square, GitBranch, List, Plus, Trash2, Settings, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import {
  getAnimator, type AnimatorController, type AnimatorState, type AnimatorTransition,
  type AnimatorParameter, type AnimatorControllerData
} from '@/lib/animator';

function StateGraphView({ controller, activeState }: { controller: AnimatorController | null; activeState: string }) {
  const data = controller?.getData();
  const layer = data?.layers[0];
  const states = layer?.states || [];
  const transitions = layer?.transitions || [];
  const inTransition = controller?.isInTransition() ?? false;

  return (
    <div className="flex-1 overflow-auto bg-sidebar-accent/20 rounded-md border border-sidebar-border m-2">
      <svg width="560" height="420" viewBox="0 0 560 420" className="text-xs">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          </marker>
          <marker id="arrowActive" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--primary))" opacity="0.8" />
          </marker>
        </defs>
        {transitions.map((t, i) => {
          const s = states.find(x => x.name === t.from);
          const target = states.find(x => x.name === t.to);
          if (!s || !target) return null;
          const isActive = (t.from === activeState || t.to === activeState) && inTransition;
          return (
            <line
              key={`${t.from}-${t.to}-${i}`}
              x1={s.x + 45} y1={s.y + 16}
              x2={target.x + 45} y2={target.y + 16}
              stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              strokeWidth={isActive ? 2 : 1}
              strokeOpacity={isActive ? 0.8 : 0.25}
              markerEnd={isActive ? 'url(#arrowActive)' : 'url(#arrowhead)'}
            />
          );
        })}
        {states.map(state => {
          const isActive = state.name === activeState;
          const isDefault = state.name === layer?.defaultState;
          return (
            <g key={state.name} transform={`translate(${state.x}, ${state.y})`}>
              <rect
                width="90" height="32" rx="5"
                fill={isActive ? 'hsl(var(--primary))' : isDefault ? 'hsl(142 76% 36%)' : 'hsl(var(--sidebar-accent))'}
                stroke={isActive ? 'hsl(var(--primary))' : isDefault ? 'hsl(142 76% 36%)' : 'hsl(var(--sidebar-border))'}
                strokeWidth={isActive || isDefault ? 2 : 1}
              />
              <text
                x="45" y="19"
                textAnchor="middle"
                fill={isActive || isDefault ? 'white' : 'hsl(var(--foreground))'}
                fontSize="10"
                fontWeight={isActive ? '600' : '400'}
                className="select-none pointer-events-none"
              >
                {state.name.length > 12 ? state.name.slice(0, 12) + '..' : state.name}
              </text>
              {isActive && (
                <circle cx="84" cy="6" r="4" fill="#22c55e" className="animate-pulse" />
              )}
              {state.loop && (
                <text x="4" y="8" fontSize="8" fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none">↻</text>
              )}
            </g>
          );
        })}
        {states.length === 0 && (
          <text x="280" y="210" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">
            No animator states. Add an Animator component and press Play.
          </text>
        )}
      </svg>
    </div>
  );
}

function ParametersView({ controller }: { controller: AnimatorController | null }) {
  const params = controller?.getAllParameters() || [];

  if (params.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        No parameters defined
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {params.map(param => (
          <div key={param.name} className="flex items-center gap-2 px-2 py-1.5 rounded bg-sidebar-accent/30 text-xs">
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              param.type === 'float' ? 'bg-blue-400' :
              param.type === 'int' ? 'bg-cyan-400' :
              param.type === 'bool' ? 'bg-amber-400' : 'bg-red-400'
            )} />
            <span className="font-mono flex-1 truncate">{param.name}</span>
            <span className="text-muted-foreground/60 uppercase text-[9px]">{param.type}</span>
            <span className="font-mono text-muted-foreground min-w-[40px] text-right">
              {param.type === 'bool' || param.type === 'trigger' ? (param.value ? 'true' : 'false') :
               typeof param.value === 'number' ? param.value.toFixed(2) : String(param.value)}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function TransitionsView({ controller, activeState }: { controller: AnimatorController | null; activeState: string }) {
  const data = controller?.getData();
  const layer = data?.layers[0];
  const transitions = layer?.transitions || [];

  if (transitions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        No transitions defined
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {transitions.map((t, i) => {
          const isRelevant = t.from === activeState || t.to === activeState;
          return (
            <div
              key={`${t.from}-${t.to}-${i}`}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs",
                isRelevant ? "bg-primary/10" : "hover:bg-sidebar-accent/50"
              )}
            >
              <span className="font-mono truncate max-w-[80px]">{t.from}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="font-mono truncate max-w-[80px]">{t.to}</span>
              {t.hasExitTime && (
                <span className="ml-auto text-[9px] text-muted-foreground/60">exit:{(t.exitTime * 100).toFixed(0)}%</span>
              )}
              <span className="text-[9px] text-muted-foreground/60 ml-1">{(t.duration * 1000).toFixed(0)}ms</span>
              {t.conditions.length > 0 && (
                <span className="text-[9px] text-amber-400 ml-1">{t.conditions.length} cond</span>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function AnimationPanel() {
  const { animationRegistry, selectedObjectId, setCurrentAnimation, getCurrentScene, isPlaying } = useEngineStore();
  const [view, setView] = useState<'clips' | 'graph' | 'params' | 'transitions'>('clips');
  const [, setTick] = useState(0);

  const selectedInfo = selectedObjectId ? animationRegistry.get(selectedObjectId) : null;
  const selectedObject = selectedObjectId ? getCurrentScene()?.objects.find(o => o.id === selectedObjectId) : null;
  const clips = selectedInfo?.animations || [];
  const currentAnim = selectedInfo?.currentAnimation || null;
  const animator = selectedObjectId ? getAnimator(selectedObjectId) ?? null : null;
  const animatorState = animator ? animator.getCurrentState() : '';

  useEffect(() => {
    if (!isPlaying || !animator) return;
    const interval = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, [isPlaying, animator]);

  const handlePlay = (animName: string) => {
    if (!selectedObjectId) return;
    if (animator && isPlaying) {
      animator.crossFade(animName, 0.2);
    } else {
      const next = currentAnim === animName ? null : animName;
      setCurrentAnimation(selectedObjectId, next);
    }
  };

  if (!selectedObjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Film className="w-8 h-8" />
        <span className="text-xs">Select an object to view its animations</span>
      </div>
    );
  }

  const viewButtons = (
    <div className="ml-auto flex gap-0.5 shrink-0">
      <Button variant={view === 'clips' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setView('clips')} title="Clips">
        <List className="w-3 h-3" />
      </Button>
      <Button variant={view === 'graph' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setView('graph')} title="State Graph">
        <GitBranch className="w-3 h-3" />
      </Button>
      <Button variant={view === 'params' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setView('params')} title="Parameters">
        <Settings className="w-3 h-3" />
      </Button>
      <Button variant={view === 'transitions' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setView('transitions')} title="Transitions">
        <Zap className="w-3 h-3" />
      </Button>
    </div>
  );

  if (clips.length === 0 && !animator) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{selectedObject?.name || 'Object'}</span>
          {viewButtons}
        </div>
        {view === 'graph' ? (
          <StateGraphView controller={animator} activeState={animatorState} />
        ) : view === 'params' ? (
          <ParametersView controller={animator} />
        ) : view === 'transitions' ? (
          <TransitionsView controller={animator} activeState={animatorState} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <span className="text-xs">No animation clips found</span>
            <span className="text-xs text-muted-foreground/60">Import a GLB with animations to see clips here</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{selectedObject?.name || 'Object'}</span>
          <span className="text-xs text-muted-foreground">
            {animator ? `— ${animator.getData().layers[0]?.states.length || 0} states` : `— ${clips.length} clip${clips.length !== 1 ? 's' : ''}`}
          </span>
          {animatorState && isPlaying && (
            <span className="ml-1 text-xs text-green-400 flex items-center gap-1 truncate max-w-[120px]">
              <Play className="w-3 h-3 shrink-0" /> {animatorState}
            </span>
          )}
          {!animator && currentAnim && (
            <span className="ml-1 text-xs text-green-400 flex items-center gap-1 truncate max-w-[120px]">
              <Play className="w-3 h-3 shrink-0" /> {currentAnim}
            </span>
          )}
          {viewButtons}
        </div>

        {view === 'graph' ? (
          <StateGraphView controller={animator} activeState={animatorState} />
        ) : view === 'params' ? (
          <ParametersView controller={animator} />
        ) : view === 'transitions' ? (
          <TransitionsView controller={animator} activeState={animatorState} />
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {clips.map((clip) => {
                  const isClipPlaying = currentAnim === clip || animatorState === clip;
                  return (
                    <div
                      key={clip}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded hover-elevate cursor-pointer text-xs",
                        isClipPlaying ? "bg-primary/20 text-primary" : "hover:bg-sidebar-accent"
                      )}
                      onClick={() => handlePlay(clip)}
                      data-testid={`anim-clip-${clip}`}
                    >
                      <div className={cn("w-2 h-2 rounded-full shrink-0", isClipPlaying ? "bg-primary animate-pulse" : "bg-sidebar-border")} />
                      <span className="flex-1 font-mono truncate">{clip}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={(e) => { e.stopPropagation(); handlePlay(clip); }}
                      >
                        {isClipPlaying ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {(currentAnim || animatorState) && (
              <div className="border-t border-sidebar-border p-2 flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => selectedObjectId && setCurrentAnimation(selectedObjectId, null)}>
                  <Square className="w-3 h-3" /> Stop All
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="w-44 border-l border-sidebar-border p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {animator ? 'Animator Info' : 'All Animated'}
        </span>
        {animator ? (
          <div className="mt-2 space-y-2">
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-mono">{animatorState || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Layer</span><span className="font-mono">{animator.getData().layers[0]?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Blending</span><span className="font-mono">{animator.isInTransition() ? 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">States</span><span className="font-mono">{animator.getData().layers[0]?.states.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Params</span><span className="font-mono">{animator.getAllParameters().length}</span></div>
            </div>
            <div className="border-t border-sidebar-border pt-2">
              <span className="text-[9px] uppercase text-muted-foreground/60">Engine: Rapier + Animator</span>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            {Array.from(animationRegistry.entries()).map(([objId, info]) => {
              const obj = getCurrentScene()?.objects.find(o => o.id === objId);
              return (
                <div key={objId} className="text-xs p-1 rounded hover-elevate flex items-center gap-1">
                  <Film className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{obj?.name || objId.slice(0, 8)}</span>
                  <span className="ml-auto text-muted-foreground/60">{info.animations.length}</span>
                </div>
              );
            })}
            {animationRegistry.size === 0 && (
              <div className="text-xs text-muted-foreground/60 p-1">No animated objects</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
