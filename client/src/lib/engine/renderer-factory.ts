// ─── Renderer Factory ─────────────────────────────────────────────────────
// Creates the appropriate renderer backend.

import type { IRenderer } from './renderer-interface';

export type RendererBackend = 'three' | 'babylon';

/**
 * Create a renderer instance for the given backend.
 * Three.js is the primary/default; Babylon is kept as legacy fallback.
 */
export async function createRenderer(
  backend: RendererBackend,
  canvas: HTMLCanvasElement
): Promise<IRenderer> {
  switch (backend) {
    case 'three': {
      const { ThreeRenderer } = await import('./three-renderer');
      const renderer = new ThreeRenderer();
      renderer.init(canvas);
      return renderer;
    }
    case 'babylon': {
      const { BabylonRenderer } = await import('./babylon-renderer');
      const renderer = new BabylonRenderer();
      renderer.init(canvas);
      return renderer;
    }
    default:
      throw new Error(`Unknown renderer backend: ${backend}`);
  }
}
