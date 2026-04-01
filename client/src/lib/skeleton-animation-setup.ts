/**
 * Skeleton Animation Setup — backward-compatible re-exports.
 * The canonical implementation is now in animation-blending.ts.
 */
import * as BABYLON from '@babylonjs/core';
import {
  configureSkeletonBlending,
  playSkeletonRange,
  blendSkeletonRanges,
  enableMatrixInterpolation,
  type SkeletonBlendConfig,
} from './animation-blending';

// Re-export types under the old name for backward compat
export type SkeletonAnimationConfig = SkeletonBlendConfig;

export function configureSkeletonAnimations(
  skeleton: BABYLON.Skeleton,
  config: SkeletonAnimationConfig = {}
): void {
  configureSkeletonBlending(skeleton, {
    enableBlending: config.enableBlending ?? true,
    blendingSpeed: config.blendingSpeed ?? 0.07,
    loopMode: config.loopMode,
  });
}

export function configureAllSkeletons(
  scene: BABYLON.Scene,
  config?: SkeletonAnimationConfig
): void {
  scene.skeletons.forEach(skeleton => {
    configureSkeletonAnimations(skeleton, config);
  });
}

export function getAnimationRanges(skeleton: BABYLON.Skeleton): Map<string, BABYLON.AnimationRange> {
  const ranges = new Map<string, BABYLON.AnimationRange>();
  skeleton.getAnimationRanges().forEach(range => {
    if (range) {
      ranges.set(range.name, range);
    }
  });
  return ranges;
}

export function playAnimationRange(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton,
  animationName: string,
  loop: boolean = true
): BABYLON.Animatable | null {
  return playSkeletonRange(scene, skeleton, animationName, loop);
}

export function blendAnimationRanges(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton,
  animationNames: string[],
  weights: number[],
  loop: boolean = true
): BABYLON.Animatable[] {
  if (animationNames.length !== weights.length) {
    console.error('Animation names and weights must have same length');
    return [];
  }
  return blendSkeletonRanges(scene, skeleton, animationNames, weights, loop);
}

export function stopSkeletonAnimations(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton
): void {
  scene.stopAnimation(skeleton);
}

// Re-export everything from the unified module for new code
export {
  enableMatrixInterpolation,
  configureSkeletonBlending,
  playSkeletonRange,
  blendSkeletonRanges,
  setupAnimationBlending,
  createGroupBlendState,
  updateGroupBlend,
  updateMultiGroupBlend,
  playGroupImmediate,
  stopAllGroups,
  computeLocomotionWeights,
} from './animation-blending';

export type {
  AnimGroupBlendState,
  LocomotionBlendTree,
} from './animation-blending';
