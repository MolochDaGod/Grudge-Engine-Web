import { useState, useEffect } from 'react';
import { Shield, Wifi, WifiOff, Database, Wallet, Key, Server, RefreshCw, Check, X, Globe, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { grudgeSDK, type GrudgeSDKConfig, type SDKStatus } from '@/lib/grudge-sdk';
import { localAIAgent, type AIProvider } from '@/lib/local-ai-agent';

type Tab = 'providers' | 'sdk' | 'status';

export function SDKPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('providers');
  const [sdkConfig, setSdkConfig] = useState<GrudgeSDKConfig>(grudgeSDK.currentConfig);
  const [sdkStatus, setSdkStatus] = useState<SDKStatus>(grudgeSDK.getStatus());
  const [providerStatus, setProviderStatus] = useState(localAIAgent.getProviderStatus());
  const [ollamaUrl, setOllamaUrl] = useState(localAIAgent.currentConfig.providers.ollama.baseUrl || 'http://localhost:11434');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: localAIAgent.currentConfig.providers.openai.apiKey || '',
    anthropic: localAIAgent.currentConfig.providers.anthropic.apiKey || '',
    deepseek: localAIAgent.currentConfig.providers.deepseek.apiKey || '',
    'grudge-hub': localAIAgent.currentConfig.providers['grudge-hub'].apiKey || '',
  });
  const [checking, setChecking] = useState(false);
  const [healthResults, setHealthResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setProviderStatus(localAIAgent.getProviderStatus());
      setSdkStatus(grudgeSDK.getStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOllamaCheck = async () => {
    setChecking(true);
    localAIAgent.updateProvider('ollama', { baseUrl: ollamaUrl });
    await localAIAgent.checkOllamaStatus();
    setProviderStatus(localAIAgent.getProviderStatus());
    setChecking(false);
  };

  const handleSaveApiKey = (provider: AIProvider, key: string) => {
    localAIAgent.updateProvider(provider, { apiKey: key, enabled: !!key });
    setProviderStatus(localAIAgent.getProviderStatus());
  };

  const handleToggleProvider = (provider: AIProvider, enabled: boolean) => {
    localAIAgent.updateProvider(provider, { enabled });
    setProviderStatus(localAIAgent.getProviderStatus());
  };

  const handleSDKToggle = (enabled: boolean) => {
    grudgeSDK.updateConfig({ enabled });
    setSdkConfig({ ...sdkConfig, enabled });
  };

  const handleSDKHealthCheck = async () => {
    setChecking(true);
    const results = await grudgeSDK.checkHealth();
    setHealthResults(results);
    setChecking(false);
  };

  const handleUpdateSDKUrl = (field: keyof GrudgeSDKConfig, value: string) => {
    grudgeSDK.updateConfig({ [field]: value });
    setSdkConfig({ ...sdkConfig, [field]: value });
  };

  return (
    <div className="h-full flex">
      <div className="w-36 border-r border-sidebar-border p-2 flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Configuration</span>
        {([
          { id: 'providers' as Tab, label: 'AI Providers', icon: Server },
          { id: 'sdk' as Tab, label: 'Grudge SDK', icon: Globe },
          { id: 'status' as Tab, label: 'Status', icon: Wifi },
        ]).map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`text-xs p-1.5 rounded cursor-pointer flex items-center gap-2 mb-0.5 ${activeTab === id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'}`}
            onClick={() => setActiveTab(id)}
            data-testid={`tab-sdk-${id}`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </div>
        ))}
      </div>

      <ScrollArea className="flex-1 p-3">
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="text-sm font-medium">AI Provider Configuration</div>
            <div className="text-xs text-muted-foreground">Configure local and cloud AI providers. Providers are tried in order of the fallback chain.</div>

            <div className="space-y-3">
              <div className="bg-sidebar-accent rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${providerStatus.ollama.ready ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-semibold">Ollama (Local LLM)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localAIAgent.currentConfig.providers.ollama.enabled}
                    onChange={(e) => handleToggleProvider('ollama', e.target.checked)}
                    className="w-3.5 h-3.5"
                    data-testid="toggle-ollama"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{providerStatus.ollama.status}</div>
                <div className="flex gap-2">
                  <Input
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="h-6 text-xs flex-1"
                    placeholder="http://localhost:11434"
                    data-testid="input-ollama-url"
                  />
                  <Button size="sm" className="h-6 text-xs px-2" onClick={handleOllamaCheck} disabled={checking} data-testid="button-ollama-check">
                    <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {localAIAgent.availableOllamaModels.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Models: {localAIAgent.availableOllamaModels.join(', ')}
                  </div>
                )}
              </div>

              <div className="bg-sidebar-accent rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${providerStatus.puter.ready ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-xs font-semibold">Puter.js (Free Unlimited)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localAIAgent.currentConfig.providers.puter.enabled}
                    onChange={(e) => handleToggleProvider('puter', e.target.checked)}
                    className="w-3.5 h-3.5"
                    data-testid="toggle-puter"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{providerStatus.puter.status}</div>
                <div className="text-xs text-green-500">GPT-4o, Claude, Gemini - No API key needed</div>
              </div>

              {(['openai', 'anthropic', 'deepseek', 'grudge-hub'] as AIProvider[]).map(provider => {
                const config = localAIAgent.currentConfig.providers[provider];
                const status = providerStatus[provider];
                return (
                  <div key={provider} className="bg-sidebar-accent rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.ready ? 'bg-green-500' : status.enabled ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                        <span className="text-xs font-semibold">{config.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleToggleProvider(provider, e.target.checked)}
                        className="w-3.5 h-3.5"
                        data-testid={`toggle-${provider}`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{status.status}</div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={apiKeys[provider] || ''}
                        onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                        className="h-6 text-xs flex-1"
                        placeholder="API Key"
                        data-testid={`input-${provider}-key`}
                      />
                      <Button
                        size="sm" className="h-6 text-xs px-2"
                        onClick={() => handleSaveApiKey(provider, apiKeys[provider])}
                        data-testid={`button-save-${provider}-key`}
                      >
                        <Key className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-sidebar-accent/50 rounded p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fallback Chain</div>
              <div className="text-xs text-muted-foreground">
                When the active provider fails, the system tries each provider in this order:
              </div>
              <div className="flex flex-wrap gap-1">
                {localAIAgent.currentConfig.fallbackChain.map((p, i) => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded bg-sidebar-accent">
                    {i + 1}. {localAIAgent.currentConfig.providers[p].name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sdk' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Grudge Studio SDK</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{sdkConfig.enabled ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  checked={sdkConfig.enabled}
                  onChange={(e) => handleSDKToggle(e.target.checked)}
                  className="w-3.5 h-3.5"
                  data-testid="toggle-sdk"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Connect to Grudge Studio services for identity, wallets, and cloud storage.</div>

            {sdkConfig.enabled && (
              <div className="space-y-3">
                {([
                  { field: 'authUrl' as const, label: 'Auth Service', icon: Shield },
                  { field: 'apiUrl' as const, label: 'Game API', icon: Server },
                  { field: 'walletUrl' as const, label: 'Wallet Service', icon: Wallet },
                  { field: 'assetsUrl' as const, label: 'Assets CDN', icon: Database },
                  { field: 'objectStoreUrl' as const, label: 'Object Store', icon: Database },
                  { field: 'aiUrl' as const, label: 'AI Hub', icon: Server },
                ]).map(({ field, label, icon: Icon }) => (
                  <div key={field} className="flex items-center gap-2">
                    <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs w-24 shrink-0">{label}</span>
                    <Input
                      value={(sdkConfig as any)[field]}
                      onChange={(e) => handleUpdateSDKUrl(field, e.target.value)}
                      className="h-6 text-xs flex-1"
                      data-testid={`input-sdk-${field}`}
                    />
                    {healthResults[field.replace('Url', '')] !== undefined && (
                      healthResults[field.replace('Url', '')] ?
                        <Check className="w-3 h-3 text-green-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                ))}

                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSDKHealthCheck} disabled={checking} data-testid="button-sdk-health">
                  <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                  Check Services
                </Button>

                <div className="bg-sidebar-accent/50 rounded p-2 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Identity</div>
                  {sdkStatus.identity.connected ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-mono">{sdkStatus.identity.username}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Grudge ID</span>
                        <span className="font-mono text-xs truncate max-w-[150px]">{sdkStatus.identity.grudgeId}</span>
                      </div>
                      <Button size="sm" variant="destructive" className="h-6 text-xs w-full mt-1" onClick={() => { grudgeSDK.disconnect(); setSdkStatus(grudgeSDK.getStatus()); }} data-testid="button-sdk-disconnect">
                        <Unplug className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Not connected. Use Grudge ID login to connect.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="text-sm font-medium">System Status</div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Providers</div>
              {Object.entries(providerStatus).map(([id, status]) => (
                <div key={id} className="flex items-center justify-between bg-sidebar-accent rounded p-2">
                  <div className="flex items-center gap-2">
                    {status.ready ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                    <span className="text-xs font-medium">{localAIAgent.currentConfig.providers[id as AIProvider].name}</span>
                  </div>
                  <span className={`text-xs ${status.ready ? 'text-green-500' : 'text-muted-foreground'}`}>{status.status}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SDK Services</div>
              {Object.entries(healthResults).length > 0 ? (
                Object.entries(healthResults).map(([service, ok]) => (
                  <div key={service} className="flex items-center justify-between bg-sidebar-accent rounded p-2">
                    <span className="text-xs font-medium capitalize">{service}</span>
                    {ok ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">Run health check from SDK tab to see service status.</div>
              )}
            </div>

            <div className="bg-sidebar-accent/50 rounded p-2 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Active Configuration</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Active Provider</span>
                <span className="font-mono">{localAIAgent.activeProvider.name}</span>
                <span className="text-muted-foreground">Active Role</span>
                <span className="font-mono">{localAIAgent.activeRole.name}</span>
                <span className="text-muted-foreground">Ollama Status</span>
                <span className="font-mono">{localAIAgent.ollamaConnectionStatus}</span>
                <span className="text-muted-foreground">SDK Enabled</span>
                <span className="font-mono">{grudgeSDK.isEnabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
