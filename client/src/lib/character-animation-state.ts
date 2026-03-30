import * as BABYLON from '@babylonjs/core';
import type { WeaponType, AnimationAction } from '@shared/character-schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoadedClip {
  action: AnimationAction;
  group: BABYLON.AnimationGroup;
  loop: boolean;
  speed: number;
}

/** Skeleton-level animation range (legacy .babylon / FBX without AnimationGroups) */
interface SkeletonAnimRange {
  action: AnimationAction;
  from: number;
  to: number;
  loop: boolean;
  speed: number;
}

interface AnimationSetData {
  weaponType: WeaponType;
  clips: Map<AnimationAction, LoadedClip>;
  /** Fallback skeleton frame ranges for models that use scene.beginAnimation */
  skeletonRanges: Map<AnimationAction, SkeletonAnimRange>;
  loaded: boolean;
}

// ---------------------------------------------------------------------------
// Default animation set definitions (file path patterns per weapon type)
// ---------------------------------------------------------------------------

/** Map from weapon type → action → file path glob hints (resolved from manifest) */
const WEAPON_ACTION_HINTS: Record<string, Partial<Record<AnimationAction, RegExp>>> = {
  'unarmed': {
    idle: /idle/i,
    walk: /walk/i,
    run: /run/i,
    jump: /jump/i,
  },
  'sword-shield': {
    idle: /sword.*shield.*idle|combat.*idle/i,
    walk: /sword.*shield.*walk/i,
    run: /sword.*shield.*run/i,
    'slash-1': /sword.*shield.*slash(?!.*[2-5])/i,
    'slash-2': /sword.*shield.*slash.*2/i,
    'slash-3': /sword.*shield.*slash.*3/i,
    'slash-4': /sword.*shield.*slash.*4/i,
    'slash-5': /sword.*shield.*slash.*5/i,
    block: /sword.*shield.*block(?!.*idle)/i,
    'block-idle': /sword.*shield.*block.*idle/i,
    crouch: /sword.*shield.*crouch(?!.*idle|.*walk|.*block)/i,
    'crouch-idle': /sword.*shield.*crouch.*idle/i,
    impact: /sword.*shield.*impact/i,
    jump: /sword.*shield.*jump/i,
    'strafe-left': /sword.*shield.*strafe(?!.*right)/i,
    'strafe-right': /sword.*shield.*strafe.*right|strafe.*[34]/i,
    'turn-180': /sword.*shield.*180/i,
    attack: /sword.*shield.*attack/i,
    'power-up': /sword.*shield.*power/i,
  },
  'two-hand-sword': {
    idle: /two.*hand.*idle|great.*sword.*idle/i,
    walk: /two.*hand.*walk/i,
    run: /two.*hand.*run/i,
    combo: /two.*hand.*combo|great.*sword.*slash/i,
    attack: /two.*hand.*attack|great.*sword/i,
  },
  'staff-mage': {
    idle: /mage.*idle|cast.*idle/i,
    walk: /mage.*walk/i,
    run: /mage.*run/i,
    'cast-1': /cast.*01|mage.*cast(?!.*[2-4])/i,
    'cast-2': /cast.*02|mage.*cast.*2/i,
    'cast-3': /2h.*magic.*attack.*01/i,
    'cast-4': /2h.*magic.*attack.*03/i,
    'area-attack-1': /area.*attack.*01/i,
    'area-attack-2': /area.*attack.*02/i,
    'combat-idle': /mage.*combat.*idle/i,
  },
  'spear': {
    idle: /spear.*idle/i,
    walk: /spear.*walk/i,
    run: /spear.*run/i,
    attack: /spear.*attack/i,
    'combat-idle': /spear.*combat.*idle/i,
  },
  'bow': {
    idle: /archer.*idle|bow.*idle/i,
    walk: /archer.*walk|bow.*walk/i,
    run: /archer.*run|bow.*run/i,
    draw: /archer.*draw|bow.*draw/i,
    shoot: /archer.*shoot|bow.*shoot|archer.*attack/i,
    'combat-idle': /archer.*combat.*idle/i,
  },
  'dual-wield': {
    idle: /dual.*idle/i,
    walk: /dual.*walk/i,
    run: /dual.*run/i,
    combo: /dual.*combo/i,
    attack: /dual.*attack/i,
  },
  'hammer': {
    idle: /hammer.*idle|club.*idle/i,
    walk: /hammer.*walk|club.*walk/i,
    run: /hammer.*run|club.*run/i,
    attack: /hammer.*attack|club.*attack/i,
    combo: /one.*hand.*club.*combo/i,
  },
  'axe': {
    idle: /axe.*idle/i,
    walk: /axe.*walk/i,
    run: /axe.*run/i,
    attack: /axe.*attack/i,
  },
  'harvesting-pick': {
    idle: /worker.*idle|harvest.*idle/i,
    walk: /worker.*walk|harvest.*walk/i,
    run: /worker.*run|harvest.*run/i,
    working: /worker.*working|worker.*attack|harvest/i,
  },
  'harvesting-axe': {
    idle: /worker.*idle/i,
    walk: /worker.*walk/i,
    run: /worker.*run/i,
    working: /worker.*working|worker.*attack/i,
  },
};

// Non-looping actions
const ONE_SHOT_ACTIONS: Set<AnimationAction> = new Set([
  'jump', 'slash-1', 'slash-2', 'slash-3', 'slash-4', 'slash-5',
  'combo', 'impact', 'attack', 'cast-1', 'cast-2', 'cast-3', 'cast-4',
  'area-attack-1', 'area-attack-2', 'draw', 'shoot', 'death',
  'battlecry', 'power-up', 'emote', 'dance',
]);

// ---------------------------------------------------------------------------
// CharacterAnimationState
// ---------------------------------------------------------------------------

export class CharacterAnimationState {
  public currentWeaponType: WeaponType = 'unarmed';
  public currentAction: AnimationAction = 'idle';

  private scene: BABYLON.Scene;
  private sets: Map<WeaponType, AnimationSetData> = new Map();
  private activeClip: LoadedClip | null = null;
  private blendingFrom: LoadedClip | null = null;
  private blendProgress = 0;
  private blendDuration = 0.2; // seconds
  private isBlending = false;
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private disposed = false;

  /** Skeleton for legacy beginAnimation fallback */
  private skeleton: BABYLON.Skeleton | null = null;
  private activeSkeletonAnimatable: BABYLON.Animatable | null = null;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.observer = scene.onBeforeRenderObservable.add(() => this.update());
  }

  /** Bind a skeleton for legacy frame-range animation fallback */
  bindSkeleton(skeleton: BABYLON.Skeleton): void {
    this.skeleton = skeleton;
  }

  // ---- Public API ----------------------------------------------------------

  /** Switch weapon type, loading the animation set if needed */
  async setWeaponType(weaponType: WeaponType): Promise<void> {
    if (weaponType === this.currentWeaponType) return;
    this.currentWeaponType = weaponType;

    // Try to play idle for the new weapon type
    this.play('idle');
  }

  /** Register an animation group from an imported model */
  registerAnimationGroup(
    group: BABYLON.AnimationGroup,
    weaponType: WeaponType,
    action: AnimationAction,
    options: { loop?: boolean; speed?: number } = {},
  ): void {
    let set = this.sets.get(weaponType);
    if (!set) {
      set = { weaponType, clips: new Map(), skeletonRanges: new Map(), loaded: false };
      this.sets.set(weaponType, set);
    }

    const clip: LoadedClip = {
      action,
      group,
      loop: options.loop ?? !ONE_SHOT_ACTIONS.has(action),
      speed: options.speed ?? 1.0,
    };

    set.clips.set(action, clip);
    group.stop();
  }

  /**
   * Register a skeleton frame range for models that use the legacy
   * scene.beginAnimation(skeleton, from, to) pattern (like .babylon FBX imports).
   */
  registerSkeletonRange(
    weaponType: WeaponType,
    action: AnimationAction,
    from: number,
    to: number,
    options: { loop?: boolean; speed?: number } = {},
  ): void {
    let set = this.sets.get(weaponType);
    if (!set) {
      set = { weaponType, clips: new Map(), skeletonRanges: new Map(), loaded: false };
      this.sets.set(weaponType, set);
    }

    set.skeletonRanges.set(action, {
      action,
      from,
      to,
      loop: options.loop ?? !ONE_SHOT_ACTIONS.has(action),
      speed: options.speed ?? 1.0,
    });
  }

  /**
   * Auto-register skeleton animation ranges from a skeleton's named ranges.
   * Useful for .babylon files that define ranges like "Walk", "Run", etc.
   */
  autoRegisterSkeletonRanges(skeleton: BABYLON.Skeleton, weaponType: WeaponType = 'unarmed'): void {
    this.bindSkeleton(skeleton);

    // Check if the skeleton has animation ranges defined
    const ranges = skeleton.getAnimationRanges();
    if (!ranges || ranges.length === 0) return;

    for (const range of ranges) {
      if (!range || !range.name) continue;
      const name = range.name.toLowerCase();

      // Try to match range name to an action
      const actionPatterns: Array<[AnimationAction, RegExp]> = [
        ['idle', /idle/i],
        ['walk', /walk/i],
        ['run', /run/i],
        ['jump', /jump/i],
        ['attack', /attack|hit/i],
        ['death', /death|die/i],
        ['block', /block|guard/i],
        ['cast-1', /cast|spell|magic/i],
        ['working', /work|harvest|mine|chop/i],
        ['combo', /combo/i],
        ['dance', /dance/i],
      ];

      let action: AnimationAction = 'idle';
      for (const [act, pat] of actionPatterns) {
        if (pat.test(name)) {
          action = act;
          break;
        }
      }

      this.registerSkeletonRange(weaponType, action, range.from, range.to);
    }
  }

  /**
   * Bulk-register animation groups by auto-matching names to weapon types
   * and actions using the hint patterns.
   */
  autoRegisterGroups(groups: BABYLON.AnimationGroup[]): void {
    for (const group of groups) {
      const name = group.name;

      for (const [wt, actionMap] of Object.entries(WEAPON_ACTION_HINTS)) {
        for (const [action, pattern] of Object.entries(actionMap)) {
          if (pattern && pattern.test(name)) {
            this.registerAnimationGroup(
              group,
              wt as WeaponType,
              action as AnimationAction,
            );
            break;
          }
        }
      }
    }
  }

  /** Load animation groups from GLB files listed in a race manifest */
  async loadFromManifest(
    animations: Array<{ name: string; file: string; category: string }>,
    basePath: string,
  ): Promise<void> {
    for (const anim of animations) {
      const url = `${basePath}/${anim.file}`;
      try {
        const result = await BABYLON.SceneLoader.ImportAnimationsAsync(
          '', url, this.scene,
          false, // don't override existing
          BABYLON.SceneLoaderAnimationGroupLoadingMode.NoSync,
        );

        // Auto-classify loaded animation groups
        for (const group of this.scene.animationGroups) {
          if (!this.isGroupRegistered(group)) {
            this.autoRegisterSingleGroup(group, anim.category, anim.name);
          }
        }
      } catch (err) {
        console.warn(`[AnimState] Failed to load animation ${anim.name}: ${err}`);
      }
    }
  }

  private autoRegisterSingleGroup(
    group: BABYLON.AnimationGroup,
    category: string,
    animName: string,
  ): void {
    const name = group.name || animName;

    // Try to match by category first (e.g. "Mage" → "staff-mage")
    const categoryToWeapon: Record<string, WeaponType> = {
      mage: 'staff-mage',
      spearman: 'spear',
      archer: 'bow',
      worker: 'harvesting-pick',
      infantry: 'sword-shield',
      cavalry: 'sword-shield',
    };

    const weaponType: WeaponType = categoryToWeapon[category.toLowerCase()] || 'unarmed';

    // Try to determine action from the name
    const actionPatterns: Array<[AnimationAction, RegExp]> = [
      ['idle', /idle/i],
      ['walk', /walk/i],
      ['run', /run/i],
      ['attack', /attack/i],
      ['death', /death/i],
      ['cast-1', /cast/i],
      ['combat-idle', /combat.*idle/i],
      ['working', /work/i],
      ['combo', /combo/i],
    ];

    let action: AnimationAction = 'idle';
    for (const [act, pat] of actionPatterns) {
      if (pat.test(name)) {
        action = act;
        break;
      }
    }

    this.registerAnimationGroup(group, weaponType, action);
  }

  private isGroupRegistered(group: BABYLON.AnimationGroup): boolean {
    for (const [, set] of this.sets) {
      for (const [, clip] of set.clips) {
        if (clip.group === group) return true;
      }
    }
    return false;
  }

  /** Play a specific action for the current weapon type */
  play(action: AnimationAction, options: { force?: boolean; blendDuration?: number } = {}): boolean {
    if (this.disposed) return false;
    if (!options.force && this.currentAction === action && this.activeClip) return true;

    // Try AnimationGroup-based clip first
    const clip = this.getClip(this.currentWeaponType, action)
      || this.getClip('unarmed', action);

    if (clip) {
      this.stopSkeletonAnimation();
      this.transitionTo(clip, options.blendDuration ?? this.blendDuration);
      this.currentAction = action;
      return true;
    }

    // Fallback: try skeleton frame-range animation
    if (this.skeleton) {
      const range = this.getSkeletonRange(this.currentWeaponType, action)
        || this.getSkeletonRange('unarmed', action);

      if (range) {
        this.stop(); // stop any AnimationGroup playback
        this.playSkeletonRange(range);
        this.currentAction = action;
        return true;
      }
    }

    console.warn(`[AnimState] No clip or skeleton range for ${this.currentWeaponType}/${action}`);
    return false;
  }

  /** Stop current animation */
  stop(): void {
    if (this.activeClip) {
      this.activeClip.group.stop();
      this.activeClip = null;
    }
    if (this.blendingFrom) {
      this.blendingFrom.group.stop();
      this.blendingFrom = null;
    }
    this.isBlending = false;
  }

  /** Get the clip for a weapon type and action */
  getClip(weaponType: WeaponType, action: AnimationAction): LoadedClip | undefined {
    return this.sets.get(weaponType)?.clips.get(action);
  }

  /** Get a skeleton frame-range for a weapon type and action */
  getSkeletonRange(weaponType: WeaponType, action: AnimationAction): SkeletonAnimRange | undefined {
    return this.sets.get(weaponType)?.skeletonRanges.get(action);
  }

  /** Get all registered animation set weapon types */
  getRegisteredWeaponTypes(): WeaponType[] {
    return Array.from(this.sets.keys());
  }

  /** Get all registered actions for a weapon type (both AnimationGroup and skeleton ranges) */
  getRegisteredActions(weaponType: WeaponType): AnimationAction[] {
    const set = this.sets.get(weaponType);
    if (!set) return [];
    const actions = new Set<AnimationAction>([
      ...set.clips.keys(),
      ...set.skeletonRanges.keys(),
    ]);
    return Array.from(actions);
  }

  // ---- Skeleton animation (legacy fallback) --------------------------------

  private playSkeletonRange(range: SkeletonAnimRange): void {
    if (!this.skeleton) return;
    this.stopSkeletonAnimation();
    this.activeSkeletonAnimatable = this.scene.beginAnimation(
      this.skeleton,
      range.from,
      range.to,
      range.loop,
      range.speed,
    );
  }

  private stopSkeletonAnimation(): void {
    if (this.activeSkeletonAnimatable) {
      this.activeSkeletonAnimatable.stop();
      this.activeSkeletonAnimatable = null;
    }
  }

  // ---- Blending ------------------------------------------------------------

  private transitionTo(clip: LoadedClip, duration: number): void {
    if (this.activeClip === clip) return;

    // Start blending from current
    if (this.activeClip && duration > 0) {
      this.blendingFrom = this.activeClip;
      this.blendProgress = 0;
      this.blendDuration = duration;
      this.isBlending = true;
    } else if (this.activeClip) {
      this.activeClip.group.stop();
    }

    // Start new clip
    clip.group.start(clip.loop, clip.speed);
    if (this.isBlending) {
      clip.group.setWeightForAllAnimatables(0);
    } else {
      clip.group.setWeightForAllAnimatables(1);
    }

    this.activeClip = clip;
  }

  private update(): void {
    if (this.disposed || !this.isBlending) return;

    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    this.blendProgress += dt / this.blendDuration;

    if (this.blendProgress >= 1) {
      // Blend complete
      this.blendProgress = 1;
      this.isBlending = false;

      if (this.blendingFrom) {
        this.blendingFrom.group.stop();
        this.blendingFrom = null;
      }
      if (this.activeClip) {
        this.activeClip.group.setWeightForAllAnimatables(1);
      }
    } else {
      // Interpolate weights
      const t = this.easeInOutQuad(this.blendProgress);
      if (this.blendingFrom) {
        this.blendingFrom.group.setWeightForAllAnimatables(1 - t);
      }
      if (this.activeClip) {
        this.activeClip.group.setWeightForAllAnimatables(t);
      }
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ---- Dispose -------------------------------------------------------------

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.stopSkeletonAnimation();
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
    this.sets.clear();
    this.skeleton = null;
  }
}
