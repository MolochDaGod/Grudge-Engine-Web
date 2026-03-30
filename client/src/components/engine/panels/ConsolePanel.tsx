import { useState } from 'react';
import { Trash2, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEngineStore } from '@/lib/engine-store';
import { cn } from '@/lib/utils';

export function ConsolePanel() {
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
