/**
 * AssetPreviewPanel.tsx
 *
 * Dedicated Three.js PBR asset preview panel — inspired by:
 *   - Stride Game Studio "Asset Preview" panel
 *   - KhronosGroup/glTF-Sample-Viewer IBL rendering technique
 *   - Three.js editor side-viewer patterns
 *
 * Features:
 *   - Isolated WebGLRenderer (never shares the main viewport canvas)
 *   - PMREMGenerator for IBL environment lighting
 *   - Proper sRGB + ACES Filmic tonemapping
 *   - OrbitControls with auto-rotate
 *   - Handles GLB/GLTF models, textures, materials, prefabs
 *   - Background: checkered (transparent), solid, or env
 *   - Animation playback selector for animated GLBs
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {
  RotateCcw, Play, Pause, Sun, Eye, Box, Loader2,
  ChevronDown, Image, Maximize2, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

// ── Loader singletons ────────────────────────────────────────────────────────

let _gltfLoader: GLTFLoader | null = null;
function getGLTFLoader() {
  if (!_gltfLoader) {
    _gltfLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    _gltfLoader.setDRACOLoader(draco);
  }
  return _gltfLoader;
}

type BgMode = 'checker' | 'dark' | 'env';

// ── Main component ────────────────────────────────────────────────────────────

export function AssetPreviewPanel() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef    = useRef<THREE.AnimationMixer | null>(null);
  const rafRef      = useRef<number | null>(null);
  const clockRef    = useRef(new THREE.Clock());
  const rootRef     = useRef<THREE.Object3D | null>(null);
  const clipsRef    = useRef<THREE.AnimationClip[]>([]);

  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [bgMode,     setBgMode]     = useState<BgMode>('dark');
  const [autoRotate, setAutoRotate] = useState(true);
  const [clips,      setClips]      = useState<string[]>([]);
  const [activeClip, setActiveClip] = useState<string>('');
  const [modelName,  setModelName]  = useState('');

  const { selectedAssetId, project } = useEngineStore();
  const selectedAsset = project?.assets.find(a => a.id === selectedAssetId) ?? null;

  // ── Init renderer once ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping      = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.08;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 1.0;
    controls.minDistance     = 0.1;
    controls.maxDistance     = 50;
    controlsRef.current = controls;

    // Default lighting (before any HDRI loads)
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x332211, 0.8);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff5e0, 1.2);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(1024);
    scene.add(key);

    // Load a neutral studio HDR for IBL (same source as Khronos viewer)
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileEquirectangularShader();
    new RGBELoader().load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
      (hdr) => {
        const envMap = pmremGen.fromEquirectangular(hdr).texture;
        scene.environment = envMap;
        hdr.dispose();
        pmremGen.dispose();
      },
      undefined,
      () => { pmremGen.dispose(); } // graceful fallback on load failure
    );

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth  || 240;
      const h = canvas.clientHeight || 200;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // Render loop
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = clockRef.current.getDelta();
      controls.update();
      mixerRef.current?.update(dt);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // ── Background mode ───────────────────────────────────────────────────────
  useEffect(() => {
    const scene    = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    if (bgMode === 'checker') {
      scene.background = null;
      renderer.setClearColor(0x000000, 0); // transparent
    } else if (bgMode === 'dark') {
      scene.background = new THREE.Color(0x1a1a2e);
    } else {
      scene.background = scene.environment ?? new THREE.Color(0x1a1a2e);
    }
  }, [bgMode]);

  // ── Auto-rotate ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // ── Animation playback ────────────────────────────────────────────────────
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer || !activeClip) return;
    mixer.stopAllAction();
    const clip = clipsRef.current.find(c => c.name === activeClip);
    if (clip) mixer.clipAction(clip).play();
  }, [activeClip]);

  // ── Load asset ────────────────────────────────────────────────────────────
  const clearScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rootRef.current) {
      scene.remove(rootRef.current);
      rootRef.current.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry?.dispose();
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat?.dispose();
        }
      });
      rootRef.current = null;
    }
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    clipsRef.current = [];
    setClips([]);
    setActiveClip('');
    setError(null);
  }, []);

  const loadGLB = useCallback((url: string, name: string) => {
    clearScene();
    setIsLoading(true);
    setModelName(name);

    getGLTFLoader().loadAsync(url).then((gltf) => {
      const scene  = sceneRef.current!;
      const camera = cameraRef.current!;
      const root   = gltf.scene;

      // Auto-centre and scale model into a unit sphere
      const box = new THREE.Box3().setFromObject(root);
      const size   = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) root.scale.setScalar(2 / maxDim);
      root.position.sub(centre.multiplyScalar(2 / maxDim));

      // Correct materials for sRGB output
      root.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        }
      });

      scene.add(root);
      rootRef.current = root;

      // Focus camera on model
      const newBox    = new THREE.Box3().setFromObject(root);
      const newSize   = newBox.getSize(new THREE.Vector3());
      const newCentre = newBox.getCenter(new THREE.Vector3());
      const dist = Math.max(newSize.x, newSize.y, newSize.z) * 1.8;
      camera.position.set(newCentre.x, newCentre.y + dist * 0.3, newCentre.z + dist);
      controlsRef.current!.target.copy(newCentre);

      // Animation setup
      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(root);
        mixerRef.current = mixer;
        clipsRef.current = gltf.animations;
        const names = gltf.animations.map(c => c.name);
        setClips(names);
        setActiveClip(names[0]);
        mixer.clipAction(gltf.animations[0]).play();
      }

      setIsLoading(false);
    }).catch(err => {
      setError(`Failed to load: ${err.message}`);
      setIsLoading(false);
    });
  }, [clearScene]);

  // Load when selected asset changes
  useEffect(() => {
    if (!selectedAsset) { clearScene(); setModelName(''); return; }
    if (['model', 'prefab'].includes(selectedAsset.type) && selectedAsset.path) {
      loadGLB(selectedAsset.path, selectedAsset.name);
    } else if (selectedAsset.type === 'texture' && selectedAsset.path) {
      // Show texture as 2D plane
      clearScene();
      setModelName(selectedAsset.name);
      const loader = new THREE.TextureLoader();
      loader.load(selectedAsset.path, (tex) => {
        const scene = sceneRef.current!;
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = tex.image ? (tex.image.width / tex.image.height) : 1;
        const geo  = new THREE.PlaneGeometry(aspect * 2, 2);
        const mat  = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        rootRef.current = mesh;
        cameraRef.current!.position.set(0, 0, 3);
        controlsRef.current!.target.set(0, 0, 0);
      });
    } else {
      clearScene();
      setModelName(selectedAsset.name);
    }
  }, [selectedAsset, loadGLB, clearScene]);

  const resetCamera = () => {
    if (!rootRef.current || !cameraRef.current || !controlsRef.current) return;
    const box    = new THREE.Box3().setFromObject(rootRef.current);
    const size   = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const dist   = Math.max(size.x, size.y, size.z) * 1.8;
    cameraRef.current.position.set(centre.x, centre.y + dist * 0.3, centre.z + dist);
    controlsRef.current.target.copy(centre);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-sidebar" data-testid="asset-preview-panel">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 h-8 border-b border-sidebar-border shrink-0">
        <Image className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset Preview</span>
        {modelName && (
          <span className="text-xs text-foreground truncate flex-1 ml-1 font-medium">— {modelName}</span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        {/* Checkerboard CSS for transparent bg */}
        <div
          className={cn(
            "absolute inset-0",
            bgMode === 'checker' && "bg-[repeating-conic-gradient(#2a2a3a_0%_25%,#1a1a2a_0%_50%)] bg-[length:16px_16px]"
          )}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="preview-canvas"
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Loading model…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <span className="text-xs text-destructive text-center">{error}</span>
          </div>
        )}

        {/* No asset */}
        {!selectedAsset && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Box className="w-8 h-8 opacity-30" />
            <span className="text-xs opacity-60">Select an asset to preview</span>
          </div>
        )}

        {/* Overlay controls — bottom-left */}
        <div className="absolute bottom-1.5 left-1.5 flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-sidebar/70 backdrop-blur-sm hover:bg-sidebar"
                onClick={() => setAutoRotate(r => !r)}
                data-testid="button-preview-autorotate"
              >
                {autoRotate
                  ? <Pause className="w-3 h-3" />
                  : <Play  className="w-3 h-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{autoRotate ? 'Pause rotation' : 'Resume rotation'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-sidebar/70 backdrop-blur-sm hover:bg-sidebar"
                onClick={resetCamera}
                data-testid="button-preview-reset"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Reset camera</TooltipContent>
          </Tooltip>
        </div>

        {/* Background toggle — bottom-right */}
        <div className="absolute bottom-1.5 right-1.5">
          <Select value={bgMode} onValueChange={(v) => setBgMode(v as BgMode)}>
            <SelectTrigger
              className="h-6 w-6 p-0 border-0 bg-sidebar/70 backdrop-blur-sm hover:bg-sidebar"
              data-testid="select-preview-bg"
            >
              <Sun className="w-3 h-3" />
            </SelectTrigger>
            <SelectContent align="end" className="text-xs w-32">
              <SelectItem value="dark" className="text-xs">Dark</SelectItem>
              <SelectItem value="checker" className="text-xs">Transparent</SelectItem>
              <SelectItem value="env" className="text-xs">Environment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Animation selector */}
      {clips.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-t border-sidebar-border shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
          <Select value={activeClip} onValueChange={setActiveClip}>
            <SelectTrigger
              className="h-6 text-xs flex-1 border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              data-testid="select-preview-animation"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs max-h-48">
              {clips.map(c => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Asset metadata footer */}
      {selectedAsset && (
        <div className="px-2 py-1 border-t border-sidebar-border shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground capitalize">{selectedAsset.type}</span>
          <span className="text-[10px] text-muted-foreground truncate flex-1 font-mono">{selectedAsset.path?.split('/').pop()}</span>
        </div>
      )}
    </div>
  );
}
