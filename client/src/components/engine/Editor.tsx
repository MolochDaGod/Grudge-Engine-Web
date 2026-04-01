import { useState, useEffect } from 'react';
import { useEngineStore } from '@/lib/engine-store';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toolbar } from './Toolbar';
import { SceneHierarchy } from './SceneHierarchy';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { AssetBrowser } from './AssetBrowser';
import { TemplateBrowser } from './TemplateBrowser';
import { ObjectStoreBrowser } from './ObjectStoreBrowser';
import { BottomPanel } from './BottomPanel';
import { CommandPalette } from './CommandPalette';

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

      {/* Toolbar always above everything */}
      <div className="relative z-30 shrink-0">
        <Toolbar onCommandPalette={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Main editor body */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1"
          id="editor-main"
          autoSaveId="editor-main-layout"
        >
          {/* Left sidebar: Hierarchy + Asset Browser */}
          <ResizablePanel
            id="panel-left"
            defaultSize={18}
            minSize={12}
            maxSize={30}
            className="relative z-20"
          >
            <ResizablePanelGroup
              direction="vertical"
              id="panel-left-vertical"
              autoSaveId="editor-left-layout"
            >
              <ResizablePanel id="panel-hierarchy" defaultSize={60} minSize={30}>
                <SceneHierarchy />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="panel-assets" defaultSize={40} minSize={20}>
                <Tabs defaultValue="assets" className="h-full flex flex-col">
                  <TabsList className="h-7 w-full justify-start rounded-none border-b border-sidebar-border bg-sidebar px-1 shrink-0">
                    <TabsTrigger value="assets" className="h-5 text-[10px] px-2">Assets</TabsTrigger>
                    <TabsTrigger value="templates" className="h-5 text-[10px] px-2">Templates</TabsTrigger>
                    <TabsTrigger value="objectstore" className="h-5 text-[10px] px-2">Object Store</TabsTrigger>
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

          {/* Center: Viewport + Bottom Panel */}
          <ResizablePanel
            id="panel-center"
            defaultSize={60}
            minSize={30}
            className="relative z-10"
          >
            <ResizablePanelGroup
              direction="vertical"
              className="h-full"
              id="panel-center-vertical"
              autoSaveId="editor-center-layout"
            >
              <ResizablePanel id="panel-viewport" defaultSize={70} minSize={30}>
                <Viewport />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="panel-bottom"
                defaultSize={30}
                minSize={10}
                maxSize={60}
              >
                <BottomPanel
                  isCollapsed={isBottomPanelCollapsed}
                  onToggleCollapse={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right sidebar: Inspector */}
          <ResizablePanel
            id="panel-inspector"
            defaultSize={22}
            minSize={15}
            maxSize={35}
            className="relative z-20"
          >
            <Inspector />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
