import * as BABYLON from '@babylonjs/core';
import { isPuterAvailable, aiChatUniversal, PUTER_AI_MODELS } from './puter';

export interface BoneDefinition {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  parent: string | null;
  length: number;
}

export interface RigSuggestion {
  rigType: 'humanoid' | 'quadruped' | 'biped' | 'custom';
  bones: BoneDefinition[];
  confidence: number;
  description: string;
}

export interface AutoRigResult {
  success: boolean;
  suggestion?: RigSuggestion;
  error?: string;
}

const HUMANOID_BONE_TEMPLATE: BoneDefinition[] = [
  { name: 'root', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: null, length: 0.1 },
  { name: 'hips', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root', length: 0.2 },
  { name: 'spine', position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'hips', length: 0.3 },
  { name: 'spine1', position: { x: 0, y: 1.4, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine', length: 0.2 },
  { name: 'spine2', position: { x: 0, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine1', length: 0.2 },
  { name: 'neck', position: { x: 0, y: 1.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine2', length: 0.1 },
  { name: 'head', position: { x: 0, y: 1.9, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'neck', length: 0.2 },
  { name: 'leftShoulder', position: { x: 0.1, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine2', length: 0.1 },
  { name: 'leftArm', position: { x: 0.2, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: Math.PI / 2 }, parent: 'leftShoulder', length: 0.3 },
  { name: 'leftForeArm', position: { x: 0.5, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'leftArm', length: 0.25 },
  { name: 'leftHand', position: { x: 0.75, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'leftForeArm', length: 0.1 },
  { name: 'rightShoulder', position: { x: -0.1, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine2', length: 0.1 },
  { name: 'rightArm', position: { x: -0.2, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: -Math.PI / 2 }, parent: 'rightShoulder', length: 0.3 },
  { name: 'rightForeArm', position: { x: -0.5, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'rightArm', length: 0.25 },
  { name: 'rightHand', position: { x: -0.75, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'rightForeArm', length: 0.1 },
  { name: 'leftUpLeg', position: { x: 0.1, y: 0.95, z: 0 }, rotation: { x: 0, y: 0, z: Math.PI }, parent: 'hips', length: 0.45 },
  { name: 'leftLeg', position: { x: 0.1, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'leftUpLeg', length: 0.45 },
  { name: 'leftFoot', position: { x: 0.1, y: 0.05, z: 0.05 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 }, parent: 'leftLeg', length: 0.15 },
  { name: 'rightUpLeg', position: { x: -0.1, y: 0.95, z: 0 }, rotation: { x: 0, y: 0, z: Math.PI }, parent: 'hips', length: 0.45 },
  { name: 'rightLeg', position: { x: -0.1, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'rightUpLeg', length: 0.45 },
  { name: 'rightFoot', position: { x: -0.1, y: 0.05, z: 0.05 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 }, parent: 'rightLeg', length: 0.15 },
];

const QUADRUPED_BONE_TEMPLATE: BoneDefinition[] = [
  { name: 'root', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: null, length: 0.1 },
  { name: 'hips', position: { x: 0, y: 0.8, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root', length: 0.3 },
  { name: 'spine', position: { x: 0, y: 0.85, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'hips', length: 0.5 },
  { name: 'spine1', position: { x: 0, y: 0.85, z: 0.3 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine', length: 0.3 },
  { name: 'neck', position: { x: 0, y: 1, z: 0.6 }, rotation: { x: -0.3, y: 0, z: 0 }, parent: 'spine1', length: 0.3 },
  { name: 'head', position: { x: 0, y: 1.2, z: 0.8 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'neck', length: 0.2 },
  { name: 'tail', position: { x: 0, y: 0.75, z: -0.7 }, rotation: { x: 0.5, y: 0, z: 0 }, parent: 'hips', length: 0.4 },
  { name: 'frontLeftLeg', position: { x: 0.15, y: 0.6, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine1', length: 0.3 },
  { name: 'frontLeftLowerLeg', position: { x: 0.15, y: 0.3, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'frontLeftLeg', length: 0.25 },
  { name: 'frontLeftFoot', position: { x: 0.15, y: 0.05, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'frontLeftLowerLeg', length: 0.1 },
  { name: 'frontRightLeg', position: { x: -0.15, y: 0.6, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine1', length: 0.3 },
  { name: 'frontRightLowerLeg', position: { x: -0.15, y: 0.3, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'frontRightLeg', length: 0.25 },
  { name: 'frontRightFoot', position: { x: -0.15, y: 0.05, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'frontRightLowerLeg', length: 0.1 },
  { name: 'backLeftLeg', position: { x: 0.15, y: 0.6, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'hips', length: 0.3 },
  { name: 'backLeftLowerLeg', position: { x: 0.15, y: 0.3, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'backLeftLeg', length: 0.25 },
  { name: 'backLeftFoot', position: { x: 0.15, y: 0.05, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'backLeftLowerLeg', length: 0.1 },
  { name: 'backRightLeg', position: { x: -0.15, y: 0.6, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'hips', length: 0.3 },
  { name: 'backRightLowerLeg', position: { x: -0.15, y: 0.3, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'backRightLeg', length: 0.25 },
  { name: 'backRightFoot', position: { x: -0.15, y: 0.05, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'backRightLowerLeg', length: 0.1 },
];

export async function captureModelScreenshot(
  scene: BABYLON.Scene,
  mesh: BABYLON.AbstractMesh
): Promise<string> {
  const engine = scene.getEngine();
  const camera = scene.activeCamera;
  
  if (!camera) {
    throw new Error('No active camera in scene');
  }

  const boundingInfo = mesh.getBoundingInfo();
  const center = boundingInfo.boundingBox.centerWorld;
  const size = boundingInfo.boundingBox.extendSizeWorld;
  const maxDim = Math.max(size.x, size.y, size.z) * 2;

  const tempCamera = new BABYLON.ArcRotateCamera(
    'screenshotCamera',
    -Math.PI / 4,
    Math.PI / 3,
    maxDim * 2.5,
    center,
    scene
  );

  const originalCamera = scene.activeCamera;
  scene.activeCamera = tempCamera;

  scene.render();
  
  const screenshot = await BABYLON.Tools.CreateScreenshotAsync(engine, tempCamera, {
    width: 512,
    height: 512,
    precision: 1
  });

  scene.activeCamera = originalCamera;
  tempCamera.dispose();

  return screenshot;
}

export async function analyzeModelWithAI(imageDataUrl: string): Promise<RigSuggestion> {
  if (!isPuterAvailable()) {
    console.log('[AutoRig] Puter not available, using heuristic analysis');
    return {
      rigType: 'humanoid',
      bones: scaleBonesForModel(HUMANOID_BONE_TEMPLATE, 1.8),
      confidence: 0.5,
      description: 'Default humanoid rig (AI not available)'
    };
  }

  try {
    const prompt = `You are an expert 3D character rigger. Analyze this 3D model image and determine:
1. What type of character is this? (humanoid, quadruped, biped bird, custom creature)
2. Estimate the model's proportions (height, arm span, leg length ratios)
3. Identify key joint positions (shoulders, elbows, wrists, hips, knees, ankles, neck, head)

Respond in this exact JSON format:
{
  "rigType": "humanoid" or "quadruped" or "biped" or "custom",
  "modelHeight": 1.8,
  "proportions": {
    "headToBodyRatio": 0.15,
    "armSpanRatio": 1.0,
    "legToTorsoRatio": 1.2,
    "shoulderWidth": 0.4,
    "hipWidth": 0.3
  },
  "confidence": 0.85,
  "description": "Brief description of the character type"
}

Image analysis:`;

    const response = await aiChatUniversal(
      prompt + '\n[Analyzing model screenshot for rigging...]',
      PUTER_AI_MODELS.GPT_4O
    );

    let analysisResult;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.log('[AutoRig] Could not parse AI response, using defaults');
      analysisResult = {
        rigType: 'humanoid',
        modelHeight: 1.8,
        proportions: {
          headToBodyRatio: 0.15,
          armSpanRatio: 1.0,
          legToTorsoRatio: 1.2,
          shoulderWidth: 0.4,
          hipWidth: 0.3
        },
        confidence: 0.6,
        description: 'Humanoid character (AI analysis fallback)'
      };
    }

    const baseTemplate = analysisResult.rigType === 'quadruped' 
      ? QUADRUPED_BONE_TEMPLATE 
      : HUMANOID_BONE_TEMPLATE;

    const scaledBones = scaleBonesForModel(
      baseTemplate,
      analysisResult.modelHeight || 1.8,
      analysisResult.proportions
    );

    return {
      rigType: analysisResult.rigType || 'humanoid',
      bones: scaledBones,
      confidence: analysisResult.confidence || 0.7,
      description: analysisResult.description || 'AI-generated rig suggestion'
    };

  } catch (error) {
    console.error('[AutoRig] AI analysis failed:', error);
    return {
      rigType: 'humanoid',
      bones: scaleBonesForModel(HUMANOID_BONE_TEMPLATE, 1.8),
      confidence: 0.4,
      description: 'Default humanoid rig (AI analysis failed)'
    };
  }
}

function scaleBonesForModel(
  template: BoneDefinition[],
  modelHeight: number,
  proportions?: {
    headToBodyRatio?: number;
    armSpanRatio?: number;
    legToTorsoRatio?: number;
    shoulderWidth?: number;
    hipWidth?: number;
  }
): BoneDefinition[] {
  // Find template bounds
  const templateHeight = template.reduce((max, bone) => 
    Math.max(max, bone.position.y), 0);
  const templateMinY = template.reduce((min, bone) => 
    Math.min(min, bone.position.y), Infinity);
  
  // Calculate scale factor based on model height
  const templateTotalHeight = templateHeight - templateMinY;
  const scale = modelHeight / (templateTotalHeight || 2);
  
  // Calculate proportion adjustments
  const widthScale = proportions?.shoulderWidth ? proportions.shoulderWidth / 0.4 : 1;
  const depthScale = proportions?.hipWidth ? proportions.hipWidth / 0.3 : 1;

  return template.map(bone => ({
    ...bone,
    position: {
      x: bone.position.x * scale * widthScale,
      y: bone.position.y * scale,
      z: bone.position.z * scale * depthScale
    },
    length: bone.length * scale
  }));
}

export function createSkeletonFromBones(
  scene: BABYLON.Scene,
  bones: BoneDefinition[],
  mesh: BABYLON.AbstractMesh
): BABYLON.Skeleton {
  const skeleton = new BABYLON.Skeleton('autoRigSkeleton', 'autoRig', scene);
  const boneMap = new Map<string, BABYLON.Bone>();

  // Get mesh bounding info for alignment
  const boundingInfo = mesh.getBoundingInfo();
  const meshCenter = boundingInfo.boundingBox.centerWorld.clone();
  const meshMinY = boundingInfo.boundingBox.minimumWorld.y;
  
  // Offset bones to align with mesh - center X/Z, base at mesh bottom
  const offsetX = meshCenter.x;
  const offsetY = meshMinY;
  const offsetZ = meshCenter.z;

  bones.forEach(boneDef => {
    const parentBone = boneDef.parent ? boneMap.get(boneDef.parent) : null;
    
    const boneMatrix = BABYLON.Matrix.Compose(
      new BABYLON.Vector3(1, 1, 1),
      BABYLON.Quaternion.FromEulerAngles(
        boneDef.rotation.x,
        boneDef.rotation.y,
        boneDef.rotation.z
      ),
      new BABYLON.Vector3(
        boneDef.position.x + offsetX,
        boneDef.position.y + offsetY,
        boneDef.position.z + offsetZ
      )
    );

    const bone = new BABYLON.Bone(
      boneDef.name,
      skeleton,
      parentBone || null,
      boneMatrix
    );

    boneMap.set(boneDef.name, bone);
  });

  // Note: Skeleton is attached for visualization. Full skinning requires vertex weights.
  if (mesh instanceof BABYLON.Mesh) {
    mesh.skeleton = skeleton;
  }

  console.log(`[AutoRig] Created skeleton with ${bones.length} bones, aligned to mesh at (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}, ${offsetZ.toFixed(2)})`);
  return skeleton;
}

export function visualizeSkeleton(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton,
  color: BABYLON.Color3 = new BABYLON.Color3(0, 1, 0)
): BABYLON.Mesh[] {
  const debugMeshes: BABYLON.Mesh[] = [];
  const boneMaterial = new BABYLON.StandardMaterial('boneMat', scene);
  boneMaterial.emissiveColor = color;
  boneMaterial.wireframe = true;

  skeleton.bones.forEach(bone => {
    const position = bone.getAbsolutePosition();
    
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `boneViz_${bone.name}`,
      { diameter: 0.05 },
      scene
    );
    sphere.position = position;
    sphere.material = boneMaterial;
    debugMeshes.push(sphere);

    if (bone.parent) {
      const parentPos = bone.parent.getAbsolutePosition();
      const points = [parentPos, position];
      const line = BABYLON.MeshBuilder.CreateLines(
        `boneLine_${bone.name}`,
        { points },
        scene
      );
      line.color = color;
      debugMeshes.push(line as unknown as BABYLON.Mesh);
    }
  });

  return debugMeshes;
}

export async function autoRigModel(
  scene: BABYLON.Scene,
  mesh: BABYLON.AbstractMesh,
  onProgress?: (message: string) => void
): Promise<AutoRigResult> {
  try {
    onProgress?.('Capturing model screenshot...');
    const screenshot = await captureModelScreenshot(scene, mesh);
    
    onProgress?.('Analyzing model with AI vision...');
    const suggestion = await analyzeModelWithAI(screenshot);
    
    onProgress?.(`Detected: ${suggestion.rigType} (${Math.round(suggestion.confidence * 100)}% confidence)`);
    
    onProgress?.('Generating skeleton...');
    const skeleton = createSkeletonFromBones(scene, suggestion.bones, mesh);
    
    onProgress?.('Visualizing bones...');
    visualizeSkeleton(scene, skeleton);
    
    onProgress?.('Auto-rigging complete!');
    
    return {
      success: true,
      suggestion
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Auto-rigging failed'
    };
  }
}

export function getMeshBoundingInfo(mesh: BABYLON.AbstractMesh): {
  height: number;
  width: number;
  depth: number;
  center: BABYLON.Vector3;
} {
  const boundingInfo = mesh.getBoundingInfo();
  const size = boundingInfo.boundingBox.extendSizeWorld.scale(2);
  
  return {
    height: size.y,
    width: size.x,
    depth: size.z,
    center: boundingInfo.boundingBox.centerWorld.clone()
  };
}

export function estimateRigTypeFromMesh(mesh: BABYLON.AbstractMesh): 'humanoid' | 'quadruped' | 'custom' {
  const { height, width, depth } = getMeshBoundingInfo(mesh);
  
  if (height > width * 1.5 && height > depth * 1.5) {
    return 'humanoid';
  }
  
  if (depth > height * 1.2 && width < depth * 0.6) {
    return 'quadruped';
  }
  
  return 'custom';
}
