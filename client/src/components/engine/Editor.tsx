import { useState, useEffect } from 'react';
import { useEngineStore } from '@/lib/engine-store';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toolbar } from './Toolbar';
import { MenuBar } from './MenuBar';
import { SceneHierarchy } from './SceneHierarchy';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { AssetBrowser } from './AssetBrowser';
import { TemplateBrowser } from './TemplateBrowser';
import { ObjectStoreBrowser } from './ObjectStoreBrowser';
import { BottomPanel } from './BottomPanel';
import { AssetPreviewPanel } from './AssetPreviewPanel';
import { CommandPalette } from './CommandPalette';
import { Layers, Box, Database, Package } from 'lucide-react';

export function Editor() {
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { isPlaying, isPaused, setPlaying, setPaused, addConsoleLog } = useEngineStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Command palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      // Play mode shortcuts
      if (e.key === 'F5') {
        e.preventDefault();
        if (!isPlaying || isPaused) {
          setPlaying(true); setPaused(false);
          addConsoleLog({ type: 'info', message: 'Game started', source: 'Engine' });
        }
      }
      if (e.key === 'F6') {
        e.preventDefault();
        if (isPlaying) {
          setPaused(!isPaused);
          addConsoleLog({ type: 'info', message: isPaused ? 'Game resumed' : 'Game paused', source: 'Engine' });
        }
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setPlaying(false); setPaused(false);
        addConsoleLog({ type: 'info', message: 'Game stopped', source: 'Engine' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, isPaused, setPlaying, setPaused, addConsoleLog]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background" data-testid="editor">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Toolbar row */}
      <div className="relative z-30 shrink-0">
        <Toolbar onCommandPalette={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Menu bar row (File / Edit / Add / View) */}
      <div className="relative z-30 shrink-0">
        <MenuBar onCommandPalette={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Main editor body — Stride-inspired 3-column layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1"
          id="editor-main"
          autoSaveId="editor-main-layout-v2"
        >
          {/* ── LEFT: Scene Hierarchy + Asset Browser (like Stride left panel) */}
          <ResizablePanel id="panel-left" defaultSize={17} minSize={12} maxSize={28} className="relative z-20">
            <ResizablePanelGroup direction="vertical" id="panel-left-v" autoSaveId="editor-left-v2">

              {/* Hierarchy */}
              <ResizablePanel id="panel-hierarchy" defaultSize={58} minSize={25}>
                <div className="h-full flex flex-col">
                  <SceneHierarchy />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Asset Browser tabs */}
              <ResizablePanel id="panel-assets" defaultSize={42} minSize={18}>
                <Tabs defaultValue="assets" className="h-full flex flex-col">
                  <TabsList className="h-8 w-full justify-start rounded-none border-b border-sidebar-border bg-sidebar px-1 shrink-0 gap-0.5">
                    <TabsTrigger value="assets" className="h-6 text-[10px] px-2 gap-1 data-[state=active]:bg-sidebar-accent">
                      <Box className="w-3 h-3" />Assets
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="h-6 text-[10px] px-2 gap-1 data-[state=active]:bg-sidebar-accent">
                      <Package className="w-3 h-3" />Templates
                    </TabsTrigger>
                    <TabsTrigger value="objectstore" className="h-6 text-[10px] px-2 gap-1 data-[state=active]:bg-sidebar-accent">
                      <Database className="w-3 h-3" />Store
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="assets" className="flex-1 mt-0 overflow-hidden">
                    <AssetBrowser />
                  </TabsContent>
                  <TabsContent value="templates" className="flex-1 mt-0 overflow-hidden">
                    <TemplateBrowser />
                  </TabsContent>
                  <TabsContent value="objectstore" className="flex-1 mt-0 overflow-hidden">
                    <ObjectStoreBrowser />
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── CENTER: Viewport (top) + Bottom Panel (console/AI/timeline) */}
          <ResizablePanel id="panel-center" defaultSize={61} minSize={30} className="relative z-10">
            <ResizablePanelGroup direction="vertical" className="h-full" id="panel-center-v" autoSaveId="editor-center-v2">

              {/* 3D Viewport */}
              <ResizablePanel id="panel-viewport" defaultSize={68} minSize={28}>
                <Viewport />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Bottom panel (console / AI / timeline / etc.) */}
              <ResizablePanel id="panel-bottom" defaultSize={32} minSize={10} maxSize={60}>
                <BottomPanel
                  isCollapsed={isBottomPanelCollapsed}
                  onToggleCollapse={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── RIGHT: Property Inspector (top) + Asset Preview (bottom, like Stride) */}
          <ResizablePanel id="panel-right" defaultSize={22} minSize={16} maxSize={34} className="relative z-20">
            <ResizablePanelGroup direction="vertical" id="panel-right-v" autoSaveId="editor-right-v2">

              {/* Property Grid / Inspector */}
              <ResizablePanel id="panel-inspector" defaultSize={60} minSize={30}>
                <Inspector />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Asset Preview — Three.js PBR viewer (like Stride's bottom-right) */}
              <ResizablePanel id="panel-preview" defaultSize={40} minSize={15}>
                <AssetPreviewPanel />
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
