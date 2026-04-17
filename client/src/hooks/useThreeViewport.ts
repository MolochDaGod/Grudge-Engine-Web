/**
 * useThreeViewport.ts
 *
 * Manages a Three.js scene on the shared viewport canvas.
 * Activated when runtimeEngine === 'three' in the engine store.
 * Mirrors the Babylon useViewportScene lifecycle:
 *   - Creates renderer/scene/camera/physics once the canvas is ready
 *   - Responds to isPlaying / isPaused from the store
 *   - Loads GLB assets from the current project scene
 *   - Integrates Grudge Pipeline (text-to-3D) and Object Store
 *   - Disposes cleanly on unmount or engine switch
 */

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useEngineStore } from '@/lib/engine-store';
import {
  createThreeScene,
  addEditorLighting,
  addEditorGrid,
  addGroundBody,
  loadGLB,
  createPrimitive,
  type ThreeSceneContext,
  THREE,
} from '@/lib/three/engine';

interface Params {
  canvasRef:       MutableRefObject<HTMLCanvasElement | null>;
  setFps:          React.Dispatch<React.SetStateAction<number>>;
  setDrawCalls:    React.Dispatch<React.SetStateAction<number>>;
  setVertices:     React.Dispatch<React.SetStateAction<number>>;
  setWebGLError:   React.Dispatch<React.SetStateAction<string | null>>;
  setLoadingModels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useThreeViewport({
  canvasRef, setFps, setDrawCalls, setVertices, setWebGLError, setLoadingModels,
}: Params) {
  const ctxRef = useRef<ThreeSceneContext | null>(null);
  const mixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map());
  const clockRef  = useRef(new THREE.Clock());

  const {
    isPlaying, isPaused, showGrid, showStats, getCurrentScene, addConsoleLog,
    setEngineMetrics, project, currentSceneId,
  } = useEngineStore();

  // ── Init / teardown ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: ThreeSceneContext;
    try {
      ctx = createThreeScene(canvas);
    } catch (err: any) {
      setWebGLError(`Three.js init failed: ${err.message}`);
      return;
    }
    ctxRef.current = ctx;

    // Default editor lighting
    addEditorLighting(ctx.scene);

    // Grid
    let grid: THREE.GridHelper | null = null;
    if (showGrid) grid = addEditorGrid(ctx.scene);

    // Ground physics body
    addGroundBody(ctx.physics);

    // Load project scene objects
    const sceneData = getCurrentScene();
    if (sceneData) {
      loadSceneObjects(ctx, sceneData, mixersRef, setLoadingModels, addConsoleLog);
    }

    // Metrics interval
    const metricsInterval = setInterval(() => {
      const r = ctx.renderer;
      if (!r) return;
      setFps(Math.round(1 / (ctx.clock.getDelta() || 0.016)));
      setDrawCalls(r.info.render.calls);
      setVertices(r.info.render.triangles * 3);
      setEngineMetrics({
        fps: Math.round(r.info.render.frame / Math.max(r.info.render.frame, 1)),
        drawCalls: r.info.render.calls,
        vertices: r.info.render.triangles * 3,
        triangles: r.info.render.triangles,
        renderMs: 0,
        memoryMB: Math.round(
          ((window.performance as any).memory?.usedJSHeapSize ?? 0) / 1_048_576
        ),
      });
    }, 1000);

    // Animation mixer update
    ctx.start((dt) => {
      mixersRef.current.forEach(m => m.update(dt));
    });

    addConsoleLog({ type: 'info', message: 'Three.js viewport initialized (Bloom + FXAA + Cannon physics)', source: 'Renderer' });

    return () => {
      clearInterval(metricsInterval);
      ctx.dispose();
      mixersRef.current.clear();
      ctxRef.current = null;
    };
  // Re-init when scene or project changes (same as Babylon viewport)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, currentSceneId, showGrid]);

  // ── Play / pause / stop ────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (isPlaying && !isPaused) {
      if (!ctx.isRunning()) {
        ctx.resume((dt) => { mixersRef.current.forEach(m => m.update(dt)); });
        addConsoleLog({ type: 'info', message: 'Three.js play mode started', source: 'Engine' });
      }
    } else if (isPlaying && isPaused) {
      ctx.pause();
      addConsoleLog({ type: 'info', message: 'Three.js play mode paused', source: 'Engine' });
    } else {
      // Stopped — restore
      if (ctx.isRunning()) {
        ctx.stop();
        // Restart editor loop (orbiting, no physics)
        ctx.start((dt) => { mixersRef.current.forEach(m => m.update(dt)); });
        addConsoleLog({ type: 'info', message: 'Three.js play mode stopped, editor loop restored', source: 'Engine' });
      }
    }
  }, [isPlaying, isPaused]);

  // ── Post-process toggle ────────────────────────────────────────────────────
  useEffect(() => {
    ctxRef.current?.setPostProcessing(showStats); // reuse showStats as proxy until dedicated setting
  }, [showStats]);

  return { threeCtxRef: ctxRef };
}

// ── Scene object loader ────────────────────────────────────────────────────────

function loadSceneObjects(
  ctx: ThreeSceneContext,
  sceneData: any,
  mixersRef: MutableRefObject<Map<string, THREE.AnimationMixer>>,
  setLoadingModels: (fn: (prev: string[]) => string[]) => void,
  addConsoleLog: (log: any) => void,
) {
  const { scene } = ctx;
  sceneData.objects?.forEach((obj: any) => {
    const meshComp = obj.components?.find((c: any) => c.type === 'mesh');
    if (!meshComp) return;

    const { type, modelPath, color } = meshComp.properties ?? {};
    const pos = obj.transform?.position ?? { x: 0, y: 0, z: 0 };
    const rot = obj.transform?.rotation ?? { x: 0, y: 0, z: 0 };
    const scl = obj.transform?.scale    ?? { x: 1, y: 1, z: 1 };

    if (type === 'imported' && modelPath) {
      setLoadingModels(prev => [...prev, obj.name]);
      loadGLB(modelPath, scene)
        .then(({ root, mixer }) => {
          root.name = obj.id;
          root.position.set(pos.x, pos.y, pos.z);
          root.rotation.set(
            (rot.x * Math.PI) / 180,
            (rot.y * Math.PI) / 180,
            (rot.z * Math.PI) / 180,
          );
          root.scale.set(scl.x, scl.y, scl.z);
          mixersRef.current.set(obj.id, mixer);
          addConsoleLog({ type: 'info', message: `[Three] Loaded: ${obj.name}`, source: 'Viewport' });
        })
        .catch(err => {
          addConsoleLog({ type: 'error', message: `[Three] Failed to load ${obj.name}: ${err.message}`, source: 'Viewport' });
        })
        .finally(() => {
          setLoadingModels(prev => prev.filter(n => n !== obj.name));
        });
    } else if (type && type !== 'imported') {
      const primitiveType = type as any;
      const hexColor = color ? parseInt(color.replace('#', ''), 16) : 0x6366f1;
      try {
        const mesh = createPrimitive(scene, primitiveType, undefined, hexColor);
        mesh.name = obj.id;
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.set(
          (rot.x * Math.PI) / 180,
          (rot.y * Math.PI) / 180,
          (rot.z * Math.PI) / 180,
        );
        mesh.scale.set(scl.x, scl.y, scl.z);
      } catch {}
    }
  });
}
