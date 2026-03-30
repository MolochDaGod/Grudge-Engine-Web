// Puter.js utilities using CDN version (window.puter)
// The CDN script is loaded in index.html: <script src="https://js.puter.com/v2/"></script>

export interface PuterUser {
  uuid: string;
  username: string;
  email?: string;
  email_confirmed?: boolean;
  is_temp?: boolean;
}

declare global {
  interface Window {
    puter?: {
      auth: {
        signIn: () => Promise<PuterUser | null>;
        signOut: () => Promise<void>;
        isSignedIn: () => boolean;
        getUser: () => PuterUser | null;
        authenticate: () => Promise<PuterUser | null>;
      };
      ai: {
        chat: (prompt: string, options?: { model?: string; stream?: boolean }) => Promise<any>;
        txt2img: (prompt: string, options?: { model?: string }) => Promise<HTMLImageElement>;
        txt2speech: (text: string, options?: { voice?: string }) => Promise<HTMLAudioElement>;
        img2txt: (imageUrl: string) => Promise<string>;
      };
      fs: {
        write: (path: string, content: string | Blob, options?: { createMissingParents?: boolean }) => Promise<void>;
        read: (path: string) => Promise<Blob>;
        mkdir: (path: string, options?: { createMissingParents?: boolean }) => Promise<void>;
        readdir: (path: string) => Promise<any[]>;
        delete: (path: string) => Promise<void>;
        stat: (path: string) => Promise<any>;
      };
      kv: {
        set: (key: string, value: string) => Promise<void>;
        get: (key: string) => Promise<string | null>;
        del: (key: string) => Promise<void>;
      };
      ui: {
        showOpenFilePicker: () => Promise<any>;
        showSaveFilePicker: (content: string | Blob, filename: string) => Promise<any>;
      };
      hosting?: {
        create: (subdomain: string, dirPath: string) => Promise<any>;
        list: () => Promise<any[]>;
        delete: (subdomain: string) => Promise<void>;
      };
      randName?: () => string;
    };
  }
}

// Check if Puter.js is available (loaded from CDN)
export const isPuterAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter;
};

// Get puter instance
const getPuter = () => {
  if (!isPuterAvailable()) {
    throw new Error('Puter.js is not available');
  }
  return window.puter!;
};

// AI Chat function
export const aiChat = async (prompt: string, model?: string): Promise<string> => {
  const puter = getPuter();
  const response = await puter.ai.chat(prompt, { model: model || 'gpt-4o' });
  if (typeof response === 'string') return response;
  if (response?.message?.content) return response.message.content;
  return String(response);
};

// Save file to Puter cloud storage
export const saveToCloud = async (path: string, content: string | Blob): Promise<{ success: boolean; path?: string; error?: string }> => {
  if (!isPuterAvailable()) {
    return { success: false, error: 'Puter.js is not available - save to local storage instead' };
  }
  try {
    await window.puter!.fs.write(path, content, { createMissingParents: true });
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Cloud save failed' };
  }
};

// Load file from Puter cloud storage
export const loadFromCloud = async (path: string): Promise<{ success: boolean; data?: Blob; error?: string }> => {
  if (!isPuterAvailable()) {
    return { success: false, error: 'Puter.js is not available - load from local storage instead' };
  }
  try {
    const data = await window.puter!.fs.read(path);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Cloud load failed' };
  }
};

// Read file from Puter cloud storage
export const readFromCloud = async (path: string): Promise<Blob> => {
  const puter = getPuter();
  return await puter.fs.read(path);
};

// Key-Value storage - set value
export const setKV = async (key: string, value: string): Promise<void> => {
  const puter = getPuter();
  await puter.kv.set(key, value);
};

// Key-Value storage - get value
export const getKV = async (key: string): Promise<string | null> => {
  const puter = getPuter();
  return await puter.kv.get(key);
};

// AI Image Generation with Puter.js (DALL-E)
export const generateImage = async (prompt: string, options?: { model?: string }): Promise<HTMLImageElement | null> => {
  if (!isPuterAvailable()) return null;
  try {
    return await window.puter!.ai.txt2img(prompt, { model: options?.model || 'dall-e-3' });
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
};

// AI Text-to-Speech with Puter.js (OpenAI TTS)
export const textToSpeech = async (text: string, options?: { voice?: string }): Promise<HTMLAudioElement | null> => {
  if (!isPuterAvailable()) return null;
  try {
    return await window.puter!.ai.txt2speech(text, { voice: options?.voice || 'alloy' });
  } catch (error) {
    console.error('Text-to-speech failed:', error);
    return null;
  }
};

// AI Chat with GPT-4o using Puter.js
export const aiChatGPT = async (prompt: string, options?: { model?: string }): Promise<string> => {
  const puter = getPuter();
  const response = await puter.ai.chat(prompt, { model: options?.model || 'gpt-4o' });
  if (typeof response === 'string') return response;
  if (response?.message?.content) return response.message.content;
  return String(response);
};

// AI Chat with Gemini using Puter.js (FREE via Puter)
export const aiChatGemini = async (prompt: string, options?: { model?: string }): Promise<string> => {
  const puter = getPuter();
  const model = options?.model || 'gemini-2.0-flash';
  const response = await puter.ai.chat(prompt, { model });
  if (typeof response === 'string') return response;
  if (response?.message?.content) return response.message.content;
  return String(response);
};

// Streaming AI Chat with Gemini for real-time responses
export const aiChatGeminiStream = async (
  prompt: string, 
  onChunk: (text: string) => void,
  options?: { model?: string }
): Promise<void> => {
  const puter = getPuter();
  const response = await puter.ai.chat(prompt, {
    model: options?.model || 'gemini-2.0-flash',
    stream: true
  });
  
  if (response && typeof response[Symbol.asyncIterator] === 'function') {
    for await (const chunk of response) {
      if (chunk?.text) {
        onChunk(chunk.text);
      }
    }
  } else if (typeof response === 'string') {
    onChunk(response);
  }
};

// AI Chat with Claude using Puter.js (FREE via Puter)
export const aiChatClaude = async (prompt: string, options?: { model?: string }): Promise<string> => {
  const puter = getPuter();
  const model = options?.model || 'claude-3-5-sonnet';
  const response = await puter.ai.chat(prompt, { model });
  if (typeof response === 'string') return response;
  if (response?.message?.content) return response.message.content;
  return String(response);
};

// Available AI models in Puter.js (expanded list)
export const PUTER_AI_MODELS = {
  // OpenAI models
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_5_NANO: 'gpt-5-nano',
  O1: 'o1',
  O3_MINI: 'o3-mini',
  
  // Google Gemini models (FREE)
  GEMINI_2_FLASH: 'gemini-2.0-flash',
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  
  // Anthropic Claude models (FREE)
  CLAUDE_3_7_SONNET: 'claude-3-7-sonnet',
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet',
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_HAIKU: 'claude-3-haiku',
  
  // Other providers (FREE via Puter)
  DEEPSEEK_CHAT: 'deepseek-chat',
  GROK_2: 'grok-2',
  
  // Image generation
  DALLE_3: 'dall-e-3',
  FLUX: 'flux',
  GPT_IMAGE: 'gpt-image',
} as const;

// Model info for UI display
export const PUTER_MODEL_INFO = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable GPT model' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', description: 'Fast, lightweight GPT-5' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', description: 'Latest Claude reasoning' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced Claude model' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Ultra-fast multimodal' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', description: 'Advanced reasoning' },
  { id: 'grok-2', name: 'Grok 2', provider: 'xAI', description: 'Real-time knowledge' },
  { id: 'o1', name: 'OpenAI o1', provider: 'OpenAI', description: 'Complex reasoning' },
  { id: 'o3-mini', name: 'OpenAI o3 Mini', provider: 'OpenAI', description: 'Efficient reasoning' },
] as const;

// Universal AI chat with model selection
export const aiChatUniversal = async (
  prompt: string, 
  model: string = PUTER_AI_MODELS.GEMINI_2_FLASH
): Promise<string> => {
  const puter = getPuter();
  const response = await puter.ai.chat(prompt, { model });
  if (typeof response === 'string') return response;
  if (response?.message?.content) return response.message.content;
  return String(response);
};

// Streaming AI Chat for real-time responses
export const aiChatStream = async (
  prompt: string, 
  onChunk: (text: string) => void,
  options?: { model?: string }
): Promise<void> => {
  const puter = getPuter();
  const response = await puter.ai.chat(prompt, {
    model: options?.model || 'gpt-4o',
    stream: true
  });
  
  if (response && typeof response[Symbol.asyncIterator] === 'function') {
    for await (const chunk of response) {
      if (chunk?.text) {
        onChunk(chunk.text);
      }
    }
  } else if (typeof response === 'string') {
    onChunk(response);
  }
};

// Image to Text (OCR/Vision) with Puter.js
export const imageToText = async (imageUrl: string): Promise<string | null> => {
  if (!isPuterAvailable()) return null;
  try {
    return await window.puter!.ai.img2txt(imageUrl);
  } catch (error) {
    console.error('Image to text failed:', error);
    return null;
  }
};

// List files in a directory
export const listCloudFiles = async (path: string): Promise<Array<{ name: string; isDirectory: boolean }>> => {
  const puter = getPuter();
  const items = await puter.fs.readdir(path);
  return items.map((item: any) => ({
    name: item.name,
    isDirectory: item.is_dir ?? item.isDirectory ?? false
  }));
};

// Create a directory
export const createCloudDir = async (path: string): Promise<void> => {
  const puter = getPuter();
  await puter.fs.mkdir(path, { createMissingParents: true });
};

// Delete a file or directory
export const deleteCloudItem = async (path: string): Promise<void> => {
  const puter = getPuter();
  await puter.fs.delete(path);
};

// Get file/directory info
export const getCloudStat = async (path: string): Promise<{ name: string; size: number; isDirectory: boolean }> => {
  const puter = getPuter();
  const stat = await puter.fs.stat(path);
  return {
    name: stat.name,
    size: stat.size,
    isDirectory: stat.is_dir ?? stat.isDirectory ?? false
  };
};

// Show file picker dialog
export const showOpenFilePicker = async (): Promise<{ data: Blob; path: string; name: string } | null> => {
  if (!isPuterAvailable()) return null;
  try {
    const result = await window.puter!.ui.showOpenFilePicker();
    const file = Array.isArray(result) ? result[0] : result;
    if (!file) return null;
    
    const data = typeof file.content === 'function' 
      ? await file.content() 
      : (typeof file.read === 'function' ? await file.read() : null);
    
    if (!data) return null;
    return { data, path: file.path || '', name: file.name || '' };
  } catch (error) {
    console.error('File picker failed:', error);
    return null;
  }
};

// Show save file picker dialog
export const showSaveFilePicker = async (content: string | Blob, filename: string): Promise<{ path: string } | null> => {
  if (!isPuterAvailable()) return null;
  try {
    const result = await window.puter!.ui.showSaveFilePicker(content, filename);
    return { path: result?.path || result?.name || filename };
  } catch (error) {
    console.error('Save file picker failed:', error);
    return null;
  }
};

// Best Practices: Initialize Puter with error handling
export const initializePuter = async (): Promise<boolean> => {
  try {
    if (!isPuterAvailable()) {
      console.warn('Puter.js not available in this environment');
      return false;
    }
    
    const testKey = '__puter_test__';
    await window.puter!.kv.set(testKey, 'test');
    await window.puter!.kv.del(testKey);
    
    console.log('Puter.js initialized successfully');
    return true;
  } catch (error) {
    console.error('Puter.js initialization failed:', error);
    return false;
  }
};

// ============================================
// PUTER AUTHENTICATION
// ============================================

// Sign in with Puter - opens Puter login popup
export const puterSignIn = async (): Promise<PuterUser | null> => {
  if (!isPuterAvailable()) {
    console.warn('Puter.js not available for authentication');
    return null;
  }
  
  try {
    const user = await window.puter!.auth.signIn();
    if (user) {
      console.log('[Puter Auth] Signed in as:', user.username);
    }
    return user;
  } catch (error) {
    console.error('[Puter Auth] Sign in failed:', error);
    return null;
  }
};

// Sign out from Puter
export const puterSignOut = async (): Promise<boolean> => {
  if (!isPuterAvailable()) {
    return false;
  }
  
  try {
    await window.puter!.auth.signOut();
    console.log('[Puter Auth] Signed out');
    return true;
  } catch (error) {
    console.error('[Puter Auth] Sign out failed:', error);
    return false;
  }
};

// Check if user is signed in with Puter
export const isPuterSignedIn = (): boolean => {
  if (!isPuterAvailable()) {
    return false;
  }
  
  try {
    return window.puter!.auth.isSignedIn();
  } catch {
    return false;
  }
};

// Get current Puter user
export const getPuterUser = (): PuterUser | null => {
  if (!isPuterAvailable()) {
    return null;
  }
  
  try {
    return window.puter!.auth.getUser();
  } catch {
    return null;
  }
};

// Authenticate with Puter (returns existing user or prompts sign in)
export const puterAuthenticate = async (): Promise<PuterUser | null> => {
  if (!isPuterAvailable()) {
    return null;
  }
  
  try {
    // Check if already signed in
    if (window.puter!.auth.isSignedIn()) {
      return window.puter!.auth.getUser();
    }
    // Otherwise prompt for sign in
    return await window.puter!.auth.signIn();
  } catch (error) {
    console.error('[Puter Auth] Authentication failed:', error);
    return null;
  }
};

// ============================================
// WEBSITE HOSTING (Deploy to Puter subdomain)
// ============================================

export interface HostedSite {
  subdomain: string;
  url: string;
  directory: string;
}

// Deploy a website to Puter hosting
export const deployWebsite = async (subdomain: string, dirPath: string): Promise<HostedSite | null> => {
  if (!isPuterAvailable()) return null;
  try {
    // @ts-ignore - hosting API may not be typed
    const result = await window.puter!.hosting?.create(subdomain, dirPath);
    return result as HostedSite;
  } catch (error) {
    console.error('[Puter Hosting] Deploy failed:', error);
    return null;
  }
};

// List all hosted websites
export const listWebsites = async (): Promise<HostedSite[]> => {
  if (!isPuterAvailable()) return [];
  try {
    // @ts-ignore - hosting API may not be typed
    const result = await window.puter!.hosting?.list();
    return (result as HostedSite[]) || [];
  } catch (error) {
    console.error('[Puter Hosting] List failed:', error);
    return [];
  }
};

// Delete a hosted website
export const deleteWebsite = async (subdomain: string): Promise<boolean> => {
  if (!isPuterAvailable()) return false;
  try {
    // @ts-ignore - hosting API may not be typed
    await window.puter!.hosting?.delete(subdomain);
    return true;
  } catch (error) {
    console.error('[Puter Hosting] Delete failed:', error);
    return false;
  }
};

// ============================================
// SPECIALIZED AI SERVICES
// ============================================

// Analyze code for issues and optimizations
export const analyzeCode = async (code: string, language: string): Promise<{
  suggestions: string[];
  issues: string[];
  optimizations: string[];
}> => {
  const prompt = `Analyze this ${language} code. Provide:
1. Suggestions for improvement
2. Potential issues or bugs
3. Performance optimizations

Code:
\`\`\`${language}
${code}
\`\`\`

Respond in JSON format: { "suggestions": [...], "issues": [...], "optimizations": [...] }`;

  try {
    const response = await aiChat(prompt, PUTER_AI_MODELS.GPT_4O);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { suggestions: [response], issues: [], optimizations: [] };
  } catch (error) {
    console.error('Code analysis failed:', error);
    return { suggestions: [], issues: ['Analysis failed'], optimizations: [] };
  }
};

// Generate code from description
export const generateCode = async (description: string, language: string): Promise<string> => {
  const prompt = `Generate ${language} code for: ${description}

Only respond with the code, no explanations.`;

  try {
    const response = await aiChat(prompt, PUTER_AI_MODELS.GPT_4O);
    // Extract code block if present
    const codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : response.trim();
  } catch (error) {
    console.error('Code generation failed:', error);
    return `// Code generation failed: ${error}`;
  }
};

// Security vulnerability analysis
export const analyzeSecurityVulnerabilities = async (code: string, language: string): Promise<{
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  securityScore: number;
}> => {
  const prompt = `Analyze this ${language} code for security vulnerabilities:

\`\`\`${language}
${code}
\`\`\`

Respond in JSON format:
{
  "vulnerabilities": [
    { "type": "...", "severity": "low|medium|high|critical", "description": "...", "recommendation": "..." }
  ],
  "securityScore": 0-100
}`;

  try {
    const response = await aiChat(prompt, PUTER_AI_MODELS.GPT_4O);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { vulnerabilities: [], securityScore: 100 };
  } catch (error) {
    console.error('Security analysis failed:', error);
    return { vulnerabilities: [], securityScore: 0 };
  }
};

// Quick code optimization
export const quickOptimize = async (code: string, language: string, target: 'performance' | 'memory' | 'readability'): Promise<{
  optimizedCode: string;
  improvements: string[];
  impact: string;
}> => {
  const prompt = `Optimize this ${language} code for ${target}:

\`\`\`${language}
${code}
\`\`\`

Respond in JSON format:
{
  "optimizedCode": "...",
  "improvements": ["..."],
  "impact": "..."
}`;

  try {
    const response = await aiChat(prompt, PUTER_AI_MODELS.GPT_4O);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { optimizedCode: code, improvements: [], impact: 'Unknown' };
  } catch (error) {
    console.error('Optimization failed:', error);
    return { optimizedCode: code, improvements: [], impact: 'Failed' };
  }
};

// Generate random name (useful for assets, projects)
export const generateRandomName = (): string => {
  if (isPuterAvailable() && window.puter!.randName) {
    return window.puter!.randName();
  }
  return `grudge-${Date.now()}-${Math.random().toString(36).substring(7)}`;
};

export {};
