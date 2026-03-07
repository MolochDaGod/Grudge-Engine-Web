import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Toolbar } from './Toolbar';
import { SceneHierarchy } from './SceneHierarchy';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { AssetBrowser } from './AssetBrowser';
import { BottomPanel } from './BottomPanel';

export function Editor() {
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background" data-testid="editor">
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60} minSize={30}>
                <SceneHierarchy />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <AssetBrowser />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <Viewport />
              </div>
              <BottomPanel 
                isCollapsed={isBottomPanelCollapsed}
                onToggleCollapse={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
            <Inspector />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
