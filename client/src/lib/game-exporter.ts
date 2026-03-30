/**
 * Game Exporter - Generates standalone deployable web apps from Grudge Engine projects
 * Exports as a single index.html with embedded Babylon.js for Puter or any web host
 */

import type { Project, Scene, GameObject, Component } from '@shared/schema';

/**
 * Escape string for safe embedding in JavaScript
 */
function escapeJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

/**
 * Escape string for safe embedding in HTML
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ExportOptions {
  projectName: string;
  includePlayMode: boolean;
  includeDebugUI: boolean;
  babylonVersion: string;
  quality: 'low' | 'medium' | 'high';
}

interface ExportResult {
  html: string;
  assets: { path: string; required: boolean }[];
}

const DEFAULT_OPTIONS: ExportOptions = {
  projectName: 'My Game',
  includePlayMode: true,
  includeDebugUI: false,
  babylonVersion: '7.0.0',
  quality: 'medium'
};

/**
 * Collect all asset paths from a scene
 */
function collectAssets(scene: Scene): string[] {
  const assets = new Set<string>();
  
  scene.objects.forEach(obj => {
    obj.components.forEach(comp => {
      if (comp.type === 'mesh' && comp.properties.modelPath) {
        assets.add(comp.properties.modelPath);
      }
      if (comp.type === 'material') {
        if (comp.properties.albedoTexture) assets.add(comp.properties.albedoTexture);
        if (comp.properties.normalTexture) assets.add(comp.properties.normalTexture);
        if (comp.properties.metallicTexture) assets.add(comp.properties.metallicTexture);
      }
      if (comp.type === 'audio' && comp.properties.audioPath) {
        assets.add(comp.properties.audioPath);
      }
      if (comp.type === 'particle' && comp.properties.texture) {
        assets.add(comp.properties.texture);
      }
    });
  });
  
  return Array.from(assets);
}

/**
 * Generate the scene creation code
 */
function generateSceneCode(scene: Scene): string {
  const objectsCode = scene.objects.map(obj => {
    const components = obj.components.map(c => generateComponentCode(obj, c)).filter(Boolean);
    return `
    // ${obj.name}
    (function() {
      const objData = ${JSON.stringify({
        id: obj.id,
        name: obj.name,
        visible: obj.visible,
        isStatic: obj.isStatic,
        transform: obj.transform,
        tags: obj.tags,
        layer: obj.layer
      })};
      
      ${components.join('\n      ')}
    })();`;
  }).join('\n');

  return `
  // Scene: ${scene.name}
  const sceneSettings = ${JSON.stringify(scene.settings)};
  
  // Set ambient color
  scene.ambientColor = BABYLON.Color3.FromHexString(sceneSettings.ambientColor);
  
  // Configure fog
  if (sceneSettings.fogEnabled) {
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogColor = BABYLON.Color3.FromHexString(sceneSettings.fogColor);
    scene.fogDensity = sceneSettings.fogDensity;
  }
  
  // Create game objects
  ${objectsCode}
  `;
}

/**
 * Generate code for a specific component type
 */
function generateComponentCode(obj: GameObject, comp: Component): string {
  const pos = obj.transform.position;
  const rot = obj.transform.rotation;
  const scale = obj.transform.scale;
  
  switch (comp.type) {
    case 'mesh':
      if (comp.properties.type === 'imported' && comp.properties.modelPath) {
        const modelPath = comp.properties.modelPath as string;
        const pathParts = modelPath.split('/');
        const fileName = pathParts.pop() || '';
        const directory = pathParts.join('/') + '/';
        return `
        BABYLON.SceneLoader.ImportMeshAsync("", "${escapeJS(directory)}", "${escapeJS(fileName)}", scene).then(result => {
          const root = result.meshes[0];
          root.name = "${escapeJS(obj.name)}";
          root.position = new BABYLON.Vector3(${pos.x}, ${pos.y}, ${pos.z});
          root.rotation = new BABYLON.Vector3(${rot.x * Math.PI / 180}, ${rot.y * Math.PI / 180}, ${rot.z * Math.PI / 180});
          root.scaling = new BABYLON.Vector3(${scale.x}, ${scale.y}, ${scale.z});
          root.isVisible = ${obj.visible};
          ${comp.properties.castShadow ? 'shadowGenerator?.addShadowCaster(root, true);' : ''}
          ${comp.properties.receiveShadow ? 'root.receiveShadows = true;' : ''}
        }).catch(err => console.warn("Failed to load model:", err));`;
      }
      const meshType = (comp.properties.type || 'box') as string;
      const safeName = escapeJS(obj.name);
      const meshBuilders: Record<string, string> = {
        box: `BABYLON.MeshBuilder.CreateBox("${safeName}", { size: 1 }, scene)`,
        sphere: `BABYLON.MeshBuilder.CreateSphere("${safeName}", { diameter: 1 }, scene)`,
        cylinder: `BABYLON.MeshBuilder.CreateCylinder("${safeName}", { diameter: 1, height: 1 }, scene)`,
        plane: `BABYLON.MeshBuilder.CreateGround("${safeName}", { width: 1, height: 1 }, scene)`,
        cone: `BABYLON.MeshBuilder.CreateCylinder("${safeName}", { diameterTop: 0, diameterBottom: 1, height: 1 }, scene)`,
        torus: `BABYLON.MeshBuilder.CreateTorus("${safeName}", { diameter: 1, thickness: 0.3 }, scene)`,
        capsule: `BABYLON.MeshBuilder.CreateCapsule("${safeName}", { radius: 0.5, height: 2 }, scene)`
      };
      const meshCreate = meshBuilders[meshType] || meshBuilders.box;
      
      const safeId = obj.id.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      return `
        const mesh_${safeId} = ${meshCreate};
        mesh_${safeId}.position = new BABYLON.Vector3(${pos.x}, ${pos.y}, ${pos.z});
        mesh_${safeId}.rotation = new BABYLON.Vector3(${rot.x * Math.PI / 180}, ${rot.y * Math.PI / 180}, ${rot.z * Math.PI / 180});
        mesh_${safeId}.scaling = new BABYLON.Vector3(${scale.x}, ${scale.y}, ${scale.z});
        mesh_${safeId}.isVisible = ${obj.visible};`;

    case 'light':
      const lightType = comp.properties.type || 'point';
      const intensity = comp.properties.intensity || 1;
      const color = comp.properties.color || '#ffffff';
      
      if (lightType === 'directional') {
        return `
        const light_${obj.id.replace(/-/g, '_')} = new BABYLON.DirectionalLight("${obj.name}", new BABYLON.Vector3(${Math.sin(rot.y * Math.PI / 180)}, -Math.cos(rot.x * Math.PI / 180), ${Math.cos(rot.y * Math.PI / 180)}), scene);
        light_${obj.id.replace(/-/g, '_')}.intensity = ${intensity};
        light_${obj.id.replace(/-/g, '_')}.diffuse = BABYLON.Color3.FromHexString("${color}");
        ${comp.properties.castShadows ? `
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, light_${obj.id.replace(/-/g, '_')});
        shadowGenerator.useBlurExponentialShadowMap = true;` : ''}`;
      }
      if (lightType === 'hemispheric') {
        return `
        const light_${obj.id.replace(/-/g, '_')} = new BABYLON.HemisphericLight("${obj.name}", new BABYLON.Vector3(0, 1, 0), scene);
        light_${obj.id.replace(/-/g, '_')}.intensity = ${intensity};
        light_${obj.id.replace(/-/g, '_')}.diffuse = BABYLON.Color3.FromHexString("${color}");`;
      }
      return `
        const light_${obj.id.replace(/-/g, '_')} = new BABYLON.PointLight("${obj.name}", new BABYLON.Vector3(${pos.x}, ${pos.y}, ${pos.z}), scene);
        light_${obj.id.replace(/-/g, '_')}.intensity = ${intensity};
        light_${obj.id.replace(/-/g, '_')}.diffuse = BABYLON.Color3.FromHexString("${color}");`;

    case 'camera':
      return `
        const camera = new BABYLON.ArcRotateCamera("${obj.name}", Math.PI / 4, Math.PI / 3, 10, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);
        camera.fov = ${(comp.properties.fov || 60) * Math.PI / 180};
        camera.minZ = ${comp.properties.near || 0.1};
        camera.maxZ = ${comp.properties.far || 1000};`;

    case 'material':
      if (comp.properties.useModelMaterials) return '';
      return `
        const mat_${obj.id.replace(/-/g, '_')} = new BABYLON.PBRMaterial("${obj.name}_mat", scene);
        mat_${obj.id.replace(/-/g, '_')}.albedoColor = BABYLON.Color3.FromHexString("${comp.properties.albedoColor || '#6366f1'}");
        mat_${obj.id.replace(/-/g, '_')}.metallic = ${comp.properties.metallic || 0};
        mat_${obj.id.replace(/-/g, '_')}.roughness = ${comp.properties.roughness || 0.5};
        if (mesh_${obj.id.replace(/-/g, '_')}) mesh_${obj.id.replace(/-/g, '_')}.material = mat_${obj.id.replace(/-/g, '_')};`;

    default:
      return '';
  }
}

/**
 * Generate the complete HTML file
 */
export function exportToHTML(project: Project, options: Partial<ExportOptions> = {}, sceneId?: string): ExportResult {
  const opts = { ...DEFAULT_OPTIONS, ...options, projectName: project.name };
  // Export specified scene or first scene
  const scene = sceneId 
    ? project.scenes.find(s => s.id === sceneId) 
    : project.scenes[0];
  
  if (!scene) {
    return { html: '<!DOCTYPE html><html><body>No scene to export</body></html>', assets: [] };
  }
  
  const assets = collectAssets(scene);
  const sceneCode = generateSceneCode(scene);
  
  const qualitySettings = {
    low: { shadowMapSize: 512, antialias: false, samples: 1 },
    medium: { shadowMapSize: 1024, antialias: true, samples: 2 },
    high: { shadowMapSize: 2048, antialias: true, samples: 4 }
  }[opts.quality];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(opts.projectName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #renderCanvas { width: 100%; height: 100%; touch-action: none; }
    #loading {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      background: #1a1a2e; color: white; font-family: system-ui, sans-serif;
    }
    #loading.hidden { display: none; }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #333;
      border-top-color: #6366f1; border-radius: 50%;
      animation: spin 1s linear infinite; margin-right: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <canvas id="renderCanvas"></canvas>
  <div id="loading">
    <div class="spinner"></div>
    <span>Loading ${escapeHTML(opts.projectName)}...</span>
  </div>
  
  <!-- Babylon.js CDN -->
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
  <script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
  
  <script>
    (function() {
      const canvas = document.getElementById("renderCanvas");
      const loading = document.getElementById("loading");
      
      const engine = new BABYLON.Engine(canvas, ${qualitySettings.antialias}, {
        preserveDrawingBuffer: true,
        stencil: true
      });
      
      const createScene = function() {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);
        
        // Shadow generator reference (set by directional light)
        let shadowGenerator = null;
        
        ${sceneCode}
        
        return scene;
      };
      
      const scene = createScene();
      
      // Hide loading when scene is ready
      scene.executeWhenReady(() => {
        loading.classList.add('hidden');
      });
      
      // Render loop
      engine.runRenderLoop(() => {
        scene.render();
      });
      
      // Resize handler
      window.addEventListener("resize", () => {
        engine.resize();
      });
      
      // Keyboard controls info
      console.log("${escapeJS(opts.projectName)} - Built with Grudge Engine");
      console.log("Controls: WASD to move, Mouse to look around");
    })();
  </script>
</body>
</html>`;

  return {
    html,
    assets: assets.map(path => ({ path, required: true }))
  };
}

/**
 * Export project and trigger download
 */
export async function downloadExport(project: Project, options: Partial<ExportOptions> = {}, sceneId?: string): Promise<void> {
  const result = exportToHTML(project, options, sceneId);
  
  // Create and download the HTML file
  const blob = new Blob([result.html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export for Puter deployment - returns files to upload
 */
export function exportForPuter(project: Project, options: Partial<ExportOptions> = {}): {
  files: { name: string; content: string | Blob }[];
  mainFile: string;
} {
  const result = exportToHTML(project, options);
  
  return {
    files: [
      { name: 'index.html', content: result.html }
    ],
    mainFile: 'index.html'
  };
}
