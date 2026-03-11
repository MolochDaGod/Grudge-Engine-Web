// ─── Combat State Machine ─────────────────────────────────────────────────
// Lightweight finite state machine replacing XState v4.
// Built dynamically from a WeaponStyle config via buildCombatMachine().
//
// Ported from annihilate-dev CombatStateMachineFactory.js.
// ~40 states covering idle, run, combo chain, charge chain, air combat,
// dash, block, specials, hit, climb, whirlwind, and launch.

import { type AnimSlot, resolveClip } from './animation-slots';
import { type WeaponStyle, type CombatTag } from './weapon-styles';

// ─── Types ────────────────────────────────────────────────────────────────

export type FSMEvent =
  | 'loaded' | 'run' | 'stop' | 'attack' | 'bash' | 'launch'
  | 'jump' | 'hit' | 'dash' | 'block' | 'air' | 'land' | 'climb'
  | 'finish' | 'keyJUp' | 'keyUUp' | 'keyOUp' | 'keyLUp'
  | 'hadouken' | 'shoryuken' | 'ajejebloken' | 'jumpPoint';

export type ActionCallback = (event?: FSMEvent) => void;

export interface FSMStateConfig {
  entry?: string[];
  exit?: string[];
  tags?: CombatTag[];
  on?: Record<string, string | { target: string; cond?: string }[]>;
  after?: Record<number, string>;  // delayed transitions (ms → target)
}

export interface FSMConfig {
  id: string;
  initial: string;
  states: Record<string, FSMStateConfig>;
}

export interface FSMActions {
  [actionName: string]: ActionCallback;
}

export interface FSMGuards {
  [guardName: string]: () => boolean;
}

// ─── State Machine ────────────────────────────────────────────────────────

export class CombatStateMachine {
  private config: FSMConfig;
  private currentState: string;
  private actions: FSMActions;
  private guards: FSMGuards;
  private delayTimers: ReturnType<typeof setTimeout>[] = [];

  /** Fires on every state transition */
  onTransition: ((from: string, to: string, event: FSMEvent) => void) | null = null;

  constructor(
    config: FSMConfig,
    actions: FSMActions = {},
    guards: FSMGuards = {},
  ) {
    this.config = config;
    this.currentState = config.initial;
    this.actions = actions;
    this.guards = guards;
  }

  // ─── Core API ───────────────────────────────────────────────────────────

  /** Send an event to the machine */
  send(event: FSMEvent): boolean {
    const stateCfg = this.config.states[this.currentState];
    if (!stateCfg?.on) return false;

    const transitions = stateCfg.on[event];
    if (!transitions) return false;

    // Simple string target
    if (typeof transitions === 'string') {
      return this.transitionTo(transitions, event);
    }

    // Array of conditional transitions
    if (Array.isArray(transitions)) {
      for (const t of transitions) {
        if (typeof t === 'string') {
          return this.transitionTo(t, event);
        }
        if (t.cond) {
          const guard = this.guards[t.cond];
          if (guard && !guard()) continue;
        }
        return this.transitionTo(t.target, event);
      }
    }

    return false;
  }

  /** Get current state name */
  getState(): string {
    return this.currentState;
  }

  /** Check if current state matches */
  matches(state: string): boolean {
    return this.currentState === state;
  }

  /** Check if current state is any of the given states */
  isAny(...states: string[]): boolean {
    return states.includes(this.currentState);
  }

  /** Check if current state has a specific tag */
  hasTag(tag: CombatTag): boolean {
    const stateCfg = this.config.states[this.currentState];
    return stateCfg?.tags?.includes(tag) ?? false;
  }

  /** Get all tags on current state */
  getTags(): CombatTag[] {
    const stateCfg = this.config.states[this.currentState];
    return stateCfg?.tags ?? [];
  }

  /** Check if we can move (state has 'canMove' tag or is in a movement state) */
  canMove(): boolean {
    return this.isAny('run', 'idle', 'jump', 'fall', 'doubleFall', 'doubleJump', 'airIdle', 'dashFall');
  }

  /** Check if current state can deal damage */
  canDamage(): boolean {
    return this.hasTag('canDamage');
  }

  // ─── Action Binding ─────────────────────────────────────────────────────

  /** Bind action callbacks (typically from character instance) */
  bindActions(actions: FSMActions): void {
    Object.assign(this.actions, actions);
  }

  /** Bind guard callbacks */
  bindGuards(guards: FSMGuards): void {
    Object.assign(this.guards, guards);
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private transitionTo(target: string, event: FSMEvent): boolean {
    // Resolve absolute references (e.g. "#charId.idle" → "idle")
    const resolved = target.includes('.') ? target.split('.').pop()! : target;

    const nextCfg = this.config.states[resolved];
    if (!nextCfg) {
      console.warn(`CombatStateMachine: Unknown state "${resolved}"`);
      return false;
    }

    const prevState = this.currentState;
    const prevCfg = this.config.states[prevState];

    // Fire exit actions
    if (prevCfg?.exit) {
      for (const actionName of prevCfg.exit) {
        this.actions[actionName]?.(event);
      }
    }

    // Clear pending delay timers
    this.clearDelayTimers();

    // Transition
    this.currentState = resolved;

    // Fire entry actions
    if (nextCfg.entry) {
      for (const actionName of nextCfg.entry) {
        this.actions[actionName]?.(event);
      }
    }

    // Schedule delayed transitions
    if (nextCfg.after) {
      for (const [msStr, afterTarget] of Object.entries(nextCfg.after)) {
        const ms = parseInt(msStr, 10);
        const timer = setTimeout(() => {
          if (this.currentState === resolved) {
            this.transitionTo(afterTarget, 'finish');
          }
        }, ms);
        this.delayTimers.push(timer);
      }
    }

    // Callback
    if (this.onTransition) {
      this.onTransition(prevState, resolved, event);
    }

    return true;
  }

  private clearDelayTimers(): void {
    for (const t of this.delayTimers) clearTimeout(t);
    this.delayTimers = [];
  }

  /** Reset to initial state */
  reset(): void {
    this.clearDelayTimers();
    this.currentState = this.config.initial;
  }

  /** Dispose timers */
  dispose(): void {
    this.clearDelayTimers();
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Build a CombatStateMachine from a WeaponStyle config.
 * Generates the full state topology matching annihilate-dev's ~40-state machine.
 */
export function buildCombatMachine(
  weaponStyle: WeaponStyle,
  characterId: string = 'character',
): { machine: CombatStateMachine; config: FSMConfig } {
  const anim = weaponStyle.animSet;
  const stats = weaponStyle.stats;
  const id = characterId;

  const clip = (slot: AnimSlot): string => resolveClip(anim, slot);

  // ─── State Definitions ──────────────────────────────────────────────

  const states: Record<string, FSMStateConfig> = {
    loading: {
      on: { loaded: 'idle' },
    },

    // ── Idle ──
    idle: {
      entry: ['playIdle'],
      on: {
        run: 'run',
        attack: weaponStyle.chargeEnabled
          ? [{ target: 'chargeAttack', cond: 'isCharged' }, { target: 'attackStartWithCharge' }]
          : [{ target: 'attackStartWithCharge' }],
        bash: 'bashStart',
        launch: 'launchStart',
        jump: 'jump',
        hit: 'hit',
        dash: 'dash',
        block: 'block',
        air: 'airIdle',
        hadouken: 'hadouken',
        shoryuken: 'shoryuken',
        ajejebloken: 'ajejebloken',
      },
    },

    // ── Run ──
    run: {
      entry: ['playRun'],
      tags: [],
      on: {
        stop: 'idle',
        attack: weaponStyle.chargeEnabled
          ? [{ target: 'chargeAttack', cond: 'isCharged' }, { target: 'attackStartWithCharge' }]
          : [{ target: 'attackStartWithCharge' }],
        bash: 'bashStart',
        launch: 'launchStart',
        jump: 'jump',
        hit: 'hit',
        dash: 'dash',
        air: 'airIdle',
        block: 'block',
        hadouken: 'hadouken',
        shoryuken: 'shoryuken',
        ajejebloken: 'ajejebloken',
      },
    },

    // ── Block ──
    block: {
      entry: ['playBlock'],
      on: {
        keyLUp: 'idle',
        hadouken: 'hadouken',
        shoryuken: 'shoryuken',
        ajejebloken: 'ajejebloken',
      },
    },

    // ── Special Moves ──
    hadouken: {
      entry: ['playHadouken'],
      tags: weaponStyle.specialMoves.special1?.tags ?? ['canDamage'],
      on: { finish: 'idle', hit: 'hit', dash: 'dash' },
    },
    shoryuken: {
      entry: ['playShoryuken'],
      tags: weaponStyle.specialMoves.special2?.tags ?? ['canDamage', 'canLaunch'],
      on: { finish: 'fall', hit: 'hit', dash: 'dash' },
    },
    ajejebloken: {
      entry: ['playAjejebloken'],
      exit: ['exitAjejebloken'],
      tags: weaponStyle.specialMoves.special3?.tags ?? ['canDamage'],
      on: { hit: 'hit' },
      after: { [weaponStyle.specialMoves.special3?.duration ?? 2000]: 'idle' },
    },

    // ── Bash → Whirlwind ──
    bashStart: {
      entry: ['playBashStart'],
      on: { finish: 'whirlwind', hit: 'hit', dash: 'dash', keyUUp: 'bashStartNotWhirlwind' },
    },
    bashStartNotWhirlwind: {
      on: { finish: 'idle', hit: 'hit', dash: 'dash' },
    },

    // ── Normal Attack Chain ──
    attackStartWithCharge: {
      entry: ['playAttackStart'],
      on: {
        finish: weaponStyle.chargeEnabled ? 'charging' : 'attack',
        hit: 'hit',
        dash: 'dash',
        keyJUp: 'attackStart',
      },
    },
    attackStart: {
      on: { finish: 'attack', hit: 'hit', dash: 'dash' },
    },
    attack: {
      entry: ['playAttack'],
      tags: weaponStyle.comboChain[0]?.tags ?? ['canDamage'],
      on: { finish: 'idle', attack: 'fistStart', hit: 'hit', dash: 'dash' },
    },

    // ── Fist / Strike combo ──
    fistStart: {
      entry: ['playFistStart'],
      on: { finish: 'fist', hit: 'hit', dash: 'dash' },
    },
    fist: {
      entry: ['playFist'],
      tags: weaponStyle.comboChain[1]?.tags ?? ['canDamage'],
      on: { finish: 'idle', attack: 'strikeStart', hit: 'hit', dash: 'dash' },
    },
    strikeStart: {
      entry: ['playStrikeStart'],
      on: { finish: 'strike', hit: 'hit', dash: 'dash' },
    },
    strike: {
      entry: ['playStrike'],
      tags: weaponStyle.comboChain[2]?.tags ?? ['canDamage', 'knockDown'],
      on: { finish: 'strikeEnd', hit: 'hit', dash: 'dash' },
    },
    strikeEnd: {
      entry: ['playStrikeEnd'],
      on: { finish: 'idle', hit: 'hit', dash: 'dash' },
    },

    // ── Launch ──
    launchStart: {
      entry: ['playLaunchStart'],
      tags: weaponStyle.launch?.tags ?? ['canDamage', 'canLaunch'],
      on: { finish: 'launchWithJump', hit: 'hit', dash: 'dash', keyOUp: 'launch' },
    },
    launchWithJump: {
      tags: weaponStyle.launch?.tags ?? ['canDamage', 'canLaunch'],
      on: { finish: 'fall', hit: 'hit', dash: 'dash' },
    },
    launch: {
      entry: ['playLaunch'],
      tags: weaponStyle.launch?.tags ?? ['canDamage', 'canLaunch'],
      on: { finish: 'idle', hit: 'hit', dash: 'dash' },
    },

    // ── Jump / Air ──
    jump: {
      entry: ['playJump', 'jump'],
      on: {
        finish: 'fall', land: 'idle', attack: 'airAttack',
        bash: 'airBashStartWithCharge', jump: 'doubleJump',
        hit: 'hit', dash: 'airDash', climb: 'climb', jumpPoint: 'airIdle',
      },
    },
    doubleJump: {
      entry: ['playJump', 'jump'],
      on: {
        finish: 'doubleFall', land: 'idle', attack: 'airAttack',
        bash: 'airBashStartWithCharge', hit: 'hit', dash: 'airDash',
        climb: 'climb', jumpPoint: 'airIdle',
      },
    },
    airIdle: {
      entry: ['playAirIdle'],
      on: {
        land: 'idle', attack: 'airAttack', bash: 'airBashStartWithCharge',
        jump: 'jump', hit: 'hit', dash: 'airDash', climb: 'climb', jumpPoint: 'airIdle',
      },
    },
    fall: {
      entry: ['playFall'],
      on: {
        land: 'idle', attack: 'airAttack', bash: 'airBashStartWithCharge',
        jump: 'doubleJump', hit: 'hit', dash: 'airDash',
        climb: 'climb', jumpPoint: 'airIdle',
      },
    },
    doubleFall: {
      entry: ['playFall'],
      on: {
        land: 'idle', attack: 'airAttack', bash: 'airBashStartWithCharge',
        hit: 'hit', dash: 'airDash', climb: 'climb', jumpPoint: 'airIdle',
      },
    },
    dashFall: {
      entry: ['playFall'],
      on: {
        land: 'idle', bash: 'airBashStartWithCharge',
        hit: 'hit', climb: 'climb', jumpPoint: 'airIdle',
      },
    },

    // ── Climb ──
    climb: {
      entry: ['playClimb'],
      exit: ['exitClimb'],
      on: { jump: 'climbJump', land: 'idle', attack: 'airIdle' },
    },
    climbJump: {
      entry: ['playClimbJump', 'jump'],
      on: {
        finish: 'fall', land: 'idle', attack: 'airAttack',
        bash: 'airBashStartWithCharge', jump: 'doubleJump',
        hit: 'hit', dash: 'airDash', climb: 'climb',
      },
    },

    // ── Air Attack Combo ──
    airAttack: {
      entry: ['playAirAttack'],
      tags: ['canDamage'],
      on: { finish: 'doubleFall', attack: 'airFist' },
    },
    airFist: {
      entry: ['playAirFist'],
      tags: ['canDamage'],
      on: { finish: 'doubleFall', attack: 'airStrike' },
    },
    airStrike: {
      entry: ['playAirStrike'],
      tags: ['canDamage'],
      on: { finish: 'doubleFall' },
    },

    // ── Air Bash ──
    airBashStartWithCharge: {
      entry: ['playAirBashStartWithCharge', 'setMassZero'],
      exit: ['restoreMass'],
      on: { finish: 'airChargeBash', hit: 'hit', keyUUp: 'airBashStart', keyJUp: 'airBashStart' },
    },
    airBashStart: {
      entry: ['playAirBashStart'],
      on: { finish: 'airBash', hit: 'hit' },
    },
    airChargeBash: {
      entry: ['playAirChargeBash'],
      tags: ['canDamage'],
      on: { finish: 'airChargeBashEnd', hit: 'hit' },
    },
    airBash: {
      entry: ['playAirBash'],
      tags: weaponStyle.airBash?.slamTags ?? ['canDamage', 'knockDown'],
      on: { finish: 'airBashEnd', hit: 'hit' },
    },
    airBashEnd: {
      entry: ['playAirBashEnd'],
      on: { finish: 'idle', hit: 'hit' },
    },
    airChargeBashEnd: {
      entry: ['playAirChargeBashEnd'],
      on: { finish: 'idle', hit: 'hit' },
    },

    // ── Hit ──
    hit: {
      entry: ['playHit'],
      on: {
        hit: 'hit',
        finish: [{ target: 'fall', cond: 'isAir' }, { target: 'idle' }],
      },
    },

    // ── Dash ──
    dash: {
      entry: ['playDash'],
      on: { attack: 'dashAttack' },
      after: { 300: 'idle' },
    },
    dashAttack: {
      entry: ['playDashAttack'],
      tags: ['canDamage'],
      on: { finish: 'idle', hit: 'hit' },
    },
    airDash: {
      entry: ['playAirDash', 'setMassZero'],
      exit: ['exitAirDash', 'restoreMass'],
      on: {
        finish: 'dashFall', land: 'idle', hit: 'hit',
        climb: 'climb', jumpPoint: 'airIdle', bash: 'airBashStartWithCharge',
      },
    },

    // ── Whirlwind ──
    whirlwind: {
      entry: ['playWhirlwind'],
      exit: ['exitWhirlwind'],
      tags: weaponStyle.whirlwind?.tags ?? ['canDamage'],
      on: { keyUUp: 'attack', hit: 'hit', dash: 'dash' },
    },
  };

  // ── Charge states (only if chargeEnabled) ──
  if (weaponStyle.chargeEnabled) {
    Object.assign(states, {
      charging: {
        on: { keyJUp: 'attack', hit: 'hit', dash: 'dash' },
        after: { 500: 'charged1' },
      },
      charged1: {
        entry: ['playCharged1'],
        on: { keyJUp: 'chargeAttack', hit: 'hit', dash: 'dash' },
        after: { 500: 'charged2' },
      },
      charged2: {
        entry: ['playCharged2'],
        on: { keyJUp: 'chargeAttack', hit: 'hit', dash: 'dash' },
      },
      chargeAttack: {
        entry: ['playChargeAttack'],
        tags: ['canDamage'],
        on: { finish: 'idle', attack: 'chargeFistStart', hit: 'hit', dash: 'dash' },
      },
      chargeFistStart: {
        entry: ['playChargeFistStart'],
        on: { finish: 'chargeFist', hit: 'hit', dash: 'dash' },
      },
      chargeFist: {
        entry: ['playChargeFist'],
        tags: ['canDamage'],
        on: { finish: 'idle', attack: 'chargeStrikeStart', hit: 'hit', dash: 'dash' },
      },
      chargeStrikeStart: {
        entry: ['playChargeStrikeStart'],
        on: { finish: 'chargeStrike', hit: 'hit', dash: 'dash' },
      },
      chargeStrike: {
        entry: ['playChargeStrike'],
        tags: ['canDamage', 'knockDown'],
        on: { finish: 'chargeStrikeEnd', hit: 'hit', dash: 'dash' },
      },
      chargeStrikeEnd: {
        entry: ['playChargeStrikeEnd'],
        on: { finish: 'idle', hit: 'hit', dash: 'dash' },
      },
    });
  }

  const config: FSMConfig = {
    id,
    initial: 'loading',
    states,
  };

  const machine = new CombatStateMachine(config, {}, {});
  return { machine, config };
}

// ─── Default Action Map Builder ───────────────────────────────────────────

/**
 * Create a default action map that calls fadeToSlot on a BabylonAnimController.
 * This bridges the FSM to the animation controller.
 */
export function createDefaultActions(
  fadeToSlot: (slot: AnimSlot, fadeDuration?: number, speed?: number) => void,
  playOneShot: (slot: AnimSlot, returnSlot?: AnimSlot, speed?: number) => void,
  weaponStyle: WeaponStyle,
): FSMActions {
  const speed = weaponStyle.stats.attackSpeed;

  return {
    // Locomotion
    playIdle:     () => fadeToSlot('idle'),
    playRun:      () => fadeToSlot('run'),
    playFall:     () => fadeToSlot('fall', 0.3),
    playAirIdle:  () => fadeToSlot('fall', 0.3),
    playClimb:    () => fadeToSlot('climb'),
    playClimbJump:() => fadeToSlot('jump'),

    // Jump
    playJump:     () => playOneShot('jump', 'fall'),

    // Block
    playBlock:    () => fadeToSlot('block'),

    // Normal combo
    playAttackStart: () => playOneShot('attackStart', 'idle', speed),
    playAttack:      () => playOneShot('attack', 'idle', speed),
    playFistStart:   () => playOneShot('fistStart', 'idle', speed),
    playFist:        () => playOneShot('fist', 'idle', speed),
    playStrikeStart: () => playOneShot('strikeStart', 'idle', speed),
    playStrike:      () => playOneShot('strike', 'idle', speed),
    playStrikeEnd:   () => playOneShot('strikeEnd', 'idle', speed),
    playBashStart:   () => playOneShot('attackStart', 'idle', speed),

    // Charge combo
    playChargeAttack:     () => playOneShot('attack', 'idle', speed * weaponStyle.stats.chargeAttackMultiplier),
    playChargeFistStart:  () => playOneShot('fistStart', 'idle', speed),
    playChargeFist:       () => playOneShot('fist', 'idle', speed * weaponStyle.stats.chargeAttackMultiplier),
    playChargeStrikeStart:() => playOneShot('strikeStart', 'idle', speed),
    playChargeStrike:     () => playOneShot('strike', 'idle', speed * weaponStyle.stats.chargeAttackMultiplier),
    playChargeStrikeEnd:  () => playOneShot('strikeEnd', 'idle'),
    playCharged1:         () => { /* Visual charge effect level 1 */ },
    playCharged2:         () => { /* Visual charge effect level 2 */ },

    // Dash
    playDash:       () => playOneShot('dash', 'idle'),
    playDashAttack: () => playOneShot('dashAttack', 'idle', speed),
    playAirDash:    () => fadeToSlot('fall', 0),

    // Air combat
    playAirAttack:  () => playOneShot('attack', 'fall', speed),
    playAirFist:    () => playOneShot('fist', 'fall', speed),
    playAirStrike:  () => playOneShot('strike', 'fall', speed),

    // Air bash
    playAirBashStartWithCharge: () => playOneShot('jumpAttackStart', 'fall'),
    playAirBashStart:           () => playOneShot('jumpAttackStart', 'fall'),
    playAirBash:                () => playOneShot('jumpAttack', 'idle'),
    playAirBashEnd:             () => playOneShot('jumpAttackEnd', 'idle'),
    playAirChargeBash:          () => playOneShot('jumpAttack', 'idle', speed * weaponStyle.stats.chargeAttackMultiplier),
    playAirChargeBashEnd:       () => playOneShot('jumpAttackEnd', 'idle'),

    // Hit
    playHit: () => playOneShot('hit', 'idle'),

    // Launch
    playLaunchStart: () => playOneShot('strike', 'idle', speed),
    playLaunch:      () => { /* Cancel launch timeout */ },

    // Whirlwind
    playWhirlwind:    () => fadeToSlot('whirlwind'),
    exitWhirlwind:    () => { /* Stop whirlwind VFX */ },

    // Specials
    playHadouken:     () => playOneShot('special1', 'idle'),
    playShoryuken:    () => playOneShot('special2', 'fall'),
    playAjejebloken:  () => fadeToSlot('special3'),
    exitAjejebloken:  () => { /* Stop special3 VFX */ },

    // Physics helpers
    jump:         () => { /* Apply jump velocity */ },
    setMassZero:  () => { /* Set physics mass to 0 */ },
    restoreMass:  () => { /* Restore physics mass */ },
    exitClimb:    () => { /* Restore physics from climb */ },
    exitAirDash:  () => { /* Stop air dash velocity */ },
  };
}
