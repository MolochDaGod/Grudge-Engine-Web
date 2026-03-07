// ─── Animation Controller ─────────────────────────────────────────────────
// Full state-machine-driven animation controller wrapping THREE.AnimationMixer.
// Supports cross-fade transitions, speed multipliers, clip name matching,
// condition-based transitions, lock system, anyState interrupts, and hooks.
// Ported from GrudgeStudioNPM AnimationStateMachine patterns.

import * as THREE from 'three';

export type AnimState = 'idle' | 'walk' | 'attack' | 'attack2' | 'gather' | 'mining' |
  'building' | 'stunned' | 'hurt' | 'die' | 'cast' | 'special';

// ─── Animation State Definition ──────────────────────────────────────────

export interface AnimStateTransition {
  condition: (ctx: Record<string, unknown>) => boolean;
  blendTime: number;
  priority: number;
}

export class AnimationState {
  name: AnimState;
  animation: AnimState;
  loop: boolean;
  speed: number;
  blendTime: number;
  transitions: Map<AnimState, AnimStateTransition> = new Map();
  conditions: ((ctx: Record<string, unknown>) => boolean)[] = [];
  onEnter: ((ctx: Record<string, unknown>) => void) | null = null;
  onExit: ((ctx: Record<string, unknown>) => void) | null = null;
  onUpdate: ((ctx: Record<string, unknown>, dt: number) => void) | null = null;

  constructor(name: AnimState, options: {
    loop?: boolean; speed?: number; blendTime?: number;
    onEnter?: ((ctx: Record<string, unknown>) => void) | null;
    onExit?: ((ctx: Record<string, unknown>) => void) | null;
    onUpdate?: ((ctx: Record<string, unknown>, dt: number) => void) | null;
  } = {}) {
    this.name = name;
    this.animation = name;
    this.loop = options.loop ?? true;
    this.speed = options.speed ?? 1;
    this.blendTime = options.blendTime ?? 0.2;
    this.onEnter = options.onEnter ?? null;
    this.onExit = options.onExit ?? null;
    this.onUpdate = options.onUpdate ?? null;
  }

  addTransition(toState: AnimState, condition: (ctx: Record<string, unknown>) => boolean, options: { blendTime?: number; priority?: number } = {}): this {
    this.transitions.set(toState, {
      condition,
      blendTime: options.blendTime ?? this.blendTime,
      priority: options.priority ?? 0,
    });
    return this;
  }

  addCondition(condition: (ctx: Record<string, unknown>) => boolean): this {
    this.conditions.push(condition);
    return this;
  }

  canEnter(ctx: Record<string, unknown>): boolean {
    return this.conditions.every(c => c(ctx));
  }
}

// ─── Clip matching aliases ────────────────────────────────────────────────

const CLIP_NAME_ALIASES: Record<AnimState, string[]> = {
  idle:     ['idle', 'stand', 'rest', 'breathe'],
  walk:     ['walk', 'run', 'move', 'locomotion'],
  attack:   ['attack', 'slash', 'hit', 'strike', 'swing', 'melee'],
  attack2:  ['attack2', 'attack_2', 'heavy', 'power'],
  gather:   ['gather', 'chop', 'harvest', 'woodcutting'],
  mining:   ['mining', 'mine', 'dig', 'pickaxe'],
  building: ['building', 'build', 'construct', 'hammer'],
  stunned:  ['stunned', 'stun', 'stagger', 'daze'],
  hurt:     ['hurt', 'hit_react', 'damage', 'pain', 'flinch'],
  die:      ['die', 'death', 'dead', 'fall'],
  cast:     ['cast', 'spell', 'magic', 'channel'],
  special:  ['special', 'ability', 'skill', 'taunt', 'emote'],
};

const ANIM_SPEEDS: Record<AnimState, number> = {
  idle: 0.8, walk: 2.5, attack: 1.8, attack2: 1.8, cast: 1.5,
  gather: 1.5, mining: 1.5, building: 1.5, hurt: 3.0,
  stunned: 0.8, special: 2.0, die: 1.0,
};

const ONE_SHOT_STATES = new Set<AnimState>(['die', 'hurt', 'cast', 'special'] as AnimState[]);

// ─── Main AnimController ──────────────────────────────────────────────────

export class AnimController {
  mixer: THREE.AnimationMixer;
  private clips: Map<AnimState, THREE.AnimationClip> = new Map();
  private actions: Map<AnimState, THREE.AnimationAction> = new Map();
  private currentState: AnimState = 'idle';
  private previousState: AnimState | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private crossFadeDuration = 0.2;

  // State machine enhancements
  private states: Map<AnimState, AnimationState> = new Map();
  private anyStateTransitions: { toState: AnimState; condition: (ctx: Record<string, unknown>) => boolean; blendTime: number; priority: number }[] = [];
  private context: Record<string, unknown> = {};
  private locked = false;
  private lockTimer = 0;
  onStateChange: ((from: AnimState | null, to: AnimState) => void) | null = null;

  constructor(mixer: THREE.AnimationMixer, rawClips: THREE.AnimationClip[]) {
    this.mixer = mixer;
    this.mapClips(rawClips);

    // Start idle
    const idleAction = this.actions.get('idle');
    if (idleAction) {
      idleAction.reset().play();
      this.currentAction = idleAction;
    }
  }

  /** Create controller from a model root + clips */
  static fromModel(model: THREE.Object3D, clips: THREE.AnimationClip[]): AnimController {
    const mixer = new THREE.AnimationMixer(model);
    return new AnimController(mixer, clips);
  }

  // ─── State Machine API ────────────────────────────────────────────────

  /** Register a state definition for condition-based transitions */
  addState(state: AnimationState): this {
    this.states.set(state.name, state);
    return this;
  }

  /** Add a transition that can fire from any state (e.g. hurt, die) */
  addAnyStateTransition(toState: AnimState, condition: (ctx: Record<string, unknown>) => boolean, options: { blendTime?: number; priority?: number } = {}): this {
    this.anyStateTransitions.push({
      toState, condition,
      blendTime: options.blendTime ?? 0.2,
      priority: options.priority ?? 0,
    });
    this.anyStateTransitions.sort((a, b) => b.priority - a.priority);
    return this;
  }

  /** Lock state machine for a duration (prevents transitions during attack wind-ups etc) */
  lock(duration: number): this {
    this.locked = true;
    this.lockTimer = duration;
    return this;
  }

  /** Unlock state machine */
  unlock(): this {
    this.locked = false;
    this.lockTimer = 0;
    return this;
  }

  /** Set context value for condition evaluation */
  setContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  /** Get context value */
  getContext(key: string): unknown {
    return this.context[key];
  }

  // ─── Clip Mapping ─────────────────────────────────────────────────────

  private mapClips(rawClips: THREE.AnimationClip[]) {
    for (const [state, aliases] of Object.entries(CLIP_NAME_ALIASES) as [AnimState, string[]][]) {
      const clip = this.findClip(rawClips, aliases);
      if (clip) {
        this.clips.set(state, clip);
        const action = this.mixer.clipAction(clip);
        this.actions.set(state, action);
      }
    }

    // If no clips matched at all but we have at least one, use first as idle
    if (this.clips.size === 0 && rawClips.length > 0) {
      this.clips.set('idle', rawClips[0]);
      const action = this.mixer.clipAction(rawClips[0]);
      this.actions.set('idle', action);
      if (rawClips.length > 1) {
        this.clips.set('walk', rawClips[1]);
        this.actions.set('walk', this.mixer.clipAction(rawClips[1]));
      }
      if (rawClips.length > 2) {
        this.clips.set('attack', rawClips[2]);
        this.actions.set('attack', this.mixer.clipAction(rawClips[2]));
      }
    }
  }

  private findClip(clips: THREE.AnimationClip[], aliases: string[]): THREE.AnimationClip | null {
    for (const alias of aliases) {
      const found = clips.find(c => c.name.toLowerCase().includes(alias));
      if (found) return found;
    }
    return null;
  }

  // ─── Play / Transition ────────────────────────────────────────────────

  /** Transition to a new animation state (backward-compatible API) */
  play(state: AnimState): this {
    if (this.locked && state !== 'die' && state !== 'hurt') return this;
    if (state === this.currentState && this.currentAction?.isRunning()) return this;

    const action = this.actions.get(state);
    if (!action) {
      // No clip for this state — try fallback
      if (state === 'attack2') return this.play('attack');
      if (state === 'mining') return this.play('gather');
      if (state === 'building') return this.play('gather');
      if (state === 'stunned') return this.play('idle');
      if (state === 'special') return this.play('attack');
      return this;
    }

    // Check AnimationState conditions if registered
    const stateDef = this.states.get(state);
    if (stateDef && !stateDef.canEnter(this.context)) return this;

    // Fire exit hook on previous state
    const prevDef = this.states.get(this.currentState);
    if (prevDef?.onExit) prevDef.onExit(this.context);

    const isOneShot = ONE_SHOT_STATES.has(state);
    action.setLoop(isOneShot ? THREE.LoopOnce : THREE.LoopRepeat, isOneShot ? 1 : Infinity);
    action.clampWhenFinished = isOneShot;
    action.timeScale = (stateDef?.speed ?? ANIM_SPEEDS[state]) ?? 1;

    const blendTime = stateDef?.blendTime ?? this.crossFadeDuration;

    if (this.currentAction && this.currentAction !== action) {
      action.reset();
      action.play();
      this.currentAction.crossFadeTo(action, blendTime, true);
    } else {
      action.reset();
      action.fadeIn(blendTime);
      action.play();
    }

    this.previousState = this.currentState;
    this.currentState = state;
    this.currentAction = action;

    // Fire enter hook
    if (stateDef?.onEnter) stateDef.onEnter(this.context);
    if (this.onStateChange) this.onStateChange(this.previousState, state);

    return this;
  }

  /** Update the mixer + evaluate condition transitions — call every frame */
  update(dt: number) {
    this.mixer.update(dt);

    // Lock timer
    if (this.locked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) this.unlock();
    }

    // Fire onUpdate hook for current state
    const curDef = this.states.get(this.currentState);
    if (curDef?.onUpdate) curDef.onUpdate(this.context, dt);

    // Skip transition evaluation if locked
    if (this.locked) return;

    // Evaluate any-state transitions (highest priority first)
    for (const anyT of this.anyStateTransitions) {
      if (anyT.condition(this.context) && anyT.toState !== this.currentState) {
        this.play(anyT.toState);
        return;
      }
    }

    // Evaluate current state's transitions
    if (curDef) {
      const transitions = Array.from(curDef.transitions.entries())
        .map(([toState, data]) => ({ toState, ...data }))
        .sort((a, b) => b.priority - a.priority);

      for (const trans of transitions) {
        if (trans.condition(this.context)) {
          this.play(trans.toState);
          break;
        }
      }
    }
  }

  // ─── Query API ────────────────────────────────────────────────────────

  getState(): AnimState { return this.currentState; }
  getPreviousState(): AnimState | null { return this.previousState; }
  isInState(name: AnimState): boolean { return this.currentState === name; }
  isAny(...names: AnimState[]): boolean { return names.includes(this.currentState); }
  hasClip(state: AnimState): boolean { return this.actions.has(state); }
  isLocked(): boolean { return this.locked; }

  stop() {
    this.mixer.stopAllAction();
    this.currentAction = null;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
