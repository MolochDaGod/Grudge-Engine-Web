import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CombatStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  comboCount?: number;
}

interface EnemyStats {
  name: string;
  health: number;
  maxHealth: number;
}

interface CombatUIProps {
  playerStats: CombatStats;
  enemyStats?: EnemyStats;
  isVisible?: boolean;
  isPaused?: boolean;
  onResume?: () => void;
  onStop?: () => void;
}

export function CombatUI({ playerStats, enemyStats, isVisible = true, isPaused, onResume, onStop }: CombatUIProps) {
  const [damageFlash, setDamageFlash] = useState(false);
  const [lastHealth, setLastHealth] = useState(playerStats.health);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [comboVisible, setComboVisible] = useState(false);

  useEffect(() => {
    if (playerStats.health < lastHealth) {
      setDamageFlash(true);
      const t = setTimeout(() => setDamageFlash(false), 250);
      return () => clearTimeout(t);
    }
    setLastHealth(playerStats.health);
  }, [playerStats.health, lastHealth]);

  useEffect(() => {
    const combo = playerStats.comboCount ?? 0;
    if (combo > 0) {
      setComboDisplay(combo);
      setComboVisible(true);
    } else {
      const t = setTimeout(() => setComboVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [playerStats.comboCount]);

  if (!isVisible) return null;

  const healthPct = Math.max(0, Math.min(100, (playerStats.health / playerStats.maxHealth) * 100));
  const staminaPct = Math.max(0, Math.min(100, (playerStats.stamina / playerStats.maxStamina) * 100));
  const enemyPct = enemyStats ? Math.max(0, Math.min(100, (enemyStats.health / enemyStats.maxHealth) * 100)) : 0;

  const healthColor = healthPct > 50 ? 'from-red-700 to-red-500' : healthPct > 25 ? 'from-orange-700 to-orange-500' : 'from-red-900 to-red-700 animate-pulse';
  const staminaColor = staminaPct > 30 ? 'from-green-700 to-green-500' : 'from-yellow-700 to-yellow-500';

  return (
    <div className="absolute inset-0 pointer-events-none z-50" data-testid="combat-ui">
      {/* Screen damage flash */}
      {damageFlash && (
        <div className="absolute inset-0 border-4 border-red-600/70 rounded pointer-events-none animate-pulse z-10" />
      )}

      {/* ── Pause Menu ── */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto" data-testid="pause-menu">
          <div className="bg-black/80 border border-white/10 rounded-xl p-8 space-y-4 min-w-56 text-center shadow-2xl">
            <div className="text-white text-2xl font-bold tracking-wide mb-6">⏸ Paused</div>
            <button
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              onClick={onResume}
              data-testid="button-resume"
            >
              Resume
            </button>
            <button
              className="w-full py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
              onClick={onStop}
              data-testid="button-stop-play"
            >
              Stop
            </button>
            <div className="text-xs text-white/40 pt-2">Press Escape to resume</div>
          </div>
        </div>
      )}

      {/* ── Player HUD — bottom left ── */}
      <div className={cn(
        "absolute bottom-6 left-6 space-y-2 transition-all duration-200",
        damageFlash && "scale-105"
      )}>
        {/* Health bar */}
        <div className="w-60 space-y-1">
          <div className="flex items-center justify-between text-xs text-white drop-shadow-lg">
            <span className="font-bold tracking-wide">❤ HP</span>
            <span className="font-mono text-[11px]">{Math.ceil(playerStats.health)} / {playerStats.maxHealth}</span>
          </div>
          <div className="relative h-4 bg-black/50 rounded overflow-hidden border border-white/15 shadow-inner">
            <div
              className={cn("absolute left-0 top-0 bottom-0 transition-all duration-300 bg-gradient-to-r", healthColor)}
              style={{ width: `${healthPct}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          </div>
        </div>

        {/* Stamina bar */}
        <div className="w-48 space-y-1">
          <div className="flex items-center justify-between text-xs text-white drop-shadow-lg">
            <span className="font-bold tracking-wide text-green-300">⚡ Stamina</span>
            <span className="font-mono text-[11px]">{Math.ceil(playerStats.stamina)} / {playerStats.maxStamina}</span>
          </div>
          <div className="relative h-2.5 bg-black/50 rounded overflow-hidden border border-white/15">
            <div
              className={cn("absolute left-0 top-0 bottom-0 transition-all duration-150 bg-gradient-to-r", staminaColor)}
              style={{ width: `${staminaPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Combo counter ── */}
      {comboVisible && comboDisplay > 1 && (
        <div className="absolute bottom-24 left-6 animate-bounce" data-testid="combo-counter">
          <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] tracking-tight">
            {comboDisplay}x
          </div>
          <div className="text-xs font-bold text-yellow-300 tracking-widest uppercase">Combo!</div>
        </div>
      )}

      {/* ── Enemy boss bar ── */}
      {enemyStats && enemyStats.health > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-96 space-y-1" data-testid="enemy-bar">
          <div className="text-center text-white text-sm font-bold drop-shadow-lg tracking-wide">{enemyStats.name}</div>
          <div className="relative h-3.5 bg-black/50 rounded overflow-hidden border border-white/15 shadow-inner">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300"
              style={{ width: `${enemyPct}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          </div>
        </div>
      )}

      {/* ── Controls hint — bottom right ── */}
      <div className="absolute bottom-6 right-6 text-white text-xs bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/10 space-y-1">
        <div className="font-bold text-white/80 mb-1.5 text-[11px] uppercase tracking-wide">Controls</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">WASD</kbd> Move</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">Shift</kbd> Sprint</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">Space</kbd> Jump</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">LMB</kbd> Attack</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">RMB</kbd> Heavy</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">F</kbd> Block</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">Q</kbd> Dodge</div>
          <div><kbd className="bg-white/15 px-1 rounded text-[10px]">Esc</kbd> Pause</div>
        </div>
      </div>
    </div>
  );
}

export function useCombatUI() {
  const [playerStats, setPlayerStats] = useState<CombatStats>({
    health: 100, maxHealth: 100, stamina: 100, maxStamina: 100, comboCount: 0
  });
  const [enemyStats, setEnemyStats] = useState<EnemyStats | undefined>();

  const updatePlayerStats = useCallback((health: number, maxHealth: number, stamina: number, maxStamina: number, comboCount?: number) => {
    setPlayerStats({ health, maxHealth, stamina, maxStamina, comboCount: comboCount ?? 0 });
  }, []);

  const updateEnemyStats = useCallback((name: string, health: number, maxHealth: number) => {
    if (health <= 0) setEnemyStats(undefined);
    else setEnemyStats({ name, health, maxHealth });
  }, []);

  const clearEnemy = useCallback(() => setEnemyStats(undefined), []);

  return { playerStats, enemyStats, updatePlayerStats, updateEnemyStats, clearEnemy };
}
