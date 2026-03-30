import * as BABYLON from '@babylonjs/core';

export type ParameterType = 'float' | 'int' | 'bool' | 'trigger';

export interface AnimatorParameter {
  name: string;
  type: ParameterType;
  value: number | boolean;
}

export interface TransitionCondition {
  parameter: string;
  mode: 'greater' | 'less' | 'equals' | 'notEquals' | 'if' | 'ifNot';
  threshold?: number;
}

export interface AnimatorTransition {
  from: string;
  to: string;
  conditions: TransitionCondition[];
  duration: number;
  exitTime: number;
  hasExitTime: boolean;
  offset: number;
  interruptionSource: 'none' | 'current' | 'next' | 'both';
}

export interface AnimatorState {
  name: string;
  clipName: string;
  speed: number;
  loop: boolean;
  mirror: boolean;
  tag: string;
  x: number;
  y: number;
}

export interface AnimatorLayer {
  name: string;
  weight: number;
  blendMode: 'override' | 'additive';
  states: AnimatorState[];
  transitions: AnimatorTransition[];
  defaultState: string;
  avatarMask: string[];
}

export interface AnimatorControllerData {
  name: string;
  parameters: AnimatorParameter[];
  layers: AnimatorLayer[];
}

export class AnimatorController {
  private data: AnimatorControllerData;
  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  private currentStates: Map<string, string> = new Map();
  private stateTimers: Map<string, number> = new Map();
  private blendWeights: Map<string, number> = new Map();
  private activeTransitions: Map<string, { transition: AnimatorTransition; elapsed: number; fromClip: string; toClip: string }> = new Map();
  private parameters: Map<string, AnimatorParameter> = new Map();
  private listeners: Array<(event: AnimatorEvent) => void> = [];

  constructor(data: AnimatorControllerData) {
    this.data = data;
    data.parameters.forEach(p => {
      this.parameters.set(p.name, { ...p });
    });
    data.layers.forEach(layer => {
      this.currentStates.set(layer.name, layer.defaultState);
      this.stateTimers.set(layer.name, 0);
    });
  }

  private guardExitTimeTransitions(transitions: AnimatorTransition[], currentStateName: string, normalizedTime: number): AnimatorTransition[] {
    return transitions.filter(t => {
      if (t.from !== currentStateName && t.from !== 'Any State') return false;
      if (t.to === currentStateName && t.from !== 'Any State') return false;
      if (t.hasExitTime && t.conditions.length === 0) {
        return normalizedTime >= t.exitTime;
      }
      if (t.hasExitTime && normalizedTime < t.exitTime) return false;
      return true;
    });
  }

  bindAnimationGroups(groups: BABYLON.AnimationGroup[]): void {
    groups.forEach(g => {
      this.animationGroups.set(g.name, g);
      g.stop();
    });
    this.data.layers.forEach(layer => {
      const defaultState = layer.states.find(s => s.name === layer.defaultState);
      if (defaultState) {
        this.startClip(defaultState, layer, layer.weight);
      }
    });
  }

  getAnimationGroups(): Map<string, BABYLON.AnimationGroup> {
    return this.animationGroups;
  }

  setFloat(name: string, value: number): void {
    const param = this.parameters.get(name);
    if (param && param.type === 'float') param.value = value;
  }

  setInt(name: string, value: number): void {
    const param = this.parameters.get(name);
    if (param && param.type === 'int') param.value = Math.floor(value);
  }

  setBool(name: string, value: boolean): void {
    const param = this.parameters.get(name);
    if (param && param.type === 'bool') param.value = value;
  }

  setTrigger(name: string): void {
    const param = this.parameters.get(name);
    if (param && param.type === 'trigger') param.value = true;
  }

  resetTrigger(name: string): void {
    const param = this.parameters.get(name);
    if (param && param.type === 'trigger') param.value = false;
  }

  getFloat(name: string): number {
    const param = this.parameters.get(name);
    return param && param.type === 'float' ? param.value as number : 0;
  }

  getInt(name: string): number {
    const param = this.parameters.get(name);
    return param && param.type === 'int' ? param.value as number : 0;
  }

  getBool(name: string): boolean {
    const param = this.parameters.get(name);
    return param && param.type === 'bool' ? param.value as boolean : false;
  }

  getParameter(name: string): AnimatorParameter | undefined {
    return this.parameters.get(name);
  }

  getAllParameters(): AnimatorParameter[] {
    return Array.from(this.parameters.values());
  }

  getCurrentState(layerName?: string): string {
    const name = layerName || this.data.layers[0]?.name || 'Base';
    return this.currentStates.get(name) || '';
  }

  isInTransition(layerName?: string): boolean {
    const name = layerName || this.data.layers[0]?.name || 'Base';
    return this.activeTransitions.has(name);
  }

  getStateInfo(layerName?: string): { state: string; normalizedTime: number; tag: string } {
    const name = layerName || this.data.layers[0]?.name || 'Base';
    const stateName = this.currentStates.get(name) || '';
    const timer = this.stateTimers.get(name) || 0;
    const layer = this.data.layers.find(l => l.name === name);
    const state = layer?.states.find(s => s.name === stateName);
    return { state: stateName, normalizedTime: timer, tag: state?.tag || '' };
  }

  getData(): AnimatorControllerData {
    return this.data;
  }

  update(dt: number): void {
    this.data.layers.forEach(layer => {
      this.updateLayer(layer, dt);
    });
  }

  private updateLayer(layer: AnimatorLayer, dt: number): void {
    const currentStateName = this.currentStates.get(layer.name) || layer.defaultState;
    const timer = (this.stateTimers.get(layer.name) || 0) + dt;
    this.stateTimers.set(layer.name, timer);

    const active = this.activeTransitions.get(layer.name);
    if (active) {
      active.elapsed += dt;
      const t = Math.min(active.elapsed / Math.max(active.transition.duration, 0.001), 1);
      this.crossfade(active.fromClip, active.toClip, t, layer);

      if (t >= 1) {
        this.completeTransition(layer, active);
      }
      return;
    }

    const currentState = layer.states.find(s => s.name === currentStateName);
    if (!currentState) return;

    const clip = this.animationGroups.get(currentState.clipName);
    const clipDuration = clip ? this.getClipDuration(clip) : 1;
    const normalizedTime = clipDuration > 0 ? timer / clipDuration : 0;

    const validTransitions = this.guardExitTimeTransitions(layer.transitions, currentStateName, normalizedTime);
    for (const transition of validTransitions) {
      if (this.evaluateConditions(transition.conditions)) {
        this.beginTransition(layer, currentState, transition);
        break;
      }
    }
  }

  private evaluateConditions(conditions: TransitionCondition[]): boolean {
    if (conditions.length === 0) return true;
    return conditions.every(cond => {
      const param = this.parameters.get(cond.parameter);
      if (!param) return false;
      switch (cond.mode) {
        case 'greater': return (param.value as number) > (cond.threshold ?? 0);
        case 'less': return (param.value as number) < (cond.threshold ?? 0);
        case 'equals': return param.value === (cond.threshold ?? 0);
        case 'notEquals': return param.value !== (cond.threshold ?? 0);
        case 'if': return param.value === true;
        case 'ifNot': return param.value === false;
        default: return false;
      }
    });
  }

  private beginTransition(layer: AnimatorLayer, fromState: AnimatorState, transition: AnimatorTransition): void {
    const toState = layer.states.find(s => s.name === transition.to);
    if (!toState) return;

    this.emit({ type: 'transitionStart', from: fromState.name, to: toState.name, layer: layer.name });

    this.startClip(toState, layer);

    this.activeTransitions.set(layer.name, {
      transition,
      elapsed: 0,
      fromClip: fromState.clipName,
      toClip: toState.clipName,
    });

    transition.conditions.forEach(cond => {
      const param = this.parameters.get(cond.parameter);
      if (param && param.type === 'trigger') param.value = false;
    });
  }

  private completeTransition(layer: AnimatorLayer, active: { transition: AnimatorTransition; fromClip: string; toClip: string }): void {
    const fromGroup = this.animationGroups.get(active.fromClip);
    if (fromGroup) {
      fromGroup.setWeightForAllAnimatables(0);
      fromGroup.stop();
    }
    const toGroup = this.animationGroups.get(active.toClip);
    if (toGroup) {
      toGroup.setWeightForAllAnimatables(layer.weight);
    }

    this.currentStates.set(layer.name, active.transition.to);
    this.stateTimers.set(layer.name, 0);
    this.activeTransitions.delete(layer.name);
    this.blendWeights.delete(active.fromClip);
    this.blendWeights.set(active.toClip, layer.weight);

    this.emit({ type: 'transitionEnd', from: active.transition.from, to: active.transition.to, layer: layer.name });
  }

  private startClip(state: AnimatorState, layer: AnimatorLayer, initialWeight?: number): void {
    const group = this.animationGroups.get(state.clipName);
    if (!group) return;
    group.speedRatio = state.speed;
    group.loopAnimation = state.loop;
    group.start(state.loop, state.speed, group.from, group.to);
    group.setWeightForAllAnimatables(initialWeight ?? 0);
  }

  private crossfade(fromClipName: string, toClipName: string, t: number, layer: AnimatorLayer): void {
    const ease = this.smoothStep(t);
    const fromGroup = this.animationGroups.get(fromClipName);
    const toGroup = this.animationGroups.get(toClipName);

    if (fromGroup) {
      const fromWeight = (1 - ease) * layer.weight;
      fromGroup.setWeightForAllAnimatables(fromWeight);
      this.blendWeights.set(fromClipName, fromWeight);
    }
    if (toGroup) {
      const toWeight = ease * layer.weight;
      toGroup.setWeightForAllAnimatables(toWeight);
      this.blendWeights.set(toClipName, toWeight);
    }
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private getClipDuration(group: BABYLON.AnimationGroup): number {
    return (group.to - group.from) / (group.speedRatio || 1) / 60;
  }

  play(stateName: string, layerName?: string, transitionDuration: number = 0.25): void {
    const lName = layerName || this.data.layers[0]?.name || 'Base';
    const layer = this.data.layers.find(l => l.name === lName);
    if (!layer) return;
    const currentStateName = this.currentStates.get(lName) || layer.defaultState;
    const fromState = layer.states.find(s => s.name === currentStateName);
    const toState = layer.states.find(s => s.name === stateName);
    if (!fromState || !toState || fromState === toState) return;

    const transition: AnimatorTransition = {
      from: fromState.name, to: toState.name, conditions: [],
      duration: transitionDuration, exitTime: 0, hasExitTime: false,
      offset: 0, interruptionSource: 'both',
    };
    this.beginTransition(layer, fromState, transition);
  }

  crossFade(stateName: string, duration: number = 0.25, layerName?: string): void {
    this.play(stateName, layerName, duration);
  }

  addState(layerName: string, state: AnimatorState): void {
    const layer = this.data.layers.find(l => l.name === layerName);
    if (layer && !layer.states.find(s => s.name === state.name)) {
      layer.states.push(state);
    }
  }

  removeState(layerName: string, stateName: string): void {
    const layer = this.data.layers.find(l => l.name === layerName);
    if (layer) {
      layer.states = layer.states.filter(s => s.name !== stateName);
      layer.transitions = layer.transitions.filter(t => t.from !== stateName && t.to !== stateName);
    }
  }

  addTransition(layerName: string, transition: AnimatorTransition): void {
    const layer = this.data.layers.find(l => l.name === layerName);
    if (layer) {
      layer.transitions.push(transition);
    }
  }

  removeTransition(layerName: string, from: string, to: string): void {
    const layer = this.data.layers.find(l => l.name === layerName);
    if (layer) {
      layer.transitions = layer.transitions.filter(t => !(t.from === from && t.to === to));
    }
  }

  addParameter(param: AnimatorParameter): void {
    this.data.parameters.push(param);
    this.parameters.set(param.name, { ...param });
  }

  removeParameter(name: string): void {
    this.data.parameters = this.data.parameters.filter(p => p.name !== name);
    this.parameters.delete(name);
  }

  onEvent(listener: (event: AnimatorEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  private emit(event: AnimatorEvent): void {
    this.listeners.forEach(l => l(event));
  }

  dispose(): void {
    this.animationGroups.forEach(g => {
      g.stop();
      g.setWeightForAllAnimatables(0);
    });
    this.animationGroups.clear();
    this.currentStates.clear();
    this.stateTimers.clear();
    this.blendWeights.clear();
    this.activeTransitions.clear();
    this.listeners = [];
  }
}

export interface AnimatorEvent {
  type: 'transitionStart' | 'transitionEnd' | 'stateEnter' | 'stateExit';
  from: string;
  to: string;
  layer: string;
}

export function createDefaultController(animationGroups: BABYLON.AnimationGroup[]): AnimatorControllerData {
  const states: AnimatorState[] = [];
  const transitions: AnimatorTransition[] = [];
  let defaultState = '';

  const clipNames = animationGroups.map(g => g.name);

  const stateMap: Record<string, string[]> = {
    idle: ['idle', 'standing', 'rest', 'breathing'],
    walk: ['walk', 'walking', 'locomotion'],
    run: ['run', 'running', 'sprint', 'sprinting', 'jog'],
    jump: ['jump', 'jumping', 'leap'],
    fall: ['fall', 'falling', 'airborne'],
    land: ['land', 'landing'],
    attack: ['attack', 'slash', 'hit', 'punch', 'kick', 'swing', 'combo'],
    block: ['block', 'defend', 'guard', 'shield'],
    dodge: ['dodge', 'roll', 'evade', 'dash'],
    death: ['death', 'die', 'dead', 'dying'],
    crouch: ['crouch', 'crouching', 'sneak'],
    swim: ['swim', 'swimming'],
    climb: ['climb', 'climbing'],
    emote: ['wave', 'dance', 'cheer', 'clap', 'bow', 'salute', 'emote'],
  };

  let posY = 50;
  const usedClips = new Set<string>();

  Object.entries(stateMap).forEach(([stateName, keywords]) => {
    const matchingClip = clipNames.find(clip => {
      const lower = clip.toLowerCase();
      return keywords.some(kw => lower.includes(kw)) && !usedClips.has(clip);
    });
    if (matchingClip) {
      usedClips.add(matchingClip);
      const isLooping = ['idle', 'walk', 'run', 'swim', 'climb', 'crouch', 'fall'].includes(stateName);
      states.push({
        name: stateName,
        clipName: matchingClip,
        speed: 1,
        loop: isLooping,
        mirror: false,
        tag: stateName === 'attack' ? 'combat' : stateName === 'block' ? 'combat' : '',
        x: states.length % 3 * 150 + 50,
        y: posY,
      });
      if (states.length % 3 === 0) posY += 90;
      if (!defaultState) defaultState = stateName;
    }
  });

  clipNames.forEach(clip => {
    if (!usedClips.has(clip)) {
      states.push({
        name: clip,
        clipName: clip,
        speed: 1,
        loop: false,
        mirror: false,
        tag: '',
        x: states.length % 3 * 150 + 50,
        y: posY,
      });
      if (states.length % 3 === 0) posY += 90;
    }
  });

  if (!defaultState && states.length > 0) {
    defaultState = states[0].name;
  }

  const stateNames = states.map(s => s.name);
  const locomotionFlow = ['idle', 'walk', 'run'];
  for (let i = 0; i < locomotionFlow.length - 1; i++) {
    if (stateNames.includes(locomotionFlow[i]) && stateNames.includes(locomotionFlow[i + 1])) {
      transitions.push({
        from: locomotionFlow[i], to: locomotionFlow[i + 1],
        conditions: [{ parameter: 'speed', mode: 'greater', threshold: i === 0 ? 0.1 : 0.6 }],
        duration: 0.2, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
      });
      transitions.push({
        from: locomotionFlow[i + 1], to: locomotionFlow[i],
        conditions: [{ parameter: 'speed', mode: 'less', threshold: i === 0 ? 0.1 : 0.6 }],
        duration: 0.2, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
      });
    }
  }

  if (stateNames.includes('jump')) {
    const jumpFrom = stateNames.includes('idle') ? 'idle' : stateNames[0];
    if (jumpFrom) {
      transitions.push({
        from: jumpFrom, to: 'jump',
        conditions: [{ parameter: 'jump', mode: 'if' }],
        duration: 0.1, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
      });
    }
    if (stateNames.includes('fall')) {
      transitions.push({
        from: 'jump', to: 'fall',
        conditions: [], duration: 0.1, exitTime: 0.8, hasExitTime: true, offset: 0, interruptionSource: 'none',
      });
    }
    if (stateNames.includes('land')) {
      transitions.push({
        from: 'fall', to: 'land',
        conditions: [{ parameter: 'grounded', mode: 'if' }],
        duration: 0.1, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
      });
      transitions.push({
        from: 'land', to: defaultState,
        conditions: [], duration: 0.2, exitTime: 0.9, hasExitTime: true, offset: 0, interruptionSource: 'none',
      });
    } else {
      transitions.push({
        from: 'jump', to: defaultState,
        conditions: [{ parameter: 'grounded', mode: 'if' }],
        duration: 0.2, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
      });
    }
  }

  if (stateNames.includes('attack')) {
    transitions.push({
      from: 'Any State', to: 'attack',
      conditions: [{ parameter: 'attack', mode: 'if' }],
      duration: 0.1, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
    });
    transitions.push({
      from: 'attack', to: defaultState,
      conditions: [], duration: 0.2, exitTime: 0.85, hasExitTime: true, offset: 0, interruptionSource: 'none',
    });
  }

  if (stateNames.includes('block') && stateNames.includes('idle')) {
    transitions.push({
      from: 'idle', to: 'block',
      conditions: [{ parameter: 'blocking', mode: 'if' }],
      duration: 0.15, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
    });
    transitions.push({
      from: 'block', to: 'idle',
      conditions: [{ parameter: 'blocking', mode: 'ifNot' }],
      duration: 0.15, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
    });
  }

  if (stateNames.includes('death')) {
    transitions.push({
      from: 'Any State', to: 'death',
      conditions: [{ parameter: 'dead', mode: 'if' }],
      duration: 0.2, exitTime: 0, hasExitTime: false, offset: 0, interruptionSource: 'both',
    });
  }

  const parameters: AnimatorParameter[] = [
    { name: 'speed', type: 'float', value: 0 },
    { name: 'grounded', type: 'bool', value: true },
    { name: 'jump', type: 'trigger', value: false },
    { name: 'attack', type: 'trigger', value: false },
    { name: 'blocking', type: 'bool', value: false },
    { name: 'dead', type: 'bool', value: false },
    { name: 'direction', type: 'float', value: 0 },
    { name: 'verticalSpeed', type: 'float', value: 0 },
  ];

  return {
    name: 'AutoGenerated',
    parameters,
    layers: [{
      name: 'Base',
      weight: 1,
      blendMode: 'override',
      states,
      transitions,
      defaultState,
      avatarMask: [],
    }],
  };
}

export function serializeController(data: AnimatorControllerData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializeController(json: string): AnimatorControllerData {
  return JSON.parse(json);
}

const activeAnimators: Map<string, AnimatorController> = new Map();

export function getAnimator(gameObjectId: string): AnimatorController | undefined {
  return activeAnimators.get(gameObjectId);
}

export function setAnimator(gameObjectId: string, controller: AnimatorController): void {
  activeAnimators.set(gameObjectId, controller);
}

export function removeAnimator(gameObjectId: string): void {
  const existing = activeAnimators.get(gameObjectId);
  if (existing) {
    existing.dispose();
    activeAnimators.delete(gameObjectId);
  }
}

export function updateAllAnimators(dt: number): void {
  activeAnimators.forEach(controller => controller.update(dt));
}

export function disposeAllAnimators(): void {
  activeAnimators.forEach(controller => controller.dispose());
  activeAnimators.clear();
}

export function getAllAnimatorIds(): string[] {
  return Array.from(activeAnimators.keys());
}
