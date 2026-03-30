import { useState, useMemo } from 'react';
import { Search, Layout, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  SCENE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  searchTemplates,
  type SceneTemplate,
  type TemplateCategory,
} from '@/lib/scene-templates';
import { useEngineStore } from '@/lib/engine-store';

interface TemplateBrowserProps {
  onLoadTemplate?: (template: SceneTemplate) => void;
}

export function TemplateBrowser({ onLoadTemplate }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const { addConsoleLog } = useEngineStore();

  const filteredTemplates = useMemo(() => {
    let templates = searchQuery
      ? searchTemplates(searchQuery)
      : selectedCategory === 'all'
        ? SCENE_TEMPLATES
        : getTemplatesByCategory(selectedCategory);
    return templates;
  }, [searchQuery, selectedCategory]);

  const handleLoadTemplate = (template: SceneTemplate) => {
    addConsoleLog({
      type: 'info',
      message: `Loading scene template: ${template.name}`,
      source: 'Templates',
    });
    onLoadTemplate?.(template);
  };

  return (
    <div className="h-full flex flex-col" data-testid="template-browser">
      {/* Header */}
      <div className="p-2 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Layout className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">Scene Templates</span>
          <Badge variant="outline" className="text-[10px] ml-auto">{filteredTemplates.length}</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
            data-testid="template-search"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-2 py-1.5 border-b border-sidebar-border shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <Button
            variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.icon} {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <ScrollArea className="flex-1">
        <div className="p-2 grid grid-cols-2 gap-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={cn(
                'group relative rounded-md border border-sidebar-border overflow-hidden cursor-pointer transition-all',
                'hover:border-primary/50 hover:shadow-md',
                hoveredTemplate === template.id && 'border-primary/50 ring-1 ring-primary/20'
              )}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              onClick={() => handleLoadTemplate(template)}
              data-testid={`template-${template.id}`}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback gradient if thumbnail not loaded
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Fallback gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-2xl">{TEMPLATE_CATEGORIES.find(c => c.key === template.category)?.icon || '🎮'}</span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" className="h-7 px-3 text-xs gap-1">
                        <Play className="w-3 h-3" />
                        Load
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Load this scene template into the editor</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Info */}
              <div className="p-1.5">
                <div className="text-xs font-medium truncate">{template.name}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                  {template.description}
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
              No templates found{searchQuery ? ` for "${searchQuery}"` : ''}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
