import { useState } from 'react';
import { BookOpen, Play, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BABYLON_EXAMPLES, getExamplesByCategory, type SceneExample } from '@/lib/babylon-examples';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

interface ExamplesBrowserProps {
  onApplyExample?: (example: SceneExample) => void;
}

export function ExamplesBrowser({ onApplyExample }: ExamplesBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addConsoleLog, setPendingExample } = useEngineStore();

  const categories = getExamplesByCategory();
  const categoryNames = Object.keys(categories);

  const filteredExamples = BABYLON_EXAMPLES.filter(example => {
    const matchesSearch = 
      example.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || example.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApplyExample = (example: SceneExample) => {
    addConsoleLog({ 
      type: 'info', 
      message: `Applied example: ${example.name}`, 
      source: 'Examples' 
    });
    setPendingExample({
      id: example.id,
      name: example.name,
      create: example.create
    });
    onApplyExample?.(example);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-examples-browser">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-xs">Examples</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Babylon.js Examples Library
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-examples-search"
            />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          <Button
            variant={selectedCategory === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categoryNames.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setSelectedCategory(category)}
              data-testid={`button-category-${category.toLowerCase()}`}
            >
              {category}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredExamples.map(example => (
              <div
                key={example.id}
                className="border rounded-md p-3 hover-elevate cursor-pointer"
                onClick={() => handleApplyExample(example)}
                data-testid={`example-${example.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm">{example.name}</h4>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {example.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {example.description}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Play className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary">Click to apply</span>
                </div>
              </div>
            ))}
          </div>

          {filteredExamples.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="w-8 h-8 mb-2" />
              <span className="text-sm">No examples found</span>
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground mt-2">
          {BABYLON_EXAMPLES.length} examples available from Babylon.js playground and documentation
        </div>
      </DialogContent>
    </Dialog>
  );
}
