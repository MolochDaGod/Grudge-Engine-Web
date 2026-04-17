/**
 * MenuBar.tsx  —  Three.js editor-style application menu bar
 *
 * Inspired by:
 *   - Three.js editor menu structure (File / Edit / Add / Play / View / Help)
 *   - Stride Game Studio top menu
 *
 * Provides keyboard-shortcut-hinted menus for:
 *   File   — New / Open / Save / Export / Import
 *   Add    — Mesh primitives / Lights / Camera / Empty
 *   View   — Toggle Grid, Stats, Fullscreen
 *   Play   — Play / Pause / Stop   (mirrors toolbar)
 *   Help   — Docs / GitHub / Shortcuts
 */

import { useState } from 'react';
import {
  FilePlus2, FolderOpen, Save, Download, Upload, FileCode,
  Box, Sphere, Cylinder, Triangle, Grid3X3, Sun, Camera,
  Layers, Eye, EyeOff, BarChart2, Maximize2, Terminal,
  Play, Pause, Square, HelpCircle, ExternalLink, Keyboard,
  Trash2, Copy, Clipboard, Undo2, Redo2, Search,
  Lightbulb, Cone, Circle, Activity,
} from 'lucide-react';
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent,
  MenubarItem, MenubarSeparator, MenubarShortcut,
  MenubarCheckboxItem, MenubarSub, MenubarSubTrigger, MenubarSubContent,
} from '@/components/ui/menubar';
import { useEngineStore } from '@/lib/engine-store';
import { useToast } from '@/hooks/use-toast';
import { downloadExport } from '@/lib/game-exporter';
import type { GameObject } from '@shared/schema';

interface MenuBarProps {
  onCommandPalette?: () => void;
}

export function MenuBar({ onCommandPalette }: MenuBarProps) {
  const {
    project, isPlaying, isPaused,
    setPlaying, setPaused,
    showGrid, showStats, toggleGrid, toggleStats,
    addConsoleLog, addGameObject, saveToCloud,
    currentSceneId, getCurrentScene,
    deleteGameObject, selectedObjectId,
    duplicateObject, setActiveBottomTab,
  } = useEngineStore();

  const { toast } = useToast();

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addObject = (
    type: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus' | 'light' | 'camera' | 'empty',
    name?: string,
  ) => {
    const obj: GameObject = {
      id: crypto.randomUUID(),
      name: name ?? (type.charAt(0).toUpperCase() + type.slice(1)),
      visible: true,
      isStatic: false,
      transform: {
        position: { x: 0, y: type === 'light' ? 5 : 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale:    { x: 1, y: 1, z: 1 },
      },
      components:
        type === 'light'
          ? [{ id: crypto.randomUUID(), type: 'light',  enabled: true, properties: { type: 'point', color: '#ffffff', intensity: 1 } }]
          : type === 'camera'
          ? [{ id: crypto.randomUUID(), type: 'camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } }]
          : type === 'empty'
          ? []
          : [{ id: crypto.randomUUID(), type: 'mesh',   enabled: true, properties: { type, color: '#6366f1' } }],
      children:  [],
      parentId:  null,
      tags:      [],
      layer:     0,
    };
    addGameObject(obj);
    addConsoleLog({ type: 'info', message: `Created ${obj.name}`, source: 'Scene' });
  };

  const handleNewScene = () => {
    toast({ title: 'New Scene', description: 'Use Scene → New in the hierarchy dropdown.' });
  };

  const handleSave = async () => {
    await saveToCloud();
  };

  const handleExportHTML = () => {
    if (!project) return;
    downloadExport(project, {}, currentSceneId || undefined);
    addConsoleLog({ type: 'info', message: 'Exported scene as HTML', source: 'Export' });
  };

  const handleExportHQ = () => {
    if (!project) return;
    downloadExport(project, { quality: 'high' }, currentSceneId || undefined);
    addConsoleLog({ type: 'info', message: 'Exported high-quality build', source: 'Export' });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex items-center h-7 bg-sidebar border-b border-sidebar-border px-1 shrink-0 select-none"
      data-testid="menu-bar"
    >
      <Menubar className="h-full border-0 bg-transparent p-0 gap-0">

        {/* ── FILE ──────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            File
          </MenubarTrigger>
          <MenubarContent className="text-xs w-52">
            <MenubarItem onClick={handleNewScene}>
              <FilePlus2 className="w-3.5 h-3.5 mr-2" /> New Scene
              <MenubarShortcut>Ctrl+N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => addConsoleLog({ type: 'info', message: 'Use the Open button in toolbar', source: 'File' })}>
              <FolderOpen className="w-3.5 h-3.5 mr-2" /> Open Project…
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-2" /> Save
              <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger className="text-xs">
                <Download className="w-3.5 h-3.5 mr-2" /> Export
              </MenubarSubTrigger>
              <MenubarSubContent className="w-44 text-xs">
                <MenubarItem onClick={handleExportHTML}>
                  <FileCode className="w-3.5 h-3.5 mr-2" /> Export as HTML
                </MenubarItem>
                <MenubarItem onClick={handleExportHQ}>
                  <Download className="w-3.5 h-3.5 mr-2" /> Export High-Quality
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>

        {/* ── EDIT ──────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            Edit
          </MenubarTrigger>
          <MenubarContent className="text-xs w-48">
            <MenubarItem disabled>
              <Undo2 className="w-3.5 h-3.5 mr-2" /> Undo
              <MenubarShortcut>Ctrl+Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Redo2 className="w-3.5 h-3.5 mr-2" /> Redo
              <MenubarShortcut>Ctrl+Y</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              disabled={!selectedObjectId}
              onClick={() => selectedObjectId && duplicateObject(selectedObjectId)}
            >
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
              <MenubarShortcut>Ctrl+D</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={!selectedObjectId}
              onClick={() => selectedObjectId && deleteGameObject(selectedObjectId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              <MenubarShortcut>Del</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onCommandPalette}>
              <Search className="w-3.5 h-3.5 mr-2" /> Command Palette
              <MenubarShortcut>Ctrl+K</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── ADD ───────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            Add
          </MenubarTrigger>
          <MenubarContent className="text-xs w-44">
            <MenubarSub>
              <MenubarSubTrigger className="text-xs">
                <Box className="w-3.5 h-3.5 mr-2" /> Mesh
              </MenubarSubTrigger>
              <MenubarSubContent className="w-36 text-xs">
                <MenubarItem onClick={() => addObject('cube',     'Cube')}>
                  <Box      className="w-3.5 h-3.5 mr-2" /> Cube
                </MenubarItem>
                <MenubarItem onClick={() => addObject('sphere',   'Sphere')}>
                  <Circle   className="w-3.5 h-3.5 mr-2" /> Sphere
                </MenubarItem>
                <MenubarItem onClick={() => addObject('cylinder', 'Cylinder')}>
                  <Cylinder className="w-3.5 h-3.5 mr-2" /> Cylinder
                </MenubarItem>
                <MenubarItem onClick={() => addObject('plane',    'Plane')}>
                  <Grid3X3  className="w-3.5 h-3.5 mr-2" /> Plane
                </MenubarItem>
                <MenubarItem onClick={() => addObject('cone',     'Cone')}>
                  <Cone     className="w-3.5 h-3.5 mr-2" /> Cone
                </MenubarItem>
                <MenubarItem onClick={() => addObject('torus',    'Torus')}>
                  <Activity className="w-3.5 h-3.5 mr-2" /> Torus
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger className="text-xs">
                <Lightbulb className="w-3.5 h-3.5 mr-2" /> Light
              </MenubarSubTrigger>
              <MenubarSubContent className="w-40 text-xs">
                <MenubarItem onClick={() => addObject('light', 'Point Light')}>
                  <Lightbulb className="w-3.5 h-3.5 mr-2" /> Point Light
                </MenubarItem>
                <MenubarItem onClick={() => addObject('light', 'Directional Light')}>
                  <Sun className="w-3.5 h-3.5 mr-2" /> Directional Light
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem onClick={() => addObject('camera', 'Camera')}>
              <Camera className="w-3.5 h-3.5 mr-2" /> Camera
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => addObject('empty', 'Empty')}>
              <Box className="w-3.5 h-3.5 mr-2 opacity-30" /> Empty Object
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── VIEW ──────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            View
          </MenubarTrigger>
          <MenubarContent className="text-xs w-48">
            <MenubarCheckboxItem checked={showGrid} onCheckedChange={toggleGrid}>
              <Grid3X3 className="w-3.5 h-3.5 mr-2" /> Show Grid
              <MenubarShortcut>G</MenubarShortcut>
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showStats} onCheckedChange={toggleStats}>
              <BarChart2 className="w-3.5 h-3.5 mr-2" /> Show Stats
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger className="text-xs">
                <Terminal className="w-3.5 h-3.5 mr-2" /> Panels
              </MenubarSubTrigger>
              <MenubarSubContent className="w-44 text-xs">
                <MenubarItem onClick={() => setActiveBottomTab('console')}>Console</MenubarItem>
                <MenubarItem onClick={() => setActiveBottomTab('ai')}>AI Studio</MenubarItem>
                <MenubarItem onClick={() => setActiveBottomTab('timeline')}>Timeline</MenubarItem>
                <MenubarItem onClick={() => setActiveBottomTab('pipeline')}>Pipeline</MenubarItem>
                <MenubarItem onClick={() => setActiveBottomTab('profiler')}>Profiler</MenubarItem>
                <MenubarItem onClick={() => setActiveBottomTab('lighting')}>Lighting</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem onClick={handleFullscreen}>
              <Maximize2 className="w-3.5 h-3.5 mr-2" /> Fullscreen
              <MenubarShortcut>F11</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── PLAY ──────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            Play
          </MenubarTrigger>
          <MenubarContent className="text-xs w-44">
            <MenubarItem
              disabled={isPlaying && !isPaused}
              onClick={() => { setPlaying(true); setPaused(false); addConsoleLog({ type: 'info', message: 'Game started', source: 'Engine' }); }}
            >
              <Play className="w-3.5 h-3.5 mr-2 text-green-400" /> Play
              <MenubarShortcut>F5</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={!isPlaying}
              onClick={() => { setPaused(!isPaused); addConsoleLog({ type: 'info', message: isPaused ? 'Game resumed' : 'Game paused', source: 'Engine' }); }}
            >
              <Pause className="w-3.5 h-3.5 mr-2 text-yellow-400" /> {isPaused ? 'Resume' : 'Pause'}
              <MenubarShortcut>F6</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={!isPlaying}
              onClick={() => { setPlaying(false); setPaused(false); addConsoleLog({ type: 'info', message: 'Game stopped', source: 'Engine' }); }}
            >
              <Square className="w-3.5 h-3.5 mr-2 text-red-400" /> Stop
              <MenubarShortcut>F7</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── HELP ──────────────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2.5 text-xs rounded-sm font-normal data-[state=open]:bg-sidebar-accent">
            Help
          </MenubarTrigger>
          <MenubarContent className="text-xs w-48">
            <MenubarItem onClick={() => window.open('https://github.com/MolochDaGod/Grudge-Engine-Web', '_blank')}>
              <ExternalLink className="w-3.5 h-3.5 mr-2" /> GitHub Repository
            </MenubarItem>
            <MenubarItem onClick={() => window.open('https://threejs.org/docs/', '_blank')}>
              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Three.js Docs
            </MenubarItem>
            <MenubarItem onClick={() => window.open('https://doc.babylonjs.com/', '_blank')}>
              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Babylon.js Docs
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onCommandPalette}>
              <Keyboard className="w-3.5 h-3.5 mr-2" /> Keyboard Shortcuts
              <MenubarShortcut>Ctrl+K</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => addConsoleLog({ type: 'info', message: 'Grudge Engine — built with Three.js, Babylon.js, React, Zustand', source: 'Help' })}>
              <HelpCircle className="w-3.5 h-3.5 mr-2" /> About
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Right status bar */}
      <div className="ml-auto flex items-center gap-3 pr-2 text-[10px] text-muted-foreground/60">
        {isPlaying && (
          <span className={`flex items-center gap-1 font-semibold ${isPaused ? 'text-yellow-400' : 'text-green-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
            {isPaused ? 'PAUSED' : 'PLAYING'}
          </span>
        )}
        <span>{project?.name ?? 'No Project'}</span>
      </div>
    </div>
  );
}
