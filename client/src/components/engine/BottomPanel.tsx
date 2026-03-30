import { Terminal, Clock, Film, Sparkles, Activity, Settings, Package, Volume2, Sun, FileCode, Library, EyeOff, ChevronUp, ChevronDown, MoreHorizontal, X, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useEngineStore, type BottomTabType, type BottomTabInfo, DEFAULT_BOTTOM_TABS } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { ScriptEditor } from './ScriptEditor';
import { FreeAssetLibrary } from './FreeAssetLibrary';
import { ConsolePanel } from './panels/ConsolePanel';
import { ProfilerPanel } from './panels/ProfilerPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { AnimationPanel } from './panels/AnimationPanel';
import { AudioMixerPanel } from './panels/AudioMixerPanel';
import { LightingPanel } from './panels/LightingPanel';
import { ProjectSettingsPanel } from './panels/ProjectSettingsPanel';
import { BuildSettingsPanel } from './panels/BuildSettingsPanel';
import { AIStudioPanel } from './panels/AIStudioPanel';
import { SDKPanel } from './panels/SDKPanel';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal, Clock, Film, Sparkles, FileCode, Library, Activity, Settings, Package, Volume2, Sun, Plug
};

function getTabIcon(iconName: string) {
  return ICON_MAP[iconName] || Terminal;
}

interface BottomPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function BottomPanel({ isCollapsed, onToggleCollapse }: BottomPanelProps) {
  const { activeBottomTab, setActiveBottomTab, bottomTabConfig, toggleBottomTabVisibility, reorderBottomTabs } = useEngineStore();

  const visibleTabs = bottomTabConfig.tabs.filter(t => t.visible).sort((a, b) => a.order - b.order);

  const renderTabContent = () => {
    switch (activeBottomTab) {
      case 'console':   return <ConsolePanel />;
      case 'profiler':  return <ProfilerPanel />;
      case 'timeline':  return <TimelinePanel />;
      case 'animation': return <AnimationPanel />;
      case 'ai':        return <AIStudioPanel />;
      case 'scripts':   return <ScriptEditor />;
      case 'library':   return <FreeAssetLibrary />;
      case 'audio':     return <AudioMixerPanel />;
      case 'lighting':  return <LightingPanel />;
      case 'settings':  return <ProjectSettingsPanel />;
      case 'build':     return <BuildSettingsPanel />;
      case 'sdk':       return <SDKPanel />;
      default:          return <ConsolePanel />;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar border-t border-sidebar-border transition-all duration-150 h-full",
        isCollapsed && "overflow-hidden"
      )}
      data-testid="bottom-panel"
    >
      <div className="flex items-center h-9 border-b border-sidebar-border shrink-0">
        <div className="flex items-center h-full overflow-x-auto hide-scrollbar">
          {visibleTabs.map((tab) => {
            const IconComponent = getTabIcon(tab.icon);
            const isActive = activeBottomTab === tab.id;
            return (
              <DropdownMenu key={tab.id}>
                <div className="relative group flex items-center">
                  <button
                    onClick={() => setActiveBottomTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 h-7 my-1 mx-0.5 text-xs rounded-sm transition-colors",
                      isActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                    data-testid={`tab-${tab.id}`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sidebar-accent rounded transition-opacity"
                      data-testid={`tab-menu-${tab.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => toggleBottomTabVisibility(tab.id)} className="text-xs" data-testid={`menu-hide-${tab.id}`}>
                    <EyeOff className="w-3 h-3 mr-2" />
                    Hide Tab
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" data-testid="button-tab-options">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Tab Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {bottomTabConfig.tabs.map((tab) => (
              <DropdownMenuCheckboxItem
                key={tab.id}
                checked={tab.visible}
                onCheckedChange={() => toggleBottomTabVisibility(tab.id)}
                className="text-xs"
                data-testid={`menu-toggle-${tab.id}`}
              >
                {tab.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => reorderBottomTabs(DEFAULT_BOTTOM_TABS.map(t => t.id))}
              className="text-xs"
              data-testid="menu-reset-tabs"
            >
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mr-1"
          onClick={onToggleCollapse}
          data-testid="button-toggle-bottom-panel"
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      )}
    </div>
  );
}
