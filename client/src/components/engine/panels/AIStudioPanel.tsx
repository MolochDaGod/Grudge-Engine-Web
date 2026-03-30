import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Code, Image, Volume2, Trash2, Wand2, Send, Loader2, Zap, Check, BookOpen, Palette, Target, Users, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';
import { isPuterAvailable, generateImage } from '@/lib/puter';
import { localAIAgent, type AgentRole, type AIProvider, AGENT_ROLES } from '@/lib/local-ai-agent';
import { aiAssistant, AI_QUICK_ACTIONS, type QuickPromptKey } from '@/lib/ai-assistant';
import { Sparkles } from 'lucide-react';

interface AIGeneration {
  id: string;
  type: 'image' | 'tts' | 'chat' | 'code';
  prompt: string;
  result?: string;
  timestamp: Date;
}

const ROLE_ICONS: Record<AgentRole, any> = {
  general: MessageSquare,
  dev: Code,
  balance: Scale,
  lore: BookOpen,
  art: Palette,
  mission: Target,
  companion: Users,
};

export function AIStudioPanel() {
  const [prompt, setPrompt] = useState('');
  const [activeMode, setActiveMode] = useState<'chat' | 'image' | 'tts' | 'code'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; provider?: string; model?: string }>>([]);
  const [activeRole, setActiveRole] = useState<AgentRole>(localAIAgent.currentConfig.activeRole);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(localAIAgent.currentConfig.activeProvider);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addConsoleLog, addAsset } = useEngineStore();

  const providerStatus = localAIAgent.getProviderStatus();
  const availableProviders = Object.entries(localAIAgent.currentConfig.providers)
    .filter(([_, config]) => config.enabled)
    .map(([id, config]) => ({ id: id as AIProvider, name: config.name, ready: providerStatus[id as AIProvider].ready }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, streamingText]);

  const handleRoleChange = (role: AgentRole) => {
    setActiveRole(role);
    localAIAgent.setActiveRole(role);
    const history = localAIAgent.getConversation(role);
    setChatMessages(history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      provider: m.provider,
      model: m.model,
    })));
    setStreamingText('');
  };

  const handleProviderChange = (provider: AIProvider) => {
    setActiveProvider(provider);
    localAIAgent.setActiveProvider(provider);
  };

  const handleQuickAction = async (actionKey: QuickPromptKey) => {
    setIsLoading(true);
    setStreamingText('');
    setChatMessages(prev => [...prev, { role: 'user', content: `[Quick Action: ${actionKey}]` }]);
    try {
      const response = await localAIAgent.chat(AI_QUICK_ACTIONS.find(a => a.key === actionKey)?.label || actionKey, {
        role: activeRole,
        provider: activeProvider,
      });
      if (response.success && response.content) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.content!, provider: response.provider, model: response.model }]);
        addConsoleLog({ type: 'info', message: `Quick action completed via ${response.provider}`, source: 'AI' });
      } else {
        addConsoleLog({ type: 'error', message: response.error || 'Quick action failed', source: 'AI' });
      }
    } catch {
      addConsoleLog({ type: 'error', message: 'Quick action error', source: 'AI' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    const currentPrompt = prompt;
    setPrompt('');
    setIsLoading(true);
    setStreamingText('');
    try {
      if (activeMode === 'image') {
        addConsoleLog({ type: 'info', message: `Generating image: "${currentPrompt}"`, source: 'AI' });
        const img = await generateImage(currentPrompt);
        if (img) {
          setGenerations(prev => [{ id: crypto.randomUUID(), type: 'image', prompt: currentPrompt, result: img.src, timestamp: new Date() }, ...prev]);
          addAsset({ id: crypto.randomUUID(), name: `AI Image - ${currentPrompt.slice(0, 20)}`, type: 'texture', path: img.src, thumbnail: img.src });
          addConsoleLog({ type: 'info', message: 'Image generated successfully', source: 'AI' });
        }
      } else if (activeMode === 'tts') {
        addConsoleLog({ type: 'info', message: `Generating speech: "${currentPrompt}"`, source: 'AI' });
        const result = await aiAssistant.speak(currentPrompt);
        if (result.success && result.audio) {
          result.audio.play();
          setGenerations(prev => [{ id: crypto.randomUUID(), type: 'tts', prompt: currentPrompt, timestamp: new Date() }, ...prev]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'user', content: currentPrompt }]);

        if (activeProvider === 'puter' && isPuterAvailable()) {
          let fullResponse = '';
          const result = await localAIAgent.streamChat(currentPrompt, (chunk) => {
            fullResponse += chunk;
            setStreamingText(fullResponse);
          }, { role: activeRole, provider: 'puter' });
          setStreamingText('');
          if (result.success && fullResponse.trim()) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: fullResponse, provider: result.provider, model: result.model }]);
            addConsoleLog({ type: 'info', message: `Response via ${result.provider} (${result.model})`, source: 'AI' });
          } else if (!result.success) {
            addConsoleLog({ type: 'error', message: result.error || 'AI chat failed', source: 'AI' });
          }
        } else {
          const result = await localAIAgent.chat(currentPrompt, {
            role: activeRole,
            provider: activeProvider,
          });
          if (result.success && result.content) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: result.content!, provider: result.provider, model: result.model }]);
            addConsoleLog({ type: 'info', message: `Response via ${result.provider} (${result.model}) ${result.fallbackUsed ? '[fallback]' : ''} in ${result.latencyMs}ms`, source: 'AI' });
          } else {
            addConsoleLog({ type: 'error', message: result.error || 'AI chat failed', source: 'AI' });
            setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${result.error || 'No response'}` }]);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed';
      addConsoleLog({ type: 'error', message, source: 'AI' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-sidebar-border">
          {[
            { mode: 'chat' as const, icon: MessageSquare, label: 'Chat' },
            { mode: 'code' as const, icon: Code, label: 'Code' },
            { mode: 'image' as const, icon: Image, label: 'Image' },
            { mode: 'tts' as const, icon: Volume2, label: 'TTS' },
          ].map(({ mode, icon: Icon, label }) => (
            <Button key={mode} variant={activeMode === mode ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setActiveMode(mode)} data-testid={`button-ai-${mode}`}>
              <Icon className="w-3 h-3" />
              {label}
            </Button>
          ))}
          <div className="flex-1" />
          <Select value={activeProvider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
            <SelectTrigger className="h-6 w-28 text-xs" data-testid="select-ai-provider"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableProviders.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.ready ? 'bg-green-500' : 'bg-red-500'}`} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setChatMessages([]); localAIAgent.clearConversation(activeRole); }} data-testid="button-ai-clear">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {(activeMode === 'chat' || activeMode === 'code') ? (
          <ScrollArea className="flex-1 p-2" ref={scrollRef}>
            <div className="space-y-2">
              {chatMessages.length === 0 && !streamingText && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  <Wand2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div>Ask the <span className="font-semibold text-primary">{AGENT_ROLES[activeRole].name}</span></div>
                  <div className="mt-1">{AGENT_ROLES[activeRole].description}</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-xs p-2 rounded-md ${msg.role === 'user' ? "bg-primary/20 ml-8" : "bg-sidebar-accent mr-8"}`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  {msg.provider && msg.role === 'assistant' && (
                    <div className="text-xs text-muted-foreground/50 mt-1 font-mono">
                      via {msg.provider}{msg.model ? ` (${msg.model})` : ''}
                    </div>
                  )}
                </div>
              ))}
              {streamingText && (
                <div className="text-xs p-2 rounded-md bg-sidebar-accent mr-8">
                  <pre className="whitespace-pre-wrap font-sans">{streamingText}</pre>
                  <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-0.5" />
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 p-3">
            <div className="text-xs text-muted-foreground mb-2">
              {activeMode === 'image' ? 'Describe the game texture or image you want to generate' : 'Enter text to convert to speech for game dialogue'}
            </div>
            {generations.filter(g => g.type === activeMode).slice(0, 3).map(gen => (
              <div key={gen.id} className="flex items-center gap-2 p-2 rounded bg-sidebar-accent mb-1">
                {gen.type === 'image' && gen.result && <img src={gen.result} alt="" className="w-8 h-8 rounded object-cover" />}
                <span className="text-xs truncate flex-1">{gen.prompt}</span>
                <Check className="w-3 h-3 text-green-500" />
              </div>
            ))}
          </div>
        )}

        <div className="p-2 border-t border-sidebar-border">
          <div className="flex gap-2">
            <Input
              placeholder={activeMode === 'image' ? 'Fantasy sword texture...' : activeMode === 'tts' ? 'NPC dialogue text...' : activeMode === 'code' ? 'Describe what code you need...' : `Ask the ${AGENT_ROLES[activeRole].name}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
              className="h-7 text-xs"
              disabled={isLoading}
              data-testid="input-ai-prompt"
            />
            <Button size="icon" className="h-7 w-7" onClick={handleGenerate} disabled={isLoading || !prompt.trim()} data-testid="button-ai-generate">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-40 border-l border-sidebar-border p-2 flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
          <Sparkles className="w-3 h-3" /> Agent Roles
        </span>
        <div className="space-y-0.5 mb-3">
          {localAIAgent.roles.map(role => {
            const RoleIcon = ROLE_ICONS[role.id] || MessageSquare;
            return (
              <Button
                key={role.id}
                variant={activeRole === role.id ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full h-6 justify-start px-2 text-xs gap-1.5"
                onClick={() => handleRoleChange(role.id)}
                data-testid={`button-role-${role.id}`}
              >
                <RoleIcon className="w-3 h-3" />
                {role.name}
              </Button>
            );
          })}
        </div>

        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3" /> Quick Actions
        </span>
        <ScrollArea className="flex-1 mt-1">
          <div className="space-y-0.5">
            {AI_QUICK_ACTIONS.slice(0, 6).map(action => (
              <Button key={action.key} variant="ghost" size="sm" className="w-full h-6 justify-start px-2 text-xs" onClick={() => handleQuickAction(action.key)} disabled={isLoading} data-testid={`button-ai-quick-${action.key}`}>
                {action.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-2 border-t border-sidebar-border mt-2">
          <div className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${providerStatus[activeProvider]?.ready ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={providerStatus[activeProvider]?.ready ? 'text-green-500' : 'text-red-500'}>
              {providerStatus[activeProvider]?.ready ? 'Ready' : 'Offline'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {localAIAgent.currentConfig.providers[activeProvider]?.name}
          </div>
        </div>
      </div>
    </div>
  );
}
