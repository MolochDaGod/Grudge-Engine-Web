import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Vector3 type for positions, rotations, scales
export const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vector3 = z.infer<typeof vector3Schema>;

// Transform component
export const transformSchema = z.object({
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
});

export type Transform = z.infer<typeof transformSchema>;

// Game object component types
export const componentTypeSchema = z.enum([
  "mesh",
  "material",
  "controller",
  "animator",
  "light",
  "camera",
  "physics",
  "collider",
  "script",
  "audio",
  "particle",
]);

export type ComponentType = z.infer<typeof componentTypeSchema>;

// Component schema
export const componentSchema = z.object({
  id: z.string(),
  type: componentTypeSchema,
  enabled: z.boolean(),
  properties: z.record(z.any()),
});

export type Component = z.infer<typeof componentSchema>;

// Game object schema
export const gameObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean(),
  isStatic: z.boolean().default(false),
  transform: transformSchema,
  components: z.array(componentSchema),
  children: z.array(z.string()),
  parentId: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  layer: z.number().default(0),
  prefabId: z.string().optional(),
});

export type GameObject = z.infer<typeof gameObjectSchema>;

// Asset types
export const assetTypeSchema = z.enum([
  "model",
  "texture",
  "material",
  "audio",
  "script",
  "prefab",
  "animation",
]);

export type AssetType = z.infer<typeof assetTypeSchema>;

// Asset schema
export const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: assetTypeSchema,
  path: z.string(),
  thumbnail: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Asset = z.infer<typeof assetSchema>;

// Scene schema
export const sceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  objects: z.array(gameObjectSchema),
  settings: z.object({
    ambientColor: z.string(),
    fogEnabled: z.boolean(),
    fogColor: z.string(),
    fogDensity: z.number(),
    gravity: vector3Schema,
  }),
});

export type Scene = z.infer<typeof sceneSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  scenes: z.array(sceneSchema),
  assets: z.array(assetSchema),
  settings: z.object({
    renderMode: z.enum(["pbr", "wireframe", "debug"]),
    antiAliasing: z.boolean(),
    shadows: z.boolean(),
    postProcessing: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

// AI generation request
export const aiGenerationRequestSchema = z.object({
  type: z.enum(["texture", "model", "script", "animation"]),
  prompt: z.string(),
  style: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

export type AIGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;

// Console log entry
export const consoleLogSchema = z.object({
  id: z.string(),
  type: z.enum(["info", "warning", "error", "debug"]),
  message: z.string(),
  timestamp: z.string(),
  source: z.string().optional(),
});

export type ConsoleLog = z.infer<typeof consoleLogSchema>;

// Animation keyframe
export const keyframeSchema = z.object({
  time: z.number(),
  value: z.any(),
  easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]),
});

export type Keyframe = z.infer<typeof keyframeSchema>;

// Animation track
export const animationTrackSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  property: z.string(),
  keyframes: z.array(keyframeSchema),
});

export type AnimationTrack = z.infer<typeof animationTrackSchema>;

// Animation clip
export const animationClipSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.number(),
  tracks: z.array(animationTrackSchema),
  loop: z.boolean(),
});

export type AnimationClip = z.infer<typeof animationClipSchema>;

// ScriptableObject base - Unity-style data container
export const scriptableObjectTypeSchema = z.enum([
  'prefab',
  'gameConfig',
  'enemyData',
  'weaponStats',
  'dialogueTree',
  'audioMixer',
  'inputActions',
  'custom'
]);

export type ScriptableObjectType = z.infer<typeof scriptableObjectTypeSchema>;

export const scriptableObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: scriptableObjectTypeSchema,
  description: z.string().optional(),
  icon: z.string().optional(),
  data: z.record(z.any()),
  references: z.array(z.object({
    key: z.string(),
    targetId: z.string(),
    targetType: z.enum(['scriptableObject', 'asset', 'gameObject']),
  })).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScriptableObject = z.infer<typeof scriptableObjectSchema>;

// Prefab schema - extends ScriptableObject pattern
export const prefabSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  baseAssetId: z.string().optional(),
  components: z.array(componentSchema),
  transform: transformSchema,
  childIds: z.array(z.string()).optional(),
  tags: z.array(z.string()),
  layer: z.number().default(0),
  overrides: z.record(z.any()).optional(),
  thumbnail: z.string().optional(),
  createdAt: z.string(),
});

export type Prefab = z.infer<typeof prefabSchema>;

// Layer definition
export const layerSchema = z.object({
  id: z.number(),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

export type Layer = z.infer<typeof layerSchema>;

// Default layers (like Unity)
export const DEFAULT_LAYERS: Layer[] = [
  { id: 0, name: 'Default', visible: true, locked: false },
  { id: 1, name: 'TransparentFX', visible: true, locked: false },
  { id: 2, name: 'IgnoreRaycast', visible: true, locked: false },
  { id: 3, name: 'Water', visible: true, locked: false },
  { id: 4, name: 'UI', visible: true, locked: false },
  { id: 5, name: 'Player', visible: true, locked: false },
  { id: 6, name: 'Enemy', visible: true, locked: false },
  { id: 7, name: 'Environment', visible: true, locked: false },
];

// Script attachment schema
export const scriptAttachmentSchema = z.object({
  id: z.string(),
  scriptId: z.string(),
  scriptName: z.string(),
  enabled: z.boolean(),
  parameters: z.record(z.any()),
});

export type ScriptAttachment = z.infer<typeof scriptAttachmentSchema>;

// Component blueprint for component registry
export const componentBlueprintSchema = z.object({
  type: componentTypeSchema,
  displayName: z.string(),
  description: z.string(),
  icon: z.string(),
  defaultProperties: z.record(z.any()),
  propertyDescriptors: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['number', 'string', 'boolean', 'color', 'vector3', 'asset', 'script', 'select']),
    default: z.any(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    options: z.array(z.string()).optional(),
  })),
});

export type ComponentBlueprint = z.infer<typeof componentBlueprintSchema>;

// Insert schemas for API validation
export const insertProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;

export const insertSceneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type InsertScene = z.infer<typeof insertSceneSchema>;

export const insertAssetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: assetTypeSchema.optional(),
  path: z.string().optional(),
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
