// ─── BabylonJS Animation Controller ───────────────────────────────────────
// Weight-based crossfade system for BabylonJS AnimationGroups.
// Replaces THREE.AnimationMixer.crossFadeTo with per-frame weight lerping.
//
// Pattern matches ai-behaviors.ts updateAnimationBlending():
//   ag.weight = Scalar.Lerp(current, target, blendSpeed * dt)
//
// This controller adds slot awareness from animation-slots.ts,
// one-shot detection, speed modifiers, and callback hooks.

import * as BABYLON from '@babylonjs/core';
import {
  type AnimSlot, type AnimClipMap,
  resolveClip, isOneShot, buildClipMapFromNames,
  ANIMATION_SLOTS,
} from './animation-slots';

// ─── Types ────────────────────────────────────────────────────────────────

export interface AnimControllerOptions {
  /** Weight lerp speed — higher = snappier crossfade (default 8) */
  blendSpeed?: number;
  /** Default crossfade duration in seconds (default 0.2) */
  defaultFadeDuration?: number;
  /** If true, auto-detect slots from clip names via Mixamo aliases */
  autoDetectSlots?: boolean;
}

export interface AnimGroupEntry {
  group: BABYLON.AnimationGroup;
  slot: AnimSlot | null;
  targetWeight: number;
  currentWeight: number;
  speedRatio: number;
  isOneShot: boolean;
  /** Callback when a one-shot finishes */
  onComplete: (() => void) | null;
}

// ─── Controller ───────────────────────────────────────────────────────────

export class BabylonAnimController {
  private entries = new Map<string, AnimGroupEntry>();
  private activeSlot: AnimSlot | null = null;
  private activeClipName: string | null = null;
  private clipMap: AnimClipMap | null = null;
  private blendSpeed: number;
  private defaultFadeDuration: number;
  private locked = false;
  private lockTimer = 0;

  /** Fires on every slot transition */
  onSlotChange: ((from: AnimSlot | null, to: AnimSlot) => void) | null = null;

  constructor(
    animationGroups: BABYLON.AnimationGroup[],
    options: AnimControllerOptions = {},
  ) {
    this.blendSpeed = options.blendSpeed ?? 8;
    this.defaultFadeDuration = options.defaultFadeDuration ?? 0.2;

    // Register all animation groups
    for (const ag of animationGroups) {
      this.registerGroup(ag);
    }

    // Optionally auto-detect slot mapping from clip names
    if (options.autoDetectSlots !== false) {
      const names = animationGroups.map(ag => ag.name);
      this.clipMap = buildClipMapFromNames(names);
    }
  }

  // ─── Setup ──────────────────────────────────────────────────────────────

  /** Register an AnimationGroup (idempotent) */
  registerGroup(ag: BABYLON.AnimationGroup, slot?: AnimSlot): void {
    if (this.entries.has(ag.name)) return;

    this.entries.set(ag.name, {
      group: ag,
      slot: slot ?? null,
      targetWeight: 0,
      currentWeight: 0,
      speedRatio: 1,
      isOneShot: false,
      onComplete: null,
    });

    // Pre-start all groups at weight 0 so blending works immediately
    ag.start(true, 1.0, ag.from, ag.to, false);
    ag.setWeightForAllAnimatables(0);
    ag.pause();
  }

  /** Set the clip map (slot→clip name mapping) for this controller */
  setClipMap(clipMap: AnimClipMap): void {
    this.clipMap = clipMap;
  }

  /** Get current clip map */
  getClipMap(): AnimClipMap | null {
    return this.clipMap;
  }

  // ─── Crossfade API ──────────────────────────────────────────────────────

  /**
   * Crossfade to a specific animation by clip name.
   * This is the low-level API — prefer fadeToSlot() for gameplay code.
   */
  fadeToAction(
    clipName: string,
    fadeDuration?: number,
    speedRatio?: number,
    onComplete?: () => void,
  ): boolean {
    if (this.locked && clipName !== this.resolveClipName('dead')) return false;

    const entry = this.entries.get(clipName);
    if (!entry) {
      console.warn(`BabylonAnimController: No animation group "${clipName}"`);
      return false;
    }

    if (clipName === this.activeClipName && entry.currentWeight > 0.5) {
      return true; // Already playing
    }

    const fade = fadeDuration ?? this.defaultFadeDuration;
    const speed = speedRatio ?? 1;

    // Fade OUT all other entries
    for (const [name, e] of this.entries) {
      if (name !== clipName) {
        e.targetWeight = 0;
      }
    }

    // Fade IN the target
    entry.targetWeight = 1;
    entry.speedRatio = speed;
    entry.isOneShot = false;
    entry.onComplete = onComplete ?? null;

    // Reset & play
    const ag = entry.group;
    ag.start(true, speed, ag.from, ag.to, false);
    ag.setWeightForAllAnimatables(entry.currentWeight);

    this.activeClipName = clipName;
    return true;
  }

  /**
   * Crossfade to an abstract animation slot.
   * Resolves the slot to a clip name via the current AnimClipMap.
   */
  fadeToSlot(
    slot: AnimSlot,
    fadeDuration?: number,
    speedRatio?: number,
    onComplete?: () => void,
  ): boolean {
    const clipName = this.resolveClipName(slot);
    if (!clipName) {
      console.warn(`BabylonAnimController: Cannot resolve slot "${slot}"`);
      return false;
    }

    const prevSlot = this.activeSlot;
    const ok = this.fadeToAction(clipName, fadeDuration, speedRatio, onComplete);
    if (ok) {
      this.activeSlot = slot;
      if (prevSlot !== slot && this.onSlotChange) {
        this.onSlotChange(prevSlot, slot);
      }
    }
    return ok;
  }

  /**
   * Play a one-shot animation (attack, hit, etc.).
   * After it finishes, automatically fades back to returnSlot (default: idle).
   */
  playOneShot(
    slot: AnimSlot,
    returnSlot: AnimSlot = 'idle',
    speedRatio?: number,
    onComplete?: () => void,
  ): boolean {
    const clipName = this.resolveClipName(slot);
    if (!clipName) return false;

    const entry = this.entries.get(clipName);
    if (!entry) return false;

    entry.isOneShot = true;
    entry.onComplete = () => {
      this.fadeToSlot(returnSlot);
      onComplete?.();
    };

    // Start non-looping
    const ag = entry.group;
    ag.start(false, speedRatio ?? 1, ag.from, ag.to, false);
    ag.setWeightForAllAnimatables(0);

    // Fade in
    entry.targetWeight = 1;
    entry.speedRatio = speedRatio ?? 1;

    // Fade out everything else
    for (const [name, e] of this.entries) {
      if (name !== clipName) e.targetWeight = 0;
    }

    this.activeClipName = clipName;
    this.activeSlot = slot;
    return true;
  }

  // ─── Lock System ────────────────────────────────────────────────────────

  /** Lock transitions for a duration (e.g. during attack windups) */
  lock(duration: number): void {
    this.locked = true;
    this.lockTimer = duration;
  }

  unlock(): void {
    this.locked = false;
    this.lockTimer = 0;
  }

  isLocked(): boolean {
    return this.locked;
  }

  // ─── Update Loop ────────────────────────────────────────────────────────

  /**
   * Call every frame. Lerps weights, detects one-shot completion.
   */
  update(deltaTime: number): void {
    // Lock countdown
    if (this.locked) {
      this.lockTimer -= deltaTime;
      if (this.lockTimer <= 0) this.unlock();
    }

    const blendFactor = Math.min(1, this.blendSpeed * deltaTime);

    for (const [_name, entry] of this.entries) {
      const { group: ag, targetWeight, currentWeight } = entry;

      // Lerp weight
      const newWeight = currentWeight + (targetWeight - currentWeight) * blendFactor;
      entry.currentWeight = newWeight;

      if (newWeight > 0.01) {
        if (!ag.isPlaying) {
          if (entry.isOneShot) {
            ag.start(false, entry.speedRatio, ag.from, ag.to, false);
          } else {
            ag.start(true, entry.speedRatio, ag.from, ag.to, false);
          }
        }
        ag.setWeightForAllAnimatables(newWeight);
      } else if (ag.isPlaying && newWeight <= 0.01) {
        ag.stop();
        ag.setWeightForAllAnimatables(0);
        entry.currentWeight = 0;
      }

      // One-shot completion detection
      if (entry.isOneShot && ag.isPlaying) {
        // AnimationGroup doesn't have a simple "finished" check —
        // check if all animatables have reached the end
        const animatables = ag.animatables;
        const allFinished = animatables.length > 0 && animatables.every(a => {
          const masterFrame = a.masterFrame ?? 0;
          const toFrame = ag.to;
          return masterFrame >= toFrame - 1;
        });
        if (allFinished) {
          entry.isOneShot = false;
          if (entry.onComplete) {
            const cb = entry.onComplete;
            entry.onComplete = null;
            cb();
          }
        }
      }
    }
  }

  // ─── Query API ──────────────────────────────────────────────────────────

  /** Get the currently active abstract slot */
  getActiveSlot(): AnimSlot | null {
    return this.activeSlot;
  }

  /** Get the currently active clip name */
  getActiveClipName(): string | null {
    return this.activeClipName;
  }

  /** Check if a specific slot is currently active */
  isInSlot(slot: AnimSlot): boolean {
    return this.activeSlot === slot;
  }

  /** Check if the active slot is any of the given slots */
  isAnySlot(...slots: AnimSlot[]): boolean {
    return this.activeSlot !== null && slots.includes(this.activeSlot);
  }

  /** Get weight of a specific clip */
  getWeight(clipName: string): number {
    return this.entries.get(clipName)?.currentWeight ?? 0;
  }

  /** Check if a clip name is registered */
  hasClip(clipName: string): boolean {
    return this.entries.has(clipName);
  }

  /** Get all registered animation group names */
  getClipNames(): string[] {
    return Array.from(this.entries.keys());
  }

  /** Get all animation groups (for UI display etc.) */
  getAnimationGroups(): BABYLON.AnimationGroup[] {
    return Array.from(this.entries.values()).map(e => e.group);
  }

  // ─── Speed Control ──────────────────────────────────────────────────────

  /** Set speed ratio for the currently active animation */
  setActiveSpeed(ratio: number): void {
    if (!this.activeClipName) return;
    const entry = this.entries.get(this.activeClipName);
    if (entry) {
      entry.speedRatio = ratio;
      entry.group.speedRatio = ratio;
    }
  }

  /** Set speed ratio for a specific clip */
  setSpeed(clipName: string, ratio: number): void {
    const entry = this.entries.get(clipName);
    if (entry) {
      entry.speedRatio = ratio;
      entry.group.speedRatio = ratio;
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  /** Stop all animations */
  stopAll(): void {
    for (const [, entry] of this.entries) {
      entry.group.stop();
      entry.targetWeight = 0;
      entry.currentWeight = 0;
    }
    this.activeClipName = null;
    this.activeSlot = null;
  }

  /** Dispose of all animation groups */
  dispose(): void {
    this.stopAll();
    for (const [, entry] of this.entries) {
      entry.group.dispose();
    }
    this.entries.clear();
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private resolveClipName(slot: AnimSlot): string | null {
    if (!this.clipMap) return null;
    const clipName = resolveClip(this.clipMap, slot);
    // Check if we actually have this clip registered
    if (this.entries.has(clipName)) return clipName;

    // Fallback: try fuzzy matching against registered names
    const lower = clipName.toLowerCase();
    for (const [name] of this.entries) {
      if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
        return name;
      }
    }
    return null;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create a BabylonAnimController from a loaded mesh result.
 * Automatically finds all AnimationGroups on the scene that belong to this mesh.
 */
export function createAnimController(
  animationGroups: BABYLON.AnimationGroup[],
  clipMap?: AnimClipMap,
  options?: AnimControllerOptions,
): BabylonAnimController {
  const controller = new BabylonAnimController(animationGroups, options);
  if (clipMap) {
    controller.setClipMap(clipMap);
  }
  return controller;
}
