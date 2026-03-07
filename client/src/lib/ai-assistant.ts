import { 
  isPuterAvailable, 
  aiChatUniversal, 
  aiChatStream as puterChatStream,
  PUTER_AI_MODELS,
  generateImage,
  textToSpeech 
} from './puter';
import { getImportKnowledgeForAI } from './gltf-import-knowledge';

export interface AIAssistantConfig {
  preferFreeModels: boolean;
  defaultModel: string;
  gameDevContext: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
}

const GAME_DEV_SYSTEM_PROMPT = `You are an expert game development AI assistant integrated into Grudge Engine, a browser-based 3D game development studio using Babylon.js.

Your capabilities:
- Help with 3D scene creation and optimization
- Assist with Babylon.js code and scripting
- Suggest game mechanics and design patterns
- Help debug rendering and performance issues
- Generate code snippets for game features
- Provide asset creation suggestions
- Guide file imports, conversions, and proper scaling
- Help with character controllers and NPC behaviors

Key technical context:
- Engine: Babylon.js v8.x with WebGL2
- Language: TypeScript/JavaScript
- UI: React with shadcn/ui components
- State: Zustand for game state management
- Storage: Puter.js cloud storage + Replit Object Storage

${getImportKnowledgeForAI()}

## Character & NPC System:
- Sketchbook-style character controller with state machine (idle, walk, run, jump, fall, land)
- Spring-based velocity/rotation simulators for smooth movement
- AI behaviors: WarBear (patrol/chase/attack), Dragon (flight physics with swoop/hover)
- Component architecture: Mesh → Material → Animator → Controller → Collider

Keep responses concise and practical. Provide code examples when helpful.`;

const QUICK_PROMPTS = {
  createCube: 'Generate Babylon.js code to create a textured cube with PBR material',
  createLight: 'Generate code to add dynamic lighting with shadows to a Babylon.js scene',
  createParticles: 'Generate Babylon.js particle system code for a fire effect',
  optimizeScene: 'Suggest optimizations for a Babylon.js scene with many objects',
  addPhysics: 'Generate code to add Havok physics to an object in Babylon.js',
  createMaterial: 'Generate PBR material code with metallic and roughness textures',
  animateObject: 'Generate Babylon.js animation code for smooth object movement',
  createTerrain: 'Generate procedural terrain code using Babylon.js GroundMesh',
  addSkybox: 'Generate code to add a procedural skybox in Babylon.js',
  playerController: 'Generate third-person character controller code for Babylon.js',
  importModel: 'Show me how to import a glTF/GLB model and scale it correctly',
  convertFbx: 'How do I convert an FBX file to GLB for use in Babylon.js?',
  scaleCharacter: 'Generate code to auto-scale an imported character to 6 feet tall',
  playAnimation: 'Show me how to find and play animations from an imported model',
  fixModelRotation: 'My imported model is facing the wrong way, how do I fix it?',
  debugImport: 'Help me diagnose why my imported model is not appearing correctly',
} as const;

export type QuickPromptKey = keyof typeof QUICK_PROMPTS;

class AIAssistantService {
  private config: AIAssistantConfig = {
    preferFreeModels: true,
    defaultModel: PUTER_AI_MODELS.GEMINI_2_FLASH,
    gameDevContext: true,
  };
  
  private conversationHistory: AIMessage[] = [];
  private isStreaming = false;
  
  get isAvailable(): boolean {
    return isPuterAvailable();
  }
  
  get currentModel(): string {
    return this.config.defaultModel;
  }
  
  get allModels(): { id: string; name: string; free: boolean }[] {
    return [
      { id: PUTER_AI_MODELS.GEMINI_2_FLASH, name: 'Gemini 2.0 Flash', free: true },
      { id: PUTER_AI_MODELS.GEMINI_1_5_PRO, name: 'Gemini 1.5 Pro', free: true },
      { id: PUTER_AI_MODELS.GEMINI_1_5_FLASH, name: 'Gemini 1.5 Flash', free: true },
      { id: PUTER_AI_MODELS.CLAUDE_3_5_SONNET, name: 'Claude 3.5 Sonnet', free: true },
      { id: PUTER_AI_MODELS.CLAUDE_3_HAIKU, name: 'Claude 3 Haiku', free: true },
      { id: PUTER_AI_MODELS.CLAUDE_3_OPUS, name: 'Claude 3 Opus', free: true },
      { id: PUTER_AI_MODELS.GPT_4O, name: 'GPT-4o', free: true },
      { id: PUTER_AI_MODELS.GPT_4O_MINI, name: 'GPT-4o Mini', free: true },
      { id: PUTER_AI_MODELS.GPT_4_TURBO, name: 'GPT-4 Turbo', free: true },
    ];
  }
  
  setModel(model: string): void {
    this.config.defaultModel = model;
  }
  
  private buildPrompt(userMessage: string, includeContext: boolean = true): string {
    if (!includeContext || !this.config.gameDevContext) {
      return userMessage;
    }
    
    const contextMessages = this.conversationHistory.slice(-6).map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');
    
    return `${GAME_DEV_SYSTEM_PROMPT}

${contextMessages ? `Previous conversation:\n${contextMessages}\n\n` : ''}User: ${userMessage}`;
  }
  
  async chat(message: string, options?: { 
    includeContext?: boolean;
    model?: string;
  }): Promise<AIResponse> {
    if (!this.isAvailable) {
      return { 
        success: false, 
        error: 'AI not available. Access via puter.com for free unlimited AI.' 
      };
    }
    
    const model = options?.model || this.config.defaultModel;
    const prompt = this.buildPrompt(message, options?.includeContext ?? true);
    
    try {
      const response = await aiChatUniversal(prompt, model);
      
      this.conversationHistory.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );
      
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      return { success: true, content: response, model };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'AI request failed',
        model 
      };
    }
  }
  
  async chatStream(
    message: string, 
    onChunk: (text: string) => void,
    options?: { model?: string }
  ): Promise<AIResponse> {
    if (!this.isAvailable) {
      return { success: false, error: 'AI not available' };
    }
    
    if (this.isStreaming) {
      return { success: false, error: 'Already streaming' };
    }
    
    this.isStreaming = true;
    const prompt = this.buildPrompt(message, true);
    const model = options?.model || this.config.defaultModel;
    let fullResponse = '';
    
    try {
      await puterChatStream(prompt, (chunk: string) => {
        fullResponse += chunk;
        onChunk(chunk);
      }, { model });
      
      if (!fullResponse.trim()) {
        return { success: false, error: 'No response received from AI' };
      }
      
      this.conversationHistory.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: fullResponse, timestamp: new Date() }
      );
      
      return { success: true, content: fullResponse, model };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Stream failed';
      console.error('[AI Stream Error]', error);
      return { success: false, error: errorMsg, model };
    } finally {
      this.isStreaming = false;
    }
  }
  
  async quickAction(action: QuickPromptKey): Promise<AIResponse> {
    const prompt = QUICK_PROMPTS[action];
    return this.chat(prompt, { includeContext: false });
  }
  
  async generateCode(description: string, language: string = 'typescript'): Promise<AIResponse> {
    const prompt = `Generate ${language} code for Babylon.js: ${description}
    
Return only the code without explanation, wrapped in a code block.`;
    return this.chat(prompt, { includeContext: false });
  }
  
  async suggestAsset(description: string): Promise<AIResponse> {
    const prompt = `Suggest 3D assets and their properties for: ${description}
    
Include: recommended model type, textures needed, materials, and any animations.
Keep response concise and practical.`;
    return this.chat(prompt, { includeContext: false });
  }
  
  async debugHelp(errorMessage: string, context?: string): Promise<AIResponse> {
    const prompt = `Debug this Babylon.js/game dev error:

Error: ${errorMessage}
${context ? `Context: ${context}` : ''}

Provide a brief explanation and solution.`;
    return this.chat(prompt, { includeContext: false });
  }
  
  async optimizeSuggestions(sceneInfo: {
    meshCount: number;
    drawCalls: number;
    vertexCount: number;
    fps: number;
  }): Promise<AIResponse> {
    const prompt = `Analyze this Babylon.js scene performance and suggest optimizations:

- Meshes: ${sceneInfo.meshCount}
- Draw Calls: ${sceneInfo.drawCalls}
- Vertices: ${sceneInfo.vertexCount.toLocaleString()}
- FPS: ${sceneInfo.fps}

Provide specific, actionable optimization suggestions.`;
    return this.chat(prompt, { includeContext: false });
  }
  
  async generateGameMechanic(mechanic: string): Promise<AIResponse> {
    const prompt = `Generate a complete implementation for this game mechanic in Babylon.js/TypeScript:

Mechanic: ${mechanic}

Include:
1. Core logic
2. Integration points with existing game objects
3. Example usage code`;
    return this.chat(prompt, { includeContext: false });
  }
  
  async generateTexture(description: string): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.isAvailable) {
      return { success: false, error: 'AI not available' };
    }
    
    try {
      const img = await generateImage(`Game texture: ${description}, seamless, tileable, high quality, 4k`);
      if (img) {
        return { success: true, url: img.src };
      }
      return { success: false, error: 'Image generation failed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  }
  
  async speak(text: string): Promise<{ success: boolean; audio?: HTMLAudioElement; error?: string }> {
    if (!this.isAvailable) {
      return { success: false, error: 'AI not available' };
    }
    
    try {
      const audio = await textToSpeech(text);
      if (audio) {
        return { success: true, audio };
      }
      return { success: false, error: 'TTS failed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  }
  
  clearHistory(): void {
    this.conversationHistory = [];
  }
  
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }
}

export const aiAssistant = new AIAssistantService();

export const AI_QUICK_ACTIONS = [
  { key: 'createCube' as const, label: 'Create Cube', icon: 'Box' },
  { key: 'createLight' as const, label: 'Add Lighting', icon: 'Sun' },
  { key: 'createParticles' as const, label: 'Particle Effect', icon: 'Sparkles' },
  { key: 'addPhysics' as const, label: 'Add Physics', icon: 'Atom' },
  { key: 'createMaterial' as const, label: 'PBR Material', icon: 'Palette' },
  { key: 'animateObject' as const, label: 'Animate', icon: 'Play' },
  { key: 'createTerrain' as const, label: 'Terrain', icon: 'Mountain' },
  { key: 'addSkybox' as const, label: 'Skybox', icon: 'Cloud' },
  { key: 'playerController' as const, label: 'Player Controller', icon: 'User' },
  { key: 'optimizeScene' as const, label: 'Optimize', icon: 'Zap' },
] as const;
