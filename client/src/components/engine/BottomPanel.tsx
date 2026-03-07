import { useState, useRef, useEffect } from 'react';
import { Terminal, Clock, Film, Sparkles, Trash2, X, ChevronUp, ChevronDown, AlertCircle, AlertTriangle, Info, Bug, Image, Volume2, MessageSquare, Loader2, Send, FileCode, Library, Wand2, Code, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';
import { isPuterAvailable, generateImage, textToSpeech } from '@/lib/puter';
import { aiAssistant, AI_QUICK_ACTIONS, type QuickPromptKey } from '@/lib/ai-assistant';
import { ScriptEditor } from './ScriptEditor';
import { FreeAssetLibrary } from './FreeAssetLibrary';

function ConsolePanel() {
  const { consoleLogs, clearConsoleLogs, addConsoleLog } = useEngineStore();
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'debug'>('all');
  const [command, setCommand] = useState('');

  const filteredLogs = filter === 'all' 
    ? consoleLogs 
    : consoleLogs.filter(log => log.type === filter);

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && command.trim()) {
      addConsoleLog({ type: 'debug', message: `> ${command}`, source: 'Console' });
      setCommand('');
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      case 'debug': return <Bug className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-sidebar-border">
        {(['all', 'info', 'warning', 'error', 'debug'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setFilter(f)}
            data-testid={`button-console-filter-${f}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearConsoleLogs} data-testid="button-clear-console">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No logs to display</div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-1 border-b border-sidebar-border/50 hover-elevate",
                  log.type === 'error' && "bg-red-500/5",
                  log.type === 'warning' && "bg-yellow-500/5"
                )}
              >
                {getLogIcon(log.type)}
                <span className="text-muted-foreground shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {log.source && (
                  <span className="text-primary/70 shrink-0">[{log.source}]</span>
                )}
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">{'>'}</span>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommand}
            placeholder="Enter command..."
            className="h-7 pl-6 text-xs font-mono"
            data-testid="input-console-command"
          />
        </div>
      </div>
    </div>
  );
}

function TimelinePanel() {
  const { currentTime, setCurrentTime, isPlaying } = useEngineStore();
  const duration = 10; // 10 seconds

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-mono text-muted-foreground">
          {currentTime.toFixed(2)}s / {duration}s
        </span>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration}
          step={0.01}
          onValueChange={([v]) => setCurrentTime(v)}
          className="flex-1"
          data-testid="slider-timeline"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          <div className="flex items-center h-8 border-b border-sidebar-border">
            <div className="w-40 px-3 text-xs text-muted-foreground border-r border-sidebar-border">Track</div>
            <div className="flex-1 relative">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-sidebar-border/50"
                  style={{ left: `${i * 10}%` }}
                >
                  <span className="text-xs text-muted-foreground ml-1">{i}s</span>
                </div>
              ))}
            </div>
          </div>

          {['Position', 'Rotation', 'Scale'].map(track => (
            <div key={track} className="flex items-center h-8 border-b border-sidebar-border/50">
              <div className="w-40 px-3 text-xs border-r border-sidebar-border">{track}</div>
              <div className="flex-1 relative bg-sidebar-accent/30">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                  style={{ left: '5%' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                  style={{ left: '50%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimationPanel() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Film className="w-8 h-8 mb-2" />
      <span className="text-xs">Select an animated object to view animation clips</span>
    </div>
  );
}

interface AIGeneration {
  id: string;
  type: 'image' | 'tts' | 'chat' | 'code';
  prompt: string;
  result?: string;
  timestamp: Date;
}

function AIStudioPanel() {
  const [prompt, setPrompt] = useState('');
  const [activeMode, setActiveMode] = useState<'chat' | 'image' | 'tts' | 'code'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [selectedModel, setSelectedModel] = useState(aiAssistant.currentModel);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addConsoleLog, addAsset } = useEngineStore();

  const puterAvailable = isPuterAvailable();
  const models = aiAssistant.allModels;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, streamingText]);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    aiAssistant.setModel(model);
  };

  const handleQuickAction = async (actionKey: QuickPromptKey) => {
    setIsLoading(true);
    setStreamingText('');
    setChatMessages(prev => [...prev, { role: 'user', content: `[Quick Action: ${actionKey}]` }]);
    
    try {
      const response = await aiAssistant.quickAction(actionKey);
      if (response.success && response.content) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.content! }]);
        addConsoleLog({ type: 'info', message: `Quick action completed: ${actionKey}`, source: 'AI' });
      } else {
        addConsoleLog({ type: 'error', message: response.error || 'Quick action failed', source: 'AI' });
      }
    } catch (error) {
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
          setGenerations(prev => [{
            id: crypto.randomUUID(),
            type: 'image',
            prompt: currentPrompt,
            result: img.src,
            timestamp: new Date()
          }, ...prev]);
          addAsset({
            id: crypto.randomUUID(),
            name: `AI Image - ${currentPrompt.slice(0, 20)}`,
            type: 'texture',
            path: img.src,
            thumbnail: img.src
          });
          addConsoleLog({ type: 'info', message: 'Image generated successfully', source: 'AI' });
        }
      } else if (activeMode === 'tts') {
        addConsoleLog({ type: 'info', message: `Generating speech: "${currentPrompt}"`, source: 'AI' });
        const result = await aiAssistant.speak(currentPrompt);
        if (result.success && result.audio) {
          result.audio.play();
          setGenerations(prev => [{
            id: crypto.randomUUID(),
            type: 'tts',
            prompt: currentPrompt,
            timestamp: new Date()
          }, ...prev]);
          addConsoleLog({ type: 'info', message: 'Speech generated and playing', source: 'AI' });
        }
      } else if (activeMode === 'code') {
        setChatMessages(prev => [...prev, { role: 'user', content: `Generate code: ${currentPrompt}` }]);
        const response = await aiAssistant.generateCode(currentPrompt);
        if (response.success && response.content) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: response.content! }]);
          setGenerations(prev => [{
            id: crypto.randomUUID(),
            type: 'code',
            prompt: currentPrompt,
            result: response.content,
            timestamp: new Date()
          }, ...prev]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'user', content: currentPrompt }]);
        
        let fullResponse = '';
        const result = await aiAssistant.chatStream(currentPrompt, (chunk) => {
          fullResponse += chunk;
          setStreamingText(fullResponse);
        }, { model: selectedModel });
        
        setStreamingText('');
        
        if (result.success && fullResponse.trim()) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
          addConsoleLog({ type: 'info', message: 'AI response received', source: 'AI' });
        } else if (!result.success) {
          addConsoleLog({ type: 'error', message: result.error || 'AI chat failed', source: 'AI' });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed';
      addConsoleLog({ type: 'error', message, source: 'AI' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!puterAvailable) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Sparkles className="w-8 h-8 mb-2 text-primary" />
        <span className="text-sm font-medium">Free Unlimited AI</span>
        <span className="text-xs text-center mt-1">Access via puter.com for GPT-4o, Claude, Gemini</span>
        <span className="text-xs text-center text-primary mt-2">No API keys required!</span>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-sidebar-border">
          <Button
            variant={activeMode === 'chat' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setActiveMode('chat')}
            data-testid="button-ai-chat"
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </Button>
          <Button
            variant={activeMode === 'code' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setActiveMode('code')}
            data-testid="button-ai-code"
          >
            <Code className="w-3 h-3" />
            Code
          </Button>
          <Button
            variant={activeMode === 'image' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setActiveMode('image')}
            data-testid="button-ai-image"
          >
            <Image className="w-3 h-3" />
            Image
          </Button>
          <Button
            variant={activeMode === 'tts' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setActiveMode('tts')}
            data-testid="button-ai-tts"
          >
            <Volume2 className="w-3 h-3" />
            TTS
          </Button>
          <div className="flex-1" />
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="h-6 w-32 text-xs" data-testid="select-ai-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name} {m.free && <span className="text-green-500 ml-1">FREE</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { setChatMessages([]); aiAssistant.clearHistory(); }}
            data-testid="button-ai-clear"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {(activeMode === 'chat' || activeMode === 'code') ? (
          <ScrollArea className="flex-1 p-2" ref={scrollRef}>
            <div className="space-y-2">
              {chatMessages.length === 0 && !streamingText && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  <Wand2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  Ask anything about game development, Babylon.js, or request code
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-xs p-2 rounded-md",
                    msg.role === 'user' ? "bg-primary/20 ml-8" : "bg-sidebar-accent mr-8"
                  )}
                >
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
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
                {gen.type === 'image' && gen.result && (
                  <img src={gen.result} alt="" className="w-8 h-8 rounded object-cover" />
                )}
                <span className="text-xs truncate flex-1">{gen.prompt}</span>
                <Check className="w-3 h-3 text-green-500" />
              </div>
            ))}
          </div>
        )}

        <div className="p-2 border-t border-sidebar-border">
          <div className="flex gap-2">
            <Input
              placeholder={
                activeMode === 'image' ? 'Fantasy sword texture, metallic, ornate...' : 
                activeMode === 'tts' ? 'NPC dialogue text...' : 
                activeMode === 'code' ? 'Describe what code you need...' :
                'Ask about game dev, Babylon.js, or anything...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
              className="h-7 text-xs"
              disabled={isLoading}
              data-testid="input-ai-prompt"
            />
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              data-testid="button-ai-generate"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-40 border-l border-sidebar-border p-2 flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3" /> Quick Actions
        </span>
        <ScrollArea className="flex-1 mt-2">
          <div className="space-y-1">
            {AI_QUICK_ACTIONS.slice(0, 6).map(action => (
              <Button
                key={action.key}
                variant="ghost"
                size="sm"
                className="w-full h-6 justify-start px-2 text-xs"
                onClick={() => handleQuickAction(action.key)}
                disabled={isLoading}
                data-testid={`button-ai-quick-${action.key}`}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-2 border-t border-sidebar-border mt-2">
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Check className="w-3 h-3" />
            <span>AI Ready</span>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {models.find(m => m.id === selectedModel)?.name}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BottomPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function BottomPanel({ isCollapsed, onToggleCollapse }: BottomPanelProps) {
  const { activeBottomTab, setActiveBottomTab } = useEngineStore();

  return (
    <div 
      className={cn(
        "flex flex-col bg-sidebar border-t border-sidebar-border transition-all duration-150",
        isCollapsed ? "h-9" : "h-48"
      )}
      data-testid="bottom-panel"
    >
      <div className="flex items-center h-9 border-b border-sidebar-border shrink-0">
        <Tabs value={activeBottomTab} onValueChange={(v) => setActiveBottomTab(v as any)}>
          <TabsList className="h-9 bg-transparent rounded-none gap-0 px-1">
            <TabsTrigger 
              value="console" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-console"
            >
              <Terminal className="w-3.5 h-3.5" />
              Console
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-timeline"
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="animation" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-animation"
            >
              <Film className="w-3.5 h-3.5" />
              Animation
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-ai-studio"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Studio
            </TabsTrigger>
            <TabsTrigger 
              value="scripts" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-scripts"
            >
              <FileCode className="w-3.5 h-3.5" />
              Scripts
            </TabsTrigger>
            <TabsTrigger 
              value="library" 
              className="text-xs data-[state=active]:bg-sidebar-accent rounded-sm h-7 px-3 gap-1.5"
              data-testid="tab-library"
            >
              <Library className="w-3.5 h-3.5" />
              Free Assets
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mr-1"
          onClick={onToggleCollapse}
          data-testid="button-toggle-bottom-panel"
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {activeBottomTab === 'console' && <ConsolePanel />}
          {activeBottomTab === 'timeline' && <TimelinePanel />}
          {activeBottomTab === 'animation' && <AnimationPanel />}
          {activeBottomTab === 'ai' && <AIStudioPanel />}
          {activeBottomTab === 'scripts' && <ScriptEditor />}
          {activeBottomTab === 'library' && <FreeAssetLibrary />}
        </div>
      )}
    </div>
  );
}
