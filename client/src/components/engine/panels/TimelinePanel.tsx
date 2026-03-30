import { useState, useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';

export function TimelinePanel() {
  const { currentTime, setCurrentTime, selectedObjectId, getCurrentScene } = useEngineStore();
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedObject = selectedObjectId ? getCurrentScene()?.objects.find(o => o.id === selectedObjectId) : null;
  const pos = selectedObject?.transform.position;
  const rot = selectedObject?.transform.rotation;
  const scl = selectedObject?.transform.scale;

  const tracks = selectedObject ? [
    { label: 'Position', sub: pos ? `X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}` : '—', color: 'bg-blue-500' },
    { label: 'Rotation', sub: rot ? `X:${rot.x.toFixed(1)}° Y:${rot.y.toFixed(1)}° Z:${rot.z.toFixed(1)}°` : '—', color: 'bg-green-500' },
    { label: 'Scale', sub: scl ? `X:${scl.x.toFixed(2)} Y:${scl.y.toFixed(2)} Z:${scl.z.toFixed(2)}` : '—', color: 'bg-orange-500' },
  ] : [
    { label: 'Position', sub: '—', color: 'bg-blue-500' },
    { label: 'Rotation', sub: '—', color: 'bg-green-500' },
    { label: 'Scale', sub: '—', color: 'bg-orange-500' },
  ];

  const timeRef = useRef(currentTime);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

  const togglePlay = () => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playRef.current = setInterval(() => {
        const next = timeRef.current + 0.05;
        if (next >= duration) {
          setIsPlaying(false);
          if (playRef.current) clearInterval(playRef.current);
          setCurrentTime(0);
        } else {
          setCurrentTime(next);
        }
      }, 50);
    }
  };

  useEffect(() => { return () => { if (playRef.current) clearInterval(playRef.current); }; }, []);

  const progressPct = (currentTime / duration) * 100;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-sidebar-border shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={togglePlay} data-testid="button-timeline-play">
          {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{currentTime.toFixed(2)}s / {duration}s</span>
        <div className="flex-1 relative cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCurrentTime(((e.clientX - rect.left) / rect.width) * duration);
        }}>
          <div className="h-1.5 bg-sidebar-accent rounded">
            <div className="h-full bg-primary rounded transition-none" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
          <SelectTrigger className="h-6 w-20 text-xs" data-testid="select-timeline-duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 30, 60].map(d => <SelectItem key={d} value={String(d)} className="text-xs">{d}s</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px] h-full">
          <div className="flex items-center h-7 border-b border-sidebar-border bg-sidebar-accent/20">
            <div className="w-44 px-3 text-xs text-muted-foreground border-r border-sidebar-border shrink-0">
              {selectedObject ? selectedObject.name : 'No Selection'}
            </div>
            <div className="flex-1 relative h-full">
              {Array.from({ length: duration + 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-sidebar-border/40" style={{ left: `${(i / duration) * 100}%` }}>
                  <span className="text-[10px] text-muted-foreground/60 ml-0.5">{i}s</span>
                </div>
              ))}
              <div className="absolute top-0 bottom-0 border-l-2 border-primary z-10 transition-none" style={{ left: `${progressPct}%` }} />
            </div>
          </div>
          {tracks.map(track => (
            <div key={track.label} className="flex items-center h-9 border-b border-sidebar-border/40">
              <div className="w-44 px-3 border-r border-sidebar-border shrink-0">
                <div className="text-xs font-medium">{track.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{track.sub}</div>
              </div>
              <div className="flex-1 relative h-full bg-sidebar-accent/10">
                <div className="absolute top-0 bottom-0 border-l-2 border-primary/40 z-10 transition-none" style={{ left: `${progressPct}%` }} />
                {selectedObject && [0.1, 0.5].map((pct, ki) => (
                  <div key={ki} className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border-2 border-white/20 ${track.color}`} style={{ left: `${pct * 100}%`, transform: 'translate(-50%, -50%) rotate(45deg)' }} title={`Keyframe at ${(pct * duration).toFixed(1)}s`} />
                ))}
              </div>
            </div>
          ))}
          {!selectedObject && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60">
              Select an object in the hierarchy to edit its timeline
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
