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

// Available AI models in Puter.js
export const PUTER_AI_MODELS = {
  // OpenAI models
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  
  // Google Gemini models (FREE)
  GEMINI_2_FLASH: 'gemini-2.0-flash',
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  
  // Anthropic Claude models (FREE)
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet',
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_HAIKU: 'claude-3-haiku',
  
  // Image generation
  DALLE_3: 'dall-e-3',
} as const;

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

export {};
