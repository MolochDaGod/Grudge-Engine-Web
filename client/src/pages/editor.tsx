import { useEffect } from 'react';
import { Editor } from '@/components/engine/Editor';
import { preloadObjectStore } from '@/lib/objectstore-client';

export default function EditorPage() {
  useEffect(() => {
    // Pre-cache ObjectStore game data (terrain, rendering, asset registry)
    preloadObjectStore();
  }, []);

  return <Editor />;
}
