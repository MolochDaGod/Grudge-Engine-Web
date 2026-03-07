// ─── Shader Library ───────────────────────────────────────────────────────
// Injectable GLSL chunks for noise, lighting, and effects.
// Ported from GrudgeStudioNPM patterns, adapted to TypeScript.

export const ShaderLib = {
  noise: {
    simplex2D: `
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
    `,

    fbm: `
      float fbm(vec2 st, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < octaves; i++) {
          value += amplitude * snoise(st * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }
    `,
  },

  utils: {
    remap: `
      float remap(float value, float inMin, float inMax, float outMin, float outMax) {
        return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
      }
    `,

    smootherstep: `
      float smootherstep(float edge0, float edge1, float x) {
        x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
      }
    `,

    hash: `
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
    `,
  },

  lighting: {
    blinnPhong: `
      vec3 blinnPhong(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 lightColor, float shininess) {
        vec3 halfDir = normalize(lightDir + viewDir);
        float diff = max(dot(normal, lightDir), 0.0);
        float spec = pow(max(dot(normal, halfDir), 0.0), shininess);
        return lightColor * (diff + spec);
      }
    `,

    fresnel: `
      float fresnel(vec3 normal, vec3 viewDir, float power) {
        return pow(1.0 - max(dot(normal, viewDir), 0.0), power);
      }
    `,

    rim: `
      vec3 rimLight(vec3 normal, vec3 viewDir, vec3 rimColor, float rimPower) {
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        return rimColor * pow(rim, rimPower);
      }
    `,
  },

  effects: {
    dissolve: `
      float dissolvePattern(vec2 uv, float threshold, float edge) {
        float noise = snoise(uv * 10.0);
        float alpha = smoothstep(threshold - edge, threshold + edge, noise);
        return alpha;
      }
    `,

    hologram: `
      vec3 hologramEffect(vec2 uv, float time, vec3 baseColor) {
        float scanline = sin(uv.y * 100.0 + time * 5.0) * 0.1;
        float flicker = sin(time * 30.0) * 0.05 + 0.95;
        return baseColor * (1.0 + scanline) * flicker + vec3(0.0, 0.5, 1.0) * 0.15;
      }
    `,

    scanline: `
      float scanline(vec2 uv, float time, float count, float speed) {
        return sin((uv.y + time * speed) * count * 3.14159);
      }
    `,
  },
} as const;
