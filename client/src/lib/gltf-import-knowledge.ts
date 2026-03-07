/**
 * Comprehensive Babylon.js glTF/Import Knowledge Base
 * 
 * This module provides AI-assistant knowledge for file imports,
 * conversions, scaling, and best practices in Grudge Engine.
 */

import { CHARACTER_HEIGHTS, CREATURES, NATURE, feetToUnits, unitsToFeet, unitsToMeters } from './units';

// ============================================================================
// SUPPORTED FILE FORMATS
// ============================================================================

export const SUPPORTED_FORMATS = {
  // Native Babylon.js support via @babylonjs/loaders
  NATIVE: {
    GLTF: {
      extensions: ['.gltf', '.glb'],
      description: 'GL Transmission Format - recommended format for web 3D',
      features: ['PBR materials', 'animations', 'skinning', 'morph targets', 'extensions'],
      bestFor: 'All 3D content - characters, environments, props',
    },
    OBJ: {
      extensions: ['.obj'],
      description: 'Wavefront OBJ - simple mesh format with MTL materials',
      features: ['vertices', 'normals', 'UVs', 'basic materials', 'vertex colors'],
      bestFor: 'Static meshes, simple props, CAD exports',
      limitations: 'No animations, no skinning, no PBR',
    },
    STL: {
      extensions: ['.stl'],
      description: 'Stereolithography format - used for 3D printing',
      features: ['triangulated geometry only'],
      bestFor: '3D printing models, CAD exports',
      limitations: 'No materials, no UVs, no animations',
    },
    SPLAT: {
      extensions: ['.ply', '.splat', '.spz'],
      description: 'Gaussian Splatting formats for photogrammetry',
      features: ['point cloud rendering', '3D scene capture'],
      bestFor: 'Photogrammetry, real-world scene capture',
    },
  },
  
  // Requires server-side conversion
  CONVERTIBLE: {
    FBX: {
      extensions: ['.fbx'],
      description: 'Autodesk FBX - common exchange format',
      convertTo: 'GLB',
      converter: 'fbx2gltf',
      features: ['animations', 'skinning', 'materials', 'cameras', 'lights'],
      notes: 'Binary FBX 2014+ supported. ASCII FBX may have issues.',
    },
    BLEND: {
      extensions: ['.blend'],
      description: 'Blender native format',
      convertTo: 'GLB',
      converter: 'Blender CLI or manual export',
      notes: 'Best to export as glTF/GLB directly from Blender',
    },
  },
};

// ============================================================================
// GLTF LOADING BEST PRACTICES
// ============================================================================

export const GLTF_LOADING_GUIDE = {
  // Primary loading functions (modern API)
  loadingFunctions: {
    LoadAssetContainerAsync: {
      use: 'Load without adding to scene - for inspection/manipulation first',
      code: `const container = await BABYLON.LoadAssetContainerAsync("model.glb", scene);
// Inspect before adding
console.log("Meshes:", container.meshes.length);
console.log("Animations:", container.animationGroups.length);
// Add to scene when ready
container.addAllToScene();`,
    },
    
    AppendSceneAsync: {
      use: 'Load and immediately add all content to scene',
      code: `await BABYLON.AppendSceneAsync("model.glb", scene);
// Content is now in scene`,
    },
    
    ImportMeshAsync: {
      use: 'Load specific meshes by name',
      code: `const result = await BABYLON.ImportMeshAsync("model.glb", scene);
// result.meshes, result.skeletons, result.animationGroups available`,
    },
  },
  
  // The __root__ node behavior
  rootNodeBehavior: `
When loading glTF/GLB, Babylon.js adds a __root__ node to handle coordinate system conversion.
- loadedMeshes[0] = __root__ node (transform container)
- loadedMeshes[1] = first actual mesh
- Use scene.useRightHandedSystem = true if model was exported right-handed
`,

  // Loading options
  options: {
    skipMaterials: 'Load geometry only, ignore materials',
    compileMaterials: 'Pre-compile shaders during load',
    useRangeRequests: 'Enable HTTP range requests for progressive loading',
    transparencyAsCoverage: 'Treat alpha as coverage for better transparency',
  },
};

// ============================================================================
// SCALING AND UNITS BEST PRACTICES
// ============================================================================

export const SCALING_GUIDE = {
  principle: '1 Babylon unit = 1 meter (real world)',
  
  commonIssues: {
    differentSoftwareUnits: {
      problem: 'Models from different 3D software have different unit scales',
      examples: {
        'Blender (default)': '1 unit = 1 meter',
        'Maya (default)': '1 unit = 1 centimeter',
        '3ds Max (default)': '1 unit = 1 inch or system units',
        'Cinema 4D': 'Variable based on project settings',
        'Sketchfab downloads': 'Varies wildly per artist',
      },
      solution: 'Always auto-scale imported models to real-world sizes',
    },
    
    characterScaling: {
      standard: '6 feet (1.83 meters) for humanoid characters',
      code: `// After loading, get bounding box and scale
const boundingInfo = mesh.getBoundingInfo();
const currentHeight = boundingInfo.maximum.y - boundingInfo.minimum.y;
const targetHeight = 1.83; // 6 feet in meters
const scale = targetHeight / currentHeight;
mesh.scaling.setAll(scale);`,
    },
  },
  
  targetSizes: {
    humanoid: { height: 1.83, description: '6ft default character' },
    child: { height: 1.22, description: '4ft child character' },
    giant: { height: 3.05, description: '10ft giant' },
    bear: { height: 1.0, description: 'Shoulder height for quadruped' },
    dragonMedium: { height: 3.96, description: '12-14ft flying creature' },
    treeMedium: { height: 4.57, description: '15ft tree' },
    treeLarge: { height: 7.62, description: '25ft tree' },
    door: { height: 2.13, width: 0.91, description: 'Standard door 7x3ft' },
  },
  
  autoScaleFunction: `
function autoScaleToRealWorld(
  mesh: AbstractMesh, 
  targetType: 'humanoid' | 'creature' | 'prop' | 'nature',
  targetHeight?: number
): number {
  const boundingInfo = mesh.getBoundingInfo();
  const currentHeight = boundingInfo.maximum.y - boundingInfo.minimum.y;
  
  // Default heights by type
  const defaults = {
    humanoid: 1.83,  // 6 feet
    creature: 2.0,   // Variable
    prop: 1.0,       // Variable
    nature: 4.57,    // 15ft tree
  };
  
  const height = targetHeight || defaults[targetType];
  const scale = height / currentHeight;
  
  // Apply uniform scale
  mesh.scaling.setAll(scale);
  
  return scale;
}`,
};

// ============================================================================
// ANIMATION HANDLING
// ============================================================================

export const ANIMATION_GUIDE = {
  accessingAnimations: `
// After loading, animations are in AnimationGroups
const container = await BABYLON.LoadAssetContainerAsync("character.glb", scene);
container.addAllToScene();

// List all animations
container.animationGroups.forEach(anim => {
  console.log("Animation:", anim.name, "Duration:", anim.to - anim.from);
});

// Play an animation
const walkAnim = container.animationGroups.find(a => a.name.includes("walk"));
walkAnim?.start(true); // true = loop
`,

  controllingAnimations: `
// Stop all animations first
scene.animationGroups.forEach(ag => ag.stop());

// Play specific animation
const idleAnim = scene.animationGroups.find(a => a.name === "idle");
idleAnim.start(true, 1.0); // loop, speed multiplier

// Blend between animations (smooth transition)
const currentAnim = idleAnim;
const nextAnim = walkAnim;
currentAnim.stop();
nextAnim.start(true, 1.0, nextAnim.from, nextAnim.to, false);
`,

  commonAnimationNames: {
    idle: ['idle', 'stand', 'wait', 'breathing'],
    walk: ['walk', 'move', 'locomotion'],
    run: ['run', 'sprint', 'jog'],
    attack: ['attack', 'hit', 'strike', 'slash', 'punch'],
    jump: ['jump', 'leap', 'hop'],
    death: ['death', 'die', 'dead', 'defeat'],
    special: ['skill', 'ability', 'cast', 'spell'],
  },
};

// ============================================================================
// SKINNING AND SKELETON HANDLING
// ============================================================================

export const SKINNING_GUIDE = {
  understanding: `
glTF skinning works differently from native Babylon.js:
- Skeleton joints point to scene nodes (not separate bone objects)
- Bones are linked to scene nodes via bone.linkTransformNode()
- Modifying bone transforms directly is lost - modify the linked node instead
`,

  accessingSkeleton: `
const container = await BABYLON.LoadAssetContainerAsync("character.glb", scene);

// Find skeleton
const skeleton = container.skeletons[0];
console.log("Bones:", skeleton.bones.length);

// Access specific bone
const headBone = skeleton.bones.find(b => b.name.includes("head"));
if (headBone) {
  // Get the linked transform node to modify
  const headNode = headBone.getTransformNode();
  if (headNode) {
    headNode.rotation.y = Math.PI / 4; // Rotate head
  }
}
`,

  importantNotes: [
    'Skinned mesh transforms are IGNORED per glTF spec (applied via skeleton only)',
    'glTF loader parents skinned mesh as sibling of skeleton root',
    'Use skeleton.overrideMesh with caution (deprecated in Babylon 5.0+)',
  ],
};

// ============================================================================
// MATERIAL HANDLING
// ============================================================================

export const MATERIAL_GUIDE = {
  pbrMaterials: `
glTF uses PBR (Physically Based Rendering) materials:
- baseColorTexture: Albedo/diffuse color
- metallicRoughnessTexture: Combined metal (B) and roughness (G)
- normalTexture: Normal/bump map
- occlusionTexture: Ambient occlusion
- emissiveTexture: Self-illumination

Babylon.js converts these to PBRMaterial automatically.
`,

  accessingMaterials: `
const container = await BABYLON.LoadAssetContainerAsync("model.glb", scene);

container.materials.forEach(mat => {
  if (mat instanceof BABYLON.PBRMaterial) {
    console.log("Material:", mat.name);
    console.log("  Albedo:", mat.albedoTexture?.name);
    console.log("  Metallic:", mat.metallic);
    console.log("  Roughness:", mat.roughness);
  }
});
`,

  modifyingMaterials: `
// Change material properties after loading
const mat = mesh.material as BABYLON.PBRMaterial;
mat.albedoColor = new BABYLON.Color3(1, 0, 0); // Red tint
mat.metallic = 0.8;
mat.roughness = 0.2;
mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Slight glow
`,
};

// ============================================================================
// COMPRESSION AND OPTIMIZATION
// ============================================================================

export const COMPRESSION_GUIDE = {
  dracoCompression: {
    description: 'Mesh geometry compression (KHR_mesh_draco_compression)',
    benefit: '70-90% smaller mesh data',
    setup: `
// Draco decoder is loaded automatically from CDN
// For production, host decoder files locally:
BABYLON.DracoDecoder.Configuration = {
  decoder: {
    wasmUrl: "/draco/draco_wasm_wrapper_gltf.js",
    wasmBinaryUrl: "/draco/draco_decoder_gltf.wasm",
    fallbackUrl: "/draco/draco_decoder_gltf.js",
  },
};`,
  },
  
  textureCompression: {
    description: 'KTX2/Basis Universal texture compression (KHR_texture_basisu)',
    benefit: '75% smaller textures, GPU-native compression',
    setup: `
// KTX2 decoder loads automatically
// For production, host locally:
BABYLON.KhronosTextureContainer2.URLConfig = {
  jsDecoderModule: "/ktx2/basis_transcoder.js",
  wasmUASTCToASTC: "/ktx2/uastc_astc.wasm",
  wasmUASTCToBC7: "/ktx2/uastc_bc7.wasm",
  // ... other transcoders
};`,
  },
  
  meshoptCompression: {
    description: 'Meshopt mesh compression (EXT_meshopt_compression)',
    benefit: 'Better than Draco for animated meshes',
    notes: 'Resource injection not yet supported - use URL config',
  },
};

// ============================================================================
// PROGRESSIVE LOADING (LOD)
// ============================================================================

export const LOD_GUIDE = {
  msftLod: {
    description: 'Microsoft LOD extension for progressive loading',
    benefit: 'Faster time-to-first-render with low-res preview',
    usage: `
// Enable range requests for GLB files
BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce((loader) => {
  if (loader.name === "gltf") {
    loader.useRangeRequests = true;
  }
});

// Load with progress callback
await BABYLON.AppendSceneAsync("model.glb", scene, {
  onProgress: (event) => {
    if (event.lengthComputable) {
      const percent = Math.floor((event.loaded / event.total) * 100);
      console.log("Loading:", percent + "%");
    }
  }
});`,
  },
  
  debugging: `
// Stop at specific LOD level
BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce((loader) => {
  if (loader.name === "gltf") {
    loader.loggingEnabled = true; // See detailed load order
    loader.onExtensionLoadedObservable.add((ext) => {
      if (ext.name === "MSFT_lod") {
        ext.maxLODsToLoad = 1; // Stop at first LOD
      }
    });
  }
});`,
};

// ============================================================================
// FBX CONVERSION
// ============================================================================

export const FBX_CONVERSION_GUIDE = {
  serverSide: `
FBX files require server-side conversion to GLB using fbx2gltf:

// Server endpoint: POST /api/convert/fbx
// Accepts: multipart/form-data with .fbx file
// Returns: Converted .glb file

// Client usage:
const formData = new FormData();
formData.append('file', fbxFile);
const response = await fetch('/api/convert/fbx', {
  method: 'POST',
  body: formData
});
const glbBlob = await response.blob();
`,

  commonIssues: {
    'Binary vs ASCII': 'fbx2gltf works best with binary FBX (2014+)',
    'Embedded textures': 'May need manual texture path fixing',
    'Scale issues': 'FBX from Maya often 100x too small (cm vs m)',
    'Animation issues': 'Complex rigs may need manual cleanup',
  },
  
  blenderAlternative: `
For problematic FBX files, recommend:
1. Import into Blender (free)
2. Fix any issues
3. Export as GLB with these settings:
   - Format: glTF Binary (.glb)
   - Include: Selected Objects or Visible Objects
   - Transform: +Y Up, Apply Modifiers
   - Mesh: Apply Modifiers, UVs, Normals, Vertex Colors
   - Animation: Include if needed
   - Compression: Enable Draco for smaller files
`,
};

// ============================================================================
// OBJ IMPORT BEST PRACTICES
// ============================================================================

export const OBJ_GUIDE = {
  settings: `
// Fix common OBJ issues before loading:
BABYLON.OBJFileLoader.OPTIMIZE_WITH_UV = true;      // Fix UV seams
BABYLON.OBJFileLoader.COMPUTE_NORMALS = true;       // Generate normals
BABYLON.OBJFileLoader.IMPORT_VERTEX_COLORS = true;  // If file has colors
BABYLON.OBJFileLoader.INVERT_Y = false;             // Flip Y if needed
BABYLON.OBJFileLoader.SKIP_MATERIALS = false;       // Load MTL file
`,

  coordinateSystem: `
OBJ files should be exported with:
- -Z axis forward (into screen)
- Y axis up

If model appears rotated:
mesh.rotation.x = -Math.PI / 2; // Rotate 90° around X
// or
mesh.rotation.y = Math.PI; // Rotate 180° around Y
`,

  limitations: [
    'No animations - OBJ is static geometry only',
    'No skinning - cannot be used for characters',
    'Basic materials only - no PBR',
    'Large files - no compression',
  ],
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const ERROR_HANDLING = {
  commonErrors: {
    '404 Not Found': {
      cause: 'File path incorrect or file not in public directory',
      fix: 'Ensure file is in client/public/ and path starts from there',
    },
    'Invalid glTF': {
      cause: 'Corrupted file or unsupported glTF version',
      fix: 'Validate file at https://github.khronos.org/glTF-Validator/',
    },
    'MIME type error': {
      cause: 'Server not sending correct Content-Type',
      fix: 'Configure server to send model/gltf+json for .gltf, model/gltf-binary for .glb',
    },
    'Draco decoder failed': {
      cause: 'Cannot load Draco WASM decoder',
      fix: 'Host decoder files locally or check CSP headers',
    },
    'Missing textures': {
      cause: 'Textures referenced but not found',
      fix: 'Ensure textures are in same folder or update paths in glTF',
    },
  },
  
  robustLoading: `
async function loadModelSafely(url: string, scene: Scene): Promise<AssetContainer | null> {
  try {
    const container = await BABYLON.LoadAssetContainerAsync(url, scene);
    console.log("Loaded successfully:", url);
    console.log("  Meshes:", container.meshes.length);
    console.log("  Materials:", container.materials.length);
    console.log("  Animations:", container.animationGroups.length);
    return container;
  } catch (error) {
    console.error("Failed to load model:", url);
    console.error("Error:", error.message);
    
    // Try fallback or show placeholder
    return null;
  }
}`,
};

// ============================================================================
// AI CONTEXT PROMPT FOR IMPORT ASSISTANCE
// ============================================================================

export const AI_IMPORT_CONTEXT = `
## File Import & Scaling Knowledge

### Supported Formats:
- **glTF/GLB** (recommended): Full support for PBR, animations, skinning
- **OBJ**: Static meshes only, no animations
- **STL**: Geometry only, for 3D printing models
- **FBX**: Requires server conversion to GLB

### Units Standard:
- 1 Babylon unit = 1 meter
- Default humanoid: 6ft (1.83m)
- Trees: Small 10ft, Medium 15ft, Large 25ft
- Dragons: Small 8ft, Medium 12-14ft, Large 22ft

### Loading Code Pattern:
\`\`\`typescript
// Load and inspect
const container = await BABYLON.LoadAssetContainerAsync("model.glb", scene);

// Auto-scale to target height
const mesh = container.meshes[1]; // [0] is __root__
const bounds = mesh.getBoundingInfo();
const height = bounds.maximum.y - bounds.minimum.y;
const targetHeight = 1.83; // 6ft humanoid
mesh.scaling.setAll(targetHeight / height);

// Add to scene
container.addAllToScene();

// Play animation
const idle = container.animationGroups.find(a => a.name.includes("idle"));
idle?.start(true);
\`\`\`

### Common Issues:
1. **Wrong scale**: Models from different software have different units - always auto-scale
2. **Rotated model**: Use mesh.rotation or check export settings (-Z forward, Y up)
3. **Missing textures**: Ensure textures are in same folder as model
4. **No animations found**: Check if format supports animations (OBJ/STL don't)

### Quick Fixes:
- Model too big/small: \`mesh.scaling.setAll(desiredScale)\`
- Model facing wrong way: \`mesh.rotation.y = Math.PI\`
- Model lying down: \`mesh.rotation.x = -Math.PI / 2\`
- Model upside down: \`mesh.rotation.z = Math.PI\`
`;

// Export knowledge for AI assistant
export function getImportKnowledgeForAI(): string {
  return AI_IMPORT_CONTEXT;
}

// Helper to diagnose model issues
export function diagnoseModel(container: any): string[] {
  const issues: string[] = [];
  
  if (!container.meshes || container.meshes.length === 0) {
    issues.push("No meshes found in model");
  }
  
  if (container.meshes?.length === 1) {
    issues.push("Only __root__ node found - model may be empty");
  }
  
  if (!container.materials || container.materials.length === 0) {
    issues.push("No materials - model will appear default gray");
  }
  
  if (!container.animationGroups || container.animationGroups.length === 0) {
    issues.push("No animations found");
  }
  
  // Check scale
  const mesh = container.meshes?.[1];
  if (mesh) {
    const bounds = mesh.getBoundingInfo();
    const height = bounds.maximum.y - bounds.minimum.y;
    
    if (height < 0.1) {
      issues.push(`Model very small (${height.toFixed(3)}m) - may need scaling up`);
    } else if (height > 100) {
      issues.push(`Model very large (${height.toFixed(1)}m) - may need scaling down`);
    }
  }
  
  return issues;
}
