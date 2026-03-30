import { Volume2, Activity } from 'lucide-react';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

export function AudioMixerPanel() {
  const { audioSettings, setAudioSettings } = useEngineStore();

  const channels = [
    { key: 'master' as const, label: 'Master', color: 'bg-primary' },
    { key: 'music' as const, label: 'Music', color: 'bg-blue-500' },
    { key: 'sfx' as const, label: 'SFX', color: 'bg-green-500' },
    { key: 'ambient' as const, label: 'Ambient', color: 'bg-purple-500' },
  ];

  return (
    <div className="h-full flex">
      <div className="flex-1 flex gap-4 p-3">
        {channels.map(channel => {
          const value = audioSettings[channel.key];
          return (
            <div key={channel.key} className="flex flex-col items-center gap-2 w-16">
              <span className="text-xs text-muted-foreground">{channel.label}</span>
              <div className="flex-1 relative w-4 bg-sidebar-accent rounded min-h-[60px]">
                <div
                  className={cn("absolute bottom-0 w-full rounded transition-all", channel.color)}
                  style={{ height: `${value}%` }}
                />
              </div>
              <span className="text-xs font-mono">{value}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setAudioSettings({ [channel.key]: Number(e.target.value) })}
                className="w-full h-1"
                data-testid={`slider-audio-${channel.key}`}
              />
            </div>
          );
        })}
      </div>
      <div className="w-48 border-l border-sidebar-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audio Buses</span>
        <div className="mt-2 space-y-1">
          {channels.map(ch => (
            <div key={ch.key} className="flex items-center gap-2 text-xs p-1.5 rounded hover-elevate">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <span className="flex-1">{ch.label}</span>
              <span className="font-mono text-muted-foreground">{audioSettings[ch.key]}%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-sidebar-border">
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">Engine</div>
          <div className="flex items-center gap-2 text-xs p-1.5 rounded hover-elevate text-muted-foreground/60" data-testid="audio-engine-info">
            <Activity className="w-3 h-3" />
            <span>Howler.js v2</span>
            <span className="ml-auto text-green-500 text-[10px]">Active</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground/60">
          Settings saved automatically
        </div>
      </div>
    </div>
  );
}
