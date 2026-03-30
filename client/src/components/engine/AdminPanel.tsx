import { useState, useEffect } from 'react';
import { Play, Pause, Settings, Map, Layers, Bug, ExternalLink, ChevronDown, ChevronRight, Monitor, Maximize2, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sceneRegistry, type RPGSceneConfig } from '@/lib/rpg/scene-registry';
import { SceneOutliner } from './SceneOutliner';
import { AssetManager } from './AssetManager';
import { cn } from '@/lib/utils';
import * as BABYLON from '@babylonjs/core';

interface AdminPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onSceneChange?: (sceneId: string) => void;
  currentSceneId?: string;
  scene?: BABYLON.Scene | null;
  onPhysicsDebugToggle?: (enabled: boolean) => void;
}

export function AdminPanel({ isVisible, onClose, onSceneChange, currentSceneId, scene, onPhysicsDebugToggle }: AdminPanelProps) {
  const [scenes, setScenes] = useState<RPGSceneConfig[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [showPhysicsDebug, setShowPhysicsDebug] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showAssetManager, setShowAssetManager] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scenes: true,
    tools: true,
    debug: false,
    outliner: false
  });

  useEffect(() => {
    setScenes(sceneRegistry.getSceneList());
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSceneSelect = (sceneId: string) => {
    onSceneChange?.(sceneId);
  };

  if (!isVisible) return null;

  return (
    <Card className="absolute top-2 right-2 w-80 z-50 bg-background/95 backdrop-blur shadow-xl border-sidebar-border" data-testid="admin-panel">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Admin Panel
        </CardTitle>
        <div className="flex items-center gap-1">
          <Badge variant={debugMode ? "default" : "secondary"} className="text-xs">
            {debugMode ? 'Debug' : 'Play'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} data-testid="button-close-admin">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <Separator />
      
      {showAssetManager ? (
        <ScrollArea className="h-[600px]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Asset Pipeline
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowAssetManager(false)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <AssetManager />
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-2">
          <CollapsibleSection
            title="Scenes"
            icon={<Map className="w-3.5 h-3.5" />}
            isOpen={expandedSections.scenes}
            onToggle={() => toggleSection('scenes')}
          >
            <div className="space-y-1">
              {scenes.map(scene => (
                <button
                  key={scene.id}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-xs hover-elevate flex items-center justify-between",
                    currentSceneId === scene.id && "bg-primary/20 border border-primary/30"
                  )}
                  onClick={() => handleSceneSelect(scene.id)}
                  data-testid={`button-scene-${scene.id}`}
                >
                  <div>
                    <div className="font-medium">{scene.name}</div>
                    <div className="text-muted-foreground text-[10px]">{scene.description}</div>
                  </div>
                  {scene.mapSize && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {(scene.mapSize / 1000).toFixed(0)}km
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Tools"
            icon={<Layers className="w-3.5 h-3.5" />}
            isOpen={expandedSections.tools}
            onToggle={() => toggleSection('tools')}
          >
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
                onClick={() => setShowAssetManager(true)}
                data-testid="button-asset-manager"
              >
                <Package className="w-3 h-3" />
                Asset Pipeline
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
                onClick={() => setShowSkillTree(true)}
                data-testid="button-skill-tree"
              >
                <ExternalLink className="w-3 h-3" />
                RPG Skill Tree Generator
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
                data-testid="button-terrain-editor"
              >
                <Map className="w-3 h-3" />
                Terrain Editor
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
                data-testid="button-npc-placer"
              >
                <Monitor className="w-3 h-3" />
                NPC Placer
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Debug Options"
            icon={<Bug className="w-3.5 h-3.5" />}
            isOpen={expandedSections.debug}
            onToggle={() => toggleSection('debug')}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Debug Mode</Label>
                <Switch 
                  checked={debugMode} 
                  onCheckedChange={setDebugMode}
                  data-testid="switch-debug-mode"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show Wireframes</Label>
                <Switch data-testid="switch-wireframes" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Physics Debug</Label>
                <Switch 
                  checked={showPhysicsDebug}
                  onCheckedChange={(checked) => {
                    setShowPhysicsDebug(checked);
                    onPhysicsDebugToggle?.(checked);
                  }}
                  data-testid="switch-physics-debug"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">FPS Counter</Label>
                <Switch defaultChecked data-testid="switch-fps" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Scene Outliner"
            icon={<Layers className="w-3.5 h-3.5" />}
            isOpen={expandedSections.outliner}
            onToggle={() => toggleSection('outliner')}
          >
            <div className="text-xs max-h-48 overflow-auto">
              <SceneOutliner scene={scene} />
            </div>
          </CollapsibleSection>

          <div className="pt-2 space-y-2">
            <Button 
              variant="default" 
              size="sm" 
              className="w-full gap-2"
              data-testid="button-play-scene"
            >
              <Play className="w-3 h-3" />
              Play Scene
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              data-testid="button-reload-scene"
            >
              <RefreshCw className="w-3 h-3" />
              Reload Scene
            </Button>
          </div>
          </div>
        </ScrollArea>
      )}

      {showSkillTree && (
        <SkillTreeModal onClose={() => setShowSkillTree(false)} />
      )}
    </Card>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border rounded-md border-sidebar-border">
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 hover-elevate rounded-t-md"
        onClick={onToggle}
        data-testid={`button-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="px-2 pb-2 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface SkillTreeModalProps {
  onClose: () => void;
}

function SkillTreeModal({ onClose }: SkillTreeModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://www.rpgskilltreegenerator.com') {
        console.log('Received skill tree data:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" data-testid="skill-tree-modal">
      <Card className="w-[90vw] h-[85vh] max-w-6xl">
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">RPG Skill Tree Generator</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open('https://www.rpgskilltreegenerator.com/RPG/index.html?scene=builder', '_blank')}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-skill-tree">
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-48px)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-muted-foreground text-sm">Loading Skill Tree Generator...</div>
            </div>
          )}
          <iframe
            src="https://www.rpgskilltreegenerator.com/RPG/index.html?scene=builder"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            title="RPG Skill Tree Generator"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPanel;
