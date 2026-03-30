import { useState } from 'react';
import { Package, Loader2, Check, Download, Monitor, Smartphone, Globe, Server, Container, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEngineStore } from '@/lib/engine-store';

type Platform = 'WebGL' | 'Desktop' | 'Mobile' | 'NodeServer' | 'Docker' | 'Static';

const PLATFORM_INFO: Record<Platform, { icon: any; label: string; description: string; ready: boolean }> = {
  WebGL: { icon: Globe, label: 'WebGL', description: 'Self-contained HTML file with embedded scene', ready: true },
  Desktop: { icon: Monitor, label: 'Desktop', description: 'Electron app bundle (main.js + renderer)', ready: true },
  Mobile: { icon: Smartphone, label: 'Mobile', description: 'PWA-ready package with service worker', ready: true },
  NodeServer: { icon: Server, label: 'Node Server', description: 'Express server with static hosting', ready: true },
  Docker: { icon: Container, label: 'Docker', description: 'Dockerfile + nginx for container deployment', ready: true },
  Static: { icon: Cpu, label: 'Static Site', description: 'Optimized static files for any CDN/host', ready: true },
};

export function BuildSettingsPanel() {
  const { project, projectSettings, addConsoleLog, getCurrentScene } = useEngineStore();
  const [activePlatform, setActivePlatform] = useState<Platform>('WebGL');
  const [compressAssets, setCompressAssets] = useState(true);
  const [includeShadows, setIncludeShadows] = useState(true);
  const [includePhysics, setIncludePhysics] = useState(false);
  const [includeAI, setIncludeAI] = useState(false);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'done' | 'error'>('idle');

  const generateWebGLHtml = () => {
    const sceneData = JSON.stringify(project, null, 2);
    const title = projectSettings.projectName || 'My Game';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} v${projectSettings.version}</title>
  <meta name="description" content="${title} - Built with Grudge Engine" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="A 3D game built with Grudge Engine and Babylon.js" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2a; color: #fff; font-family: sans-serif; overflow: hidden; }
    #canvas { width: 100vw; height: 100vh; display: block; touch-action: none; }
    #loading { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1a2a; z-index: 10; transition: opacity 0.5s; }
    #loading h1 { font-size: 2rem; margin-bottom: 1rem; }
    #loading p { color: #888; }
    .progress { width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden; margin-top: 1rem; }
    .progress-bar { height: 100%; background: #6366f1; width: 0%; transition: width 0.3s; }
    #info { position: fixed; bottom: 1rem; left: 1rem; font-size: 0.75rem; color: rgba(255,255,255,0.4); font-family: monospace; }
    #fps { position: fixed; top: 1rem; right: 1rem; font-size: 0.75rem; color: rgba(255,255,255,0.6); font-family: monospace; }
  </style>
</head>
<body>
  <div id="loading">
    <h1>${title}</h1>
    <p>Loading engine...</p>
    <div class="progress"><div class="progress-bar" id="progress"></div></div>
  </div>
  <canvas id="canvas"></canvas>
  <div id="info">${title} v${projectSettings.version} &bull; ${projectSettings.companyName} &bull; Grudge Engine</div>
  <div id="fps"></div>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
  <script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
  ${includePhysics ? '<script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>' : ''}
  <script>
    const SCENE_DATA = ${sceneData};
    const progress = document.getElementById('progress');
    progress.style.width = '30%';
    const canvas = document.getElementById('canvas');
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);
    progress.style.width = '50%';
    const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2, Math.PI/3, 15, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
    hemi.intensity = 1.2;
    const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1,-2,-1), scene);
    dir.intensity = 1.5;
    dir.position = new BABYLON.Vector3(10, 20, 10);
    ${includeShadows ? "const shadowGen = new BABYLON.ShadowGenerator(1024, dir); shadowGen.usePoissonSampling = true; shadowGen.bias = 0.001;" : ''}
    progress.style.width = '70%';
    const currentScene = SCENE_DATA.scenes && SCENE_DATA.scenes[0];
    if (currentScene && currentScene.objects) {
      currentScene.objects.forEach(obj => {
        if (!obj.transform) return;
        const meshComp = obj.components && obj.components.find(c => c.type === 'mesh');
        const meshType = meshComp && meshComp.properties && meshComp.properties.type;
        let mesh;
        if (meshType === 'box') mesh = BABYLON.MeshBuilder.CreateBox(obj.name, { width: obj.transform.scale.x||1, height: obj.transform.scale.y||1, depth: obj.transform.scale.z||1 }, scene);
        else if (meshType === 'sphere') mesh = BABYLON.MeshBuilder.CreateSphere(obj.name, { diameter: 2*(obj.transform.scale.x||1) }, scene);
        else if (meshType === 'cylinder') mesh = BABYLON.MeshBuilder.CreateCylinder(obj.name, { height: obj.transform.scale.y||1, diameter: (obj.transform.scale.x||1)*2 }, scene);
        else if (meshType === 'plane' || meshType === 'ground') mesh = BABYLON.MeshBuilder.CreateGround(obj.name, { width: obj.transform.scale.x||10, height: obj.transform.scale.z||10 }, scene);
        else if (meshComp) mesh = BABYLON.MeshBuilder.CreateBox(obj.name, { size: 0.5 }, scene);
        if (mesh) {
          mesh.position = new BABYLON.Vector3(obj.transform.position.x||0, obj.transform.position.y||0, obj.transform.position.z||0);
          if (obj.transform.scale && meshType !== 'box') mesh.scaling = new BABYLON.Vector3(obj.transform.scale.x||1, obj.transform.scale.y||1, obj.transform.scale.z||1);
          ${includeShadows ? "if(typeof shadowGen!=='undefined'){shadowGen.addShadowCaster(mesh);mesh.receiveShadows=true;}" : ''}
          const mat = new BABYLON.StandardMaterial(obj.name+'_mat', scene);
          const c = meshComp && meshComp.properties && meshComp.properties.color;
          if (c) mat.diffuseColor = new BABYLON.Color3(c.r||0.5, c.g||0.5, c.b||0.5);
          else mat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.7);
          mesh.material = mat;
        }
      });
    }
    progress.style.width = '100%';
    setTimeout(() => { document.getElementById('loading').style.opacity = '0'; setTimeout(() => document.getElementById('loading').style.display = 'none', 500); }, 300);
    let frameCount = 0, lastTime = performance.now();
    engine.runRenderLoop(() => {
      scene.render();
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        document.getElementById('fps').textContent = Math.round(frameCount * 1000 / (now - lastTime)) + ' FPS';
        frameCount = 0; lastTime = now;
      }
    });
    window.addEventListener('resize', () => engine.resize());
  </script>
</body>
</html>`;
  };

  const generateElectronPackage = () => {
    const html = generateWebGLHtml();
    const title = projectSettings.projectName || 'My Game';
    const mainJs = `const { app, BrowserWindow } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, title: '${title}',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });`;
    const packageJson = JSON.stringify({
      name: (title).replace(/\s+/g, '-').toLowerCase(),
      version: projectSettings.version,
      main: 'main.js',
      scripts: { start: 'electron .' },
      devDependencies: { electron: '^28.0.0' }
    }, null, 2);
    return { html, mainJs, packageJson };
  };

  const generateNodeServer = () => {
    const html = generateWebGLHtml();
    const title = projectSettings.projectName || 'My Game';
    const serverJs = `const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok', game: '${title}', version: '${projectSettings.version}' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log('${title} running on port ' + PORT));`;
    const packageJson = JSON.stringify({
      name: (title).replace(/\s+/g, '-').toLowerCase(),
      version: projectSettings.version,
      main: 'server.js',
      scripts: { start: 'node server.js', dev: 'node server.js' },
      dependencies: { express: '^4.18.0' }
    }, null, 2);
    return { html, serverJs, packageJson };
  };

  const generateDockerfile = () => {
    const title = projectSettings.projectName || 'My Game';
    const dockerfile = `FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .

FROM nginx:alpine
COPY --from=build /app/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
    const nginxConf = `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}`;
    const dockerCompose = `version: '3.8'
services:
  game:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production`;
    return { dockerfile, nginxConf, dockerCompose };
  };

  const generatePWA = () => {
    const title = projectSettings.projectName || 'My Game';
    const manifest = JSON.stringify({
      name: title,
      short_name: title.substring(0, 12),
      description: `${title} - Built with Grudge Engine`,
      start_url: '/',
      display: 'fullscreen',
      orientation: 'landscape',
      background_color: '#1a1a2a',
      theme_color: '#6366f1',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
    }, null, 2);
    const sw = `const CACHE_NAME = '${title.replace(/\s+/g, '-').toLowerCase()}-v${projectSettings.version}';
const urlsToCache = ['/', '/index.html'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))));`;
    return { manifest, sw };
  };

  const downloadFile = (content: string, filename: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadZip = async (files: { name: string; content: string }[], zipName: string) => {
    for (const file of files) {
      downloadFile(file.content, file.name);
    }
    addConsoleLog({ type: 'info', message: `Downloaded ${files.length} files for ${zipName}`, source: 'Build' });
  };

  const handleBuild = async () => {
    if (!project) return;
    setBuildStatus('building');
    addConsoleLog({ type: 'info', message: `Building ${activePlatform} export...`, source: 'Build' });

    setTimeout(async () => {
      try {
        const projectName = (projectSettings.projectName || 'game').replace(/\s+/g, '-').toLowerCase();

        switch (activePlatform) {
          case 'WebGL': {
            const html = generateWebGLHtml();
            downloadFile(html, `${projectName}-v${projectSettings.version}.html`, 'text/html');
            break;
          }
          case 'Desktop': {
            const { html, mainJs, packageJson } = generateElectronPackage();
            await downloadZip([
              { name: 'index.html', content: html },
              { name: 'main.js', content: mainJs },
              { name: 'package.json', content: packageJson },
            ], `${projectName}-electron`);
            break;
          }
          case 'Mobile': {
            const html = generateWebGLHtml();
            const { manifest, sw } = generatePWA();
            await downloadZip([
              { name: 'index.html', content: html },
              { name: 'manifest.json', content: manifest },
              { name: 'sw.js', content: sw },
            ], `${projectName}-pwa`);
            break;
          }
          case 'NodeServer': {
            const { html, serverJs, packageJson } = generateNodeServer();
            await downloadZip([
              { name: 'public/index.html', content: html },
              { name: 'server.js', content: serverJs },
              { name: 'package.json', content: packageJson },
            ], `${projectName}-server`);
            break;
          }
          case 'Docker': {
            const html = generateWebGLHtml();
            const { dockerfile, nginxConf, dockerCompose } = generateDockerfile();
            const { serverJs, packageJson } = generateNodeServer();
            await downloadZip([
              { name: 'public/index.html', content: html },
              { name: 'server.js', content: serverJs },
              { name: 'package.json', content: packageJson },
              { name: 'Dockerfile', content: dockerfile },
              { name: 'nginx.conf', content: nginxConf },
              { name: 'docker-compose.yml', content: dockerCompose },
            ], `${projectName}-docker`);
            break;
          }
          case 'Static': {
            const html = generateWebGLHtml();
            downloadFile(html, `${projectName}-v${projectSettings.version}.html`, 'text/html');
            break;
          }
        }

        setBuildStatus('done');
        addConsoleLog({ type: 'info', message: `${activePlatform} export complete`, source: 'Build' });
        setTimeout(() => setBuildStatus('idle'), 3000);
      } catch (err: any) {
        setBuildStatus('error');
        addConsoleLog({ type: 'error', message: `Build failed: ${err.message}`, source: 'Build' });
        setTimeout(() => setBuildStatus('idle'), 3000);
      }
    }, 500);
  };

  const info = PLATFORM_INFO[activePlatform];
  const PlatformIcon = info.icon;

  return (
    <div className="h-full flex">
      <div className="w-40 border-r border-sidebar-border p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platforms</span>
        <div className="mt-2 space-y-1">
          {(Object.keys(PLATFORM_INFO) as Platform[]).map((platform) => {
            const pInfo = PLATFORM_INFO[platform];
            const Icon = pInfo.icon;
            return (
              <div
                key={platform}
                className={`text-xs p-1.5 rounded cursor-pointer flex items-center gap-2 ${activePlatform === platform ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"}`}
                onClick={() => setActivePlatform(platform)}
                data-testid={`platform-${platform}`}
              >
                <Icon className="w-3 h-3" />
                {pInfo.label}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 p-3 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PlatformIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{info.label} Build</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleBuild}
            disabled={buildStatus === 'building'}
            data-testid="button-build"
          >
            {buildStatus === 'building' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Building...</>
            ) : buildStatus === 'done' ? (
              <><Check className="w-3.5 h-3.5 text-green-400" /> Done!</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> Export</>
            )}
          </Button>
        </div>
        <div className="bg-sidebar-accent rounded p-3 space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Build Options</div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="compress" checked={compressAssets} onChange={(e) => setCompressAssets(e.target.checked)} className="w-3.5 h-3.5" data-testid="checkbox-compress" />
            <label htmlFor="compress" className="text-xs cursor-pointer">Include scene data</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="shadows" checked={includeShadows} onChange={(e) => setIncludeShadows(e.target.checked)} className="w-3.5 h-3.5" data-testid="checkbox-shadows" />
            <label htmlFor="shadows" className="text-xs cursor-pointer">Enable shadows</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="physics" checked={includePhysics} onChange={(e) => setIncludePhysics(e.target.checked)} className="w-3.5 h-3.5" data-testid="checkbox-physics" />
            <label htmlFor="physics" className="text-xs cursor-pointer">Include Havok physics</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="airuntime" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} className="w-3.5 h-3.5" data-testid="checkbox-ai" />
            <label htmlFor="airuntime" className="text-xs cursor-pointer">Include AI runtime (Puter.js)</label>
          </div>
        </div>
        <div className="bg-sidebar-accent/50 rounded p-2 space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Export Info</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Project</span>
            <span className="font-mono truncate">{projectSettings.projectName}</span>
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">{projectSettings.version}</span>
            <span className="text-muted-foreground">Engine</span>
            <span className="font-mono">Babylon.js v8</span>
            <span className="text-muted-foreground">Platform</span>
            <span className="font-mono">{info.label}</span>
            <span className="text-muted-foreground">Scenes</span>
            <span className="font-mono">{project?.scenes.length || 0}</span>
            <span className="text-muted-foreground">Objects</span>
            <span className="font-mono">{getCurrentScene()?.objects.length || 0}</span>
            <span className="text-muted-foreground">Shadows</span>
            <span className="font-mono">{includeShadows ? 'Poisson 1024' : 'Off'}</span>
            <span className="text-muted-foreground">Physics</span>
            <span className="font-mono">{includePhysics ? 'Havok' : 'None'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
