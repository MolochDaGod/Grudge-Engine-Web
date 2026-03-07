import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, FileCode, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngineStore } from '@/lib/engine-store';

const SCRIPT_TEMPLATES: Record<string, { name: string; code: string }> = {
  gameManager: {
    name: 'GameManager',
    code: `// GameManager - Core game loop and state management
class GameManager {
  private static instance: GameManager;
  private isRunning: boolean = false;
  private score: number = 0;
  private level: number = 1;
  
  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }
  
  start(): void {
    this.isRunning = true;
    console.log('Game Started');
    this.gameLoop();
  }
  
  pause(): void {
    this.isRunning = false;
    console.log('Game Paused');
  }
  
  private gameLoop(): void {
    if (!this.isRunning) return;
    
    // Update game state here
    this.update();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  private update(): void {
    // Game logic goes here
  }
  
  addScore(points: number): void {
    this.score += points;
    console.log(\`Score: \${this.score}\`);
  }
  
  nextLevel(): void {
    this.level++;
    console.log(\`Level: \${this.level}\`);
  }
}

export default GameManager;
`
  },
  playerController: {
    name: 'PlayerController',
    code: `// PlayerController - Handles player input and movement
import * as BABYLON from '@babylonjs/core';

class PlayerController {
  private mesh: BABYLON.AbstractMesh;
  private speed: number = 5;
  private jumpForce: number = 8;
  private isGrounded: boolean = true;
  private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  
  private keys: { [key: string]: boolean } = {};
  
  constructor(mesh: BABYLON.AbstractMesh) {
    this.mesh = mesh;
    this.setupInput();
  }
  
  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }
  
  update(deltaTime: number): void {
    const moveDir = BABYLON.Vector3.Zero();
    
    if (this.keys['w'] || this.keys['arrowup']) moveDir.z += 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveDir.z -= 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveDir.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveDir.x += 1;
    
    if (moveDir.length() > 0) {
      moveDir.normalize();
      this.mesh.position.addInPlace(
        moveDir.scale(this.speed * deltaTime)
      );
    }
    
    if (this.keys[' '] && this.isGrounded) {
      this.jump();
    }
  }
  
  private jump(): void {
    this.velocity.y = this.jumpForce;
    this.isGrounded = false;
  }
  
  setSpeed(speed: number): void {
    this.speed = speed;
  }
}

export default PlayerController;
`
  },
  cameraController: {
    name: 'CameraController',
    code: `// CameraController - Camera follow and orbit behavior
import * as BABYLON from '@babylonjs/core';

class CameraController {
  private camera: BABYLON.ArcRotateCamera;
  private target: BABYLON.AbstractMesh | null = null;
  private followDistance: number = 10;
  private followHeight: number = 5;
  private smoothSpeed: number = 5;
  
  constructor(camera: BABYLON.ArcRotateCamera) {
    this.camera = camera;
  }
  
  setTarget(mesh: BABYLON.AbstractMesh): void {
    this.target = mesh;
  }
  
  update(deltaTime: number): void {
    if (!this.target) return;
    
    // Smooth follow
    const targetPosition = this.target.position.clone();
    targetPosition.y += this.followHeight;
    
    this.camera.target = BABYLON.Vector3.Lerp(
      this.camera.target,
      targetPosition,
      this.smoothSpeed * deltaTime
    );
  }
  
  setFollowDistance(distance: number): void {
    this.followDistance = distance;
    this.camera.radius = distance;
  }
  
  setFollowHeight(height: number): void {
    this.followHeight = height;
  }
  
  shake(intensity: number, duration: number): void {
    const originalTarget = this.camera.target.clone();
    let elapsed = 0;
    
    const shakeInterval = setInterval(() => {
      elapsed += 16;
      if (elapsed >= duration) {
        this.camera.target = originalTarget;
        clearInterval(shakeInterval);
        return;
      }
      
      const offset = new BABYLON.Vector3(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      );
      
      this.camera.target = originalTarget.add(offset);
    }, 16);
  }
}

export default CameraController;
`
  },
  empty: {
    name: 'New Script',
    code: `// New Script
// Add your custom game logic here

class MyScript {
  private scene: any;
  
  constructor(scene: any) {
    this.scene = scene;
  }
  
  start(): void {
    console.log('Script started');
  }
  
  update(deltaTime: number): void {
    // Called every frame
  }
  
  onDestroy(): void {
    console.log('Script destroyed');
  }
}

export default MyScript;
`
  }
};

export function ScriptEditor() {
  const [currentScript, setCurrentScript] = useState('empty');
  const [code, setCode] = useState(SCRIPT_TEMPLATES.empty.code);
  const [hasChanges, setHasChanges] = useState(false);
  const { addConsoleLog, addAsset } = useEngineStore();

  const handleScriptChange = useCallback((value: string) => {
    setCurrentScript(value);
    setCode(SCRIPT_TEMPLATES[value].code);
    setHasChanges(false);
  }, []);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      setHasChanges(true);
    }
  }, []);

  const handleSave = useCallback(() => {
    const scriptName = SCRIPT_TEMPLATES[currentScript].name;
    addAsset({
      id: crypto.randomUUID(),
      name: scriptName,
      type: 'script',
      path: `/scripts/custom/${scriptName}.ts`
    });
    addConsoleLog({ 
      type: 'info', 
      message: `Saved script: ${scriptName}`, 
      source: 'Script Editor' 
    });
    setHasChanges(false);
  }, [currentScript, addAsset, addConsoleLog]);

  const handleRun = useCallback(() => {
    try {
      addConsoleLog({ 
        type: 'info', 
        message: `Running script: ${SCRIPT_TEMPLATES[currentScript].name}`, 
        source: 'Script Editor' 
      });
    } catch (error) {
      addConsoleLog({ 
        type: 'error', 
        message: `Script error: ${error}`, 
        source: 'Script Editor' 
      });
    }
  }, [currentScript, addConsoleLog]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-sidebar-border">
        <FileCode className="w-4 h-4 text-orange-400" />
        <Select value={currentScript} onValueChange={handleScriptChange}>
          <SelectTrigger className="h-7 w-48 text-xs" data-testid="select-script">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCRIPT_TEMPLATES).map(([key, template]) => (
              <SelectItem key={key} value={key} data-testid={`select-script-${key}`}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex-1" />
        
        {hasChanges && (
          <span className="text-xs text-yellow-400">Unsaved changes</span>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7" 
          onClick={handleSave}
          data-testid="button-save-script"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="h-7" 
          onClick={handleRun}
          data-testid="button-run-script"
        >
          <Play className="w-3.5 h-3.5 mr-1" />
          Run
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
