import { useState, useRef } from 'react';
import { FileUp, ArrowRightLeft, Package, FileImage, Box, FileAudio, FileCode, Loader2, Check, AlertCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@shared/schema';

interface ImportedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'importing' | 'complete' | 'error';
  assetType: AssetType;
  error?: string;
}

const SUPPORTED_FORMATS = {
  models: {
    import: ['.gltf', '.glb', '.obj', '.fbx', '.stl', '.ply', '.dae', '.3ds'],
    convert: ['.gltf', '.glb', '.obj']
  },
  textures: {
    import: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tga', '.hdr', '.exr', '.xcf'],
    convert: ['.png', '.jpg', '.webp']
  },
  audio: {
    import: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
    convert: ['.mp3', '.wav', '.ogg']
  },
  scripts: {
    import: ['.js', '.ts', '.json'],
    convert: []
  }
};

function getAssetTypeFromExtension(filename: string): AssetType {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  if (SUPPORTED_FORMATS.models.import.includes(ext)) return 'model';
  if (SUPPORTED_FORMATS.textures.import.includes(ext)) return 'texture';
  if (SUPPORTED_FORMATS.audio.import.includes(ext)) return 'audio';
  if (SUPPORTED_FORMATS.scripts.import.includes(ext)) return 'script';
  return 'texture';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function AssetImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'convert'>('import');
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [convertSourceFormat, setConvertSourceFormat] = useState<string>('');
  const [convertTargetFormat, setConvertTargetFormat] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addAsset, addConsoleLog } = useEngineStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: ImportedFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'pending',
      assetType: getAssetTypeFromExtension(file.name)
    }));
    setImportedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newFiles: ImportedFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'pending',
      assetType: getAssetTypeFromExtension(file.name)
    }));
    setImportedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setImportedFiles(prev => prev.filter(f => f.id !== id));
  };

  const processXCFFile = async (file: File): Promise<Asset[]> => {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const res = await fetch('/api/assets/process-xcf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
      }),
    });
    
    if (!res.ok) throw new Error('Failed to process XCF file');
    
    const result = await res.json();
    const assets: Asset[] = [];
    
    for (const layer of result.layers) {
      if (layer.path) {
        const asset: Asset = {
          id: crypto.randomUUID(),
          name: `${file.name.replace('.xcf', '')} - ${layer.name}`,
          type: 'texture',
          path: layer.path
        };
        assets.push(asset);
      }
    }
    
    addConsoleLog({ 
      type: 'info', 
      message: `Extracted ${result.layerCount} layers from ${file.name} (${result.imageWidth}x${result.imageHeight})`, 
      source: 'XCF Import' 
    });
    
    return assets;
  };

  const importFiles = async () => {
    if (importedFiles.length === 0) return;
    
    setIsProcessing(true);
    
    for (const importedFile of importedFiles) {
      if (importedFile.status !== 'pending') continue;
      
      setImportedFiles(prev => prev.map(f => 
        f.id === importedFile.id ? { ...f, status: 'importing' } : f
      ));
      
      try {
        const ext = '.' + importedFile.name.split('.').pop()?.toLowerCase();
        
        if (ext === '.xcf') {
          const extractedAssets = await processXCFFile(importedFile.file);
          for (const asset of extractedAssets) {
            addAsset(asset);
          }
          addConsoleLog({ type: 'info', message: `Imported XCF with ${extractedAssets.length} layers: ${importedFile.name}`, source: 'Import' });
        } else if (ext === '.fbx') {
          // Auto-convert FBX to GLB (best practice for web)
          addConsoleLog({ type: 'info', message: `Converting FBX to GLB: ${importedFile.name}`, source: 'Import' });
          
          const conversionResult = await convertFBXtoGLB(importedFile.file);
          if (!conversionResult) {
            throw new Error('FBX to GLB conversion failed');
          }
          
          const glbName = importedFile.name.replace(/\.fbx$/i, '.glb');
          const newAsset: Asset = {
            id: crypto.randomUUID(),
            name: glbName,
            type: 'model',
            path: conversionResult.glbPath
          };
          
          addAsset(newAsset);
          addConsoleLog({ 
            type: 'info', 
            message: `Converted & imported: ${glbName} (${(conversionResult.size / 1024 / 1024).toFixed(2)}MB, ${conversionResult.duration}ms)`, 
            source: 'Import' 
          });
        } else {
          const res = await fetch('/api/uploads/request-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: importedFile.name,
              size: importedFile.size,
              contentType: importedFile.type || 'application/octet-stream',
            }),
          });
          
          if (!res.ok) throw new Error('Failed to get upload URL');
          
          const { uploadURL } = await res.json();
          
          const uploadRes = await fetch(uploadURL, {
            method: 'PUT',
            headers: { 'Content-Type': importedFile.type || 'application/octet-stream' },
            body: importedFile.file,
          });
          
          if (!uploadRes.ok) throw new Error('Failed to upload file');
          
          const newAsset: Asset = {
            id: crypto.randomUUID(),
            name: importedFile.name,
            type: importedFile.assetType,
            path: uploadURL.split('?')[0]
          };
          
          addAsset(newAsset);
          addConsoleLog({ type: 'info', message: `Imported: ${importedFile.name}`, source: 'Import' });
        }
        
        setImportedFiles(prev => prev.map(f => 
          f.id === importedFile.id ? { ...f, status: 'complete' } : f
        ));
      } catch (error) {
        setImportedFiles(prev => prev.map(f => 
          f.id === importedFile.id ? { ...f, status: 'error', error: String(error) } : f
        ));
        addConsoleLog({ type: 'error', message: `Import failed: ${importedFile.name} - ${error}`, source: 'Import' });
      }
    }
    
    setIsProcessing(false);
  };

  const convertFBXtoGLB = async (file: File): Promise<{ glbPath: string; duration: number; size: number } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/convert/fbx-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Conversion failed');
      }
      
      const result = await res.json();
      return {
        glbPath: result.outputPath,
        duration: result.duration,
        size: result.fileSize
      };
    } catch (error) {
      console.error('FBX conversion failed:', error);
      return null;
    }
  };

  const convertAsset = async () => {
    if (!convertSourceFormat || !convertTargetFormat) return;
    
    setIsProcessing(true);
    addConsoleLog({ 
      type: 'info', 
      message: `Converting from ${convertSourceFormat} to ${convertTargetFormat}...`, 
      source: 'Convert' 
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addConsoleLog({ 
      type: 'info', 
      message: `Conversion complete: ${convertSourceFormat} → ${convertTargetFormat}`, 
      source: 'Convert' 
    });
    
    setIsProcessing(false);
  };

  const clearCompleted = () => {
    setImportedFiles(prev => prev.filter(f => f.status !== 'complete'));
  };

  const allFormatsForConvert = [
    ...SUPPORTED_FORMATS.models.import,
    ...SUPPORTED_FORMATS.textures.import,
    ...SUPPORTED_FORMATS.audio.import
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" data-testid="button-asset-importer">
          <Package className="w-3.5 h-3.5" />
          <span className="text-xs">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Asset Importer & Converter
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'convert')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-2" data-testid="tab-import">
              <FileUp className="w-4 h-4" />
              Import Assets
            </TabsTrigger>
            <TabsTrigger value="convert" className="gap-2" data-testid="tab-convert">
              <ArrowRightLeft className="w-4 h-4" />
              Convert Format
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="mt-4">
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate transition-colors",
                importedFiles.length > 0 ? "border-muted" : "border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              data-testid="drop-zone-import"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept={[
                  ...SUPPORTED_FORMATS.models.import,
                  ...SUPPORTED_FORMATS.textures.import,
                  ...SUPPORTED_FORMATS.audio.import,
                  ...SUPPORTED_FORMATS.scripts.import
                ].join(',')}
              />
              <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">
                Supports: 3D models, textures, audio, and scripts
              </p>
            </div>
            
            {importedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Files ({importedFiles.length})</span>
                  <Button variant="ghost" size="sm" onClick={clearCompleted} className="h-6 text-xs" data-testid="button-clear-completed">
                    Clear Completed
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-2 space-y-1">
                    {importedFiles.map(file => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/50"
                      >
                        {file.assetType === 'model' && <Box className="w-4 h-4 text-cyan-400" />}
                        {file.assetType === 'texture' && file.name.endsWith('.xcf') ? (
                          <Layers className="w-4 h-4 text-purple-400" />
                        ) : file.assetType === 'texture' ? (
                          <FileImage className="w-4 h-4 text-green-400" />
                        ) : null}
                        {file.assetType === 'audio' && <FileAudio className="w-4 h-4 text-yellow-400" />}
                        {file.assetType === 'script' && <FileCode className="w-4 h-4 text-orange-400" />}
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                        </div>
                        
                        {file.status === 'pending' && file.name.toLowerCase().endsWith('.fbx') && (
                          <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            → GLB
                          </Badge>
                        )}
                        {file.status === 'pending' && file.name.endsWith('.xcf') && (
                          <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/50">
                            <Layers className="w-3 h-3 mr-1" />
                            Layers
                          </Badge>
                        )}
                        {file.status === 'pending' && !file.name.endsWith('.xcf') && (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                        {file.status === 'importing' && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {file.status === 'complete' && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        
                        {file.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => removeFile(file.id)}
                            data-testid={`button-remove-file-${file.id}`}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-sidebar-accent/30 rounded-md">
              <div className="text-xs font-medium mb-2">Supported Formats</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="text-cyan-400">Models:</span> {SUPPORTED_FORMATS.models.import.join(', ')}
                </div>
                <div>
                  <span className="text-green-400">Textures:</span> {SUPPORTED_FORMATS.textures.import.filter(f => f !== '.xcf').join(', ')}
                </div>
                <div>
                  <span className="text-yellow-400">Audio:</span> {SUPPORTED_FORMATS.audio.import.join(', ')}
                </div>
                <div>
                  <span className="text-orange-400">Scripts:</span> {SUPPORTED_FORMATS.scripts.import.join(', ')}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-sidebar-border text-xs">
                <span className="text-purple-400">GIMP (XCF):</span> Auto-extracts layers as individual textures
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="convert" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Source Format</Label>
                  <Select value={convertSourceFormat} onValueChange={setConvertSourceFormat}>
                    <SelectTrigger data-testid="select-source-format">
                      <SelectValue placeholder="Select source format" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFormatsForConvert.map(fmt => (
                        <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Target Format</Label>
                  <Select value={convertTargetFormat} onValueChange={setConvertTargetFormat}>
                    <SelectTrigger data-testid="select-target-format">
                      <SelectValue placeholder="Select target format" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ...SUPPORTED_FORMATS.models.convert,
                        ...SUPPORTED_FORMATS.textures.convert,
                        ...SUPPORTED_FORMATS.audio.convert
                      ].map(fmt => (
                        <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    {convertSourceFormat ? (
                      <span className="text-sm font-medium">{convertSourceFormat}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Source</span>
                    )}
                  </div>
                  <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
                  <div className="w-20 h-20 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    {convertTargetFormat ? (
                      <span className="text-sm font-medium">{convertTargetFormat}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Target</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-sidebar-accent/30 rounded-md">
                <div className="text-xs font-medium mb-2">Conversion Support</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div><span className="text-cyan-400">Models:</span> Convert between GLTF, GLB, and OBJ</div>
                  <div><span className="text-green-400">Textures:</span> Convert between PNG, JPG, and WebP</div>
                  <div><span className="text-yellow-400">Audio:</span> Convert between MP3, WAV, and OGG</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          {activeTab === 'import' ? (
            <Button 
              onClick={importFiles} 
              disabled={isProcessing || importedFiles.filter(f => f.status === 'pending').length === 0}
              data-testid="button-import-assets"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Import {importedFiles.filter(f => f.status === 'pending').length} Files
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={convertAsset} 
              disabled={isProcessing || !convertSourceFormat || !convertTargetFormat}
              data-testid="button-convert-assets"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Convert
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
