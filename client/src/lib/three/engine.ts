/**
 * three/engine.ts — Three.js Engine for Grudge-Engine-Web demos
 * Standalone renderer wrapper — no dependency on grudge-engine repo.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// ── Singleton renderer ───────────────────────────────────────────────────────

export function createThreeScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0.08, 0.1, 0.16)
  scene.fog = new THREE.Fog(0x141a28, 60, 200)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 500)
  camera.position.set(0, 8, 15)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 1, 0)
  controls.maxPolarAngle = Math.PI * 0.48
  controls.minDistance = 3
  controls.maxDistance = 80

  const clock = new THREE.Clock()
  let rafId: number | null = null

  const onResize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  function start(onFrame?: (dt: number) => void) {
    const loop = () => {
      rafId = requestAnimationFrame(loop)
      const dt = clock.getDelta()
      controls.update()
      onFrame?.(dt)
      renderer.render(scene, camera)
    }
    loop()
  }

  function dispose() {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    renderer.dispose()
    scene.clear()
  }

  return { renderer, scene, camera, controls, clock, start, dispose }
}

// ── GLTF Loader ──────────────────────────────────────────────────────────────

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

export async function loadGLB(url: string, scene: THREE.Scene): Promise<{
  root: THREE.Object3D
  animations: THREE.AnimationClip[]
  mixer: THREE.AnimationMixer
}> {
  const gltf = await getGLTFLoader().loadAsync(url)
  const root = gltf.scene
  root.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh
      m.castShadow = true
      m.receiveShadow = true
    }
  })
  scene.add(root)
  const mixer = new THREE.AnimationMixer(root)
  return { root, animations: gltf.animations, mixer }
}

// ── Common lighting presets ──────────────────────────────────────────────────

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

// ── Procedural terrain ───────────────────────────────────────────────────────

export function createTerrain(scene: THREE.Scene, size = 200, segments = 128): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments)
  geo.rotateX(-Math.PI / 2)

  // Simple Perlin-like height displacement
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

// ── Instanced props (trees/rocks) ────────────────────────────────────────────

export function scatterInstancedTrees(scene: THREE.Scene, count = 200, spread = 80): THREE.InstancedMesh {
  const trunk = new THREE.CylinderGeometry(0.15, 0.25, 2, 6)
  const canopy = new THREE.ConeGeometry(1.2, 3, 6)
  canopy.translate(0, 2.5, 0)

  const merged = new THREE.BufferGeometry()
  // Merge trunk + canopy into single geometry manually
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d1a, roughness: 0.85 })
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d6b30, roughness: 0.7 })

  // Use canopy geometry for the instanced mesh (simpler visual)
  const geo = new THREE.ConeGeometry(1.2, 4, 6)
  const mat = new THREE.MeshStandardMaterial({ color: 0x2d6b30, roughness: 0.7 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.castShadow = true

  const matrix = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()

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

export { THREE }
