import { useState, useCallback, useRef, useEffect } from 'react';
import { Sliders, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CurvePoint {
  x: number;
  y: number;
}

interface ColorCurvesProps {
  onApply?: (adjustments: ColorAdjustments) => void;
  imageUrl?: string;
}

export interface ColorAdjustments {
  rgbCurve: CurvePoint[];
  redCurve: CurvePoint[];
  greenCurve: CurvePoint[];
  blueCurve: CurvePoint[];
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
}

const defaultCurve: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 }
];

const defaultAdjustments: ColorAdjustments = {
  rgbCurve: [...defaultCurve],
  redCurve: [...defaultCurve],
  greenCurve: [...defaultCurve],
  blueCurve: [...defaultCurve],
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0
};

function CurveCanvas({ 
  curve, 
  onChange, 
  color = 'white',
  className 
}: { 
  curve: CurvePoint[]; 
  onChange: (curve: CurvePoint[]) => void;
  color?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  
  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 4) * i, 0);
      ctx.lineTo((width / 4) * i, height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, (height / 4) * i);
      ctx.lineTo(width, (height / 4) * i);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sortedCurve = [...curve].sort((a, b) => a.x - b.x);
    
    if (sortedCurve.length > 0) {
      const scale = width / 255;
      ctx.moveTo(sortedCurve[0].x * scale, height - sortedCurve[0].y * scale);
      
      for (let i = 1; i < sortedCurve.length; i++) {
        ctx.lineTo(sortedCurve[i].x * scale, height - sortedCurve[i].y * scale);
      }
    }
    
    ctx.stroke();
    
    sortedCurve.forEach((point, index) => {
      const scale = width / 255;
      ctx.fillStyle = selectedPoint === index ? '#fff' : color;
      ctx.beginPath();
      ctx.arc(point.x * scale, height - point.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [curve, color, selectedPoint]);
  
  useEffect(() => {
    drawCurve();
  }, [drawCurve]);
  
  const getPointFromEvent = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 255;
    const x = Math.max(0, Math.min(255, (e.clientX - rect.left) / scale));
    const y = Math.max(0, Math.min(255, 255 - ((e.clientY - rect.top) / scale)));
    
    return { x: Math.round(x), y: Math.round(y) };
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getPointFromEvent(e);
    
    const existingIndex = curve.findIndex(p => 
      Math.abs(p.x - point.x) < 15 && Math.abs(p.y - point.y) < 15
    );
    
    if (existingIndex !== -1) {
      setSelectedPoint(existingIndex);
      setIsDragging(true);
    } else if (curve.length < 10) {
      const newCurve = [...curve, point].sort((a, b) => a.x - b.x);
      onChange(newCurve);
      setSelectedPoint(newCurve.findIndex(p => p.x === point.x && p.y === point.y));
      setIsDragging(true);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || selectedPoint === null) return;
    
    const point = getPointFromEvent(e);
    const newCurve = [...curve];
    
    if (selectedPoint > 0 && selectedPoint < curve.length - 1) {
      newCurve[selectedPoint] = point;
    } else {
      newCurve[selectedPoint] = { ...newCurve[selectedPoint], y: point.y };
    }
    
    onChange(newCurve.sort((a, b) => a.x - b.x));
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = getPointFromEvent(e);
    
    const existingIndex = curve.findIndex(p => 
      Math.abs(p.x - point.x) < 15 && Math.abs(p.y - point.y) < 15
    );
    
    if (existingIndex !== -1 && existingIndex > 0 && existingIndex < curve.length - 1) {
      const newCurve = curve.filter((_, i) => i !== existingIndex);
      onChange(newCurve);
      setSelectedPoint(null);
    }
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      className={cn("rounded-md cursor-crosshair", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}

export function ColorCurvesEditor({ onApply, imageUrl }: ColorCurvesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');
  const [adjustments, setAdjustments] = useState<ColorAdjustments>({ ...defaultAdjustments });
  
  const handleCurveChange = (channel: 'rgb' | 'red' | 'green' | 'blue', curve: CurvePoint[]) => {
    setAdjustments(prev => ({
      ...prev,
      [`${channel}Curve`]: curve
    }));
  };
  
  const handleSliderChange = (key: keyof ColorAdjustments, value: number[]) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: value[0]
    }));
  };
  
  const handleReset = () => {
    setAdjustments({ ...defaultAdjustments });
  };
  
  const handleApply = () => {
    onApply?.(adjustments);
    setIsOpen(false);
  };
  
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'red': return '#ef4444';
      case 'green': return '#22c55e';
      case 'blue': return '#3b82f6';
      default: return '#ffffff';
    }
  };
  
  const getCurveForChannel = () => {
    switch (activeChannel) {
      case 'red': return adjustments.redCurve;
      case 'green': return adjustments.greenCurve;
      case 'blue': return adjustments.blueCurve;
      default: return adjustments.rgbCurve;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-color-curves">
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-xs">Curves</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Color Curves
          </DialogTitle>
          <DialogDescription>
            Adjust color curves and levels for post-processing effects
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as 'rgb' | 'red' | 'green' | 'blue')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rgb" className="text-xs" data-testid="tab-rgb">
                RGB
              </TabsTrigger>
              <TabsTrigger value="red" className="text-xs text-red-400" data-testid="tab-red">
                Red
              </TabsTrigger>
              <TabsTrigger value="green" className="text-xs text-green-400" data-testid="tab-green">
                Green
              </TabsTrigger>
              <TabsTrigger value="blue" className="text-xs text-blue-400" data-testid="tab-blue">
                Blue
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex justify-center">
            <CurveCanvas
              curve={getCurveForChannel()}
              onChange={(curve) => handleCurveChange(activeChannel, curve)}
              color={getChannelColor(activeChannel)}
            />
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Click to add points, drag to adjust, double-click to remove
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Brightness</Label>
              <Slider
                value={[adjustments.brightness]}
                min={-100}
                max={100}
                step={1}
                onValueChange={(v) => handleSliderChange('brightness', v)}
                data-testid="slider-brightness"
              />
              <div className="text-xs text-muted-foreground text-right">{adjustments.brightness}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Contrast</Label>
              <Slider
                value={[adjustments.contrast]}
                min={-100}
                max={100}
                step={1}
                onValueChange={(v) => handleSliderChange('contrast', v)}
                data-testid="slider-contrast"
              />
              <div className="text-xs text-muted-foreground text-right">{adjustments.contrast}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Saturation</Label>
              <Slider
                value={[adjustments.saturation]}
                min={-100}
                max={100}
                step={1}
                onValueChange={(v) => handleSliderChange('saturation', v)}
                data-testid="slider-saturation"
              />
              <div className="text-xs text-muted-foreground text-right">{adjustments.saturation}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Exposure</Label>
              <Slider
                value={[adjustments.exposure]}
                min={-100}
                max={100}
                step={1}
                onValueChange={(v) => handleSliderChange('exposure', v)}
                data-testid="slider-exposure"
              />
              <div className="text-xs text-muted-foreground text-right">{adjustments.exposure}</div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} data-testid="button-reset-curves">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-curves">
            <Check className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
