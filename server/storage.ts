import { type User, type InsertUser, type Project, type Scene, type Asset, type GameObject } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  getScene(projectId: string, sceneId: string): Promise<Scene | undefined>;
  createScene(projectId: string, scene: Omit<Scene, 'id'>): Promise<Scene | undefined>;
  updateScene(projectId: string, sceneId: string, updates: Partial<Scene>): Promise<Scene | undefined>;
  deleteScene(projectId: string, sceneId: string): Promise<boolean>;
  
  getAsset(projectId: string, assetId: string): Promise<Asset | undefined>;
  createAsset(projectId: string, asset: Omit<Asset, 'id'>): Promise<Asset | undefined>;
  updateAsset(projectId: string, assetId: string, updates: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(projectId: string, assetId: string): Promise<boolean>;
  
  addGameObject(projectId: string, sceneId: string, object: GameObject): Promise<GameObject | undefined>;
  updateGameObject(projectId: string, sceneId: string, objectId: string, updates: Partial<GameObject>): Promise<GameObject | undefined>;
  deleteGameObject(projectId: string, sceneId: string, objectId: string): Promise<boolean>;
}

function createDefaultProject(): Project {
  return {
    id: randomUUID(),
    name: 'New Project',
    description: 'A new Grudge Engine project',
    scenes: [{
      id: randomUUID(),
      name: 'Main Scene',
      objects: [
        {
          id: randomUUID(),
          name: 'Main Camera',
          visible: true,
          isStatic: false,
          tags: [],
          layer: 0,
          transform: {
            position: { x: 0, y: 5, z: -10 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [{
            id: randomUUID(),
            type: 'camera',
            enabled: true,
            properties: { fov: 60, near: 0.1, far: 1000 }
          }],
          children: [],
          parentId: null
        },
        {
          id: randomUUID(),
          name: 'Directional Light',
          visible: true,
          isStatic: true,
          tags: [],
          layer: 0,
          transform: {
            position: { x: 0, y: 10, z: 0 },
            rotation: { x: -45, y: 45, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [{
            id: randomUUID(),
            type: 'light',
            enabled: true,
            properties: { type: 'directional', color: '#ffffff', intensity: 1 }
          }],
          children: [],
          parentId: null
        },
        {
          id: randomUUID(),
          name: 'Ground',
          visible: true,
          isStatic: true,
          tags: [],
          layer: 0,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 10, y: 0.1, z: 10 }
          },
          components: [{
            id: randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { type: 'box', color: '#4a5568' }
          }],
          children: [],
          parentId: null
        },
        {
          id: randomUUID(),
          name: 'Cube',
          visible: true,
          isStatic: false,
          tags: [],
          layer: 0,
          transform: {
            position: { x: 0, y: 1, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [{
            id: randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { type: 'box', color: '#3b82f6' }
          }],
          children: [],
          parentId: null
        }
      ],
      settings: {
        ambientColor: '#1a1a2e',
        fogEnabled: false,
        fogColor: '#888888',
        fogDensity: 0.01,
        gravity: { x: 0, y: -9.81, z: 0 }
      }
    }],
    assets: [
      { id: randomUUID(), name: 'Default Material', type: 'material', path: '/materials/default.mat' },
      { id: randomUUID(), name: 'Ground Texture', type: 'texture', path: '/textures/ground.png' },
    ],
    settings: {
      renderMode: 'pbr',
      antiAliasing: true,
      shadows: true,
      postProcessing: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    
    const defaultProject = createDefaultProject();
    this.projects.set(defaultProject.id, defaultProject);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updated: Project = {
      ...project,
      ...updates,
      id: project.id,
      updatedAt: new Date().toISOString()
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async getScene(projectId: string, sceneId: string): Promise<Scene | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    return project.scenes.find(s => s.id === sceneId);
  }

  async createScene(projectId: string, scene: Omit<Scene, 'id'>): Promise<Scene | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const newScene: Scene = {
      ...scene,
      id: randomUUID()
    };
    project.scenes.push(newScene);
    project.updatedAt = new Date().toISOString();
    return newScene;
  }

  async updateScene(projectId: string, sceneId: string, updates: Partial<Scene>): Promise<Scene | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return undefined;
    
    project.scenes[sceneIndex] = {
      ...project.scenes[sceneIndex],
      ...updates,
      id: sceneId
    };
    project.updatedAt = new Date().toISOString();
    return project.scenes[sceneIndex];
  }

  async deleteScene(projectId: string, sceneId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    const initialLength = project.scenes.length;
    project.scenes = project.scenes.filter(s => s.id !== sceneId);
    project.updatedAt = new Date().toISOString();
    return project.scenes.length < initialLength;
  }

  async getAsset(projectId: string, assetId: string): Promise<Asset | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    return project.assets.find(a => a.id === assetId);
  }

  async createAsset(projectId: string, asset: Omit<Asset, 'id'>): Promise<Asset | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const newAsset: Asset = {
      ...asset,
      id: randomUUID()
    };
    project.assets.push(newAsset);
    project.updatedAt = new Date().toISOString();
    return newAsset;
  }

  async updateAsset(projectId: string, assetId: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const assetIndex = project.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) return undefined;
    
    project.assets[assetIndex] = {
      ...project.assets[assetIndex],
      ...updates,
      id: assetId
    };
    project.updatedAt = new Date().toISOString();
    return project.assets[assetIndex];
  }

  async deleteAsset(projectId: string, assetId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    const initialLength = project.assets.length;
    project.assets = project.assets.filter(a => a.id !== assetId);
    project.updatedAt = new Date().toISOString();
    return project.assets.length < initialLength;
  }

  async addGameObject(projectId: string, sceneId: string, object: GameObject): Promise<GameObject | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return undefined;
    
    scene.objects.push(object);
    project.updatedAt = new Date().toISOString();
    return object;
  }

  async updateGameObject(projectId: string, sceneId: string, objectId: string, updates: Partial<GameObject>): Promise<GameObject | undefined> {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return undefined;
    
    const objectIndex = scene.objects.findIndex(o => o.id === objectId);
    if (objectIndex === -1) return undefined;
    
    scene.objects[objectIndex] = {
      ...scene.objects[objectIndex],
      ...updates,
      id: objectId
    };
    project.updatedAt = new Date().toISOString();
    return scene.objects[objectIndex];
  }

  async deleteGameObject(projectId: string, sceneId: string, objectId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return false;
    
    const initialLength = scene.objects.length;
    scene.objects = scene.objects.filter(o => o.id !== objectId);
    project.updatedAt = new Date().toISOString();
    return scene.objects.length < initialLength;
  }
}

export const storage = new MemStorage();
