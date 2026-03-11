#!/usr/bin/env node
/**
 * convert-mixamo.js — Batch FBX → GLB converter for Mixamo animation packs
 *
 * Scans the animation-mutant folder (or any input folder) for .fbx files,
 * converts them to .glb using fbx2gltf, and outputs to
 * client/public/assets/animations/mixamo/ with a JSON manifest.
 *
 * Usage:
 *   node script/convert-mixamo.js                                    # Default paths
 *   node script/convert-mixamo.js --input "D:/Games/Models/anims"    # Custom input
 *   node script/convert-mixamo.js --clean                            # Delete FBX after
 *   node script/convert-mixamo.js --framerate bake60                 # Set bake framerate
 *
 * Requires: npm install -g fbx2gltf  (or `npm install fbx2gltf`)
 *
 * Part of Grudge Studio asset pipeline.
 */

const path = require('path')
const fs = require('fs')

// ── Try to load fbx2gltf ──
let convert
try {
  convert = require('fbx2gltf')
} catch {
  console.error('Missing dependency: fbx2gltf')
  console.error('Install with: npm install fbx2gltf')
  console.error('Or globally:  npm install -g fbx2gltf')
  process.exit(1)
}

// ── Default Paths ──
const DEFAULT_INPUT = 'D:\\Games\\Models\\annihilate-dev\\animation-mutant'
const DEFAULT_OUTPUT = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'animations', 'mixamo')

const DEFAULT_OPTS = [
  '--binary',
  '--anim-framerate', 'bake30',
]

// ── Parse CLI Args ──
const args = process.argv.slice(2)
let inputDir = DEFAULT_INPUT
let outputDir = DEFAULT_OUTPUT
let cleanAfter = false
let framerate = 'bake30'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) inputDir = args[++i]
  else if (args[i] === '--output' && args[i + 1]) outputDir = args[++i]
  else if (args[i] === '--clean') cleanAfter = true
  else if (args[i] === '--framerate' && args[i + 1]) framerate = args[++i]
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  Grudge Engine — Mixamo FBX → GLB Converter     ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Input:     ${inputDir}`)
  console.log(`  Output:    ${outputDir}`)
  console.log(`  Framerate: ${framerate}`)
  console.log(`  Clean FBX: ${cleanAfter}`)
  console.log()

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`)
    process.exit(1)
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true })

  // Find all FBX files
  const fbxFiles = findFbxFiles(inputDir)
  console.log(`  Found ${fbxFiles.length} FBX files`)
  console.log()

  if (fbxFiles.length === 0) {
    console.log('  Nothing to convert.')
    return
  }

  let totalConverted = 0
  let totalSkipped = 0
  let totalFailed = 0
  const manifest = {
    generated: new Date().toISOString(),
    inputDir,
    outputDir,
    framerate,
    animations: [],
  }

  for (const fbxPath of fbxFiles) {
    const basename = path.basename(fbxPath, '.fbx')
    // Sanitize name: replace spaces with underscores, lowercase
    const safeName = basename
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
    const glbPath = path.join(outputDir, `${safeName}.glb`)

    // Skip if GLB already exists and is newer than FBX
    if (fs.existsSync(glbPath)) {
      const fbxStat = fs.statSync(fbxPath)
      const glbStat = fs.statSync(glbPath)
      if (glbStat.mtimeMs > fbxStat.mtimeMs) {
        console.log(`  ✓ ${safeName}.glb (up to date)`)
        totalSkipped++
        manifest.animations.push({
          name: basename,
          safeName,
          file: `${safeName}.glb`,
          slot: detectSlot(basename),
          skipped: true,
        })
        continue
      }
    }

    try {
      const opts = [...DEFAULT_OPTS]
      const frIdx = opts.indexOf('--anim-framerate')
      if (frIdx !== -1) opts[frIdx + 1] = framerate

      await convert(fbxPath, glbPath, opts)
      console.log(`  ✓ ${safeName}.glb`)
      totalConverted++

      manifest.animations.push({
        name: basename,
        safeName,
        file: `${safeName}.glb`,
        slot: detectSlot(basename),
        skipped: false,
      })

      if (cleanAfter) {
        fs.unlinkSync(fbxPath)
        console.log(`    🗑 Deleted ${basename}.fbx`)
      }
    } catch (err) {
      console.error(`  ✗ ${basename}.fbx — ${err.message || err}`)
      totalFailed++
      manifest.animations.push({
        name: basename,
        safeName,
        file: null,
        slot: null,
        error: err.message || String(err),
      })
    }
  }

  // Summary
  console.log()
  console.log('─'.repeat(50))
  console.log(`  Converted: ${totalConverted}  |  Skipped: ${totalSkipped}  |  Failed: ${totalFailed}`)
  console.log('─'.repeat(50))

  // Write manifest
  const manifestPath = path.join(outputDir, 'mixamo-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n  Manifest: ${manifestPath}`)

  // Write TypeScript import helper
  const tsPath = path.join(outputDir, 'mixamo-animations.ts')
  const successAnims = manifest.animations.filter(a => a.file && !a.error)
  const tsContent = generateTypeScript(successAnims)
  fs.writeFileSync(tsPath, tsContent)
  console.log(`  TS helper: ${tsPath}`)

  if (totalFailed > 0) process.exit(1)
}

// ── Helpers ──

function findFbxFiles(dir) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFbxFiles(full))
    } else if (entry.name.toLowerCase().endsWith('.fbx')) {
      results.push(full)
    }
  }
  return results
}

/**
 * Auto-detect animation slot from Mixamo file name.
 * Returns the best-matching AnimSlot or null.
 */
function detectSlot(name) {
  const lower = name.toLowerCase()

  // Priority-ordered matching
  const slotMap = [
    ['idle',            ['idle', 'standing', 'breathe', 'fighting idle']],
    ['run',             ['running', 'sprint', 'run']],
    ['jump',            ['jump', 'unarmed jump']],
    ['fall',            ['falling', 'fall']],
    ['climb',           ['climbing', 'climb']],
    ['hit',             ['hit', 'big hit', 'getting smashed']],
    ['knockDown',       ['knockdown', 'losing balance', 'stunned']],
    ['dead',            ['death', 'dying']],
    ['block',           ['block', 'blocking']],
    ['dash',            ['dodge', 'dodging', 'dive roll', 'running slide']],
    ['attack',          ['punch', 'stabbing', 'kicking', 'combo']],
    ['strike',          ['strike', 'thrust', 'uppercut']],
    ['whirlwind',       ['hurricane kick', 'flair']],
    ['dashAttack',      ['flying kick', 'running forward flip']],
    ['jumpAttack',      ['jumping down', 'front flip']],
    ['special1',        ['fireball', 'magic heal']],
    ['special2',        ['power up', 'taunt']],
    ['special3',        ['dual weapon combo']],
  ]

  for (const [slot, aliases] of slotMap) {
    for (const alias of aliases) {
      if (lower.includes(alias)) return slot
    }
  }
  return null
}

/**
 * Generate a TypeScript file that exports animation metadata.
 */
function generateTypeScript(animations) {
  const lines = [
    '// ─── Auto-generated Mixamo Animation Manifest ──────────────────────────',
    '// Generated by script/convert-mixamo.js',
    `// Date: ${new Date().toISOString()}`,
    '// DO NOT EDIT — re-run the conversion script to regenerate.',
    '',
    'export interface MixamoAnimEntry {',
    '  name: string;',
    '  safeName: string;',
    '  file: string;',
    '  slot: string | null;',
    '}',
    '',
    'export const MIXAMO_ANIMATIONS: MixamoAnimEntry[] = [',
  ]

  for (const anim of animations) {
    lines.push(`  { name: ${JSON.stringify(anim.name)}, safeName: ${JSON.stringify(anim.safeName)}, file: ${JSON.stringify(anim.file)}, slot: ${anim.slot ? JSON.stringify(anim.slot) : 'null'} },`)
  }

  lines.push('];')
  lines.push('')
  lines.push('export const MIXAMO_BASE_PATH = \'/assets/animations/mixamo/\';')
  lines.push('')
  lines.push('export function getMixamoAnimPath(safeName: string): string {')
  lines.push('  return `${MIXAMO_BASE_PATH}${safeName}.glb`;')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
