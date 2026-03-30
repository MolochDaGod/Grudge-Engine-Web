import * as BABYLON from '@babylonjs/core';

export class AudioManager {
  private scene: BABYLON.Scene;
  private sounds: Map<string, BABYLON.Sound> = new Map();
  private masterVolume = 1;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  loadSound(name: string, url: string, loop: boolean = false, volume: number = 1): void {
    if (this.sounds.has(name)) return;
    
    const sound = new BABYLON.Sound(name, url, this.scene, undefined, {
      loop,
      volume: volume * this.sfxVolume,
      autoplay: false,
    });
    this.sounds.set(name, sound);
  }

  playSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      if (sound.isPlaying) sound.stop();
      sound.play();
    }
  }

  playSoundAtPosition(name: string, position: BABYLON.Vector3): void {
    const sound = this.sounds.get(name);
    if (sound) {
      if (sound.isPlaying) sound.stop();
      sound.spatialSound = true;
      sound.setPosition(position);
      sound.play();
    }
  }

  playAttackSound(attackType: 'light' | 'heavy' | 'spell'): void {
    const sounds: Record<string, string[]> = {
      light: ['attack_light_1', 'attack_light_2', 'attack_light_3'],
      heavy: ['attack_heavy_1', 'attack_heavy_2'],
      spell: ['spell_cast_1', 'spell_cast_2'],
    };
    const soundList = sounds[attackType] || [];
    const sound = soundList[Math.floor(Math.random() * soundList.length)];
    if (sound) this.playSound(sound);
  }

  playImpactSound(impactType: 'hit' | 'block' | 'footstep'): void {
    const sounds: Record<string, string[]> = {
      hit: ['impact_hit_1', 'impact_hit_2'],
      block: ['impact_block_1'],
      footstep: ['footstep_1', 'footstep_2'],
    };
    const soundList = sounds[impactType] || [];
    const sound = soundList[Math.floor(Math.random() * soundList.length)];
    if (sound) this.playSound(sound);
  }

  stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      if (!sound.metadata?.isMusic) {
        sound.setVolume(this.sfxVolume);
      }
    });
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      if (sound.metadata?.isMusic) {
        sound.setVolume(this.musicVolume);
      }
    });
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    try {
      if (BABYLON.Engine.audioEngine) {
        BABYLON.Engine.audioEngine.setGlobalVolume(this.masterVolume);
      }
    } catch { }
  }

  dispose(): void {
    this.sounds.forEach(sound => sound.dispose());
    this.sounds.clear();
  }
}

let audioManager: AudioManager | null = null;

export function createAudioManager(scene: BABYLON.Scene): AudioManager {
  if (audioManager) audioManager.dispose();
  audioManager = new AudioManager(scene);
  return audioManager;
}

export function getAudioManager(): AudioManager | null {
  return audioManager;
}
