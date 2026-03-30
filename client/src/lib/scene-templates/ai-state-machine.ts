/**
 * AI State Machine — Ported from threejs-games core/actor/AI.js
 * Provides a generic state machine for NPC behaviors in Babylon.js scenes.
 * States: idle, patrol, wander, pursue, flee, follow, defend, attack, death, pain
 */

import * as BABYLON from '@babylonjs/core';

export type AIStateName = 'idle' | 'patrol' | 'wander' | 'pursue' | 'flee' | 'follow' | 'defend' | 'attack' | 'death' | 'pain';

export interface AIStateConfig {
  detectionRange: number;
  attackRange: number;
  patrolRadius: number;
  moveSpeed: number;
  runSpeed?: number;
  turnSpeed: number;
  fleeHealthThreshold: number;
  sightAngle: number; // degrees
}

export const DEFAULT_AI_CONFIG: AIStateConfig = {
  detectionRange: 25,
  attackRange: 2,
  patrolRadius: 15,
  moveSpeed: 3,
  runSpeed: 6,
  turnSpeed: 2,
  fleeHealthThreshold: 0.2,
  sightAngle: 120,
};

export interface AIContext {
  mesh: BABYLON.TransformNode;
  target: BABYLON.TransformNode | null;
  config: AIStateConfig;
  health: number;
  maxHealth: number;
  baseState: AIStateName;
  origin: BABYLON.Vector3; // spawn point for patrol/wander
  lastStateChange: number;
  patrolDirection: BABYLON.Vector3;
  wanderTimer: number;
}

export interface AIState {
  name: AIStateName;
  enter(ctx: AIContext): void;
  update(ctx: AIContext, deltaTime: number): AIStateName | null;
  exit(ctx: AIContext): void;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function distanceTo(a: BABYLON.TransformNode, b: BABYLON.TransformNode): number {
  return BABYLON.Vector3.Distance(a.position, b.position);
}

function lookingAtTarget(mesh: BABYLON.TransformNode, target: BABYLON.TransformNode, sightAngle: number): boolean {
  const forward = mesh.forward.normalize();
  const toTarget = target.position.subtract(mesh.position).normalize();
  const dot = BABYLON.Vector3.Dot(forward, toTarget);
  const halfAngle = (sightAngle / 2) * (Math.PI / 180);
  return dot > Math.cos(halfAngle);
}

function moveToward(mesh: BABYLON.TransformNode, target: BABYLON.Vector3, speed: number, dt: number): void {
  const direction = target.subtract(mesh.position).normalize();
  direction.y = 0; // stay on ground plane
  mesh.position.addInPlace(direction.scale(speed * dt));
}

function lookAtSmooth(mesh: BABYLON.TransformNode, target: BABYLON.Vector3, turnSpeed: number, dt: number): void {
  const targetPos = new BABYLON.Vector3(target.x, mesh.position.y, target.z);
  const direction = targetPos.subtract(mesh.position);
  if (direction.length() < 0.01) return;
  const targetAngle = Math.atan2(direction.x, direction.z);
  const currentAngle = mesh.rotation.y;
  let diff = targetAngle - currentAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  mesh.rotation.y += diff * Math.min(1, turnSpeed * dt);
}

function targetSpotted(ctx: AIContext): boolean {
  if (!ctx.target) return false;
  const dist = distanceTo(ctx.mesh, ctx.target);
  if (dist > ctx.config.detectionRange) return false;
  // Close enough that direction doesn't matter (feel if too close)
  if (dist < ctx.config.detectionRange * 0.3) return true;
  return lookingAtTarget(ctx.mesh, ctx.target, ctx.config.sightAngle);
}

function randomDirection(): BABYLON.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  return new BABYLON.Vector3(Math.sin(angle), 0, Math.cos(angle));
}

// ─── States ──────────────────────────────────────────────────────────────────

const IdleState: AIState = {
  name: 'idle',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (targetSpotted(ctx)) return 'pursue';
    // Transition to base state after idle delay
    if (performance.now() - ctx.lastStateChange > 2000 + Math.random() * 3000) {
      return ctx.baseState === 'idle' ? null : ctx.baseState;
    }
    return null;
  },
  exit() {},
};

const PatrolState: AIState = {
  name: 'patrol',
  enter(ctx) {
    ctx.patrolDirection = randomDirection();
  },
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (targetSpotted(ctx)) return 'pursue';

    // Move in patrol direction
    const patrolTarget = ctx.origin.add(ctx.patrolDirection.scale(ctx.config.patrolRadius));
    moveToward(ctx.mesh, patrolTarget, ctx.config.moveSpeed, dt);
    lookAtSmooth(ctx.mesh, patrolTarget, ctx.config.turnSpeed, dt);

    // Change direction periodically
    if (performance.now() - ctx.lastStateChange > 4000 + Math.random() * 4000) {
      ctx.patrolDirection = randomDirection();
      ctx.lastStateChange = performance.now();
    }

    // Don't stray too far from origin
    if (BABYLON.Vector3.Distance(ctx.mesh.position, ctx.origin) > ctx.config.patrolRadius) {
      const toOrigin = ctx.origin.subtract(ctx.mesh.position).normalize();
      ctx.patrolDirection = toOrigin;
    }

    return null;
  },
  exit() {},
};

const WanderState: AIState = {
  name: 'wander',
  enter(ctx) {
    ctx.wanderTimer = 0;
    ctx.patrolDirection = randomDirection();
  },
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (targetSpotted(ctx)) return 'pursue';

    ctx.wanderTimer += dt;
    // Random direction changes
    if (ctx.wanderTimer > 2 + Math.random() * 3) {
      ctx.patrolDirection = randomDirection();
      ctx.wanderTimer = 0;
      // Occasionally pause
      if (Math.random() < 0.3) return 'idle';
    }

    const wanderTarget = ctx.mesh.position.add(ctx.patrolDirection.scale(5));
    moveToward(ctx.mesh, wanderTarget, ctx.config.moveSpeed * 0.6, dt);
    lookAtSmooth(ctx.mesh, wanderTarget, ctx.config.turnSpeed, dt);

    // Stay near origin
    if (BABYLON.Vector3.Distance(ctx.mesh.position, ctx.origin) > ctx.config.patrolRadius * 1.5) {
      ctx.patrolDirection = ctx.origin.subtract(ctx.mesh.position).normalize();
    }

    return null;
  },
  exit() {},
};

const PursueState: AIState = {
  name: 'pursue',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (!ctx.target) return ctx.baseState;
    if (ctx.health / ctx.maxHealth <= ctx.config.fleeHealthThreshold) return 'flee';

    const dist = distanceTo(ctx.mesh, ctx.target);
    if (dist > ctx.config.detectionRange * 1.5) return ctx.baseState; // lost target
    if (dist <= ctx.config.attackRange) return 'attack';

    const speed = ctx.config.runSpeed || ctx.config.moveSpeed * 2;
    moveToward(ctx.mesh, ctx.target.position, speed, dt);
    lookAtSmooth(ctx.mesh, ctx.target.position, ctx.config.turnSpeed * 2, dt);

    return null;
  },
  exit() {},
};

const FleeState: AIState = {
  name: 'flee',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (!ctx.target) return ctx.baseState;

    const awayDir = ctx.mesh.position.subtract(ctx.target.position).normalize();
    const fleeTarget = ctx.mesh.position.add(awayDir.scale(20));
    const speed = ctx.config.runSpeed || ctx.config.moveSpeed * 2;
    moveToward(ctx.mesh, fleeTarget, speed, dt);
    lookAtSmooth(ctx.mesh, fleeTarget, ctx.config.turnSpeed, dt);

    const dist = distanceTo(ctx.mesh, ctx.target);
    if (dist > ctx.config.detectionRange * 2) return ctx.baseState;

    return null;
  },
  exit() {},
};

const FollowState: AIState = {
  name: 'follow',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (!ctx.target) return 'idle';

    const dist = distanceTo(ctx.mesh, ctx.target);
    const followDist = ctx.config.attackRange * 2;

    if (dist > followDist) {
      moveToward(ctx.mesh, ctx.target.position, ctx.config.moveSpeed, dt);
      lookAtSmooth(ctx.mesh, ctx.target.position, ctx.config.turnSpeed, dt);
    }

    return null;
  },
  exit() {},
};

const DefendState: AIState = {
  name: 'defend',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (!ctx.target) return 'idle';

    const dist = distanceTo(ctx.mesh, ctx.target);
    lookAtSmooth(ctx.mesh, ctx.target.position, ctx.config.turnSpeed * 2, dt);

    if (dist <= ctx.config.attackRange) return 'attack';
    // Only pursue if target comes into defend zone
    if (dist < ctx.config.detectionRange * 0.5) return 'pursue';

    // Stay near origin
    if (BABYLON.Vector3.Distance(ctx.mesh.position, ctx.origin) > ctx.config.patrolRadius * 0.5) {
      moveToward(ctx.mesh, ctx.origin, ctx.config.moveSpeed * 0.5, dt);
    }

    return null;
  },
  exit() {},
};

const AttackState: AIState = {
  name: 'attack',
  enter() {},
  update(ctx, dt) {
    if (ctx.health <= 0) return 'death';
    if (!ctx.target) return ctx.baseState;

    lookAtSmooth(ctx.mesh, ctx.target.position, ctx.config.turnSpeed * 3, dt);
    const dist = distanceTo(ctx.mesh, ctx.target);
    if (dist > ctx.config.attackRange * 1.5) return 'pursue';

    return null;
  },
  exit() {},
};

const DeathState: AIState = {
  name: 'death',
  enter() {},
  update() { return null; }, // Terminal state
  exit() {},
};

const PainState: AIState = {
  name: 'pain',
  enter() {},
  update(ctx) {
    if (ctx.health <= 0) return 'death';
    // Brief pain reaction then back to action
    if (performance.now() - ctx.lastStateChange > 500) {
      return ctx.target ? 'pursue' : ctx.baseState;
    }
    return null;
  },
  exit() {},
};

// ─── State Machine ───────────────────────────────────────────────────────────

const STATE_MAP: Record<AIStateName, AIState> = {
  idle: IdleState,
  patrol: PatrolState,
  wander: WanderState,
  pursue: PursueState,
  flee: FleeState,
  follow: FollowState,
  defend: DefendState,
  attack: AttackState,
  death: DeathState,
  pain: PainState,
};

export class AIStateMachine {
  private currentState: AIState;
  private ctx: AIContext;

  constructor(
    mesh: BABYLON.TransformNode,
    config: Partial<AIStateConfig> = {},
    baseState: AIStateName = 'wander',
    target: BABYLON.TransformNode | null = null,
  ) {
    this.ctx = {
      mesh,
      target,
      config: { ...DEFAULT_AI_CONFIG, ...config },
      health: 100,
      maxHealth: 100,
      baseState,
      origin: mesh.position.clone(),
      lastStateChange: performance.now(),
      patrolDirection: randomDirection(),
      wanderTimer: 0,
    };
    this.currentState = STATE_MAP[baseState];
    this.currentState.enter(this.ctx);
  }

  get state(): AIStateName {
    return this.currentState.name;
  }

  get context(): AIContext {
    return this.ctx;
  }

  setTarget(target: BABYLON.TransformNode | null): void {
    this.ctx.target = target;
  }

  applyDamage(amount: number): void {
    this.ctx.health = Math.max(0, this.ctx.health - amount);
    if (this.ctx.health <= 0) {
      this.transitionTo('death');
    } else {
      this.transitionTo('pain');
    }
  }

  private transitionTo(name: AIStateName): void {
    if (this.currentState.name === name) return;
    this.currentState.exit(this.ctx);
    this.currentState = STATE_MAP[name];
    this.ctx.lastStateChange = performance.now();
    this.currentState.enter(this.ctx);
  }

  update(deltaTime: number): void {
    const nextState = this.currentState.update(this.ctx, deltaTime);
    if (nextState && nextState !== this.currentState.name) {
      this.transitionTo(nextState);
    }
  }
}
