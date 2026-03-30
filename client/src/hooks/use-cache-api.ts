import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CacheEntry {
  key: string;
  data: any;
  age: number;
}

interface CacheListEntry {
  key: string;
  age: number;
  ttl: number;
  expiresIn: number;
}

interface SceneCacheData {
  sceneId: string;
  objects: any[];
  settings: any;
}

export function useCacheGet(key: string | null) {
  return useQuery<CacheEntry>({
    queryKey: [`/api/cache/${key}`],
    enabled: !!key,
  });
}

export function useCacheList() {
  return useQuery<CacheListEntry[]>({
    queryKey: ['/api/cache'],
  });
}

export function useCacheSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, data, ttl }: { key: string; data: any; ttl?: number }) => {
      const response = await apiRequest('POST', `/api/cache/${encodeURIComponent(key)}`, { data, ttl });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cache'] });
    },
  });
}

export function useCacheDelete() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (key: string) => {
      await apiRequest('DELETE', `/api/cache/${encodeURIComponent(key)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cache'] });
    },
  });
}

export function useCacheClear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/cache');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cache'] });
    },
  });
}

export function useSceneCacheGet(sceneId: string | null) {
  return useQuery<SceneCacheData>({
    queryKey: [`/api/cache/scene/${sceneId}`],
    enabled: !!sceneId,
  });
}

export function useSceneCacheSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sceneId, objects, settings, ttl }: { sceneId: string; objects: any[]; settings: any; ttl?: number }) => {
      const response = await apiRequest('POST', `/api/cache/scene/${encodeURIComponent(sceneId)}`, { objects, settings, ttl });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/cache/scene/${variables.sceneId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/cache'] });
    },
  });
}

export function useScenesApi(projectId: string | null) {
  return useQuery({
    queryKey: [`/api/projects/${projectId}/scenes`],
    enabled: !!projectId,
  });
}

export function useSceneApi(projectId: string | null, sceneId: string | null) {
  return useQuery({
    queryKey: [`/api/projects/${projectId}/scenes/${sceneId}`],
    enabled: !!projectId && !!sceneId,
  });
}
