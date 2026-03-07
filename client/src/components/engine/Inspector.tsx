import { useState } from 'react';
import { RotateCcw, Plus, Trash2, ChevronDown, ChevronRight, Box, Sun, Camera, Atom, FileCode, Volume2, Sparkles, Package, Copy, Tag, Layers, X, Lock, Database, Palette, Gamepad2, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useEngineStore, componentRegistry } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { DEFAULT_LAYERS } from '@shared/schema';
import type { Vector3, Component, ComponentType, ScriptableObjectType } from '@shared/schema';

const iconMap: Record<string, any> = {
  Box, Sun, Camera, Atom, FileCode, Volume2, Sparkles, Palette, Gamepad2, Play, Square
};

interface Vector3InputProps {
  label: string;
  value: Vector3;
  onChange: (value: Vector3) => void;
  step?: number;
}

function Vector3Input({ label, value, onChange, step = 0.1 }: Vector3InputProps) {
  const handleChange = (axis: 'x' | 'y' | 'z', newValue: string) => {
    const num = parseFloat(newValue) || 0;
    onChange({ ...value, [axis]: num });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-red-400 font-medium">X</span>
          <Input
            type="number"
            value={value.x}
            onChange={(e) => handleChange('x', e.target.value)}
            step={step}
            className="h-7 pl-6 text-xs font-mono"
            data-testid={`input-${label.toLowerCase()}-x`}
          />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-green-400 font-medium">Y</span>
          <Input
            type="number"
            value={value.y}
            onChange={(e) => handleChange('y', e.target.value)}
            step={step}
            className="h-7 pl-6 text-xs font-mono"
            data-testid={`input-${label.toLowerCase()}-y`}
          />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-medium">Z</span>
          <Input
            type="number"
            value={value.z}
            onChange={(e) => handleChange('z', e.target.value)}
            step={step}
            className="h-7 pl-6 text-xs font-mono"
            data-testid={`input-${label.toLowerCase()}-z`}
          />
        </div>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onRemove?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true, onRemove, enabled, onToggleEnabled }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="border-b border-sidebar-border">
      <div className="flex items-center gap-1 px-2 py-1.5 hover-elevate">
        <button
          className="flex items-center gap-2 flex-1"
          onClick={() => setIsOpen(!isOpen)}
          data-testid={`button-collapse-${sectionId}`}
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </button>
        {onToggleEnabled !== undefined && (
          <Switch
            checked={enabled}
            onCheckedChange={onToggleEnabled}
            className="scale-75"
            data-testid={`switch-${sectionId}`}
          />
        )}
        {onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5" 
            onClick={onRemove}
            data-testid={`button-remove-${sectionId}`}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        )}
      </div>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function PropertyEditor({ descriptor, value, onChange }: { 
  descriptor: any; 
  value: any; 
  onChange: (value: any) => void;
}) {
  switch (descriptor.type) {
    case 'number':
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{descriptor.label}</Label>
            <span className="text-xs font-mono">{value ?? descriptor.default}</span>
          </div>
          <Slider
            value={[value ?? descriptor.default]}
            min={descriptor.min ?? 0}
            max={descriptor.max ?? 100}
            step={descriptor.step ?? 1}
            onValueChange={([v]) => onChange(v)}
            data-testid={`slider-${descriptor.key}`}
          />
        </div>
      );
    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{descriptor.label}</Label>
          <Switch
            checked={value ?? descriptor.default}
            onCheckedChange={onChange}
            data-testid={`switch-${descriptor.key}`}
          />
        </div>
      );
    case 'color':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{descriptor.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value ?? descriptor.default}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer border-0"
              data-testid={`color-${descriptor.key}`}
            />
            <Input
              value={value ?? descriptor.default}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 text-xs font-mono flex-1"
            />
          </div>
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{descriptor.label}</Label>
          <Select value={value ?? descriptor.default} onValueChange={onChange}>
            <SelectTrigger className="h-7 text-xs" data-testid={`select-${descriptor.key}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {descriptor.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt} className="text-xs capitalize">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'string':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{descriptor.label}</Label>
          <Input
            value={value ?? descriptor.default}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs"
            data-testid={`input-${descriptor.key}`}
          />
        </div>
      );
    default:
      return null;
  }
}

function ComponentEditor({ component, objectId }: { component: Component; objectId: string }) {
  const { updateComponent, removeComponent, toggleComponent, project } = useEngineStore();
  const blueprint = componentRegistry.find(b => b.type === component.type);
  const IconComponent = blueprint ? iconMap[blueprint.icon] : Box;
  
  const scripts = project?.assets.filter(a => a.type === 'script') || [];

  const handlePropertyChange = (key: string, value: any) => {
    updateComponent(objectId, component.id, { [key]: value });
  };

  return (
    <CollapsibleSection
      title={blueprint?.displayName || component.type}
      icon={<IconComponent className="w-3.5 h-3.5 text-muted-foreground" />}
      enabled={component.enabled}
      onToggleEnabled={() => toggleComponent(objectId, component.id)}
      onRemove={() => removeComponent(objectId, component.id)}
    >
      {blueprint?.propertyDescriptors.map((desc) => (
        <PropertyEditor
          key={desc.key}
          descriptor={desc}
          value={component.properties[desc.key]}
          onChange={(value) => handlePropertyChange(desc.key, value)}
        />
      ))}
      
      {component.type === 'script' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Attach Script</Label>
          <Select 
            value={component.properties.scriptName || ''} 
            onValueChange={(name) => {
              const script = scripts.find(s => s.name === name);
              if (script) {
                updateComponent(objectId, component.id, { 
                  scriptName: script.name, 
                  scriptPath: script.path 
                });
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs" data-testid="select-script">
              <SelectValue placeholder="Select script..." />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {scripts.map((script) => (
                <SelectItem key={script.id} value={script.name} className="text-xs">
                  {script.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </CollapsibleSection>
  );
}

function AddComponentDialog({ objectId }: { objectId: string }) {
  const { addComponent, addConsoleLog } = useEngineStore();
  const [open, setOpen] = useState(false);

  const handleAddComponent = (type: ComponentType) => {
    const blueprint = componentRegistry.find(b => b.type === type);
    if (!blueprint) return;

    const newComponent: Component = {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      properties: { ...blueprint.defaultProperties },
    };

    addComponent(objectId, newComponent);
    addConsoleLog({ type: 'info', message: `Added ${blueprint.displayName} component`, source: 'Inspector' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" data-testid="button-add-component">
          <Plus className="w-3.5 h-3.5" />
          Add Component
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Component</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {componentRegistry.map((blueprint) => {
            const IconComponent = iconMap[blueprint.icon] || Box;
            return (
              <Button
                key={blueprint.type}
                variant="outline"
                className="h-auto py-3 flex flex-col gap-1 text-xs"
                onClick={() => handleAddComponent(blueprint.type)}
                data-testid={`button-add-${blueprint.type}`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{blueprint.displayName}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePrefabDialog({ objectId }: { objectId: string }) {
  const { project, createPrefab } = useEngineStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  
  const selectedObject = project?.scenes[0]?.objects.find(o => o.id === objectId);

  const handleCreate = () => {
    if (!selectedObject || !name.trim()) return;
    createPrefab(name.trim(), selectedObject);
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Create Prefab" data-testid="button-create-prefab">
          <Package className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Prefab</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Prefab Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prefab name..."
              className="h-8 text-sm"
              data-testid="input-prefab-name"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This will save the current object with all its components as a reusable prefab.
          </p>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleCreate} disabled={!name.trim()} data-testid="button-confirm-prefab">
            Create Prefab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransformPanel() {
  const { project, selectedObjectId, updateTransform, updateGameObject, deleteGameObject, addTag, removeTag, setLayer } = useEngineStore();
  const [newTag, setNewTag] = useState('');
  const scene = project?.scenes[0];
  const selectedObject = scene?.objects.find(o => o.id === selectedObjectId);

  if (!selectedObject) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
        Select an object to view its properties
      </div>
    );
  }

  const handlePositionChange = (position: Vector3) => {
    updateTransform(selectedObject.id, { position });
  };

  const handleRotationChange = (rotation: Vector3) => {
    updateTransform(selectedObject.id, { rotation });
  };

  const handleScaleChange = (scale: Vector3) => {
    updateTransform(selectedObject.id, { scale });
  };

  const handleResetTransform = () => {
    updateTransform(selectedObject.id, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag(selectedObject.id, newTag.trim());
      setNewTag('');
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-1">
          <Input
            value={selectedObject.name}
            onChange={(e) => updateGameObject(selectedObject.id, { name: e.target.value })}
            className="h-7 text-sm font-medium flex-1"
            data-testid="input-object-name"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset Transform" onClick={handleResetTransform}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <CreatePrefabDialog objectId={selectedObject.id} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            title="Delete Object"
            onClick={() => deleteGameObject(selectedObject.id)}
            data-testid="button-delete-object"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={selectedObject.visible}
              onCheckedChange={(visible) => updateGameObject(selectedObject.id, { visible })}
              data-testid="switch-visibility"
            />
            <Label className="text-xs">Visible</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={selectedObject.isStatic ?? false}
              onCheckedChange={(isStatic) => updateGameObject(selectedObject.id, { isStatic })}
              data-testid="switch-static"
            />
            <Label className="text-xs">Static</Label>
          </div>
        </div>
      </div>

      <CollapsibleSection title="Tags & Layer" icon={<Tag className="w-3.5 h-3.5 text-muted-foreground" />} defaultOpen={false}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Layer</Label>
            <Select value={String(selectedObject.layer ?? 0)} onValueChange={(v) => setLayer(selectedObject.id, parseInt(v))}>
              <SelectTrigger className="h-7 text-xs" data-testid="select-layer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_LAYERS.map(layer => (
                  <SelectItem key={layer.id} value={String(layer.id)} className="text-xs">
                    {layer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {(selectedObject.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs h-5 gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(selectedObject.id, tag)} className="hover-elevate rounded">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="h-6 text-xs flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                data-testid="input-new-tag"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddTag}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Transform" icon={<Box className="w-3.5 h-3.5 text-muted-foreground" />}>
        <Vector3Input
          label="Position"
          value={selectedObject.transform.position}
          onChange={handlePositionChange}
        />
        <Vector3Input
          label="Rotation"
          value={selectedObject.transform.rotation}
          onChange={handleRotationChange}
          step={1}
        />
        <Vector3Input
          label="Scale"
          value={selectedObject.transform.scale}
          onChange={handleScaleChange}
        />
      </CollapsibleSection>

      {selectedObject.components.map((component) => (
        <ComponentEditor 
          key={component.id} 
          component={component} 
          objectId={selectedObject.id} 
        />
      ))}

      <div className="p-3">
        <AddComponentDialog objectId={selectedObject.id} />
      </div>
    </ScrollArea>
  );
}

function MaterialPanel() {
  const { project, selectedObjectId, updateComponent } = useEngineStore();
  const scene = project?.scenes[0];
  const selectedObject = scene?.objects.find(o => o.id === selectedObjectId);
  const meshComponent = selectedObject?.components.find(c => c.type === 'mesh');

  if (!meshComponent) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        Select a mesh object to edit materials
      </div>
    );
  }

  const textures = project?.assets.filter(a => a.type === 'texture') || [];
  const materials = project?.assets.filter(a => a.type === 'material') || [];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <CollapsibleSection title="Surface" icon={<Box className="w-3.5 h-3.5" />}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Base Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={meshComponent.properties.color || '#6366f1'}
                  onChange={(e) => updateComponent(selectedObject!.id, meshComponent.id, { color: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer border-0"
                  data-testid="color-base"
                />
                <Input
                  value={meshComponent.properties.color || '#6366f1'}
                  onChange={(e) => updateComponent(selectedObject!.id, meshComponent.id, { color: e.target.value })}
                  className="h-7 text-xs font-mono flex-1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Roughness</Label>
                <span className="text-xs font-mono">{meshComponent.properties.roughness ?? 0.5}</span>
              </div>
              <Slider
                value={[meshComponent.properties.roughness ?? 0.5]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => updateComponent(selectedObject!.id, meshComponent.id, { roughness: v })}
                data-testid="slider-roughness"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Metallic</Label>
                <span className="text-xs font-mono">{meshComponent.properties.metallic ?? 0}</span>
              </div>
              <Slider
                value={[meshComponent.properties.metallic ?? 0]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => updateComponent(selectedObject!.id, meshComponent.id, { metallic: v })}
                data-testid="slider-metallic"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Textures" defaultOpen={false}>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Albedo Map</Label>
              <Select 
                value={meshComponent.properties.albedoTexture || ''} 
                onValueChange={(v) => updateComponent(selectedObject!.id, meshComponent.id, { albedoTexture: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="h-7 text-xs" data-testid="select-albedo">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {textures.map((tex) => (
                    <SelectItem key={tex.id} value={tex.path} className="text-xs">{tex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Normal Map</Label>
              <Select 
                value={meshComponent.properties.normalTexture || ''} 
                onValueChange={(v) => updateComponent(selectedObject!.id, meshComponent.id, { normalTexture: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="h-7 text-xs" data-testid="select-normal">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {textures.map((tex) => (
                    <SelectItem key={tex.id} value={tex.path} className="text-xs">{tex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Material Presets" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-1">
            {materials.slice(0, 6).map((mat) => (
              <Button 
                key={mat.id} 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs justify-start"
                onClick={() => updateComponent(selectedObject!.id, meshComponent.id, { materialPath: mat.path })}
              >
                {mat.name}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}

function ScriptsPanel() {
  const { project, selectedObjectId, addComponent, addConsoleLog } = useEngineStore();
  const scene = project?.scenes[0];
  const selectedObject = scene?.objects.find(o => o.id === selectedObjectId);
  const scripts = project?.assets.filter(a => a.type === 'script') || [];
  const scriptComponents = selectedObject?.components.filter(c => c.type === 'script') || [];

  if (!selectedObject) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        Select an object to manage scripts
      </div>
    );
  }

  const attachScript = (script: typeof scripts[0]) => {
    const newComponent: Component = {
      id: crypto.randomUUID(),
      type: 'script',
      enabled: true,
      properties: { 
        scriptPath: script.path, 
        scriptName: script.name,
        autoStart: true 
      },
    };
    addComponent(selectedObject.id, newComponent);
    addConsoleLog({ type: 'info', message: `Attached script: ${script.name}`, source: 'Scripts' });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div>
          <Label className="text-xs font-medium">Attached Scripts</Label>
          {scriptComponents.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">No scripts attached</p>
          ) : (
            <div className="mt-2 space-y-1">
              {scriptComponents.map((comp) => (
                <div key={comp.id} className="flex items-center gap-2 p-2 bg-sidebar-accent rounded text-xs">
                  <FileCode className="w-3.5 h-3.5" />
                  <span className="flex-1">{comp.properties.scriptName}</span>
                  <Switch checked={comp.enabled} className="scale-75" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs font-medium">Available Scripts</Label>
          <div className="mt-2 space-y-1 max-h-48 overflow-auto">
            {scripts.slice(0, 20).map((script) => (
              <Button
                key={script.id}
                variant="ghost"
                size="sm"
                className="w-full h-7 justify-start text-xs gap-2"
                onClick={() => attachScript(script)}
                data-testid={`button-attach-${script.name}`}
              >
                <Plus className="w-3 h-3" />
                {script.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function PrefabsPanel() {
  const { prefabs, instantiatePrefab, deletePrefab, project } = useEngineStore();
  const prefabAssets = project?.assets.filter(a => a.type === 'prefab') || [];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div>
          <Label className="text-xs font-medium">Custom Prefabs</Label>
          {prefabs.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">No custom prefabs created yet. Select an object and click the package icon to create one.</p>
          ) : (
            <div className="mt-2 space-y-1">
              {prefabs.map((prefab) => (
                <div key={prefab.id} className="flex items-center gap-2 p-2 bg-sidebar-accent rounded">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span className="flex-1 text-xs">{prefab.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => instantiatePrefab(prefab.id)}
                    title="Instantiate"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => deletePrefab(prefab.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs font-medium">Starter Prefabs</Label>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {prefabAssets.slice(0, 8).map((prefab) => (
              <Button
                key={prefab.id}
                variant="outline"
                size="sm"
                className="h-auto py-2 flex-col gap-1 text-xs"
                data-testid={`button-prefab-${prefab.name}`}
              >
                <Package className="w-4 h-4" />
                <span className="truncate w-full text-center">{prefab.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function Inspector() {
  const { activeRightTab, setActiveRightTab } = useEngineStore();

  return (
    <div className="h-full flex flex-col bg-sidebar" data-testid="inspector">
      <div className="border-b border-sidebar-border">
        <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as any)}>
          <TabsList className="w-full h-9 bg-transparent rounded-none justify-start gap-0 px-1">
            <TabsTrigger 
              value="transform" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-2"
              data-testid="tab-transform"
            >
              Object
            </TabsTrigger>
            <TabsTrigger 
              value="material" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-2"
              data-testid="tab-material"
            >
              Material
            </TabsTrigger>
            <TabsTrigger 
              value="components" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-2"
              data-testid="tab-scripts"
            >
              Scripts
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-2"
              data-testid="tab-prefabs"
            >
              Prefabs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeRightTab === 'transform' && <TransformPanel />}
        {activeRightTab === 'material' && <MaterialPanel />}
        {activeRightTab === 'components' && <ScriptsPanel />}
        {activeRightTab === 'ai' && <PrefabsPanel />}
      </div>
    </div>
  );
}
