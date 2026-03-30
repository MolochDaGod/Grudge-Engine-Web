#!/usr/bin/env node
/**
 * convert-race-assets.mjs
 * ─────────────────────────
 * Batch-converts all 6 Toon_RTS race characters, equipment, and animations
 * from FBX → GLB and organises them under public/assets/characters/races/.
 *
 * Usage:
 *   node scripts/convert-race-assets.mjs [--source <path>] [--dest <path>]
 *
 * Requires: fbx2gltf  (npm i fbx2gltf)
 *           sharp      (npm i sharp)  — for TGA → PNG texture conversion
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE = String.raw`D:\GRUDGE-NEW-GGG\FRESH GRUDGE\Assets\Toon_RTS`;
const DEFAULT_DEST = path.resolve(process.cwd(), 'public', 'assets', 'characters', 'races');

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const SOURCE_ROOT = getArg('--source') || DEFAULT_SOURCE;
const DEST_ROOT = getArg('--dest') || DEFAULT_DEST;

/** Map Toon_RTS folder → Grudge race ID */
const RACE_MAP = {
  Barbarians:      { id: 'barbarian', prefix: 'BRB' },
  Dwarves:         { id: 'dwarf',     prefix: 'DWF' },
  Elves:           { id: 'elf',       prefix: 'ELF' },
  Orcs:            { id: 'orc',       prefix: 'ORC' },
  Undead:          { id: 'undead',     prefix: 'UD' },
  WesternKingdoms: { id: 'human',     prefix: 'WK' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(name) {
  return name
    .replace(/\.fbx$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function findFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, extensions));
    } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

let fbx2gltfPath = null;

async function resolveFbx2gltf() {
  if (fbx2gltfPath) return fbx2gltfPath;
  // Try the npm package first
  try {
    const mod = await import('fbx2gltf');
    // fbx2gltf exports a function that wraps the binary
    fbx2gltfPath = 'npm';
    return fbx2gltfPath;
  } catch (_) { /* not installed as npm package */ }

  // Try system PATH
  const names = process.platform === 'win32'
    ? ['FBX2glTF-windows-x64.exe', 'fbx2gltf.exe', 'FBX2glTF.exe']
    : ['FBX2glTF-linux-x64', 'fbx2gltf', 'FBX2glTF'];
  for (const name of names) {
    try {
      await execFileAsync(name, ['--help']);
      fbx2gltfPath = name;
      return fbx2gltfPath;
    } catch (_) { /* not found */ }
  }

  throw new Error(
    'fbx2gltf not found. Install via: npm i fbx2gltf\n' +
    'Or download FBX2glTF binary from https://github.com/godotengine/FBX2glTF/releases'
  );
}

async function convertFbxToGlb(inputPath, outputPath) {
  ensureDir(path.dirname(outputPath));
  const tool = await resolveFbx2gltf();

  if (tool === 'npm') {
    const fbx2gltf = (await import('fbx2gltf')).default;
    await fbx2gltf(inputPath, outputPath, ['--binary']);
  } else {
    await execFileAsync(tool, [
      '--input', inputPath,
      '--output', outputPath,
      '--binary',
    ], { timeout: 120_000 });
  }

  if (!fs.existsSync(outputPath)) {
    // Some versions output with _out suffix
    const altOutput = outputPath.replace(/\.glb$/, '_out.glb');
    if (fs.existsSync(altOutput)) {
      fs.renameSync(altOutput, outputPath);
    }
  }

  return fs.existsSync(outputPath);
}

async function convertTgaToPng(inputPath, outputPath) {
  ensureDir(path.dirname(outputPath));
  try {
    const sharp = (await import('sharp')).default;
    await sharp(inputPath).png().toFile(outputPath);
    return true;
  } catch (err) {
    console.warn(`  ⚠ TGA→PNG failed for ${path.basename(inputPath)}: ${err.message}`);
    // Fallback: copy raw TGA
    fs.copyFileSync(inputPath, outputPath.replace(/\.png$/, '.tga'));
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-race processing
// ---------------------------------------------------------------------------

async function processRace(raceFolder, raceInfo) {
  const raceDir = path.join(SOURCE_ROOT, raceFolder);
  if (!fs.existsSync(raceDir)) {
    console.warn(`⚠ Race folder not found: ${raceDir}`);
    return null;
  }

  const destDir = path.join(DEST_ROOT, raceInfo.id);
  ensureDir(destDir);
  ensureDir(path.join(destDir, 'equipment'));
  ensureDir(path.join(destDir, 'animations'));

  const manifest = {
    raceId: raceInfo.id,
    prefix: raceInfo.prefix,
    baseMesh: null,
    texture: null,
    equipment: [],
    animations: [],
  };

  console.log(`\n━━━ ${raceInfo.id.toUpperCase()} (${raceFolder}) ━━━`);

  // 1. Base character model
  const modelsDir = path.join(raceDir, 'models');
  const baseFiles = findFiles(modelsDir, ['.fbx']).filter(
    (f) => path.basename(f).toLowerCase().includes('characters_customizable')
  );

  if (baseFiles.length > 0) {
    const baseFbx = baseFiles[0];
    const baseGlb = path.join(destDir, `${raceInfo.id}-base.glb`);
    console.log(`  Base: ${path.basename(baseFbx)}`);
    try {
      const ok = await convertFbxToGlb(baseFbx, baseGlb);
      if (ok) {
        manifest.baseMesh = `${raceInfo.id}-base.glb`;
        console.log(`  ✓ → ${manifest.baseMesh}`);
      } else {
        console.warn(`  ✗ Conversion produced no output`);
        // Copy FBX as fallback
        const fallback = path.join(destDir, `${raceInfo.id}-base.fbx`);
        fs.copyFileSync(baseFbx, fallback);
        manifest.baseMesh = `${raceInfo.id}-base.fbx`;
      }
    } catch (err) {
      console.warn(`  ✗ Conversion failed: ${err.message}`);
      const fallback = path.join(destDir, `${raceInfo.id}-base.fbx`);
      fs.copyFileSync(baseFbx, fallback);
      manifest.baseMesh = `${raceInfo.id}-base.fbx`;
    }
  }

  // 2. Textures
  const textureFiles = findFiles(path.join(modelsDir, 'Materials'), ['.tga', '.png', '.jpg']);
  for (const texFile of textureFiles) {
    const ext = path.extname(texFile).toLowerCase();
    const slug = slugify(path.basename(texFile));
    if (ext === '.tga') {
      const outPng = path.join(destDir, `${slug}.png`);
      console.log(`  Tex: ${path.basename(texFile)} → ${slug}.png`);
      await convertTgaToPng(texFile, outPng);
      if (!manifest.texture) manifest.texture = `${slug}.png`;
    } else {
      const outFile = path.join(destDir, `${slug}${ext}`);
      fs.copyFileSync(texFile, outFile);
      if (!manifest.texture) manifest.texture = `${slug}${ext}`;
    }
  }

  // 3. Equipment models
  const equipDirs = [
    path.join(modelsDir, 'extra models', 'Equipment'),
    path.join(modelsDir, 'extra models', 'equipment'),
    path.join(modelsDir, 'extra_models', 'Equipment'),
    path.join(modelsDir, 'extra_models', 'equipment'),
  ];
  for (const eqDir of equipDirs) {
    const eqFiles = findFiles(eqDir, ['.fbx']);
    for (const eqFile of eqFiles) {
      const slug = slugify(path.basename(eqFile));
      const outGlb = path.join(destDir, 'equipment', `${slug}.glb`);
      console.log(`  Equip: ${path.basename(eqFile)}`);
      try {
        const ok = await convertFbxToGlb(eqFile, outGlb);
        if (ok) {
          manifest.equipment.push({ name: slug, file: `equipment/${slug}.glb`, source: path.basename(eqFile) });
          console.log(`  ✓ → equipment/${slug}.glb`);
        } else {
          fs.copyFileSync(eqFile, path.join(destDir, 'equipment', `${slug}.fbx`));
          manifest.equipment.push({ name: slug, file: `equipment/${slug}.fbx`, source: path.basename(eqFile) });
        }
      } catch (err) {
        console.warn(`  ✗ ${err.message}`);
        fs.copyFileSync(eqFile, path.join(destDir, 'equipment', `${slug}.fbx`));
        manifest.equipment.push({ name: slug, file: `equipment/${slug}.fbx`, source: path.basename(eqFile) });
      }
    }
  }

  // Also grab extra models like bags, bolts
  const extraFiles = findFiles(path.join(modelsDir, 'extra models'), ['.fbx']).concat(
    findFiles(path.join(modelsDir, 'extra_models'), ['.fbx'])
  ).filter(f => {
    const rel = path.relative(modelsDir, f).toLowerCase();
    return !rel.includes('equipment') && !rel.includes('cavalry');
  });
  for (const extraFile of extraFiles) {
    const slug = slugify(path.basename(extraFile));
    const outGlb = path.join(destDir, 'equipment', `${slug}.glb`);
    if (fs.existsSync(outGlb)) continue; // Already processed
    console.log(`  Extra: ${path.basename(extraFile)}`);
    try {
      await convertFbxToGlb(extraFile, outGlb);
      manifest.equipment.push({ name: slug, file: `equipment/${slug}.glb`, source: path.basename(extraFile) });
    } catch (_) {
      fs.copyFileSync(extraFile, path.join(destDir, 'equipment', `${slug}.fbx`));
      manifest.equipment.push({ name: slug, file: `equipment/${slug}.fbx`, source: path.basename(extraFile) });
    }
  }

  // 4. Animations
  const animDir = path.join(raceDir, 'animation');
  const animFiles = findFiles(animDir, ['.fbx']);
  for (const animFile of animFiles) {
    // Determine weapon type from folder name
    const relPath = path.relative(animDir, animFile);
    const category = relPath.split(path.sep)[0] || 'general';
    const slug = slugify(path.basename(animFile));
    const outGlb = path.join(destDir, 'animations', `${slug}.glb`);
    console.log(`  Anim: ${category}/${path.basename(animFile)}`);
    try {
      const ok = await convertFbxToGlb(animFile, outGlb);
      if (ok) {
        manifest.animations.push({
          name: slug,
          file: `animations/${slug}.glb`,
          category: category.toLowerCase(),
          source: path.basename(animFile),
        });
      } else {
        fs.copyFileSync(animFile, path.join(destDir, 'animations', `${slug}.fbx`));
        manifest.animations.push({
          name: slug,
          file: `animations/${slug}.fbx`,
          category: category.toLowerCase(),
          source: path.basename(animFile),
        });
      }
    } catch (_) {
      fs.copyFileSync(animFile, path.join(destDir, 'animations', `${slug}.fbx`));
      manifest.animations.push({
        name: slug,
        file: `animations/${slug}.fbx`,
        category: category.toLowerCase(),
        source: path.basename(animFile),
      });
    }
  }

  // Write per-race manifest
  const manifestPath = path.join(destDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  → manifest.json (${manifest.equipment.length} equip, ${manifest.animations.length} anims)`);

  return manifest;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Grudge Race Asset Converter             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Source: ${SOURCE_ROOT}`);
  console.log(`Dest:   ${DEST_ROOT}`);

  try {
    await resolveFbx2gltf();
    console.log(`Converter: ${fbx2gltfPath === 'npm' ? 'fbx2gltf (npm)' : fbx2gltfPath}`);
  } catch (err) {
    console.error(err.message);
    console.log('\nFalling back to raw FBX copy mode (convert later via pipeline).\n');
    // Override converter to just copy
    fbx2gltfPath = 'copy';
  }

  const allManifests = {};

  for (const [folder, info] of Object.entries(RACE_MAP)) {
    const result = await processRace(folder, info);
    if (result) allManifests[info.id] = result;
  }

  // Also copy the existing Mixamo sword-and-shield animations reference
  const mixamoDir = path.resolve(process.cwd(), 'public', 'assets', 'animations', 'warrior-fbx');
  if (fs.existsSync(mixamoDir)) {
    console.log(`\n━━━ SHARED ANIMATIONS ━━━`);
    console.log(`  Mixamo sword-shield set already at: assets/animations/warrior-fbx/`);
    allManifests._sharedAnimations = {
      'sword-shield': '/assets/animations/warrior-fbx/',
    };
  }

  // Write root race manifest
  const rootManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    races: allManifests,
  };
  const rootManifestPath = path.join(DEST_ROOT, 'race-manifest.json');
  fs.writeFileSync(rootManifestPath, JSON.stringify(rootManifest, null, 2));

  console.log(`\n✓ Root manifest: ${rootManifestPath}`);
  console.log(`✓ Done. ${Object.keys(allManifests).filter(k => !k.startsWith('_')).length} races processed.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
