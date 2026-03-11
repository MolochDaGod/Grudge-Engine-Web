// ─── RTS AI Commander ──────────────────────────────────────────────────────
// Faction-level AI that manages economy, build orders, army composition,
// threat detection, and attack timing. Each faction gets one Commander.
// Uses RTSEconomy for resources and DamageSystem for combat.

import * as BABYLON from '@babylonjs/core';
import type { FactionId, FactionBuildingDef, FactionUnitDef } from './faction-assets';
import { getBuildingsForFaction, getUnitsForFaction, FACTIONS } from './faction-assets';
import { RTSEconomy } from './rts-economy';
import { DamageSystem, type DamageEntity } from './engine/damage-system';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RTSUnitState = 'idle' | 'gather' | 'build' | 'patrol' | 'attack' | 'defend' | 'flee' | 'dead';

export interface RTSUnit {
  id: string;
  defId: string;
  faction: FactionId;
  state: RTSUnitState;
  mesh: BABYLON.AbstractMesh | null;
  position: BABYLON.Vector3;
  targetPosition: BABYLON.Vector3 | null;
  targetUnit: string | null;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  range: number;
  isWorker: boolean;
}

export interface RTSBuilding {
  id: string;
  defId: string;
  faction: FactionId;
  position: BABYLON.Vector3;
  hp: number;
  maxHp: number;
  isComplete: boolean;
}

type CommanderPhase = 'early_game' | 'mid_game' | 'late_game' | 'all_in';

export interface CommanderConfig {
  aggression: number;      // 0-1: how willing to attack (0.3=defensive, 0.7=aggressive)
  expandRate: number;      // 0-1: how fast it builds new structures
  workerTarget: number;    // ideal worker count
  armySizeThreshold: number; // army size before first attack
  scoutInterval: number;   // seconds between scouting checks
}

const DEFAULT_CONFIG: CommanderConfig = {
  aggression: 0.5,
  expandRate: 0.5,
  workerTarget: 6,
  armySizeThreshold: 8,
  scoutInterval: 15,
};

export interface CommanderEvent {
  type: 'phase_change' | 'attack_wave' | 'defend_base' | 'build_order' | 'train_order'
    | 'threat_detected' | 'unit_died' | 'building_destroyed';
  faction: FactionId;
  data?: Record<string, unknown>;
}

type CommanderListener = (event: CommanderEvent) => void;

// ─── Build Order Templates ──────────────────────────────────────────────────

interface BuildOrderStep {
  type: 'building' | 'unit' | 'wait';
  defIdSuffix?: string; // partial match against def.id (e.g. 'barracks')
  category?: string;
  count?: number;
  waitSeconds?: number;
}

const STANDARD_BUILD_ORDER: BuildOrderStep[] = [
  { type: 'unit', category: 'worker', count: 2 },
  { type: 'building', category: 'resource' },
  { type: 'unit', category: 'worker', count: 2 },
  { type: 'building', category: 'military' },
  { type: 'unit', category: 'melee', count: 3 },
  { type: 'unit', category: 'ranged', count: 2 },
  { type: 'building', category: 'defense' },
  { type: 'unit', category: 'melee', count: 2 },
  { type: 'building', category: 'production' },
  { type: 'unit', category: 'magic', count: 1 },
];

// ─── Commander ──────────────────────────────────────────────────────────────

export class RTSAICommander {
  readonly faction: FactionId;
  private config: CommanderConfig;
  private economy: RTSEconomy;
  private damageSystem: DamageSystem;
  private scene: BABYLON.Scene;

  private units: Map<string, RTSUnit> = new Map();
  private buildings: Map<string, RTSBuilding> = new Map();

  private phase: CommanderPhase = 'early_game';
  private phaseTimer = 0;
  private scoutTimer = 0;
  private buildOrderIndex = 0;
  private buildOrderCooldown = 0;
  private attackWaveTimer = 0;
  private threatLevel = 0;

  private isActive = false;
  private listeners: CommanderListener[] = [];

  // Enemy tracking
  private knownEnemyPositions: Map<string, BABYLON.Vector3> = new Map();
  private lastKnownEnemyBase: BABYLON.Vector3 | null = null;

  constructor(
    faction: FactionId,
    scene: BABYLON.Scene,
    economy: RTSEconomy,
    damageSystem: DamageSystem,
    config?: Partial<CommanderConfig>
  ) {
    this.faction = faction;
    this.scene = scene;
    this.economy = economy;
    this.damageSystem = damageSystem;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Personality variance per faction
    if (faction === 'orc') {
      this.config.aggression = Math.min(1, this.config.aggression + 0.2);
      this.config.armySizeThreshold = Math.max(4, this.config.armySizeThreshold - 3);
    } else if (faction === 'elf') {
      this.config.expandRate = Math.min(1, this.config.expandRate + 0.15);
      this.config.workerTarget += 2;
    }
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  on(listener: CommanderListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emit(event: CommanderEvent) {
    this.listeners.forEach(l => l(event));
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  start() {
    this.isActive = true;
    this.phase = 'early_game';
    this.buildOrderIndex = 0;
    console.log(`[Commander:${this.faction}] AI started — ${FACTIONS[this.faction].name}`);
  }

  stop() {
    this.isActive = false;
    console.log(`[Commander:${this.faction}] AI stopped`);
  }

  // ─── Unit/Building Registration ──────────────────────────────────────────

  registerUnit(unit: RTSUnit) {
    this.units.set(unit.id, unit);
    this.damageSystem.registerEntity(unit.id, {
      maxHealth: unit.maxHp,
      health: unit.hp,
      team: this.faction,
    });
    if (unit.isWorker) {
      this.economy.assignWorker(this.faction, unit.id, 'idle');
    }
  }

  registerBuilding(building: RTSBuilding) {
    this.buildings.set(building.id, building);
    this.damageSystem.registerEntity(building.id, {
      maxHealth: building.maxHp,
      health: building.hp,
      team: this.faction,
    });
  }

  removeUnit(unitId: string) {
    this.units.delete(unitId);
    this.damageSystem.unregisterEntity(unitId);
    this.economy.removeWorker(this.faction, unitId);
    this.emit({ type: 'unit_died', faction: this.faction, data: { unitId } });
  }

  removeBuilding(buildingId: string) {
    this.buildings.delete(buildingId);
    this.damageSystem.unregisterEntity(buildingId);
    this.emit({ type: 'building_destroyed', faction: this.faction, data: { buildingId } });
  }

  // ─── Main Update Loop ───────────────────────────────────────────────────

  update(deltaTime: number) {
    if (!this.isActive) return;

    this.phaseTimer += deltaTime;
    this.scoutTimer += deltaTime;
    this.buildOrderCooldown = Math.max(0, this.buildOrderCooldown - deltaTime);
    this.attackWaveTimer += deltaTime;

    // Phase transitions
    this.updatePhase();

    // Decision-making
    this.updateWorkerAssignments();
    this.processNextBuildOrder();
    this.updateThreatAssessment();
    this.updateUnitBehaviors(deltaTime);
    this.updateAttackDecisions();
  }

  // ─── Phase Management ───────────────────────────────────────────────────

  private updatePhase() {
    const armySize = this.getArmySize();
    const buildingCount = this.buildings.size;
    const oldPhase = this.phase;

    if (armySize >= this.config.armySizeThreshold * 2 && buildingCount >= 5) {
      this.phase = 'late_game';
    } else if (armySize >= this.config.armySizeThreshold || buildingCount >= 3) {
      this.phase = 'mid_game';
    } else {
      this.phase = 'early_game';
    }

    // Emergency: losing buildings → all-in attack
    if (buildingCount <= 1 && armySize > 3) {
      this.phase = 'all_in';
    }

    if (oldPhase !== this.phase) {
      this.emit({ type: 'phase_change', faction: this.faction, data: { from: oldPhase, to: this.phase } });
      console.log(`[Commander:${this.faction}] Phase: ${oldPhase} → ${this.phase}`);
    }
  }

  // ─── Worker Auto-Assignment ─────────────────────────────────────────────

  private updateWorkerAssignments() {
    const workers = [...this.units.values()].filter(u => u.isWorker && u.state !== 'dead');
    const idleWorkers = workers.filter(u => u.state === 'idle');

    for (const worker of idleWorkers) {
      // Priority: gold > wood > stone
      const goldWorkers = this.economy.getWorkerCount(this.faction, 'gold');
      const woodWorkers = this.economy.getWorkerCount(this.faction, 'wood');
      const stoneWorkers = this.economy.getWorkerCount(this.faction, 'stone');

      if (goldWorkers < 3) {
        this.economy.assignWorker(this.faction, worker.id, 'gold');
        worker.state = 'gather';
      } else if (woodWorkers < 2) {
        this.economy.assignWorker(this.faction, worker.id, 'wood');
        worker.state = 'gather';
      } else if (stoneWorkers < 1) {
        this.economy.assignWorker(this.faction, worker.id, 'stone');
        worker.state = 'gather';
      } else {
        this.economy.assignWorker(this.faction, worker.id, 'gold');
        worker.state = 'gather';
      }
    }

    // Train more workers if below target
    if (workers.length < this.config.workerTarget && this.buildOrderCooldown <= 0) {
      const workerDef = getUnitsForFaction(this.faction).find(u => u.category === 'worker');
      const productionBuilding = [...this.buildings.values()].find(b => b.isComplete);
      if (workerDef && productionBuilding) {
        if (this.economy.startTrain(this.faction, workerDef, productionBuilding.id)) {
          this.buildOrderCooldown = 5;
          this.emit({ type: 'train_order', faction: this.faction, data: { unit: workerDef.name } });
        }
      }
    }
  }

  // ─── Build Order Processing ─────────────────────────────────────────────

  private processNextBuildOrder() {
    if (this.buildOrderCooldown > 0) return;
    if (this.buildOrderIndex >= STANDARD_BUILD_ORDER.length) return;

    const step = STANDARD_BUILD_ORDER[this.buildOrderIndex];

    if (step.type === 'wait') {
      if (this.phaseTimer > (step.waitSeconds ?? 10)) {
        this.buildOrderIndex++;
      }
      return;
    }

    if (step.type === 'building') {
      const buildings = getBuildingsForFaction(this.faction);
      const def = step.defIdSuffix
        ? buildings.find(b => b.id.includes(step.defIdSuffix!))
        : buildings.find(b => b.category === step.category);

      if (def) {
        const basePos = this.getBasePosition();
        const pos = {
          x: basePos.x + (Math.random() - 0.5) * 60,
          z: basePos.z + (Math.random() - 0.5) * 60,
        };
        if (this.economy.startBuild(this.faction, def, pos)) {
          this.buildOrderIndex++;
          this.buildOrderCooldown = 8;
          this.emit({ type: 'build_order', faction: this.faction, data: { building: def.name } });
        }
      }
    }

    if (step.type === 'unit') {
      const units = getUnitsForFaction(this.faction);
      const def = step.defIdSuffix
        ? units.find(u => u.id.includes(step.defIdSuffix!))
        : units.find(u => u.category === step.category);

      const building = [...this.buildings.values()].find(b => b.isComplete);

      if (def && building) {
        const count = step.count ?? 1;
        let trained = 0;
        for (let i = 0; i < count; i++) {
          if (this.economy.startTrain(this.faction, def, building.id)) trained++;
        }
        if (trained > 0) {
          this.buildOrderCooldown = 4;
          this.emit({ type: 'train_order', faction: this.faction, data: { unit: def.name, count: trained } });
        }
        if (trained >= count) this.buildOrderIndex++;
      }
    }
  }

  // ─── Threat Assessment ──────────────────────────────────────────────────

  private updateThreatAssessment() {
    if (this.scoutTimer < this.config.scoutInterval) return;
    this.scoutTimer = 0;

    const basePos = this.getBasePosition();
    let threatCount = 0;

    // Check scene meshes for enemy units
    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.faction && mesh.metadata.faction !== this.faction) {
        const dist = BABYLON.Vector3.Distance(basePos, mesh.position);
        if (dist < 200) {
          this.knownEnemyPositions.set(mesh.name, mesh.position.clone());
          if (dist < 100) threatCount++;
        }
      }
    });

    const oldThreat = this.threatLevel;
    this.threatLevel = Math.min(10, threatCount);

    if (this.threatLevel > 3 && oldThreat <= 3) {
      this.emit({ type: 'threat_detected', faction: this.faction, data: { level: this.threatLevel } });
      console.log(`[Commander:${this.faction}] THREAT DETECTED! Level: ${this.threatLevel}`);
    }
  }

  // ─── Unit Behaviors ─────────────────────────────────────────────────────

  private updateUnitBehaviors(deltaTime: number) {
    for (const unit of this.units.values()) {
      if (unit.state === 'dead') continue;

      // Sync HP from damage system
      const entity = this.damageSystem.getEntity(unit.id);
      if (entity) {
        unit.hp = entity.health;
        if (entity.isDead) {
          unit.state = 'dead';
          continue;
        }
      }

      switch (unit.state) {
        case 'patrol':
          this.updatePatrolUnit(unit, deltaTime);
          break;
        case 'attack':
          this.updateAttackUnit(unit, deltaTime);
          break;
        case 'defend':
          this.updateDefendUnit(unit, deltaTime);
          break;
        case 'flee':
          this.updateFleeUnit(unit, deltaTime);
          break;
        case 'gather':
          // Workers handled by economy system
          break;
      }
    }
  }

  private updatePatrolUnit(unit: RTSUnit, deltaTime: number) {
    if (!unit.targetPosition) {
      // Generate random patrol point near base
      const basePos = this.getBasePosition();
      unit.targetPosition = new BABYLON.Vector3(
        basePos.x + (Math.random() - 0.5) * 80,
        0,
        basePos.z + (Math.random() - 0.5) * 80
      );
    }

    // Move toward target
    if (unit.mesh) {
      const dir = unit.targetPosition.subtract(unit.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 2) {
        unit.targetPosition = null; // pick new point next frame
      } else {
        dir.normalize();
        unit.position.addInPlace(dir.scale(unit.speed * deltaTime));
        unit.mesh.position = unit.position.clone();
      }
    }

    // Check for nearby enemies
    const enemy = this.findNearestEnemy(unit.position, unit.range > 0 ? unit.range * 2 : 15);
    if (enemy) {
      unit.state = 'attack';
      unit.targetUnit = enemy;
    }
  }

  private updateAttackUnit(unit: RTSUnit, deltaTime: number) {
    if (!unit.targetUnit) {
      unit.state = 'patrol';
      return;
    }

    const targetEntity = this.damageSystem.getEntity(unit.targetUnit);
    if (!targetEntity || targetEntity.isDead) {
      unit.targetUnit = null;
      unit.state = 'patrol';
      return;
    }

    // Find target mesh position
    const targetMesh = this.scene.getMeshByName(unit.targetUnit);
    if (!targetMesh) {
      unit.targetUnit = null;
      unit.state = 'patrol';
      return;
    }

    const dist = BABYLON.Vector3.Distance(unit.position, targetMesh.position);
    const attackRange = unit.range > 0 ? unit.range : 3;

    if (dist <= attackRange) {
      // Apply damage via DamageSystem
      this.damageSystem.applyDamage(unit.targetUnit, unit.damage, {
        source: unit.id,
        element: 'physical',
      });
    } else {
      // Move toward target
      const dir = targetMesh.position.subtract(unit.position);
      dir.y = 0;
      dir.normalize();
      unit.position.addInPlace(dir.scale(unit.speed * deltaTime));
      if (unit.mesh) unit.mesh.position = unit.position.clone();
    }

    // Flee if low HP
    if (unit.hp < unit.maxHp * 0.15) {
      unit.state = 'flee';
      unit.targetUnit = null;
    }
  }

  private updateDefendUnit(unit: RTSUnit, deltaTime: number) {
    const basePos = this.getBasePosition();
    const distToBase = BABYLON.Vector3.Distance(unit.position, basePos);

    // Stay near base
    if (distToBase > 50) {
      const dir = basePos.subtract(unit.position);
      dir.y = 0;
      dir.normalize();
      unit.position.addInPlace(dir.scale(unit.speed * deltaTime));
      if (unit.mesh) unit.mesh.position = unit.position.clone();
    }

    // Attack enemies near base
    const enemy = this.findNearestEnemy(basePos, 60);
    if (enemy) {
      unit.state = 'attack';
      unit.targetUnit = enemy;
    }
  }

  private updateFleeUnit(unit: RTSUnit, deltaTime: number) {
    const basePos = this.getBasePosition();
    const dir = basePos.subtract(unit.position);
    dir.y = 0;
    if (dir.length() < 20) {
      unit.state = 'defend';
      return;
    }
    dir.normalize();
    unit.position.addInPlace(dir.scale(unit.speed * 1.5 * deltaTime));
    if (unit.mesh) unit.mesh.position = unit.position.clone();
  }

  // ─── Attack Decisions ───────────────────────────────────────────────────

  private updateAttackDecisions() {
    const armySize = this.getArmySize();
    const combatUnits = [...this.units.values()].filter(
      u => !u.isWorker && u.state !== 'dead'
    );

    // Phase-dependent attack threshold
    let attackThreshold = this.config.armySizeThreshold;
    if (this.phase === 'mid_game') attackThreshold *= 0.8;
    if (this.phase === 'late_game') attackThreshold *= 0.6;
    if (this.phase === 'all_in') attackThreshold = 2;

    // Launch attack wave when threshold met and cooldown elapsed
    if (armySize >= attackThreshold && this.attackWaveTimer > 30) {
      const idleUnits = combatUnits.filter(u => u.state === 'idle' || u.state === 'patrol');
      if (idleUnits.length >= attackThreshold * 0.6) {
        this.launchAttackWave(idleUnits);
        this.attackWaveTimer = 0;
      }
    }

    // Respond to threats
    if (this.threatLevel > 3) {
      const patrollers = combatUnits.filter(u => u.state === 'patrol');
      patrollers.forEach(u => { u.state = 'defend'; });
    }
  }

  private launchAttackWave(units: RTSUnit[]) {
    // Pick attack target
    let target: BABYLON.Vector3;
    if (this.knownEnemyPositions.size > 0) {
      const positions = [...this.knownEnemyPositions.values()];
      target = positions[Math.floor(Math.random() * positions.length)];
    } else {
      // Default: attack toward center of map
      target = BABYLON.Vector3.Zero();
    }

    for (const unit of units) {
      unit.state = 'attack';
      unit.targetPosition = target.clone();
      // Try to find a specific enemy to attack
      const enemy = this.findNearestEnemy(target, 100);
      unit.targetUnit = enemy;
    }

    this.emit({
      type: 'attack_wave', faction: this.faction,
      data: { unitCount: units.length, target: { x: target.x, z: target.z } }
    });

    console.log(`[Commander:${this.faction}] ATTACK WAVE! ${units.length} units`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private getBasePosition(): BABYLON.Vector3 {
    // Use first building or faction default position
    const firstBuilding = [...this.buildings.values()][0];
    if (firstBuilding) return firstBuilding.position;

    // Default base positions per faction
    switch (this.faction) {
      case 'orc': return new BABYLON.Vector3(-250, 0, -250);
      case 'elf': return new BABYLON.Vector3(250, 0, -250);
      case 'human': return new BABYLON.Vector3(0, 0, 280);
      default: return BABYLON.Vector3.Zero();
    }
  }

  private getArmySize(): number {
    return [...this.units.values()].filter(u => !u.isWorker && u.state !== 'dead').length;
  }

  private findNearestEnemy(position: BABYLON.Vector3, range: number): string | null {
    let nearest: string | null = null;
    let nearestDist = range;

    // Check damage system entities on other teams
    for (const [faction] of this.economy['resources']) {
      if (faction === this.faction) continue;
      const enemies = this.damageSystem.getEntitiesByTeam(faction);
      for (const entity of enemies) {
        if (entity.isDead) continue;
        const mesh = this.scene.getMeshByName(entity.id);
        if (!mesh) continue;
        const dist = BABYLON.Vector3.Distance(position, mesh.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = entity.id;
        }
      }
    }

    return nearest;
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  getPhase(): CommanderPhase { return this.phase; }
  getThreatLevel(): number { return this.threatLevel; }
  getUnitCount(): number { return this.units.size; }
  getBuildingCount(): number { return this.buildings.size; }
  getArmyCount(): number { return this.getArmySize(); }

  getStatus() {
    return {
      faction: this.faction,
      phase: this.phase,
      threatLevel: this.threatLevel,
      units: this.units.size,
      buildings: this.buildings.size,
      army: this.getArmySize(),
      workers: [...this.units.values()].filter(u => u.isWorker && u.state !== 'dead').length,
      buildOrderStep: this.buildOrderIndex,
      resources: this.economy.getResources(this.faction),
    };
  }

  dispose() {
    this.stop();
    this.units.clear();
    this.buildings.clear();
    this.knownEnemyPositions.clear();
    this.listeners = [];
  }
}
