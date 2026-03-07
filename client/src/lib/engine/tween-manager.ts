// ─── Tween Manager ────────────────────────────────────────────────────────
// Lightweight tween system with easing, delay, repeat, yoyo, and chaining.
// Ported from GrudgeStudioNPM Tween patterns, adapted to TypeScript.

// ─── Easing Functions ─────────────────────────────────────────────────────

export type EasingName = 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' |
  'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic' |
  'easeInElastic' | 'easeOutElastic' | 'easeOutBounce';

function ease(t: number, name: EasingName): number {
  switch (name) {
    case 'linear': return t;
    case 'easeInQuad': return t * t;
    case 'easeOutQuad': return t * (2 - t);
    case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'easeInCubic': return t * t * t;
    case 'easeOutCubic': { const t1 = t - 1; return t1 * t1 * t1 + 1; }
    case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    case 'easeInElastic': return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    case 'easeOutElastic': return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    case 'easeOutBounce': {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
      if (t < 2.5 / 2.75) { const t3 = t - 2.25 / 2.75; return 7.5625 * t3 * t3 + 0.9375; }
      const t4 = t - 2.625 / 2.75;
      return 7.5625 * t4 * t4 + 0.984375;
    }
    default: return t;
  }
}

// ─── Tween ────────────────────────────────────────────────────────────────

export class Tween {
  target: Record<string, number>;
  private properties: Map<string, { start: number | null; end: number; current: number | null }> = new Map();
  private duration = 1;
  private elapsed = 0;
  private delay = 0;
  private delayElapsed = 0;
  private easing: EasingName = 'linear';
  running = false;
  completed = false;
  private paused = false;
  private repeatCount = 0;
  private repeatCurrent = 0;
  private yoyo = false;
  private reversed = false;
  private started = false;

  private onStartCallback: ((target: Record<string, number>) => void) | null = null;
  private onUpdateCallback: ((target: Record<string, number>, progress: number) => void) | null = null;
  private onCompleteCallback: ((target: Record<string, number>) => void) | null = null;

  private chain: Tween[] = [];

  constructor(target: Record<string, number>) {
    this.target = target;
  }

  to(properties: Record<string, number>, duration: number): this {
    for (const [key, value] of Object.entries(properties)) {
      this.properties.set(key, { start: null, end: value, current: null });
    }
    this.duration = duration;
    return this;
  }

  from(properties: Record<string, number>): this {
    for (const [key, value] of Object.entries(properties)) {
      const prop = this.properties.get(key);
      if (prop) prop.start = value;
    }
    return this;
  }

  setDelay(delay: number): this { this.delay = delay; return this; }
  setEasing(easing: EasingName): this { this.easing = easing; return this; }
  setRepeat(count: number): this { this.repeatCount = count; return this; }
  setYoyo(yoyo: boolean): this { this.yoyo = yoyo; return this; }

  onStart(callback: (target: Record<string, number>) => void): this { this.onStartCallback = callback; return this; }
  onUpdate(callback: (target: Record<string, number>, progress: number) => void): this { this.onUpdateCallback = callback; return this; }
  onComplete(callback: (target: Record<string, number>) => void): this { this.onCompleteCallback = callback; return this; }

  then(tween: Tween): this { this.chain.push(tween); return this; }

  start(): this {
    this.running = true;
    this.paused = false;
    this.completed = false;
    this.elapsed = 0;
    this.delayElapsed = 0;
    this.repeatCurrent = 0;
    this.reversed = false;
    this.started = false;
    return this;
  }

  stop(): this { this.running = false; this.completed = true; return this; }
  pause(): this { this.paused = true; return this; }
  resume(): this { this.paused = false; return this; }

  /** Returns a chained tween to start, or null */
  update(deltaTime: number): Tween | null {
    if (!this.running || this.paused || this.completed) return null;

    // Delay
    if (this.delayElapsed < this.delay) {
      this.delayElapsed += deltaTime;
      return null;
    }

    // Capture start values
    if (!this.started) {
      this.started = true;
      for (const [key, prop] of this.properties) {
        if (prop.start === null) prop.start = this.target[key];
        prop.current = prop.start;
      }
      if (this.onStartCallback) this.onStartCallback(this.target);
    }

    this.elapsed += deltaTime;
    let progress = Math.min(1, this.elapsed / this.duration);
    if (this.reversed) progress = 1 - progress;

    const easedProgress = ease(progress, this.easing);

    for (const [key, prop] of this.properties) {
      const value = prop.start! + (prop.end - prop.start!) * easedProgress;
      this.target[key] = value;
      prop.current = value;
    }

    if (this.onUpdateCallback) this.onUpdateCallback(this.target, progress);

    if (this.elapsed >= this.duration) {
      if (this.repeatCount === -1 || this.repeatCurrent < this.repeatCount) {
        this.repeatCurrent++;
        this.elapsed = 0;
        if (this.yoyo) {
          this.reversed = !this.reversed;
        } else {
          for (const [key, prop] of this.properties) {
            prop.current = prop.start;
            this.target[key] = prop.start!;
          }
        }
      } else {
        this.completed = true;
        this.running = false;
        if (this.onCompleteCallback) this.onCompleteCallback(this.target);
        if (this.chain.length > 0) return this.chain.shift()!;
      }
    }

    return null;
  }

  isComplete(): boolean { return this.completed; }
  isRunning(): boolean { return this.running && !this.paused; }
  getProgress(): number { return Math.min(1, this.elapsed / this.duration); }
}

// ─── Tween Manager ────────────────────────────────────────────────────────

export class TweenManager {
  private tweens: Set<Tween> = new Set();

  create(target: Record<string, number>): Tween {
    const tween = new Tween(target);
    this.tweens.add(tween);
    return tween;
  }

  add(tween: Tween): this {
    this.tweens.add(tween);
    return this;
  }

  remove(tween: Tween): this {
    this.tweens.delete(tween);
    return this;
  }

  update(deltaTime: number) {
    for (const tween of this.tweens) {
      const chainedTween = tween.update(deltaTime);
      if (chainedTween) {
        this.tweens.add(chainedTween);
        chainedTween.start();
      }
      if (tween.completed) {
        this.tweens.delete(tween);
      }
    }
  }

  clear(): this { this.tweens.clear(); return this; }

  pauseAll(): this {
    for (const tween of this.tweens) tween.pause();
    return this;
  }

  resumeAll(): this {
    for (const tween of this.tweens) tween.resume();
    return this;
  }

  getActiveCount(): number { return this.tweens.size; }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const tweenManager = new TweenManager();
