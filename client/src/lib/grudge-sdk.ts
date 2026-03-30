export interface GrudgeSDKConfig {
  authUrl: string;
  apiUrl: string;
  accountUrl: string;
  walletUrl: string;
  aiUrl: string;
  assetsUrl: string;
  objectStoreUrl: string;
  wsUrl: string;
  gbuxTokenAddress: string;
  enabled: boolean;
}

export interface GrudgeIdentity {
  grudgeId: string;
  puterId: string;
  username: string;
  walletAddress?: string;
  serverWalletAddress?: string;
  discordId?: string;
  token: string;
  expiresAt: number;
}

export interface GrudgeWallet {
  address: string;
  balance?: number;
  gbuxBalance?: number;
  network: 'mainnet' | 'devnet';
}

export interface SDKStatus {
  identity: { connected: boolean; username?: string; grudgeId?: string };
  wallet: { connected: boolean; address?: string; balance?: number };
  storage: { connected: boolean; bucketName?: string };
  ai: { connected: boolean; provider?: string };
  devices: { count: number; paired: string[] };
}

const SDK_CONFIG_KEY = 'grudge-sdk-config';
const SDK_IDENTITY_KEY = 'grudge_auth_token';
const SDK_GRUDGE_ID_KEY = 'grudge_id';
const SDK_USERNAME_KEY = 'grudge_username';
const SDK_WALLET_KEY = 'grudge_wallet_address';

function getDefaultConfig(): GrudgeSDKConfig {
  return {
    authUrl: import.meta.env.VITE_AUTH_URL || 'https://id.grudge-studio.com',
    apiUrl: import.meta.env.VITE_API_URL || 'https://api.grudge-studio.com',
    accountUrl: import.meta.env.VITE_ACCOUNT_URL || 'https://account.grudge-studio.com',
    walletUrl: import.meta.env.VITE_WALLET_URL || 'https://wallet.grudge-studio.com',
    aiUrl: import.meta.env.VITE_AI_URL || 'https://ai.grudge-studio.com',
    assetsUrl: import.meta.env.VITE_ASSETS_URL || 'https://assets.grudge-studio.com',
    objectStoreUrl: import.meta.env.VITE_OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com',
    wsUrl: import.meta.env.VITE_WS_URL || 'wss://ws.grudge-studio.com',
    gbuxTokenAddress: import.meta.env.VITE_GBUX_TOKEN_ADDRESS || '55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray',
    enabled: false,
  };
}

function loadConfig(): GrudgeSDKConfig {
  try {
    const stored = localStorage.getItem(SDK_CONFIG_KEY);
    if (stored) return { ...getDefaultConfig(), ...JSON.parse(stored) };
  } catch {}
  return getDefaultConfig();
}

function saveConfig(config: GrudgeSDKConfig): void {
  try {
    localStorage.setItem(SDK_CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

class GrudgeSDKService {
  private config: GrudgeSDKConfig;
  private identity: GrudgeIdentity | null = null;
  private wallet: GrudgeWallet | null = null;

  constructor() {
    this.config = loadConfig();
    this.restoreSession();
  }

  get currentConfig(): GrudgeSDKConfig {
    return this.config;
  }

  get isEnabled(): boolean {
    return this.config.enabled;
  }

  get currentIdentity(): GrudgeIdentity | null {
    return this.identity;
  }

  get currentWallet(): GrudgeWallet | null {
    return this.wallet;
  }

  updateConfig(updates: Partial<GrudgeSDKConfig>): void {
    this.config = { ...this.config, ...updates };
    saveConfig(this.config);
  }

  private restoreSession(): void {
    const token = localStorage.getItem(SDK_IDENTITY_KEY);
    const grudgeId = localStorage.getItem(SDK_GRUDGE_ID_KEY);
    const username = localStorage.getItem(SDK_USERNAME_KEY);
    const walletAddr = localStorage.getItem(SDK_WALLET_KEY);

    if (token && grudgeId) {
      this.identity = {
        grudgeId,
        puterId: `GRUDGE-${grudgeId.substring(0, 8).toUpperCase()}`,
        username: username || 'Unknown',
        walletAddress: walletAddr || undefined,
        token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
    }

    if (walletAddr) {
      this.wallet = {
        address: walletAddr,
        network: 'mainnet',
      };
    }
  }

  private async grudgeFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem(SDK_IDENTITY_KEY);
    return fetch(`${this.config.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }

  async connectWithPuter(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) return { success: false, error: 'SDK not enabled' };
    if (!window.puter) return { success: false, error: 'Puter.js not available' };

    try {
      const result = await window.puter.auth.signIn();
      if (!result) return { success: false, error: 'Sign in cancelled' };

      const resp = await fetch(`${this.config.authUrl}/auth/puter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puterUuid: result.uuid,
          puterUsername: result.username,
        }),
      });

      if (!resp.ok) return { success: false, error: `Auth failed: ${resp.status}` };
      const data = await resp.json();

      localStorage.setItem(SDK_IDENTITY_KEY, data.token);
      localStorage.setItem(SDK_GRUDGE_ID_KEY, data.grudgeId);
      localStorage.setItem(SDK_USERNAME_KEY, result.username);

      this.identity = {
        grudgeId: data.grudgeId,
        puterId: `GRUDGE-${data.grudgeId.substring(0, 8).toUpperCase()}`,
        username: result.username,
        token: data.token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async connectWithCredentials(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) return { success: false, error: 'SDK not enabled' };

    try {
      const resp = await fetch(`${this.config.authUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) return { success: false, error: `Auth failed: ${resp.status}` };
      const data = await resp.json();

      localStorage.setItem(SDK_IDENTITY_KEY, data.token);
      localStorage.setItem(SDK_GRUDGE_ID_KEY, data.grudgeId);
      localStorage.setItem(SDK_USERNAME_KEY, username);

      this.identity = {
        grudgeId: data.grudgeId,
        puterId: `GRUDGE-${data.grudgeId.substring(0, 8).toUpperCase()}`,
        username,
        token: data.token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async connectAsGuest(deviceId?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) return { success: false, error: 'SDK not enabled' };

    try {
      const resp = await fetch(`${this.config.authUrl}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId || `device-${Date.now()}` }),
      });

      if (!resp.ok) return { success: false, error: `Guest auth failed: ${resp.status}` };
      const data = await resp.json();

      this.identity = {
        grudgeId: data.grudgeId,
        puterId: `GRUDGE-${data.grudgeId.substring(0, 8).toUpperCase()}`,
        username: 'Guest',
        token: data.token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      localStorage.setItem(SDK_IDENTITY_KEY, data.token);
      localStorage.setItem(SDK_GRUDGE_ID_KEY, data.grudgeId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Guest auth failed' };
    }
  }

  disconnect(): void {
    this.identity = null;
    this.wallet = null;
    localStorage.removeItem(SDK_IDENTITY_KEY);
    localStorage.removeItem(SDK_GRUDGE_ID_KEY);
    localStorage.removeItem(SDK_USERNAME_KEY);
    localStorage.removeItem(SDK_WALLET_KEY);
  }

  async checkHealth(): Promise<Record<string, boolean>> {
    const services = {
      auth: this.config.authUrl,
      api: this.config.apiUrl,
      account: this.config.accountUrl,
    };

    const results: Record<string, boolean> = {};

    await Promise.all(
      Object.entries(services).map(async ([name, url]) => {
        try {
          const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
          results[name] = resp.ok;
        } catch {
          results[name] = false;
        }
      })
    );

    return results;
  }

  async fetchCharacters(): Promise<any[]> {
    if (!this.identity) return [];
    try {
      const resp = await this.grudgeFetch('/api/characters');
      if (!resp.ok) return [];
      return resp.json();
    } catch { return []; }
  }

  async fetchWalletBalance(): Promise<{ sol: number; gbux: number } | null> {
    if (!this.wallet) return null;
    try {
      const resp = await this.grudgeFetch(`/api/economy/balance`);
      if (!resp.ok) return null;
      const data = await resp.json();
      this.wallet.balance = data.sol;
      this.wallet.gbuxBalance = data.gbux;
      return data;
    } catch { return null; }
  }

  async uploadToObjectStore(file: File, category: string = 'assets'): Promise<{ success: boolean; url?: string; id?: string; error?: string }> {
    if (!this.config.enabled) return { success: false, error: 'SDK not enabled' };
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const token = localStorage.getItem(SDK_IDENTITY_KEY);
      const resp = await fetch(`${this.config.objectStoreUrl}/v1/assets`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!resp.ok) return { success: false, error: `Upload failed: ${resp.status}` };
      const data = await resp.json();
      return { success: true, url: data.url, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async searchAssets(query: string): Promise<any[]> {
    try {
      const resp = await fetch(`${this.config.objectStoreUrl}/v1/assets?search=${encodeURIComponent(query)}`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.assets || data || [];
    } catch { return []; }
  }

  getStatus(): SDKStatus {
    return {
      identity: {
        connected: !!this.identity,
        username: this.identity?.username,
        grudgeId: this.identity?.grudgeId,
      },
      wallet: {
        connected: !!this.wallet,
        address: this.wallet?.address,
        balance: this.wallet?.balance,
      },
      storage: {
        connected: this.config.enabled,
        bucketName: 'grudge-assets',
      },
      ai: {
        connected: this.config.enabled,
        provider: 'Grudge AI Hub',
      },
      devices: {
        count: 0,
        paired: [],
      },
    };
  }
}

export const grudgeSDK = new GrudgeSDKService();
