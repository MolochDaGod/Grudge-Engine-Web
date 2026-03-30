import { z } from "zod";
import { sceneSchema } from "./schema";

export const pipelineAssetTypeSchema = z.enum([
  "model",
  "animation",
  "texture",
  "scene",
]);

export const pipelineAssetFormatSchema = z.enum([
  "glb",
  "gltf",
  "fbx",
  "obj",
  "dae",
  "stl",
  "ply",
  "3ds",
  "zip",
]);

export const pipelineAssetSourceSchema = z.enum([
  "local",
  "objectstore",
  "meshy",
  "upload",
]);

export const pipelineAssetMetadataSchema = z.object({
  meshCount: z.number().int().nonnegative().default(0),
  animationCount: z.number().int().nonnegative().default(0),
  hasBones: z.boolean().default(false),
  materialCount: z.number().int().nonnegative().default(0),
  textureCount: z.number().int().nonnegative().default(0),
  polyCount: z.number().int().nonnegative().optional(),
  fileSize: z.number().int().nonnegative().default(0),
});

export const grudgePipelineAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: pipelineAssetTypeSchema,
  format: pipelineAssetFormatSchema,
  localPath: z.string().optional(),
  manifestPath: z.string().optional(),
  objectStoreUrl: z.string().optional(),
  cdnUrl: z.string().optional(),
  metadata: pipelineAssetMetadataSchema,
  source: pipelineAssetSourceSchema,
  pipelineTaskId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const pipelineManifestSchema = z.object({
  version: z.string().default("1.0.0"),
  generatedAt: z.string(),
  assets: z.array(grudgePipelineAssetSchema),
});

export const grudgeArchiveSchema = z.object({
  version: z.string().default("1.0.0"),
  exportedAt: z.string(),
  projectId: z.string().optional(),
  sceneId: z.string(),
  sceneName: z.string(),
  scene: sceneSchema,
  assets: z.array(grudgePipelineAssetSchema),
  files: z.record(z.string()).default({}),
});

export type PipelineAssetType = z.infer<typeof pipelineAssetTypeSchema>;
export type PipelineAssetFormat = z.infer<typeof pipelineAssetFormatSchema>;
export type PipelineAssetSource = z.infer<typeof pipelineAssetSourceSchema>;
export type PipelineAssetMetadata = z.infer<typeof pipelineAssetMetadataSchema>;
export type GrudgePipelineAsset = z.infer<typeof grudgePipelineAssetSchema>;
export type PipelineManifest = z.infer<typeof pipelineManifestSchema>;
export type GrudgeArchive = z.infer<typeof grudgeArchiveSchema>;
