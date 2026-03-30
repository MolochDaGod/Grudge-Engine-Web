import { useState, useCallback } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import { BABYLON_TYPE_DEFINITIONS } from '@/lib/babylon-types';
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
  npcBehavior: {
    name: 'NPCBehavior',
    code: `// NPCBehavior - Simple state machine for AI characters
import * as BABYLON from '@babylonjs/core';

type NPCState = 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';

class NPCBehavior {
  private mesh: BABYLON.AbstractMesh;
  private scene: BABYLON.Scene;
  private state: NPCState = 'idle';
  private target: BABYLON.AbstractMesh | null = null;
  private patrolPoints: BABYLON.Vector3[] = [];
  private currentPatrolIndex: number = 0;
  private speed: number = 3;
  private detectionRange: number = 10;
  private attackRange: number = 1.5;
  private health: number = 100;

  constructor(mesh: BABYLON.AbstractMesh, scene: BABYLON.Scene) {
    this.mesh = mesh;
    this.scene = scene;
  }

  setTarget(target: BABYLON.AbstractMesh): void {
    this.target = target;
  }

  addPatrolPoint(point: BABYLON.Vector3): void {
    this.patrolPoints.push(point);
  }

  update(deltaTime: number): void {
    if (this.state === 'dead') return;

    if (this.target) {
      const dist = BABYLON.Vector3.Distance(this.mesh.position, this.target.position);
      if (dist < this.attackRange) {
        this.state = 'attack';
      } else if (dist < this.detectionRange) {
        this.state = 'chase';
      } else {
        this.state = this.patrolPoints.length > 0 ? 'patrol' : 'idle';
      }
    }

    switch (this.state) {
      case 'patrol': this.doPatrol(deltaTime); break;
      case 'chase': this.doChase(deltaTime); break;
      case 'attack': this.doAttack(); break;
    }
  }

  private doPatrol(dt: number): void {
    if (this.patrolPoints.length === 0) return;
    const dest = this.patrolPoints[this.currentPatrolIndex];
    const dir = dest.subtract(this.mesh.position).normalize();
    this.mesh.position.addInPlace(dir.scale(this.speed * dt));
    if (BABYLON.Vector3.Distance(this.mesh.position, dest) < 0.3) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    }
  }

  private doChase(dt: number): void {
    if (!this.target) return;
    const dir = this.target.position.subtract(this.mesh.position).normalize();
    this.mesh.position.addInPlace(dir.scale(this.speed * 1.5 * dt));
  }

  private doAttack(): void {
    console.log(\`\${this.mesh.name} attacks!\`);
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'dead';
      console.log(\`\${this.mesh.name} died\`);
    }
  }
}

export default NPCBehavior;
`
  },
  healthSystem: {
    name: 'HealthSystem',
    code: `// HealthSystem - Player health, armor, and regeneration
class HealthSystem {
  private maxHealth: number;
  private health: number;
  private maxArmor: number;
  private armor: number;
  private regenRate: number; // HP per second
  private regenDelay: number = 5; // seconds after last damage
  private lastDamageTime: number = 0;
  private onDeath?: () => void;
  private onDamage?: (amount: number, remaining: number) => void;

  constructor(maxHealth: number = 100, maxArmor: number = 50, regenRate: number = 5) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.maxArmor = maxArmor;
    this.armor = 0;
    this.regenRate = regenRate;
  }

  takeDamage(amount: number): void {
    this.lastDamageTime = Date.now() / 1000;
    let remaining = amount;
    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, amount * 0.5);
      this.armor -= armorAbsorb;
      remaining -= armorAbsorb;
    }
    this.health = Math.max(0, this.health - remaining);
    this.onDamage?.(amount, this.health);
    if (this.health <= 0) this.onDeath?.();
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount: number): void {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  update(deltaTime: number): void {
    const now = Date.now() / 1000;
    if (now - this.lastDamageTime > this.regenDelay && this.health < this.maxHealth) {
      this.heal(this.regenRate * deltaTime);
    }
  }

  getHealthPercent(): number { return this.health / this.maxHealth; }
  getArmorPercent(): number { return this.armor / this.maxArmor; }
  isDead(): boolean { return this.health <= 0; }
  onDeathCallback(cb: () => void): void { this.onDeath = cb; }
  onDamageCallback(cb: (amount: number, remaining: number) => void): void { this.onDamage = cb; }
}

export default HealthSystem;
`
  },
  interactable: {
    name: 'Interactable',
    code: `// Interactable - Pickup, trigger zones, and interactable props
import * as BABYLON from '@babylonjs/core';

type InteractableType = 'pickup' | 'trigger' | 'door' | 'switch';

class Interactable {
  private mesh: BABYLON.AbstractMesh;
  private type: InteractableType;
  private range: number = 2;
  private isActive: boolean = true;
  private onInteract?: (instigator: BABYLON.AbstractMesh) => void;
  private floatOffset: number = 0;

  constructor(mesh: BABYLON.AbstractMesh, type: InteractableType = 'pickup') {
    this.mesh = mesh;
    this.type = type;
  }

  onInteractCallback(cb: (instigator: BABYLON.AbstractMesh) => void): void {
    this.onInteract = cb;
  }

  checkInteraction(player: BABYLON.AbstractMesh): void {
    if (!this.isActive) return;
    const dist = BABYLON.Vector3.Distance(this.mesh.position, player.position);
    if (dist <= this.range) {
      this.onInteract?.(player);
      if (this.type === 'pickup') this.collect();
    }
  }

  private collect(): void {
    this.isActive = false;
    this.mesh.isVisible = false;
    console.log(\`Picked up: \${this.mesh.name}\`);
    // Respawn after 30 seconds
    setTimeout(() => {
      this.isActive = true;
      this.mesh.isVisible = true;
    }, 30000);
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;
    // Float animation for pickups
    if (this.type === 'pickup') {
      this.floatOffset += deltaTime * 2;
      this.mesh.position.y += Math.sin(this.floatOffset) * 0.01;
      this.mesh.rotate(BABYLON.Axis.Y, deltaTime * 1.5, BABYLON.Space.WORLD);
    }
  }

  setActive(active: boolean): void { this.isActive = active; }
  setRange(range: number): void { this.range = range; }
}

export default Interactable;
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
          beforeMount={(monaco) => {
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
              target: monaco.languages.typescript.ScriptTarget.ES2020,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              allowNonTsExtensions: true,
              allowSyntheticDefaultImports: true,
              strict: false,
            });
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              BABYLON_TYPE_DEFINITIONS,
              'file:///node_modules/@babylonjs/core/index.d.ts'
            );
          }}
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
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            parameterHints: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
