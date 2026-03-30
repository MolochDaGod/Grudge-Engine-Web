import { isPuterAvailable, aiChatUniversal, aiChatStream as puterChatStream, PUTER_AI_MODELS } from './puter';
import { getImportKnowledgeForAI } from './gltf-import-knowledge';

export type AIProvider = 'ollama' | 'puter' | 'openai' | 'anthropic' | 'deepseek' | 'grudge-hub';
export type AgentRole = 'dev' | 'balance' | 'lore' | 'art' | 'mission' | 'companion' | 'general';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  isLocal: boolean;
}

export interface AgentRoleConfig {
  id: AgentRole;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  preferredProvider?: AIProvider;
}

export interface LocalAIConfig {
  providers: Record<AIProvider, ProviderConfig>;
  activeProvider: AIProvider;
  activeRole: AgentRole;
  fallbackChain: AIProvider[];
  maxRetries: number;
  timeout: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: AIProvider;
  model?: string;
  agentRole?: AgentRole;
}

export interface AgentResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
}

const STORAGE_KEY = 'grudge-ai-config';

const GAME_CONTEXT = `You are an expert game development AI assistant integrated into Grudge Engine, a browser-based 3D game development studio using Babylon.js.

Key technical context:
- Engine: Babylon.js v8.x with WebGL2
- Language: TypeScript/JavaScript
- UI: React with shadcn/ui components
- State: Zustand for game state management
- Storage: Puter.js cloud storage + local storage

${getImportKnowledgeForAI()}`;

const AGENT_ROLES: Record<AgentRole, AgentRoleConfig> = {
  general: {
    id: 'general',
    name: 'General Assistant',
    description: 'All-purpose game development help',
    icon: 'MessageSquare',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a general-purpose game development assistant. Help with any task including coding, design, assets, and debugging. Keep responses concise and practical.`,
  },
  dev: {
    id: 'dev',
    name: 'Dev Agent',
    description: 'Code review, generation, and debugging',
    icon: 'Code',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a senior game developer specializing in Babylon.js, TypeScript, and game engine architecture. Focus on:\n- Code review for bugs, performance, and patterns\n- Generating game code (controllers, systems, shaders)\n- Debugging rendering and physics issues\n- Architecture recommendations\n\nAlways provide runnable code examples. Use modern TypeScript patterns.`,
    preferredProvider: 'puter',
  },
  balance: {
    id: 'balance',
    name: 'Balance Agent',
    description: 'Game balance, economy, and progression analysis',
    icon: 'Scale',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a game balance designer and analyst. Focus on:\n- Combat balance (damage, health, defense curves)\n- Economy design (currency flow, pricing, rewards)\n- Progression systems (XP curves, unlock gates, difficulty)\n- Gear/equipment stat distributions\n- Player engagement optimization\n\nProvide data-driven recommendations with formulas and spreadsheet-ready values.`,
  },
  lore: {
    id: 'lore',
    name: 'Lore Agent',
    description: 'World building, quests, NPC dialogue',
    icon: 'BookOpen',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a game narrative designer and lore writer specializing in dark fantasy worlds. Focus on:\n- Quest text and storylines\n- NPC dialogue trees with branching choices\n- Item descriptions and flavor text\n- Boss encounter narratives\n- Location descriptions and environmental storytelling\n- Faction lore and political intrigue\n\nWrite in an immersive, atmospheric style. Provide dialogue in a format ready for implementation.`,
  },
  art: {
    id: 'art',
    name: 'Art Agent',
    description: '3D art prompts, asset descriptions, visual direction',
    icon: 'Palette',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a 3D art director specializing in game-ready assets. Focus on:\n- Optimized prompts for AI 3D model generation (Meshy, Tripo, text2vox)\n- Texture descriptions for PBR materials\n- Character design specifications\n- Environment art direction\n- UI/UX visual design guidance\n- Asset optimization for real-time rendering\n\nAlways consider polygon budget, texture resolution, and LOD requirements.`,
  },
  mission: {
    id: 'mission',
    name: 'Mission Agent',
    description: 'Dynamic mission and quest generation',
    icon: 'Target',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are a mission designer generating dynamic game content. Focus on:\n- Procedural mission generation with varied objectives\n- Reward scaling based on difficulty\n- Mission chains and storyline arcs\n- Random events and encounters\n- Multiplayer cooperative objectives\n\nOutput missions in structured JSON format with: title, description, objectives, rewards, difficulty, prerequisites.`,
  },
  companion: {
    id: 'companion',
    name: 'Companion Agent',
    description: 'NPC companion AI behaviors and dialogue',
    icon: 'Users',
    systemPrompt: `${GAME_CONTEXT}\n\nYou are an AI companion behavior designer. Focus on:\n- Contextual companion dialogue for game situations\n- Personality profiles and behavioral patterns\n- Combat assistance AI logic\n- Relationship and loyalty systems\n- Environmental reactions and commentary\n\nGenerate dialogue that feels natural and character-appropriate. Include emotional tags and delivery notes.`,
  },
};

function getDefaultConfig(): LocalAIConfig {
  return {
    providers: {
      ollama: {
        id: 'ollama',
        name: 'Ollama (Local)',
        enabled: true,
        baseUrl: 'http://localhost:11434',
        models: [],
        defaultModel: 'llama3.2',
        isLocal: true,
      },
      puter: {
        id: 'puter',
        name: 'Puter.js (Free)',
        enabled: true,
        models: Object.values(PUTER_AI_MODELS),
        defaultModel: PUTER_AI_MODELS.GPT_4O,
        isLocal: false,
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        enabled: false,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4o',
        isLocal: false,
      },
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        enabled: false,
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        defaultModel: 'claude-sonnet-4-20250514',
        isLocal: false,
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        enabled: false,
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        models: ['deepseek-chat', 'deepseek-coder'],
        defaultModel: 'deepseek-chat',
        isLocal: false,
      },
      'grudge-hub': {
        id: 'grudge-hub',
        name: 'Grudge AI Hub',
        enabled: false,
        baseUrl: 'https://ai.grudge-studio.com',
        apiKey: '',
        models: ['llama-3.1-8b', 'llama-3.1-70b'],
        defaultModel: 'llama-3.1-8b',
        isLocal: false,
      },
    },
    activeProvider: 'puter',
    activeRole: 'general',
    fallbackChain: ['puter', 'ollama', 'openai', 'anthropic', 'deepseek'],
    maxRetries: 2,
    timeout: 30000,
  };
}

function loadConfig(): LocalAIConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultConfig();
      return {
        ...defaults,
        ...parsed,
        providers: {
          ...defaults.providers,
          ...parsed.providers,
        },
      };
    }
  } catch {}
  return getDefaultConfig();
}

function saveConfig(config: LocalAIConfig): void {
  try {
    const safeConfig = JSON.parse(JSON.stringify(config));
    Object.values(safeConfig.providers).forEach((p: any) => {
      if (p.apiKey) p.apiKey = p.apiKey;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
  } catch {}
}

async function chatViaBackendProxy(
  provider: string,
  messages: { role: string; content: string }[],
  config: ProviderConfig
): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model: config.defaultModel,
      messages,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `${provider} error: ${response.status}` }));
    throw new Error(err.error || `${provider} error: ${response.status}`);
  }
  const data = await response.json();
  return data.content || '';
}

async function chatWithOllama(
  messages: { role: string; content: string }[],
  config: ProviderConfig
): Promise<string> {
  return chatViaBackendProxy('ollama', messages, config);
}

async function chatWithOpenAI(
  messages: { role: string; content: string }[],
  config: ProviderConfig
): Promise<string> {
  return chatViaBackendProxy('openai', messages, config);
}

async function chatWithAnthropic(
  messages: { role: string; content: string }[],
  config: ProviderConfig
): Promise<string> {
  return chatViaBackendProxy('anthropic', messages, config);
}

async function chatWithDeepSeek(
  messages: { role: string; content: string }[],
  config: ProviderConfig
): Promise<string> {
  return chatViaBackendProxy('deepseek', messages, config);
}

async function chatWithGrudgeHub(
  messages: { role: string; content: string }[],
  config: ProviderConfig,
  role: AgentRole
): Promise<string> {
  const endpoint = role === 'general'
    ? `${config.baseUrl}/v1/chat`
    : `${config.baseUrl}/v1/agents/${role}/chat`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey!,
    },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(`Grudge Hub error: ${response.status}`);
  const data = await response.json();
  return data.response || data.content || data.message || '';
}

async function chatWithPuter(prompt: string, model?: string): Promise<string> {
  return aiChatUniversal(prompt, model || PUTER_AI_MODELS.GPT_4O);
}

class LocalAIAgentService {
  private config: LocalAIConfig;
  private conversations: Record<AgentRole, AgentMessage[]> = {
    general: [], dev: [], balance: [], lore: [], art: [], mission: [], companion: [],
  };
  private ollamaModels: string[] = [];
  private ollamaStatus: 'unknown' | 'connected' | 'disconnected' = 'unknown';

  constructor() {
    this.config = loadConfig();
    this.checkOllamaStatus();
  }

  get currentConfig(): LocalAIConfig {
    return this.config;
  }

  get roles(): AgentRoleConfig[] {
    return Object.values(AGENT_ROLES);
  }

  get activeRole(): AgentRoleConfig {
    return AGENT_ROLES[this.config.activeRole];
  }

  get activeProvider(): ProviderConfig {
    return this.config.providers[this.config.activeProvider];
  }

  get ollamaConnectionStatus(): string {
    return this.ollamaStatus;
  }

  get availableOllamaModels(): string[] {
    return this.ollamaModels;
  }

  getConversation(role: AgentRole): AgentMessage[] {
    return this.conversations[role] || [];
  }

  clearConversation(role: AgentRole): void {
    this.conversations[role] = [];
  }

  setActiveProvider(provider: AIProvider): void {
    this.config.activeProvider = provider;
    saveConfig(this.config);
  }

  setActiveRole(role: AgentRole): void {
    this.config.activeRole = role;
    saveConfig(this.config);
  }

  updateProvider(id: AIProvider, updates: Partial<ProviderConfig>): void {
    this.config.providers[id] = { ...this.config.providers[id], ...updates };
    saveConfig(this.config);
  }

  setFallbackChain(chain: AIProvider[]): void {
    this.config.fallbackChain = chain;
    saveConfig(this.config);
  }

  async checkOllamaStatus(): Promise<boolean> {
    const ollamaConfig = this.config.providers.ollama;
    try {
      const resp = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        this.ollamaModels = (data.models || []).map((m: any) => m.name);
        if (this.ollamaModels.length > 0) {
          this.config.providers.ollama.models = this.ollamaModels;
          if (!this.ollamaModels.includes(ollamaConfig.defaultModel)) {
            this.config.providers.ollama.defaultModel = this.ollamaModels[0];
          }
        }
        this.ollamaStatus = 'connected';
        return true;
      }
    } catch {}
    this.ollamaStatus = 'disconnected';
    return false;
  }

  async pullOllamaModel(modelName: string): Promise<boolean> {
    const ollamaConfig = this.config.providers.ollama;
    try {
      const resp = await fetch(`${ollamaConfig.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  private async chatWithProvider(
    provider: AIProvider,
    messages: { role: string; content: string }[],
    role: AgentRole
  ): Promise<string> {
    const providerConfig = this.config.providers[provider];
    if (!providerConfig.enabled) throw new Error(`Provider ${provider} is disabled`);

    switch (provider) {
      case 'ollama':
        return chatWithOllama(messages, providerConfig);
      case 'puter':
        if (!isPuterAvailable()) throw new Error('Puter.js not available');
        const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        return chatWithPuter(fullPrompt, providerConfig.defaultModel);
      case 'openai':
        if (!providerConfig.apiKey) throw new Error('OpenAI API key not set');
        return chatWithOpenAI(messages, providerConfig);
      case 'anthropic':
        if (!providerConfig.apiKey) throw new Error('Anthropic API key not set');
        return chatWithAnthropic(messages, providerConfig);
      case 'deepseek':
        if (!providerConfig.apiKey) throw new Error('DeepSeek API key not set');
        return chatWithDeepSeek(messages, providerConfig);
      case 'grudge-hub':
        if (!providerConfig.apiKey) throw new Error('Grudge Hub API key not set');
        return chatWithGrudgeHub(messages, providerConfig, role);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async chat(userMessage: string, options?: {
    role?: AgentRole;
    provider?: AIProvider;
    includeHistory?: boolean;
  }): Promise<AgentResponse> {
    const role = options?.role || this.config.activeRole;
    const roleConfig = AGENT_ROLES[role];
    const startTime = Date.now();

    const history = options?.includeHistory !== false
      ? this.conversations[role].slice(-10)
      : [];

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: roleConfig.systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const providersToTry = options?.provider
      ? [options.provider]
      : roleConfig.preferredProvider
        ? [roleConfig.preferredProvider, ...this.config.fallbackChain.filter(p => p !== roleConfig.preferredProvider)]
        : [this.config.activeProvider, ...this.config.fallbackChain.filter(p => p !== this.config.activeProvider)];

    const uniqueProviders = Array.from(new Set(providersToTry));
    let lastError = '';
    let fallbackUsed = false;

    for (let i = 0; i < uniqueProviders.length; i++) {
      const provider = uniqueProviders[i];
      const providerConfig = this.config.providers[provider as AIProvider];
      if (!providerConfig.enabled) continue;

      try {
        const content = await this.chatWithProvider(provider, messages, role);
        if (!content?.trim()) continue;

        this.conversations[role].push(
          { role: 'user', content: userMessage, timestamp: Date.now(), agentRole: role },
          { role: 'assistant', content, timestamp: Date.now(), provider, model: providerConfig.defaultModel, agentRole: role }
        );

        if (this.conversations[role].length > 50) {
          this.conversations[role] = this.conversations[role].slice(-50);
        }

        return {
          success: true,
          content,
          provider,
          model: providerConfig.defaultModel,
          fallbackUsed: i > 0,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        lastError = err.message || 'Unknown error';
        fallbackUsed = true;
        console.warn(`[AI Agent] Provider ${provider} failed:`, lastError);
      }
    }

    return {
      success: false,
      error: `All providers failed. Last error: ${lastError}`,
      provider: uniqueProviders[0],
      model: '',
      fallbackUsed,
      latencyMs: Date.now() - startTime,
    };
  }

  async streamChat(
    userMessage: string,
    onChunk: (chunk: string) => void,
    options?: { role?: AgentRole; provider?: AIProvider }
  ): Promise<AgentResponse> {
    const role = options?.role || this.config.activeRole;
    const provider = options?.provider || this.config.activeProvider;
    const startTime = Date.now();

    if (provider === 'puter' && isPuterAvailable()) {
      const roleConfig = AGENT_ROLES[role];
      const prompt = `${roleConfig.systemPrompt}\n\nUser: ${userMessage}`;
      let fullResponse = '';

      try {
        await puterChatStream(prompt, (chunk: string) => {
          fullResponse += chunk;
          onChunk(chunk);
        }, { model: this.config.providers.puter.defaultModel });

        if (fullResponse.trim()) {
          this.conversations[role].push(
            { role: 'user', content: userMessage, timestamp: Date.now(), agentRole: role },
            { role: 'assistant', content: fullResponse, timestamp: Date.now(), provider: 'puter', agentRole: role }
          );
        }

        return {
          success: true,
          content: fullResponse,
          provider: 'puter',
          model: this.config.providers.puter.defaultModel,
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          provider: 'puter',
          model: '',
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    const result = await this.chat(userMessage, { role, provider });
    if (result.success && result.content) {
      onChunk(result.content);
    }
    return result;
  }

  getProviderStatus(): Record<AIProvider, { enabled: boolean; ready: boolean; status: string }> {
    const status: Record<string, { enabled: boolean; ready: boolean; status: string }> = {};
    for (const [id, config] of Object.entries(this.config.providers)) {
      let ready = config.enabled;
      let statusText = config.enabled ? 'Ready' : 'Disabled';

      if (id === 'ollama') {
        ready = this.ollamaStatus === 'connected';
        statusText = this.ollamaStatus === 'connected'
          ? `Connected (${this.ollamaModels.length} models)`
          : this.ollamaStatus === 'disconnected' ? 'Not running' : 'Checking...';
      } else if (id === 'puter') {
        ready = isPuterAvailable();
        statusText = ready ? 'Available (Free)' : 'Not available';
      } else if (['openai', 'anthropic', 'deepseek', 'grudge-hub'].includes(id)) {
        ready = config.enabled && !!config.apiKey;
        statusText = !config.enabled ? 'Disabled' : !config.apiKey ? 'No API key' : 'Ready';
      }

      status[id] = { enabled: config.enabled, ready, status: statusText };
    }
    return status as any;
  }

  exportConfig(): string {
    const exportable = JSON.parse(JSON.stringify(this.config));
    Object.values(exportable.providers).forEach((p: any) => {
      if (p.apiKey) p.apiKey = '***';
    });
    return JSON.stringify(exportable, null, 2);
  }
}

export const localAIAgent = new LocalAIAgentService();
export { AGENT_ROLES };
