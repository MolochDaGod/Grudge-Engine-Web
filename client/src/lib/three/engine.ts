/**
 * three/engine.ts — Grudge Three.js Engine
 *
 * Full-featured Three.js runtime with:
 *   - WebGL renderer with shadow maps + tone mapping
 *   - Cannon-ES physics world
 *   - Postprocessing pipeline (Bloom + FXAA via 'postprocessing' package)
 *   - GLB/GLTF loader with DRACO decompression
 *   - Grudge Pipeline client integration (text-to-3D, auto-rig)
 *   - Lighting presets, procedural terrain, instanced trees
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import * as CANNON from 'cannon-es'
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  FXAAEffect,
  EffectPass,
  SMAAEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing'
import { pipeline } from '@/lib/pipeline-client'

// ── Core scene factory ─────────────────────────────────────────────────────────

export interface ThreeSceneContext {
  renderer:   THREE.WebGLRenderer
  composer:   EffectComposer
  scene:      THREE.Scene
  camera:     THREE.PerspectiveCamera
  controls:   OrbitControls
  clock:      THREE.Clock
  physics:    CannonWorld
  start:      (onFrame?: (dt: number) => void) => void
  pause:      () => void
  resume:     (onFrame?: (dt: number) => void) => void
  stop:       () => void
  dispose:    () => void
  isRunning:  () => boolean
  setPostProcessing: (enabled: boolean) => void
}

export function createThreeScene(canvas: HTMLCanvasElement): ThreeSceneContext {
  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // FXAA handles AA
    powerPreference: 'high-performance',
    stencil: false,
  })
  renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping // composer handles tone mapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.info.autoReset = false

  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0.08, 0.10, 0.16)
  scene.fog = new THREE.Fog(0x141a28, 80, 300)

  const camera = new THREE.PerspectiveCamera(
    60,
    (canvas.clientWidth || 800) / (canvas.clientHeight || 600),
    0.1,
    1000,
  )
  camera.position.set(0, 8, 15)

  // ── Controls ─────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 1, 0)
  controls.maxPolarAngle = Math.PI * 0.495
  controls.minDistance = 2
  controls.maxDistance = 200
  controls.screenSpacePanning = false

  // ── Post-processing ───────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)

  const bloom = new BloomEffect({
    intensity: 0.4,
    luminanceThreshold: 0.85,
    luminanceSmoothing: 0.1,
    mipmapBlur: true,
  })

  const fxaa     = new FXAAEffect()
  const smaa     = new SMAAEffect()
  const vignette = new VignetteEffect({ darkness: 0.4, offset: 0.35 })
  const tonemap  = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC, exposure: 1.0 })

  const effectPass = new EffectPass(camera, bloom, fxaa, vignette, tonemap)
  composer.addPass(renderPass)
  composer.addPass(effectPass)

  let postProcessingEnabled = true

  // ── Physics (cannon-es) ───────────────────────────────────────────────────
  const physics = createCannonWorld()

  // ── Resize ───────────────────────────────────────────────────────────────
  const onResize = () => {
    const w = canvas.clientWidth  || 800
    const h = canvas.clientHeight || 600
    renderer.setSize(w, h)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(onResize)
  ro.observe(canvas)
  window.addEventListener('resize', onResize)

  // ── Render loop ───────────────────────────────────────────────────────────
  const clock = new THREE.Clock()
  let rafId: number | null = null
  let _onFrame: ((dt: number) => void) | undefined
  let _running = false

  const loop = () => {
    if (!_running) return
    rafId = requestAnimationFrame(loop)
    const dt = clock.getDelta()
    controls.update()
    physics.step(Math.min(dt, 1 / 30)) // cap physics step
    _onFrame?.(dt)
    renderer.info.reset()
    if (postProcessingEnabled) {
      composer.render(dt)
    } else {
      renderer.render(scene, camera)
    }
  }

  function start(onFrame?: (dt: number) => void) {
    _onFrame  = onFrame
    _running  = true
    clock.start()
    loop()
  }

  function pause() {
    _running = false
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    clock.stop()
  }

  function resume(onFrame?: (dt: number) => void) {
    if (onFrame) _onFrame = onFrame
    _running = true
    clock.start()
    loop()
  }

  function stop() {
    _running = false
    _onFrame = undefined
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    clock.stop()
  }

  function dispose() {
    stop()
    ro.disconnect()
    window.removeEventListener('resize', onResize)
    controls.dispose()
    composer.dispose()
    renderer.dispose()
    scene.clear()
    physics.bodies.forEach(b => physics.removeBody(b))
  }

  function setPostProcessing(enabled: boolean) {
    postProcessingEnabled = enabled
  }

  return {
    renderer, composer, scene, camera, controls, clock, physics,
    start, pause, resume, stop, dispose,
    isRunning: () => _running,
    setPostProcessing,
  }
}

// ── Cannon-ES physics world ────────────────────────────────────────────────────

export interface CannonWorld extends CANNON.World {
  /** Step by dt (seconds), clamped internally to avoid spiral of death. */
  step(dt: number): void
  /** Create a physics body and keep the mesh in sync via beforeStep. */
  addRigidBody(mesh: THREE.Object3D, shape: CANNON.Shape, mass?: number): CANNON.Body
  /** Remove a body and its sync callback. */
  removeRigidBody(body: CANNON.Body): void
  /** Auto-sync all registered (body, mesh) pairs. Call after world.step(). */
  syncMeshes(): void
}

export function createCannonWorld(gravity = -9.81): CannonWorld {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, gravity, 0) }) as CannonWorld
  world.broadphase   = new CANNON.SAPBroadphase(world)
  world.allowSleep   = true
  world.defaultContactMaterial.friction    = 0.4
  world.defaultContactMaterial.restitution = 0.2

  const pairs: Array<{ body: CANNON.Body; mesh: THREE.Object3D }> = []

  world.step = (dt: number) => {
    CANNON.World.prototype.step.call(world, 1 / 60, dt, 3)
    world.syncMeshes()
  }

  world.addRigidBody = (mesh, shape, mass = 1) => {
    const body = new CANNON.Body({ mass, shape })
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z)
    const q = mesh.quaternion as unknown as { x: number; y: number; z: number; w: number }
    body.quaternion.set(q.x, q.y, q.z, q.w)
    world.addBody(body)
    pairs.push({ body, mesh })
    return body
  }

  world.removeRigidBody = (body) => {
    world.removeBody(body)
    const idx = pairs.findIndex(p => p.body === body)
    if (idx >= 0) pairs.splice(idx, 1)
  }

  world.syncMeshes = () => {
    for (const { body, mesh } of pairs) {
      mesh.position.set(body.position.x, body.position.y, body.position.z)
      mesh.quaternion.set(
        body.quaternion.x, body.quaternion.y,
        body.quaternion.z, body.quaternion.w,
      )
    }
  }

  return world
}

// ── Ground / environment physics helpers ──────────────────────────────────────

export function addGroundBody(world: CANNON.World, y = 0): CANNON.Body {
  const body = new CANNON.Body({
    mass: 0, // static
    shape: new CANNON.Plane(),
  })
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  body.position.set(0, y, 0)
  world.addBody(body)
  return body
}

// ── GLTF Loader ────────────────────────────────────────────────────────────────

let _loader: GLTFLoader | null = null

export function getGLTFLoader(): GLTFLoader {
  if (!_loader) {
    _loader = new GLTFLoader()
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    _loader.setDRACOLoader(draco)
  }
  return _loader
}

export async function loadGLB(
  url:   string,
  scene: THREE.Scene,
  opts?: { castShadow?: boolean; receiveShadow?: boolean; scale?: number },
): Promise<{
  root:       THREE.Object3D
  animations: THREE.AnimationClip[]
  mixer:      THREE.AnimationMixer
}> {
  const gltf = await getGLTFLoader().loadAsync(url)
  const root = gltf.scene

  if (opts?.scale && opts.scale !== 1) root.scale.setScalar(opts.scale)

  root.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh
      m.castShadow    = opts?.castShadow    ?? true
      m.receiveShadow = opts?.receiveShadow ?? true
    }
  })
  scene.add(root)
  const mixer = new THREE.AnimationMixer(root)
  return { root, animations: gltf.animations, mixer }
}

/** Load GLB from the Grudge Pipeline (text-to-3D) and insert into scene. */
export async function loadGLBFromPipeline(
  scene:    THREE.Scene,
  prompt:   string,
  onStep?:  (step: string, pct: number) => void,
  token?:   string,
): Promise<{ root: THREE.Object3D; animations: THREE.AnimationClip[]; mixer: THREE.AnimationMixer }> {
  const result = await pipeline.generateCharacter(prompt, onStep, false, token)
  return loadGLB(result.glbUrl, scene)
}

/** Load an already-known GLB URL from the Grudge Object Store into Three.js. */
export async function loadGLBFromObjectStore(
  scene: THREE.Scene,
  url:   string,
  opts?: { castShadow?: boolean; receiveShadow?: boolean; scale?: number },
) {
  return loadGLB(url, scene, opts)
}

// ── HDRI / env map ────────────────────────────────────────────────────────────

/** Load an equirectangular HDRI as scene environment + background. */
export async function loadHDRI(
  renderer: THREE.WebGLRenderer,
  scene:    THREE.Scene,
  url:      string,
  intensity = 1,
) {
  const loader = new RGBELoader()
  const texture = await loader.loadAsync(url)
  texture.mapping = THREE.EquirectangularReflectionMapping
  const pmremGen = new THREE.PMREMGenerator(renderer)
  const env = pmremGen.fromEquirectangular(texture).texture
  scene.environment       = env
  scene.environmentIntensity = intensity
  texture.dispose()
  pmremGen.dispose()
  return env
}

// ── Common lighting presets ────────────────────────────────────────────────────

export function addEditorLighting(scene: THREE.Scene): THREE.DirectionalLight {
  const hemi = new THREE.HemisphereLight(0xb0c4de, 0x3a3a3a, 0.6)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.4)
  sun.position.set(-20, 40, 20)
  sun.castShadow = true
  sun.shadow.mapSize.setScalar(2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far  = 200
  const d = 80
  sun.shadow.camera.left   = -d
  sun.shadow.camera.right  =  d
  sun.shadow.camera.top    =  d
  sun.shadow.camera.bottom = -d
  sun.shadow.bias = -0.001
  scene.add(sun)
  scene.add(sun.target)
  return sun
}

export function addForestLighting(scene: THREE.Scene): THREE.DirectionalLight {
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a4020, 0.4)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sun.position.set(-30, 50, 30)
  sun.castShadow = true
  sun.shadow.mapSize.setScalar(2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 150
  const d = 60
  sun.shadow.camera.left = -d
  sun.shadow.camera.right = d
  sun.shadow.camera.top = d
  sun.shadow.camera.bottom = -d
  scene.add(sun)
  scene.add(sun.target)
  return sun
}

export function addArenaLighting(scene: THREE.Scene): THREE.DirectionalLight {
  const hemi = new THREE.HemisphereLight(0x9999cc, 0x222222, 0.3)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xff9944, 1.5)
  sun.position.set(20, 40, -10)
  sun.castShadow = true
  sun.shadow.mapSize.setScalar(2048)
  const d = 40
  sun.shadow.camera.left = -d
  sun.shadow.camera.right = d
  sun.shadow.camera.top = d
  sun.shadow.camera.bottom = -d
  scene.add(sun)
  scene.add(sun.target)
  return sun
}

// ── Grid helper for editor mode ────────────────────────────────────────────────

export function addEditorGrid(scene: THREE.Scene, size = 40, divisions = 40): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, 0x444466, 0x333355)
  grid.position.y = 0
  scene.add(grid)
  return grid
}

// ── Procedural terrain ─────────────────────────────────────────────────────────

export function createTerrain(scene: THREE.Scene, size = 200, segments = 128): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / size
    const z = pos.getZ(i) / size
    const h = Math.sin(x * 12) * Math.cos(z * 8) * 2
      + Math.sin(x * 25 + z * 15) * 0.8
      + Math.cos(z * 35) * 0.4
    pos.setY(i, h)
  }
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.9, metalness: 0 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

// ── Instanced props ────────────────────────────────────────────────────────────

export function scatterInstancedTrees(scene: THREE.Scene, count = 200, spread = 80): THREE.InstancedMesh {
  const geo = new THREE.ConeGeometry(1.2, 4, 6)
  const mat = new THREE.MeshStandardMaterial({ color: 0x2d6b30, roughness: 0.7 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.castShadow = true

  const matrix = new THREE.Matrix4()
  const pos    = new THREE.Vector3()
  const quat   = new THREE.Quaternion()
  const scl    = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread * 2
    const z = (Math.random() - 0.5) * spread * 2
    const s = 0.6 + Math.random() * 1.0
    pos.set(x, s * 2, z)
    scl.set(s, s, s)
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2)
    matrix.compose(pos, quat, scl)
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  scene.add(mesh)
  return mesh
}

// ── Primitive factory ─────────────────────────────────────────────────────────

export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'plane' | 'cone' | 'torus'

export function createPrimitive(
  scene:     THREE.Scene,
  type:      PrimitiveType,
  material?: THREE.Material,
  color = 0x6366f1,
): THREE.Mesh {
  let geo: THREE.BufferGeometry
  switch (type) {
    case 'box':      geo = new THREE.BoxGeometry(1, 1, 1); break
    case 'sphere':   geo = new THREE.SphereGeometry(0.5, 32, 16); break
    case 'cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break
    case 'capsule':  geo = new THREE.CapsuleGeometry(0.5, 1, 8, 16); break
    case 'plane':    geo = new THREE.PlaneGeometry(1, 1); break
    case 'cone':     geo = new THREE.ConeGeometry(0.5, 1, 32); break
    case 'torus':    geo = new THREE.TorusGeometry(0.5, 0.15, 8, 32); break
    default:         geo = new THREE.BoxGeometry(1, 1, 1)
  }
  const mat  = material ?? new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow    = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

// ── Pipeline helpers (text-to-3D in-editor) ───────────────────────────────────

/**
 * Generate a 3D character from a text prompt via the Grudge Pipeline
 * and drop it into the Three.js scene.
 *
 * @example
 * const { root } = await generateAndImport(ctx.scene, 'orc warrior', (s,p) => console.log(s,p))
 */
export async function generateAndImport(
  scene:   THREE.Scene,
  prompt:  string,
  onStep?: (step: string, pct: number) => void,
  token?:  string,
) {
  return loadGLBFromPipeline(scene, prompt, onStep, token)
}

/**
 * Upload a Three.js-loaded model blob back to the Grudge Object Store.
 */
export async function exportToObjectStore(
  glbBlob:  Blob,
  filename: string,
  token?:   string,
) {
  return pipeline.uploadAsset(glbBlob, filename, 'models', token)
}

export { THREE, CANNON, pipeline }
