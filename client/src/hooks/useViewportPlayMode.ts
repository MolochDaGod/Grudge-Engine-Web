import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useEngineStore } from '@/lib/engine-store';
import { CharacterController, findPlayerCharacter } from '@/lib/character-controller';
import { WarriorPlayerController } from '@/lib/warrior-controller';
import { setupPlayModeEnvironment } from '@/lib/grass-environment';
import { WarBearBehavior } from '@/lib/warbear-behavior';
import { DragonBehavior } from '@/lib/dragon-behavior';
import { createPhysicsWorld, setPhysicsWorld, type RapierPhysicsWorld } from '@/lib/rapier-physics';
import { AnimatorController, createDefaultController, setAnimator, disposeAllAnimators, updateAllAnimators } from '@/lib/animator';

interface CombatStats {
  player: { health: number; maxHealth: number; stamina: number; maxStamina: number };
  enemy: { name: string; health: number; maxHealth: number } | null;
}

interface Params {
  sceneRef: MutableRefObject<BABYLON.Scene | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  meshMapRef: MutableRefObject<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>;
  animationGroupsRef: MutableRefObject<Map<string, BABYLON.AnimationGroup[]>>;
  controllerRef: MutableRefObject<CharacterController | WarriorPlayerController | null>;
  warriorControllerRef: MutableRefObject<WarriorPlayerController | null>;
  npcBehaviorsRef: MutableRefObject<Map<string, WarBearBehavior | DragonBehavior>>;
  gizmoManagerRef: MutableRefObject<BABYLON.GizmoManager | null>;
}

export function useViewportPlayMode({
  sceneRef, canvasRef, meshMapRef, animationGroupsRef,
  controllerRef, warriorControllerRef, npcBehaviorsRef, gizmoManagerRef
}: Params) {
  const { isPlaying, addConsoleLog, getCurrentScene } = useEngineStore();
  const combatUpdateRef = useRef<(() => void) | null>(null);
  const combatObserverRef = useRef<BABYLON.Observer<BABYLON.Scene> | null>(null);
  const physicsWorldRef = useRef<RapierPhysicsWorld | null>(null);
  const physicsObserverRef = useRef<BABYLON.Observer<BABYLON.Scene> | null>(null);
  const [combatStats, setCombatStats] = useState<CombatStats>({
    player: { health: 100, maxHealth: 100, stamina: 100, maxStamina: 100 },
    enemy: null
  });

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;

    let cancelled = false;

    if (isPlaying) {
      setupPlayModeEnvironment(scene);

      const sceneData = getCurrentScene();
      createPhysicsWorld(scene, { x: 0, y: -9.81, z: 0 }).then(world => {
        if (cancelled) { world.dispose(); return; }
        physicsWorldRef.current = world;
        world.createGround(200, 200, 0);

        if (sceneData) {
          sceneData.objects.forEach(obj => {
            const physicsComp = obj.components?.find(c => c.type === 'physics');
            const colliderComp = obj.components?.find(c => c.type === 'collider');
            if (!physicsComp && !colliderComp) return;
            const mesh = meshMapRef.current.get(obj.id);
            if (!mesh) return;
            const props = physicsComp?.properties || {};
            const colProps = colliderComp?.properties || {};
            world.addBody(obj.id, mesh,
              { type: props.bodyType || 'dynamic', mass: props.mass ?? 1, friction: props.friction ?? 0.5, restitution: props.restitution ?? 0.3, linearDamping: props.linearDamping ?? 0, angularDamping: props.angularDamping ?? 0.05, gravityScale: props.gravityScale ?? 1, lockRotationX: props.lockRotationX ?? false, lockRotationY: props.lockRotationY ?? false, lockRotationZ: props.lockRotationZ ?? false, ccd: props.ccd ?? false },
              colProps.autoFit ? world.autoFitCollider(mesh) : { shape: colProps.shape || 'box', halfExtents: colProps.halfExtents, radius: colProps.radius, halfHeight: colProps.halfHeight, isTrigger: colProps.isTrigger ?? false, density: colProps.density ?? 1, friction: colProps.friction ?? 0.5, restitution: colProps.restitution ?? 0.3, offset: colProps.offset || { x: 0, y: 0, z: 0 } }
            );
          });
        }

        physicsObserverRef.current = scene.onBeforeRenderObservable.add(() => {
          const dt = scene.getEngine().getDeltaTime() / 1000;
          world.step(dt);
        });

        addConsoleLog({ type: 'info', message: `Rapier physics initialized — ${world.getBodyCount()} bodies, gravity: -9.81`, source: 'Physics' });
      }).catch(err => {
        addConsoleLog({ type: 'warning', message: `Rapier physics init skipped: ${err.message}`, source: 'Physics' });
      });

      const animObserver = scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        updateAllAnimators(dt);
      });

      if (sceneData) {
        sceneData.objects.forEach(obj => {
          const animatorComp = obj.components?.find(c => c.type === 'animator');
          const objAnims = animationGroupsRef.current.get(obj.id);
          if (objAnims && objAnims.length > 0) {
            const controllerData = createDefaultController(objAnims);
            const controller = new AnimatorController(controllerData);
            controller.bindAnimationGroups(objAnims);
            setAnimator(obj.id, controller);
          }
        });
      }

      let playerNode: BABYLON.TransformNode | BABYLON.AbstractMesh | null = null;
      let playerId: string | null = null;
      let anims: BABYLON.AnimationGroup[] = [];

      for (const node of scene.transformNodes) {
        const metadata = node.metadata as { tags?: string[], gameObjectId?: string } | null;
        if (metadata?.tags?.includes('player') && metadata.gameObjectId) {
          playerNode = node;
          playerId = metadata.gameObjectId;
          anims = animationGroupsRef.current.get(playerId) || [];
          break;
        }
      }

      if (!playerNode) {
        for (const mesh of scene.meshes) {
          const metadata = mesh.metadata as { tags?: string[], gameObjectId?: string } | null;
          if (metadata?.tags?.includes('player') && metadata.gameObjectId) {
            playerNode = meshMapRef.current.get(metadata.gameObjectId) || mesh;
            playerId = metadata.gameObjectId;
            anims = animationGroupsRef.current.get(playerId) || [];
            break;
          }
        }
      }

      if (!playerNode) {
        const result = findPlayerCharacter(scene);
        playerNode = result.mesh;
        anims = result.animationGroups;
      }

      const playerMesh = playerNode as BABYLON.AbstractMesh;

      if (playerMesh) {
        if (controllerRef.current) controllerRef.current.dispose();
        if (warriorControllerRef.current) {
          warriorControllerRef.current.dispose();
          warriorControllerRef.current = null;
        }

        if (anims.length === 0) {
          animationGroupsRef.current.forEach((storedAnims) => {
            if (anims.length === 0 && storedAnims.length > 0) anims = storedAnims;
          });
        }

        const metadata = playerMesh.metadata as { tags?: string[], modelPath?: string } | null;
        const isWarrior = metadata?.tags?.includes('warrior') ||
          metadata?.modelPath?.includes('racalvin-warrior') ||
          playerMesh.name?.toLowerCase().includes('warrior');

        if (isWarrior) {
          const warriorCtrl = new WarriorPlayerController({
            scene, canvas, characterMesh: playerMesh,
            walkSpeed: 3.5, runSpeed: 6, sprintSpeed: 10,
            jumpForce: 8, gravity: 20, cameraDistance: 7, cameraHeight: 2.5,
          });
          if (anims.length > 0) warriorCtrl.setAnimationGroups(anims);
          warriorCtrl.loadAnimations().then(() => {
            warriorCtrl.activate();
            addConsoleLog({ type: 'info', message: 'Warrior Controller: WASD move, Shift sprint, Space jump, Ctrl dodge, LMB slash combo, RMB heavy attack, F block, C crouch, 1-0 special moves', source: 'Controller' });
          }).catch(() => { warriorCtrl.activate(); });
          warriorControllerRef.current = warriorCtrl;
          controllerRef.current = warriorCtrl as any;
        } else {
          const controller = new CharacterController({
            scene, canvas, characterMesh: playerMesh, animationGroups: anims,
            walkSpeed: 4, runSpeed: 8, jumpForce: 8, gravity: 20, cameraDistance: 6, cameraHeight: 2
          });
          controllerRef.current = controller;
          controller.activate();
        }

        combatUpdateRef.current = () => {
          const ctrl = controllerRef.current;
          if (!ctrl) return;
          let nearestEnemy: { name: string; health: number; maxHealth: number } | null = null;
          let nearestDist = Infinity;
          const charPos = ctrl.getCharacter().position;
          npcBehaviorsRef.current.forEach((behavior) => {
            let combatEntity = null;
            let meshPos: BABYLON.Vector3 | null = null;
            let meshName = 'Enemy';
            if (behavior instanceof WarBearBehavior && behavior.combatEntity) {
              combatEntity = behavior.combatEntity;
              meshPos = behavior.combatEntity.mesh.position;
              meshName = behavior.combatEntity.mesh.name || 'War Bear';
            } else if (behavior instanceof DragonBehavior) {
              meshPos = (behavior as any).mesh?.position;
              meshName = (behavior as any).mesh?.name || 'Dragon';
            }
            if (meshPos) {
              const dist = BABYLON.Vector3.Distance(charPos, meshPos);
              if (dist < 25 && dist < nearestDist) {
                nearestDist = dist;
                if (combatEntity && combatEntity.stats.health > 0) {
                  nearestEnemy = { name: meshName, health: combatEntity.stats.health, maxHealth: combatEntity.stats.maxHealth };
                } else if (!combatEntity && behavior instanceof DragonBehavior) {
                  nearestEnemy = { name: meshName, health: 150, maxHealth: 150 };
                }
              }
            }
          });
          const isWarriorCtrl = ctrl instanceof WarriorPlayerController;
          const isCharCtrl = ctrl instanceof CharacterController;
          const statProvider = isWarriorCtrl ? (ctrl as WarriorPlayerController)
            : isCharCtrl ? (ctrl as CharacterController) : null;
          setCombatStats({
            player: {
              health: statProvider ? statProvider.getHealth() : 100,
              maxHealth: statProvider ? statProvider.getMaxHealth() : 100,
              stamina: statProvider ? statProvider.getStamina() : 100,
              maxStamina: statProvider ? statProvider.getMaxStamina() : 100,
            },
            enemy: nearestEnemy
          });
        };

        if (combatObserverRef.current) scene.onBeforeRenderObservable.remove(combatObserverRef.current);
        combatObserverRef.current = scene.onBeforeRenderObservable.add(() => {
          if (combatUpdateRef.current) combatUpdateRef.current();
        });

        if (gizmoManagerRef.current) gizmoManagerRef.current.attachToMesh(null);

        addConsoleLog({ type: 'info', message: `Sketchbook controller activated on "${playerMesh.name}" - WASD move, Shift run, Space jump. Combat: LMB attack, RMB charge, F block, Q dodge`, source: 'Controller' });

        npcBehaviorsRef.current.clear();
        const processedIds = new Set<string>();
        const npcNodes: Array<{ node: BABYLON.TransformNode | BABYLON.AbstractMesh; id: string; name: string; tags: string[] }> = [];

        scene.transformNodes.forEach(node => {
          const metadata = node.metadata as { tags?: string[], gameObjectId?: string } | null;
          if (metadata?.tags && (metadata.tags.includes('npc') || metadata.tags.includes('creature') || metadata.tags.includes('enemy'))) {
            if (metadata.gameObjectId && !processedIds.has(metadata.gameObjectId)) {
              processedIds.add(metadata.gameObjectId);
              npcNodes.push({ node, id: metadata.gameObjectId, name: node.name || metadata.gameObjectId, tags: metadata.tags });
            }
          }
        });

        scene.meshes.forEach(mesh => {
          const metadata = mesh.metadata as { tags?: string[], gameObjectId?: string } | null;
          if (metadata?.tags && (metadata.tags.includes('npc') || metadata.tags.includes('creature') || metadata.tags.includes('enemy'))) {
            if (metadata.gameObjectId && !processedIds.has(metadata.gameObjectId)) {
              const rootNode = meshMapRef.current.get(metadata.gameObjectId) || mesh;
              processedIds.add(metadata.gameObjectId);
              npcNodes.push({ node: rootNode, id: metadata.gameObjectId, name: rootNode.name || metadata.gameObjectId, tags: metadata.tags });
            }
          }
        });

        npcNodes.forEach(({ node, id, name, tags }) => {
          const mesh = node as BABYLON.AbstractMesh;
          if (mesh === playerMesh) return;
          const meshAnimGroups = animationGroupsRef.current.get(id) ||
            scene.animationGroups.filter(ag => ag.targetedAnimations.some(ta => {
              const target = ta.target as BABYLON.Node;
              return target === mesh || target?.parent === mesh || (target?.parent?.parent === mesh);
            }));
          const meshName = name.toLowerCase();
          const hasFlying = tags.includes('flying') || meshName.includes('dragon') || meshName.includes('drake') || meshName.includes('wyvern');
          const isBear = meshName.includes('bear') || meshName.includes('warbear');
          if (hasFlying && !npcBehaviorsRef.current.has(id)) {
            const behavior = new DragonBehavior({ scene, mesh, animationGroups: meshAnimGroups, detectionRange: 50, flyHeight: mesh.position.y > 2 ? mesh.position.y : 15, patrolRadius: 25, moveSpeed: 10 });
            behavior.start();
            npcBehaviorsRef.current.set(id, behavior);
            addConsoleLog({ type: 'info', message: `Dragon AI activated: ${name}`, source: 'AI' });
          } else if ((isBear || tags.includes('npc')) && !npcBehaviorsRef.current.has(id) && !hasFlying) {
            const behavior = new WarBearBehavior({ scene, mesh, animationGroups: meshAnimGroups, detectionRange: 20, attackRange: 3, patrolRadius: 12, moveSpeed: 4 });
            behavior.start();
            npcBehaviorsRef.current.set(id, behavior);
            addConsoleLog({ type: 'info', message: `Ground NPC AI activated: ${name}`, source: 'AI' });
          }
        });

        if (npcBehaviorsRef.current.size > 0) {
          addConsoleLog({ type: 'info', message: `${npcBehaviorsRef.current.size} NPC AI behaviors started`, source: 'AI' });
        }
      } else {
        addConsoleLog({ type: 'warning', message: 'No character found in scene. Add a 3D model to control in play mode.', source: 'Controller' });
      }
    } else {
      if (warriorControllerRef.current) {
        warriorControllerRef.current.deactivate();
        warriorControllerRef.current = null;
        addConsoleLog({ type: 'info', message: 'Warrior controller deactivated', source: 'Controller' });
      }
      if (controllerRef.current) {
        controllerRef.current.deactivate();
        if (!warriorControllerRef.current) {
          addConsoleLog({ type: 'info', message: 'Character controller deactivated', source: 'Controller' });
        }
      }
      controllerRef.current = null;
      combatUpdateRef.current = null;
      if (combatObserverRef.current && sceneRef.current) {
        sceneRef.current.onBeforeRenderObservable.remove(combatObserverRef.current);
        combatObserverRef.current = null;
      }
      if (physicsObserverRef.current && sceneRef.current) {
        sceneRef.current.onBeforeRenderObservable.remove(physicsObserverRef.current);
        physicsObserverRef.current = null;
      }
      if (physicsWorldRef.current) {
        physicsWorldRef.current.dispose();
        physicsWorldRef.current = null;
        setPhysicsWorld(null);
        addConsoleLog({ type: 'info', message: 'Rapier physics disposed', source: 'Physics' });
      }
      disposeAllAnimators();
      setCombatStats({ player: { health: 100, maxHealth: 100, stamina: 100, maxStamina: 100 }, enemy: null });
      npcBehaviorsRef.current.forEach((behavior) => { behavior.stop(); });
      if (npcBehaviorsRef.current.size > 0) {
        addConsoleLog({ type: 'info', message: `${npcBehaviorsRef.current.size} NPC AI behaviors stopped`, source: 'AI' });
      }
      npcBehaviorsRef.current.clear();
    }

    return () => {
      cancelled = true;
      if (physicsObserverRef.current && sceneRef.current) {
        sceneRef.current.onBeforeRenderObservable.remove(physicsObserverRef.current);
        physicsObserverRef.current = null;
      }
      if (physicsWorldRef.current) {
        physicsWorldRef.current.dispose();
        physicsWorldRef.current = null;
        setPhysicsWorld(null);
      }
      disposeAllAnimators();
    };
  }, [isPlaying, addConsoleLog]);

  return { combatStats };
}
