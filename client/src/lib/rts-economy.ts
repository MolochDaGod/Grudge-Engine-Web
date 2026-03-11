// ─── RTS Economy System ────────────────────────────────────────────────────
// Per-faction resource tracking, building construction queues, unit training
// queues, supply cap, and income/upkeep mechanics.

import type { FactionId, FactionBuildingDef, FactionUnitDef } from './faction-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FactionResources {
  gold: number;
  wood: number;
  stone: number;
  food: number;
  supply: number;
  supplyMax: number;
}

export interface BuildQueueItem {
  id: string;
  def: FactionBuildingDef;
  timeRemaining: number;
  totalTime: number;
  position: { x: number; z: number };
}

export interface TrainQueueItem {
  id: string;
  def: FactionUnitDef;
  timeRemaining: number;
  totalTime: number;
  buildingId: string; // building that's training this unit
}

export interface WorkerAssignment {
  unitId: string;
  task: 'gold' | 'wood' | 'stone' | 'idle' | 'build';
  targetId?: string; // mine/tree/building id
}

export interface EconomyEvent {
  type: 'resource_changed' | 'build_start' | 'build_complete' | 'train_start' | 'train_complete'
    | 'insufficient_resources' | 'supply_capped' | 'worker_assigned' | 'income_tick';
  faction: FactionId;
  data?: Record<string, unknown>;
}

type EconomyListener = (event: EconomyEvent) => void;

// ─── Constants ──────────────────────────────────────────────────────────────

const STARTING_RESOURCES: FactionResources = {
  gold: 500, wood: 300, stone: 100, food: 50,
  supply: 5, supplyMax: 15,
};

const INCOME_RATES = {
  gold: 8,    // per worker per tick
  wood: 6,
  stone: 4,
};

const TICK_INTERVAL = 1; // seconds between income ticks
const SUPPLY_PER_FARM = 5;
const UPKEEP_THRESHOLD = 30; // above this supply usage, income starts to decrease
const UPKEEP_PENALTY = 0.5;  // multiplier at high supply

// ─── Economy Manager ────────────────────────────────────────────────────────

export class RTSEconomy {
  private resources: Map<FactionId, FactionResources> = new Map();
  private buildQueues: Map<FactionId, BuildQueueItem[]> = new Map();
  private trainQueues: Map<FactionId, TrainQueueItem[]> = new Map();
  private workers: Map<FactionId, WorkerAssignment[]> = new Map();
  private listeners: EconomyListener[] = [];
  private tickAccumulator = 0;

  constructor(factions: FactionId[]) {
    for (const fid of factions) {
      this.resources.set(fid, { ...STARTING_RESOURCES });
      this.buildQueues.set(fid, []);
      this.trainQueues.set(fid, []);
      this.workers.set(fid, []);
    }
  }

  // ─── Event System ────────────────────────────────────────────────────────

  on(listener: EconomyListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emit(event: EconomyEvent) {
    this.listeners.forEach(l => l(event));
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  getResources(faction: FactionId): FactionResources {
    return { ...(this.resources.get(faction) ?? STARTING_RESOURCES) };
  }

  getBuildQueue(faction: FactionId): BuildQueueItem[] {
    return [...(this.buildQueues.get(faction) ?? [])];
  }

  getTrainQueue(faction: FactionId): TrainQueueItem[] {
    return [...(this.trainQueues.get(faction) ?? [])];
  }

  getWorkerCount(faction: FactionId, task?: WorkerAssignment['task']): number {
    const w = this.workers.get(faction) ?? [];
    return task ? w.filter(a => a.task === task).length : w.length;
  }

  // ─── Resource Operations ─────────────────────────────────────────────────

  canAfford(faction: FactionId, cost: { gold?: number; wood?: number; stone?: number; food?: number }): boolean {
    const res = this.resources.get(faction);
    if (!res) return false;
    return (
      res.gold >= (cost.gold ?? 0) &&
      res.wood >= (cost.wood ?? 0) &&
      res.stone >= (cost.stone ?? 0) &&
      res.food >= (cost.food ?? 0)
    );
  }

  spend(faction: FactionId, cost: { gold?: number; wood?: number; stone?: number; food?: number }): boolean {
    if (!this.canAfford(faction, cost)) {
      this.emit({ type: 'insufficient_resources', faction, data: { cost } });
      return false;
    }
    const res = this.resources.get(faction)!;
    res.gold -= cost.gold ?? 0;
    res.wood -= cost.wood ?? 0;
    res.stone -= cost.stone ?? 0;
    res.food -= cost.food ?? 0;
    this.emit({ type: 'resource_changed', faction, data: { resources: { ...res } } });
    return true;
  }

  addResources(faction: FactionId, amounts: Partial<FactionResources>) {
    const res = this.resources.get(faction);
    if (!res) return;
    if (amounts.gold) res.gold += amounts.gold;
    if (amounts.wood) res.wood += amounts.wood;
    if (amounts.stone) res.stone += amounts.stone;
    if (amounts.food) res.food += amounts.food;
    if (amounts.supplyMax) res.supplyMax += amounts.supplyMax;
  }

  // ─── Building Queue ──────────────────────────────────────────────────────

  startBuild(faction: FactionId, def: FactionBuildingDef, position: { x: number; z: number }): boolean {
    if (!this.spend(faction, def.cost)) return false;

    const item: BuildQueueItem = {
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      def,
      timeRemaining: def.buildTime,
      totalTime: def.buildTime,
      position,
    };

    this.buildQueues.get(faction)!.push(item);
    this.emit({ type: 'build_start', faction, data: { building: def.name, id: item.id } });

    // Farm buildings increase supply cap
    if (def.category === 'resource' && def.name.toLowerCase().includes('farm')) {
      const res = this.resources.get(faction)!;
      res.supplyMax += SUPPLY_PER_FARM;
    }

    return true;
  }

  // ─── Training Queue ──────────────────────────────────────────────────────

  startTrain(faction: FactionId, def: FactionUnitDef, buildingId: string): boolean {
    const res = this.resources.get(faction)!;

    // Supply check
    if (res.supply >= res.supplyMax) {
      this.emit({ type: 'supply_capped', faction, data: { current: res.supply, max: res.supplyMax } });
      return false;
    }

    if (!this.spend(faction, { gold: def.cost.gold, food: def.cost.food })) return false;

    const item: TrainQueueItem = {
      id: `train_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      def,
      timeRemaining: def.trainTime,
      totalTime: def.trainTime,
      buildingId,
    };

    this.trainQueues.get(faction)!.push(item);
    res.supply += 1; // reserve supply slot
    this.emit({ type: 'train_start', faction, data: { unit: def.name, id: item.id } });
    return true;
  }

  // ─── Worker Management ───────────────────────────────────────────────────

  assignWorker(faction: FactionId, unitId: string, task: WorkerAssignment['task'], targetId?: string) {
    const assignments = this.workers.get(faction)!;
    const existing = assignments.find(a => a.unitId === unitId);
    if (existing) {
      existing.task = task;
      existing.targetId = targetId;
    } else {
      assignments.push({ unitId, task, targetId });
    }
    this.emit({ type: 'worker_assigned', faction, data: { unitId, task, targetId } });
  }

  removeWorker(faction: FactionId, unitId: string) {
    const assignments = this.workers.get(faction)!;
    const idx = assignments.findIndex(a => a.unitId === unitId);
    if (idx >= 0) assignments.splice(idx, 1);
  }

  // ─── Update Loop ─────────────────────────────────────────────────────────

  update(deltaTime: number) {
    // Income tick
    this.tickAccumulator += deltaTime;
    if (this.tickAccumulator >= TICK_INTERVAL) {
      this.tickAccumulator -= TICK_INTERVAL;
      this.processIncomeTick();
    }

    // Process build queues
    for (const [faction, queue] of this.buildQueues) {
      const completed: number[] = [];
      queue.forEach((item, i) => {
        item.timeRemaining -= deltaTime;
        if (item.timeRemaining <= 0) {
          completed.push(i);
          this.emit({ type: 'build_complete', faction, data: { building: item.def.name, id: item.id, position: item.position } });
        }
      });
      // Remove completed (reverse order to preserve indices)
      for (let i = completed.length - 1; i >= 0; i--) {
        queue.splice(completed[i], 1);
      }
    }

    // Process train queues
    for (const [faction, queue] of this.trainQueues) {
      const completed: number[] = [];
      queue.forEach((item, i) => {
        item.timeRemaining -= deltaTime;
        if (item.timeRemaining <= 0) {
          completed.push(i);
          this.emit({ type: 'train_complete', faction, data: { unit: item.def.name, id: item.id, def: item.def } });
        }
      });
      for (let i = completed.length - 1; i >= 0; i--) {
        queue.splice(completed[i], 1);
      }
    }
  }

  private processIncomeTick() {
    for (const [faction, assignments] of this.workers) {
      const res = this.resources.get(faction)!;

      // Calculate upkeep penalty
      let incomeMul = 1.0;
      if (res.supply > UPKEEP_THRESHOLD) {
        const excess = (res.supply - UPKEEP_THRESHOLD) / UPKEEP_THRESHOLD;
        incomeMul = Math.max(UPKEEP_PENALTY, 1 - excess);
      }

      let goldIncome = 0, woodIncome = 0, stoneIncome = 0;

      for (const worker of assignments) {
        switch (worker.task) {
          case 'gold':  goldIncome += INCOME_RATES.gold; break;
          case 'wood':  woodIncome += INCOME_RATES.wood; break;
          case 'stone': stoneIncome += INCOME_RATES.stone; break;
        }
      }

      res.gold += Math.floor(goldIncome * incomeMul);
      res.wood += Math.floor(woodIncome * incomeMul);
      res.stone += Math.floor(stoneIncome * incomeMul);

      if (goldIncome + woodIncome + stoneIncome > 0) {
        this.emit({
          type: 'income_tick', faction,
          data: { gold: goldIncome, wood: woodIncome, stone: stoneIncome, multiplier: incomeMul }
        });
      }
    }
  }

  // ─── Snapshot ─────────────────────────────────────────────────────────────

  getSnapshot(faction: FactionId) {
    return {
      resources: this.getResources(faction),
      buildQueue: this.getBuildQueue(faction),
      trainQueue: this.getTrainQueue(faction),
      workers: {
        gold: this.getWorkerCount(faction, 'gold'),
        wood: this.getWorkerCount(faction, 'wood'),
        stone: this.getWorkerCount(faction, 'stone'),
        idle: this.getWorkerCount(faction, 'idle'),
        build: this.getWorkerCount(faction, 'build'),
        total: this.getWorkerCount(faction),
      },
    };
  }

  dispose() {
    this.resources.clear();
    this.buildQueues.clear();
    this.trainQueues.clear();
    this.workers.clear();
    this.listeners = [];
  }
}
