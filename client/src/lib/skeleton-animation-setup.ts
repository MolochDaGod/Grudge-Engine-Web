import * as BABYLON from '@babylonjs/core';

export interface SkeletonAnimationConfig {
  enableBlending?: boolean;
  blendingSpeed?: number;
  loopMode?: number;
}

export function configureSkeletonAnimations(
  skeleton: BABYLON.Skeleton,
  config: SkeletonAnimationConfig = {}
): void {
  const {
    enableBlending = true,
    blendingSpeed = 0.07,
    loopMode = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  } = config;

  // Enable animation interpolation for smooth blending
  BABYLON.Animation.AllowMatricesInterpolation = true;

  // Create animation properties override for smooth transitions
  skeleton.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
  skeleton.animationPropertiesOverride.enableBlending = enableBlending;
  skeleton.animationPropertiesOverride.blendingSpeed = blendingSpeed;
  skeleton.animationPropertiesOverride.loopMode = loopMode;
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
  const range = skeleton.getAnimationRange(animationName);
  if (!range) {
    console.warn(`Animation range "${animationName}" not found on skeleton`);
    return null;
  }
  return scene.beginAnimation(skeleton, range.from, range.to, loop);
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

  scene.stopAnimation(skeleton);

  const animatables: BABYLON.Animatable[] = [];
  let totalWeight = 0;

  for (let i = 0; i < animationNames.length; i++) {
    const range = skeleton.getAnimationRange(animationNames[i]);
    if (!range) {
      console.warn(`Animation range "${animationNames[i]}" not found`);
      continue;
    }

    const weight = weights[i] / weights.reduce((a, b) => a + b, 0);
    const anim = scene.beginWeightedAnimation(skeleton, range.from, range.to, weight, loop);
    
    if (i > 0 && animatables.length > 0) {
      anim.syncWith(animatables[0]);
    }
    
    animatables.push(anim);
    totalWeight += weight;
  }

  return animatables;
}

export function stopSkeletonAnimations(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton
): void {
  scene.stopAnimation(skeleton);
}
