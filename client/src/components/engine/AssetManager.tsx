import { useState, useCallback } from 'react';
import { Upload, FileArchive, Trash2, Check, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Asset {
  id: string;
  name: string;
  format: string;
  size: number;
  meshCount?: number;
  animationCount?: number;
  hasBones: boolean;
  processedAt: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function AssetManager() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadAssetRegistry = useCallback(async () => {
    try {
      const response = await fetch('/api/assets/registry');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load asset registry:', error);
    }
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    setIsLoading(true);

    for (const file of files) {
      const fileId = `${file.name}_${Date.now()}`;
      const progress: UploadProgress = {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      };

      setUploads(prev => [...prev, progress]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.split('.')[0]);

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        setUploads(prev =>
          prev.map(u =>
            u.fileName === file.name
              ? { ...u, status: 'complete', progress: 100 }
              : u
          )
        );

        toast({
          title: 'Success',
          description: `Processed ${result.assetsProcessed} asset(s) from ${file.name}`,
          variant: 'default'
        });

        // Reload registry
        await loadAssetRegistry();
      } catch (error) {
        setUploads(prev =>
          prev.map(u =>
            u.fileName === file.name
              ? {
                  ...u,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : u
          )
        );

        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload file',
          variant: 'destructive'
        });
      }
    }

    setIsLoading(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Asset Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <FileArchive className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Supports: ZIP, GLB, GLTF, FBX, OBJ, DAE, STL, PLY, 3DS
                </p>
              </div>
              <input
                type="file"
                multiple
                onChange={handleChange}
                className="hidden"
                id="asset-upload"
                accept=".zip,.glb,.gltf,.fbx,.obj,.dae,.stl,.ply,.3ds"
                disabled={isLoading}
              />
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <label htmlFor="asset-upload" className="cursor-pointer">
                  {isLoading ? (
                    <>
                      <Loader className="w-3 h-3 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-2" />
                      Select Files
                    </>
                  )}
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploads.map((upload) => (
              <div key={upload.fileName} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{upload.fileName}</span>
                  {upload.status === 'complete' && <Check className="w-4 h-4 text-green-500" />}
                  {upload.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {upload.status === 'uploading' && <Loader className="w-4 h-4 animate-spin" />}
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      upload.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                {upload.error && (
                  <p className="text-xs text-red-500">{upload.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Asset Registry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Processed Assets ({assets.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAssetRegistry}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No assets processed yet
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-start justify-between p-2 rounded border border-muted hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {asset.format}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {formatFileSize(asset.size)}
                        </Badge>
                        {asset.hasBones && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            Rigged
                          </Badge>
                        )}
                        {asset.animationCount && asset.animationCount > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            {asset.animationCount} anims
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(asset.processedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 flex-shrink-0"
                      onClick={() => {
                        // TODO: Implement asset deletion
                        toast({
                          title: 'Info',
                          description: 'Asset deletion coming soon',
                          variant: 'default'
                        });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
