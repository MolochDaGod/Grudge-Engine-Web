// ─── Material Factory ─────────────────────────────────────────────────────
// Static factory for common THREE.js material presets.
// Ported from GrudgeStudioNPM patterns, adapted to TypeScript.

import * as THREE from 'three';

export interface MaterialOptions {
  color?: number;
  map?: THREE.Texture | null;
  metalness?: number;
  roughness?: number;
  normalMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  wireframe?: boolean;
  // Physical extras
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  sheen?: number;
  sheenRoughness?: number;
  sheenColor?: number;
  // Toon extras
  steps?: number;
  gradientMap?: THREE.Texture;
  // Metal extras
  envMapIntensity?: number;
  // Outline extras
  outlineThickness?: number;
}

export class MaterialFactory {
  static basic(options: MaterialOptions = {}): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      wireframe: options.wireframe ?? false,
    });
  }

  static standard(options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 1,
      normalMap: options.normalMap ?? null,
      aoMap: options.aoMap ?? null,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 1,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
    });
  }

  static physical(options: MaterialOptions = {}): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 1,
      clearcoat: options.clearcoat ?? 0,
      clearcoatRoughness: options.clearcoatRoughness ?? 0,
      transmission: options.transmission ?? 0,
      thickness: options.thickness ?? 0,
      ior: options.ior ?? 1.5,
      sheen: options.sheen ?? 0,
      sheenRoughness: options.sheenRoughness ?? 1,
      sheenColor: new THREE.Color(options.sheenColor ?? 0x000000),
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
    });
  }

  static toon(options: MaterialOptions = {}): THREE.MeshToonMaterial {
    const gradientMap = options.gradientMap ?? MaterialFactory.createToonGradient(options.steps ?? 3);
    return new THREE.MeshToonMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      gradientMap,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
    });
  }

  static createToonGradient(steps: number = 3): THREE.DataTexture {
    const colors = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) {
      colors[i] = (i / (steps - 1)) * 255;
    }
    const gradientMap = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    return gradientMap;
  }

  static glass(options: MaterialOptions = {}): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xffffff,
      metalness: 0,
      roughness: options.roughness ?? 0,
      transmission: options.transmission ?? 1,
      thickness: options.thickness ?? 0.5,
      ior: options.ior ?? 1.5,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
  }

  static metal(options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: options.color ?? 0x888888,
      metalness: options.metalness ?? 1,
      roughness: options.roughness ?? 0.3,
      envMapIntensity: options.envMapIntensity ?? 1,
      side: options.side ?? THREE.FrontSide,
    });
  }

  static emissive(options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: options.color ?? 0x000000,
      emissive: options.emissive ?? 0xffffff,
      emissiveIntensity: options.emissiveIntensity ?? 1,
      metalness: 0,
      roughness: 1,
    });
  }

  static outline(options: MaterialOptions = {}): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        outlineColor: { value: new THREE.Color(options.color ?? 0x000000) },
        outlineThickness: { value: options.outlineThickness ?? 0.03 },
      },
      vertexShader: `
        uniform float outlineThickness;
        void main() {
          vec3 pos = position + normal * outlineThickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 outlineColor;
        void main() {
          gl_FragColor = vec4(outlineColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }

  static shader(
    vertexShader: string,
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform> = {},
  ): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
  }

  static fromPreset(preset: string, options: MaterialOptions = {}): THREE.Material {
    switch (preset) {
      case 'basic': return MaterialFactory.basic(options);
      case 'standard': return MaterialFactory.standard(options);
      case 'physical': return MaterialFactory.physical(options);
      case 'toon': return MaterialFactory.toon(options);
      case 'glass': return MaterialFactory.glass(options);
      case 'metal': return MaterialFactory.metal(options);
      case 'emissive': return MaterialFactory.emissive(options);
      default:
        console.warn(`Unknown material preset: ${preset}`);
        return MaterialFactory.standard(options);
    }
  }
}
