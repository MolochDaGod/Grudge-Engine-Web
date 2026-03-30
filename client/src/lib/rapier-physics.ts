import RAPIER from '@dimforge/rapier3d-compat';
import * as BABYLON from '@babylonjs/core';

export type RigidBodyType = 'dynamic' | 'kinematicPosition' | 'kinematicVelocity' | 'fixed';
export type ColliderShape = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'trimesh' | 'convexHull';

export interface PhysicsBodyDesc {
  type: RigidBodyType;
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  gravityScale: number;
  lockRotationX: boolean;
  lockRotationY: boolean;
  lockRotationZ: boolean;
  ccd: boolean;
}

export interface ColliderDesc {
  shape: ColliderShape;
  halfExtents: { x: number; y: number; z: number };
  radius: number;
  halfHeight: number;
  isTrigger: boolean;
  density: number;
  friction: number;
  restitution: number;
  offset: { x: number; y: number; z: number };
}

export interface PhysicsBody {
  gameObjectId: string;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: BABYLON.AbstractMesh | BABYLON.TransformNode;
  bodyDesc: PhysicsBodyDesc;
  colliderDesc: ColliderDesc;
}

export interface RaycastHit {
  point: BABYLON.Vector3;
  normal: BABYLON.Vector3;
  distance: number;
  gameObjectId: string | null;
  collider: RAPIER.Collider;
}

export interface ContactEvent {
  bodyA: string;
  bodyB: string;
  started: boolean;
}

export interface TriggerEvent {
  sensorId: string;
  otherId: string;
  started: boolean;
}

type ContactCallback = (event: ContactEvent) => void;
type TriggerCallback = (event: TriggerEvent) => void;

let rapierInitialized = false;

export async function initRapier(): Promise<void> {
  if (rapierInitialized) return;
  await RAPIER.init();
  rapierInitialized = true;
}

export function isRapierReady(): boolean {
  return rapierInitialized;
}

export class RapierPhysicsWorld {
  private world: RAPIER.World;
  private bodies: Map<string, PhysicsBody> = new Map();
  private colliderToId: Map<number, string> = new Map();
  private scene: BABYLON.Scene;
  private debugLines: BABYLON.LinesMesh[] = [];
  private debugEnabled = false;
  private helperMeshes: BABYLON.AbstractMesh[] = [];
  private contactCallbacks: ContactCallback[] = [];
  private triggerCallbacks: TriggerCallback[] = [];
  private eventQueue: RAPIER.EventQueue;
  private timeAccumulator = 0;
  private fixedTimeStep = 1 / 60;
  private maxSubSteps = 4;

  constructor(scene: BABYLON.Scene, gravity: { x: number; y: number; z: number } = { x: 0, y: -9.81, z: 0 }) {
    if (!rapierInitialized) {
      throw new Error('Rapier not initialized. Call initRapier() first.');
    }
    this.world = new RAPIER.World(new RAPIER.Vector3(gravity.x, gravity.y, gravity.z));
    this.scene = scene;
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  setGravity(gravity: { x: number; y: number; z: number }): void {
    this.world.gravity = new RAPIER.Vector3(gravity.x, gravity.y, gravity.z);
  }

  getGravity(): { x: number; y: number; z: number } {
    const g = this.world.gravity;
    return { x: g.x, y: g.y, z: g.z };
  }

  addBody(
    gameObjectId: string,
    mesh: BABYLON.AbstractMesh | BABYLON.TransformNode,
    bodyDesc: Partial<PhysicsBodyDesc> = {},
    colliderDesc: Partial<ColliderDesc> = {}
  ): PhysicsBody {
    if (this.bodies.has(gameObjectId)) {
      this.removeBody(gameObjectId);
    }

    const fullBodyDesc: PhysicsBodyDesc = {
      type: bodyDesc.type || 'dynamic',
      mass: bodyDesc.mass ?? 1,
      friction: bodyDesc.friction ?? 0.5,
      restitution: bodyDesc.restitution ?? 0.3,
      linearDamping: bodyDesc.linearDamping ?? 0,
      angularDamping: bodyDesc.angularDamping ?? 0.05,
      gravityScale: bodyDesc.gravityScale ?? 1,
      lockRotationX: bodyDesc.lockRotationX ?? false,
      lockRotationY: bodyDesc.lockRotationY ?? false,
      lockRotationZ: bodyDesc.lockRotationZ ?? false,
      ccd: bodyDesc.ccd ?? false,
    };

    const fullColliderDesc: ColliderDesc = {
      shape: colliderDesc.shape || 'box',
      halfExtents: colliderDesc.halfExtents || { x: 0.5, y: 0.5, z: 0.5 },
      radius: colliderDesc.radius ?? 0.5,
      halfHeight: colliderDesc.halfHeight ?? 0.5,
      isTrigger: colliderDesc.isTrigger ?? false,
      density: colliderDesc.density ?? 1,
      friction: colliderDesc.friction ?? fullBodyDesc.friction,
      restitution: colliderDesc.restitution ?? fullBodyDesc.restitution,
      offset: colliderDesc.offset || { x: 0, y: 0, z: 0 },
    };

    let rbDesc: RAPIER.RigidBodyDesc;
    switch (fullBodyDesc.type) {
      case 'dynamic':
        rbDesc = RAPIER.RigidBodyDesc.dynamic();
        break;
      case 'kinematicPosition':
        rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'kinematicVelocity':
        rbDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased();
        break;
      case 'fixed':
      default:
        rbDesc = RAPIER.RigidBodyDesc.fixed();
        break;
    }

    const pos = mesh.position || BABYLON.Vector3.Zero();
    rbDesc.setTranslation(pos.x, pos.y, pos.z);

    if (mesh.rotationQuaternion) {
      rbDesc.setRotation({ x: mesh.rotationQuaternion.x, y: mesh.rotationQuaternion.y, z: mesh.rotationQuaternion.z, w: mesh.rotationQuaternion.w });
    }

    rbDesc.setLinearDamping(fullBodyDesc.linearDamping);
    rbDesc.setAngularDamping(fullBodyDesc.angularDamping);
    rbDesc.setGravityScale(fullBodyDesc.gravityScale);
    rbDesc.setCcdEnabled(fullBodyDesc.ccd);

    const rigidBody = this.world.createRigidBody(rbDesc);

    if (fullBodyDesc.lockRotationX || fullBodyDesc.lockRotationY || fullBodyDesc.lockRotationZ) {
      rigidBody.setEnabledRotations(
        !fullBodyDesc.lockRotationX,
        !fullBodyDesc.lockRotationY,
        !fullBodyDesc.lockRotationZ,
        true
      );
    }

    let colDesc: RAPIER.ColliderDesc;
    const he = fullColliderDesc.halfExtents;
    switch (fullColliderDesc.shape) {
      case 'sphere':
        colDesc = RAPIER.ColliderDesc.ball(fullColliderDesc.radius);
        break;
      case 'capsule':
        colDesc = RAPIER.ColliderDesc.capsule(fullColliderDesc.halfHeight, fullColliderDesc.radius);
        break;
      case 'cylinder':
        colDesc = RAPIER.ColliderDesc.cylinder(fullColliderDesc.halfHeight, fullColliderDesc.radius);
        break;
      case 'trimesh': {
        const trimeshData = this.extractTrimeshData(mesh);
        if (trimeshData) {
          colDesc = RAPIER.ColliderDesc.trimesh(trimeshData.vertices, trimeshData.indices);
        } else {
          colDesc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z);
        }
        break;
      }
      case 'convexHull': {
        const hullVerts = this.extractVertices(mesh);
        if (hullVerts) {
          const hull = RAPIER.ColliderDesc.convexHull(hullVerts);
          colDesc = hull || RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z);
        } else {
          colDesc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z);
        }
        break;
      }
      case 'box':
      default:
        colDesc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z);
        break;
    }

    colDesc.setDensity(fullColliderDesc.density);
    colDesc.setFriction(fullColliderDesc.friction);
    colDesc.setRestitution(fullColliderDesc.restitution);
    colDesc.setSensor(fullColliderDesc.isTrigger);

    if (fullColliderDesc.offset.x !== 0 || fullColliderDesc.offset.y !== 0 || fullColliderDesc.offset.z !== 0) {
      colDesc.setTranslation(fullColliderDesc.offset.x, fullColliderDesc.offset.y, fullColliderDesc.offset.z);
    }

    colDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.createCollider(colDesc, rigidBody);

    this.colliderToId.set(collider.handle, gameObjectId);

    const body: PhysicsBody = { gameObjectId, rigidBody, collider, mesh, bodyDesc: fullBodyDesc, colliderDesc: fullColliderDesc };
    this.bodies.set(gameObjectId, body);
    return body;
  }

  removeBody(gameObjectId: string): void {
    const body = this.bodies.get(gameObjectId);
    if (!body) return;
    this.colliderToId.delete(body.collider.handle);
    this.world.removeRigidBody(body.rigidBody);
    this.bodies.delete(gameObjectId);
  }

  getBody(gameObjectId: string): PhysicsBody | undefined {
    return this.bodies.get(gameObjectId);
  }

  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  step(dt: number): void {
    this.timeAccumulator += dt;
    let steps = 0;
    while (this.timeAccumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
      this.world.step(this.eventQueue);
      steps++;
      this.timeAccumulator -= this.fixedTimeStep;
    }
    if (this.timeAccumulator > this.fixedTimeStep * this.maxSubSteps) {
      this.timeAccumulator = 0;
    }

    this.processEvents();
    this.syncMeshes();

    if (this.debugEnabled) {
      this.renderDebug();
    }
  }

  private processEvents(): void {
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const id1 = this.colliderToId.get(handle1);
      const id2 = this.colliderToId.get(handle2);

      const col1 = this.world.getCollider(handle1);
      const col2 = this.world.getCollider(handle2);
      const isSensor1 = col1?.isSensor() ?? false;
      const isSensor2 = col2?.isSensor() ?? false;

      if (isSensor1 || isSensor2) {
        const sensorId = isSensor1 ? id1 : id2;
        const otherId = isSensor1 ? id2 : id1;
        if (sensorId && otherId) {
          this.triggerCallbacks.forEach(cb => cb({ sensorId, otherId, started }));
        }
      } else {
        if (id1 && id2) {
          this.contactCallbacks.forEach(cb => cb({ bodyA: id1, bodyB: id2, started }));
        }
      }
    });
  }

  private syncMeshes(): void {
    this.bodies.forEach((body) => {
      if (body.bodyDesc.type === 'fixed') return;

      if (body.bodyDesc.type === 'kinematicPosition' || body.bodyDesc.type === 'kinematicVelocity') {
        const pos = body.mesh.position;
        body.rigidBody.setNextKinematicTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z));
        if (body.mesh.rotationQuaternion) {
          body.rigidBody.setNextKinematicRotation({
            x: body.mesh.rotationQuaternion.x,
            y: body.mesh.rotationQuaternion.y,
            z: body.mesh.rotationQuaternion.z,
            w: body.mesh.rotationQuaternion.w,
          });
        }
      } else {
        const translation = body.rigidBody.translation();
        const rotation = body.rigidBody.rotation();
        body.mesh.position.set(translation.x, translation.y, translation.z);
        if (!body.mesh.rotationQuaternion) {
          body.mesh.rotationQuaternion = new BABYLON.Quaternion();
        }
        body.mesh.rotationQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    });
  }

  applyForce(gameObjectId: string, force: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(gameObjectId);
    if (body && body.bodyDesc.type === 'dynamic') {
      body.rigidBody.addForce(new RAPIER.Vector3(force.x, force.y, force.z), true);
    }
  }

  applyImpulse(gameObjectId: string, impulse: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(gameObjectId);
    if (body && body.bodyDesc.type === 'dynamic') {
      body.rigidBody.applyImpulse(new RAPIER.Vector3(impulse.x, impulse.y, impulse.z), true);
    }
  }

  applyTorque(gameObjectId: string, torque: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(gameObjectId);
    if (body && body.bodyDesc.type === 'dynamic') {
      body.rigidBody.addTorque(new RAPIER.Vector3(torque.x, torque.y, torque.z), true);
    }
  }

  setLinearVelocity(gameObjectId: string, vel: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(gameObjectId);
    if (body) {
      body.rigidBody.setLinvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true);
    }
  }

  getLinearVelocity(gameObjectId: string): { x: number; y: number; z: number } | null {
    const body = this.bodies.get(gameObjectId);
    if (!body) return null;
    const v = body.rigidBody.linvel();
    return { x: v.x, y: v.y, z: v.z };
  }

  setAngularVelocity(gameObjectId: string, vel: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(gameObjectId);
    if (body) {
      body.rigidBody.setAngvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true);
    }
  }

  raycast(origin: BABYLON.Vector3, direction: BABYLON.Vector3, maxDist: number = 100): RaycastHit | null {
    const ray = new RAPIER.Ray(
      new RAPIER.Vector3(origin.x, origin.y, origin.z),
      new RAPIER.Vector3(direction.x, direction.y, direction.z)
    );
    const hit = this.world.castRay(ray, maxDist, true);
    if (!hit) return null;
    const point = ray.pointAt(hit.timeOfImpact);
    const normal = hit.collider.castRayAndGetNormal(ray, maxDist, true);
    const n = normal ? { x: normal.normal.x, y: normal.normal.y, z: normal.normal.z } : { x: 0, y: 1, z: 0 };
    return {
      point: new BABYLON.Vector3(point.x, point.y, point.z),
      normal: new BABYLON.Vector3(n.x, n.y, n.z),
      distance: hit.timeOfImpact,
      gameObjectId: this.colliderToId.get(hit.collider.handle) || null,
      collider: hit.collider,
    };
  }

  raycastAll(origin: BABYLON.Vector3, direction: BABYLON.Vector3, maxDist: number = 100): RaycastHit[] {
    const ray = new RAPIER.Ray(
      new RAPIER.Vector3(origin.x, origin.y, origin.z),
      new RAPIER.Vector3(direction.x, direction.y, direction.z)
    );
    const hits: RaycastHit[] = [];
    this.world.intersectionsWithRay(ray, maxDist, true, (intersection) => {
      const point = ray.pointAt(intersection.timeOfImpact);
      const normal = intersection.normal;
      hits.push({
        point: new BABYLON.Vector3(point.x, point.y, point.z),
        normal: new BABYLON.Vector3(normal.x, normal.y, normal.z),
        distance: intersection.timeOfImpact,
        gameObjectId: this.colliderToId.get(intersection.collider.handle) || null,
        collider: intersection.collider,
      });
      return true;
    });
    return hits;
  }

  overlapSphere(center: BABYLON.Vector3, radius: number): string[] {
    const shape = new RAPIER.Ball(radius);
    const shapePos = new RAPIER.Vector3(center.x, center.y, center.z);
    const shapeRot = { x: 0, y: 0, z: 0, w: 1 };
    const results: string[] = [];
    this.world.intersectionsWithShape(shapePos, shapeRot, shape, (collider) => {
      const id = this.colliderToId.get(collider.handle);
      if (id) results.push(id);
      return true;
    });
    return results;
  }

  onContact(callback: ContactCallback): () => void {
    this.contactCallbacks.push(callback);
    return () => {
      const idx = this.contactCallbacks.indexOf(callback);
      if (idx >= 0) this.contactCallbacks.splice(idx, 1);
    };
  }

  onTrigger(callback: TriggerCallback): () => void {
    this.triggerCallbacks.push(callback);
    return () => {
      const idx = this.triggerCallbacks.indexOf(callback);
      if (idx >= 0) this.triggerCallbacks.splice(idx, 1);
    };
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (!enabled) this.clearDebugLines();
  }

  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  getBodyCount(): number {
    return this.bodies.size;
  }

  getWorldStats(): { bodies: number; colliders: number; contacts: number } {
    return {
      bodies: this.world.bodies.len(),
      colliders: this.world.colliders.len(),
      contacts: 0,
    };
  }

  private renderDebug(): void {
    this.clearDebugLines();
    const buffers = this.world.debugRender();
    const vertices = buffers.vertices;
    const colors = buffers.colors;

    if (vertices.length < 6) return;

    const lines: BABYLON.Vector3[][] = [];
    const lineColors: BABYLON.Color4[][] = [];
    for (let i = 0; i < vertices.length; i += 6) {
      lines.push([
        new BABYLON.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]),
        new BABYLON.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]),
      ]);
      const ci = (i / 6) * 8;
      lineColors.push([
        new BABYLON.Color4(colors[ci] || 0, colors[ci + 1] || 1, colors[ci + 2] || 0, 1),
        new BABYLON.Color4(colors[ci + 4] || 0, colors[ci + 5] || 1, colors[ci + 6] || 0, 1),
      ]);
    }

    const lineSystem = BABYLON.MeshBuilder.CreateLineSystem('rapierDebug', { lines, colors: lineColors }, this.scene);
    lineSystem.isPickable = false;
    lineSystem.alwaysSelectAsActiveMesh = true;
    this.debugLines.push(lineSystem);
  }

  private clearDebugLines(): void {
    this.debugLines.forEach(l => l.dispose());
    this.debugLines = [];
  }

  private extractTrimeshData(mesh: BABYLON.AbstractMesh | BABYLON.TransformNode): { vertices: Float32Array; indices: Uint32Array } | null {
    if (mesh instanceof BABYLON.Mesh) {
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = mesh.getIndices();
      if (positions && indices) {
        return { vertices: new Float32Array(positions), indices: new Uint32Array(indices) };
      }
    }
    const childMeshes = mesh.getChildMeshes();
    if (childMeshes.length > 0) {
      const firstMesh = childMeshes[0] as BABYLON.Mesh;
      if (firstMesh.getVerticesData) {
        const positions = firstMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = firstMesh.getIndices();
        if (positions && indices) {
          return { vertices: new Float32Array(positions), indices: new Uint32Array(indices) };
        }
      }
    }
    return null;
  }

  private extractVertices(mesh: BABYLON.AbstractMesh | BABYLON.TransformNode): Float32Array | null {
    if (mesh instanceof BABYLON.Mesh) {
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (positions) return new Float32Array(positions);
    }
    const childMeshes = mesh.getChildMeshes();
    if (childMeshes.length > 0) {
      const firstMesh = childMeshes[0] as BABYLON.Mesh;
      if (firstMesh.getVerticesData) {
        const positions = firstMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions) return new Float32Array(positions);
      }
    }
    return null;
  }

  autoFitCollider(mesh: BABYLON.AbstractMesh | BABYLON.TransformNode): Partial<ColliderDesc> {
    let boundingInfo: BABYLON.BoundingInfo | null = null;
    if (mesh instanceof BABYLON.AbstractMesh) {
      mesh.computeWorldMatrix(true);
      boundingInfo = mesh.getBoundingInfo();
    } else {
      const children = mesh.getChildMeshes();
      if (children.length > 0) {
        children[0].computeWorldMatrix(true);
        boundingInfo = children[0].getBoundingInfo();
      }
    }
    if (!boundingInfo) {
      return { shape: 'box', halfExtents: { x: 0.5, y: 0.5, z: 0.5 } };
    }
    const size = boundingInfo.boundingBox.extendSize;
    const center = boundingInfo.boundingBox.center;
    return {
      shape: 'box',
      halfExtents: { x: Math.max(size.x, 0.01), y: Math.max(size.y, 0.01), z: Math.max(size.z, 0.01) },
      offset: { x: center.x - mesh.position.x, y: center.y - mesh.position.y, z: center.z - mesh.position.z },
    };
  }

  createGround(width: number = 100, depth: number = 100, y: number = 0): PhysicsBody {
    const ground = BABYLON.MeshBuilder.CreateGround('rapierGround', { width, height: depth }, this.scene);
    ground.position.y = y;
    ground.isPickable = false;
    ground.visibility = 0;
    this.helperMeshes.push(ground);
    return this.addBody('__rapier_ground__', ground,
      { type: 'fixed', mass: 0 },
      { shape: 'box', halfExtents: { x: width / 2, y: 0.01, z: depth / 2 } }
    );
  }

  dispose(): void {
    this.clearDebugLines();
    this.helperMeshes.forEach(m => m.dispose());
    this.helperMeshes = [];
    this.bodies.clear();
    this.colliderToId.clear();
    this.contactCallbacks = [];
    this.triggerCallbacks = [];
    this.world.free();
    this.eventQueue.free();
  }
}

let activeWorld: RapierPhysicsWorld | null = null;

export function getPhysicsWorld(): RapierPhysicsWorld | null {
  return activeWorld;
}

export function setPhysicsWorld(world: RapierPhysicsWorld | null): void {
  activeWorld = world;
}

export async function createPhysicsWorld(
  scene: BABYLON.Scene,
  gravity?: { x: number; y: number; z: number }
): Promise<RapierPhysicsWorld> {
  await initRapier();
  const world = new RapierPhysicsWorld(scene, gravity);
  activeWorld = world;
  return world;
}
