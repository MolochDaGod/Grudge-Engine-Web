/**
 * Grudge Engine Units System
 * 
 * Standard: 1 Babylon unit = 1 meter (real world)
 * All measurements should use these constants for consistency.
 */

// Base conversion: Babylon units to real-world measurements
export const METERS_PER_UNIT = 1.0;
export const FEET_PER_METER = 3.28084;
export const INCHES_PER_FOOT = 12;

// Conversion functions
export function feetToUnits(feet: number): number {
  return feet / FEET_PER_METER;
}

export function unitsToFeet(units: number): number {
  return units * FEET_PER_METER;
}

export function metersToUnits(meters: number): number {
  return meters * METERS_PER_UNIT;
}

export function unitsToMeters(units: number): number {
  return units / METERS_PER_UNIT;
}

export function inchesToUnits(inches: number): number {
  const feet = inches / INCHES_PER_FOOT;
  return feetToUnits(feet);
}

export function unitsToInches(units: number): number {
  const feet = unitsToFeet(units);
  return feet * INCHES_PER_FOOT;
}

// Standard character heights (in Babylon units/meters)
export const CHARACTER_HEIGHTS = {
  // Default starting height: 6 feet = 1.83 meters (humanoid standard)
  DEFAULT: feetToUnits(6),           // ~1.83 units
  CHILD: feetToUnits(4),             // ~1.22 units
  SHORT_ADULT: feetToUnits(5),       // ~1.52 units
  AVERAGE_ADULT: feetToUnits(5.5),   // ~1.68 units
  TALL_ADULT: feetToUnits(6.5),      // ~1.98 units
  GIANT: feetToUnits(10),            // ~3.05 units
};

// Standard object sizes for reference
export const STANDARD_SIZES = {
  DOOR_HEIGHT: feetToUnits(7),       // ~2.13 units (standard door)
  DOOR_WIDTH: feetToUnits(3),        // ~0.91 units
  TABLE_HEIGHT: feetToUnits(2.5),    // ~0.76 units
  CHAIR_HEIGHT: feetToUnits(1.5),    // ~0.46 units (seat height)
  STEP_HEIGHT: feetToUnits(0.58),    // ~0.18 units (7 inch stair)
};

// ============================================================================
// COMPREHENSIVE REAL-WORLD SIZE REFERENCE
// All values in Babylon units (1 unit = 1 meter)
// ============================================================================

// Architecture & Buildings
export const ARCHITECTURE = {
  // Walls & Rooms
  WALL_HEIGHT_STANDARD: 2.4,      // 8ft - standard residential ceiling
  WALL_HEIGHT_TALL: 3.0,          // 10ft - older buildings, commercial
  WALL_HEIGHT_GRAND: 4.5,         // 15ft - grand halls, churches
  WALL_THICKNESS: 0.15,           // 6 inches - standard interior wall
  WALL_THICKNESS_EXTERIOR: 0.3,   // 12 inches - exterior/load-bearing
  
  // Doors
  DOOR_STANDARD: { width: 0.9, height: 2.1 },      // 3x7 ft
  DOOR_DOUBLE: { width: 1.8, height: 2.1 },        // 6x7 ft
  DOOR_GARAGE_SINGLE: { width: 2.7, height: 2.1 }, // 9x7 ft
  DOOR_GARAGE_DOUBLE: { width: 4.8, height: 2.1 }, // 16x7 ft
  
  // Windows
  WINDOW_STANDARD: { width: 0.9, height: 1.2 },    // 3x4 ft
  WINDOW_LARGE: { width: 1.5, height: 1.8 },       // 5x6 ft
  WINDOW_FLOOR_TO_CEILING: { width: 1.2, height: 2.4 },
  WINDOW_SILL_HEIGHT: 0.9,        // Height from floor to window bottom
  
  // Stairs
  STAIR_RISE: 0.18,               // 7 inches - step height
  STAIR_RUN: 0.28,                // 11 inches - step depth
  STAIR_WIDTH: 0.9,               // 3ft minimum residential
  STAIR_WIDTH_GRAND: 1.5,         // 5ft - grand staircase
  HANDRAIL_HEIGHT: 0.9,           // 3ft
  
  // Hallways & Rooms
  HALLWAY_WIDTH: 1.0,             // 3.3ft minimum
  HALLWAY_WIDTH_WIDE: 1.5,        // 5ft comfortable
  ROOM_SMALL: { width: 3.0, depth: 3.0 },     // 10x10 ft bathroom
  ROOM_MEDIUM: { width: 4.0, depth: 4.5 },    // 13x15 ft bedroom
  ROOM_LARGE: { width: 5.5, depth: 6.0 },     // 18x20 ft living room
};

// Furniture
export const FURNITURE = {
  // Seating
  CHAIR_DINING: { width: 0.45, depth: 0.45, height: 0.45, backHeight: 0.9 },
  CHAIR_OFFICE: { width: 0.6, depth: 0.6, height: 0.45, backHeight: 1.0 },
  SOFA_2SEAT: { width: 1.5, depth: 0.85, height: 0.85 },
  SOFA_3SEAT: { width: 2.2, depth: 0.85, height: 0.85 },
  ARMCHAIR: { width: 0.9, depth: 0.85, height: 0.85 },
  STOOL_BAR: { width: 0.4, depth: 0.4, height: 0.75 },
  BENCH: { width: 1.2, depth: 0.4, height: 0.45 },
  
  // Tables
  TABLE_DINING_4: { width: 1.2, depth: 0.75, height: 0.75 },  // 4 person
  TABLE_DINING_6: { width: 1.8, depth: 0.9, height: 0.75 },   // 6 person
  TABLE_DINING_8: { width: 2.4, depth: 1.0, height: 0.75 },   // 8 person
  TABLE_COFFEE: { width: 1.2, depth: 0.6, height: 0.45 },
  TABLE_SIDE: { width: 0.5, depth: 0.5, height: 0.55 },
  TABLE_DESK: { width: 1.5, depth: 0.75, height: 0.75 },
  TABLE_COUNTER: { width: 0.6, depth: 0.6, height: 0.9 },     // Kitchen counter height
  
  // Beds
  BED_SINGLE: { width: 0.9, depth: 1.9, height: 0.55 },       // 3x6.5 ft
  BED_DOUBLE: { width: 1.35, depth: 1.9, height: 0.55 },      // 4.5x6.5 ft
  BED_QUEEN: { width: 1.5, depth: 2.0, height: 0.55 },        // 5x6.5 ft
  BED_KING: { width: 1.9, depth: 2.0, height: 0.55 },         // 6.5x6.5 ft
  
  // Storage
  BOOKSHELF: { width: 0.9, depth: 0.3, height: 1.8 },
  DRESSER: { width: 1.2, depth: 0.5, height: 0.85 },
  WARDROBE: { width: 1.2, depth: 0.6, height: 2.0 },
  CABINET_KITCHEN: { width: 0.6, depth: 0.6, height: 0.85 },
  CABINET_UPPER: { width: 0.6, depth: 0.3, height: 0.75 },
  CHEST: { width: 0.8, depth: 0.5, height: 0.5 },
  CRATE_SMALL: { width: 0.4, depth: 0.4, height: 0.4 },
  CRATE_LARGE: { width: 0.6, depth: 0.6, height: 0.6 },
  BARREL: { diameter: 0.6, height: 0.9 },
};

// Vehicles
export const VEHICLES = {
  // Cars
  CAR_COMPACT: { length: 4.0, width: 1.7, height: 1.4 },
  CAR_SEDAN: { length: 4.7, width: 1.8, height: 1.45 },
  CAR_SUV: { length: 4.8, width: 1.9, height: 1.7 },
  CAR_SPORTS: { length: 4.4, width: 1.9, height: 1.2 },
  CAR_PICKUP: { length: 5.5, width: 2.0, height: 1.9 },
  
  // Trucks & Large
  VAN: { length: 5.0, width: 2.0, height: 2.0 },
  TRUCK_BOX: { length: 7.0, width: 2.4, height: 3.0 },
  TRUCK_SEMI: { length: 6.0, width: 2.5, height: 3.8 },    // Cab only
  BUS: { length: 12.0, width: 2.5, height: 3.0 },
  
  // Two-wheelers
  MOTORCYCLE: { length: 2.2, width: 0.8, height: 1.1 },
  BICYCLE: { length: 1.8, width: 0.5, height: 1.0 },
  
  // Fantasy/Medieval
  HORSE: { length: 2.4, width: 0.6, height: 1.6 },         // At withers
  CART_SMALL: { length: 2.0, width: 1.2, height: 1.0 },
  CART_WAGON: { length: 4.0, width: 1.8, height: 2.0 },
  CARRIAGE: { length: 4.5, width: 1.8, height: 2.5 },
};

// Nature & Environment
export const NATURE = {
  // Trees (height at maturity)
  TREE_BUSH: { height: 1.5, canopyWidth: 1.5 },
  TREE_SMALL: { height: 3.0, canopyWidth: 2.5 },           // ~10ft - Ornamental
  TREE_MEDIUM: { height: feetToUnits(15), canopyWidth: 4.0 }, // 15ft - Apple, birch
  TREE_LARGE: { height: feetToUnits(25), canopyWidth: 6.0 },  // 25ft - Oak, maple
  TREE_TALL: { height: feetToUnits(40), canopyWidth: 8.0 },   // 40ft - Pine, fir
  TREE_GIANT: { height: 40.0, canopyWidth: 15.0 },         // Redwood, sequoia
  TREE_PALM: { height: 10.0, canopyWidth: 4.0 },
  
  // Plants
  GRASS_SHORT: 0.1,              // Lawn grass
  GRASS_TALL: 0.5,               // Wild grass
  FLOWER_SMALL: 0.2,
  FLOWER_TALL: 0.6,
  BUSH_SMALL: 0.6,
  BUSH_MEDIUM: 1.2,
  BUSH_LARGE: 2.0,
  
  // Rocks
  ROCK_PEBBLE: 0.05,
  ROCK_SMALL: 0.3,
  ROCK_MEDIUM: 0.8,
  ROCK_LARGE: 1.5,
  ROCK_BOULDER: 3.0,
  ROCK_MASSIVE: 6.0,
  
  // Water features
  POND_SMALL: { diameter: 3.0, depth: 0.5 },
  POND_MEDIUM: { diameter: 8.0, depth: 1.5 },
  STREAM_WIDTH: 2.0,
  RIVER_WIDTH: 15.0,
  WATERFALL_SMALL: { width: 2.0, height: 3.0 },
};

// Props & Items
export const PROPS = {
  // Weapons (length)
  WEAPON_DAGGER: 0.3,
  WEAPON_SWORD_SHORT: 0.6,
  WEAPON_SWORD_LONG: 1.0,
  WEAPON_SWORD_GREAT: 1.5,
  WEAPON_AXE_HAND: 0.4,
  WEAPON_AXE_BATTLE: 1.2,
  WEAPON_SPEAR: 2.0,
  WEAPON_HALBERD: 2.5,
  WEAPON_BOW: 1.2,
  WEAPON_CROSSBOW: 0.8,
  WEAPON_STAFF: 1.8,
  WEAPON_WAND: 0.35,
  WEAPON_SHIELD_BUCKLER: 0.4,    // Diameter
  WEAPON_SHIELD_ROUND: 0.6,
  WEAPON_SHIELD_KITE: 0.9,       // Height
  
  // Firearms (length)
  GUN_PISTOL: 0.2,
  GUN_REVOLVER: 0.25,
  GUN_SMG: 0.5,
  GUN_RIFLE: 1.0,
  GUN_SHOTGUN: 1.1,
  GUN_SNIPER: 1.3,
  
  // Tools
  TOOL_HAMMER: 0.3,
  TOOL_PICKAXE: 0.9,
  TOOL_SHOVEL: 1.2,
  TOOL_AXE_WOOD: 0.8,
  TOOL_SAW: 0.6,
  TOOL_WRENCH: 0.25,
  
  // Containers
  BOTTLE: 0.25,
  MUG: 0.12,
  PLATE: 0.25,                   // Diameter
  BOWL: 0.15,
  POT_COOKING: 0.3,
  CAULDRON: 0.6,
  BACKPACK: { width: 0.35, depth: 0.2, height: 0.5 },
  SACK: { diameter: 0.4, height: 0.6 },
  
  // Books & Documents
  BOOK_SMALL: { width: 0.12, depth: 0.18, height: 0.02 },
  BOOK_LARGE: { width: 0.25, depth: 0.35, height: 0.05 },
  SCROLL: { diameter: 0.03, length: 0.3 },
  
  // Lighting
  CANDLE: { diameter: 0.02, height: 0.15 },
  TORCH: { length: 0.5 },
  LANTERN: { width: 0.15, height: 0.3 },
  CHANDELIER_SMALL: { diameter: 0.6, height: 0.5 },
  CHANDELIER_LARGE: { diameter: 1.5, height: 1.0 },
  LAMP_TABLE: { diameter: 0.3, height: 0.5 },
  LAMP_FLOOR: { diameter: 0.4, height: 1.6 },
  
  // Miscellaneous
  COIN: { diameter: 0.025, height: 0.002 },
  KEY: 0.08,
  ROPE_COIL: { diameter: 0.4, height: 0.15 },
  LADDER: { width: 0.5, height: 3.0 },
  FLAG: { width: 1.0, height: 0.6 },
  SIGN_POST: { width: 0.6, height: 2.0 },
  WELL: { diameter: 1.2, height: 0.9 },
  FOUNTAIN: { diameter: 3.0, height: 2.0 },
};

// Creatures & Animals
export const CREATURES = {
  // Real Animals (height at shoulder/back)
  ANIMAL_CAT: { length: 0.5, height: 0.25 },
  ANIMAL_DOG_SMALL: { length: 0.5, height: 0.3 },
  ANIMAL_DOG_MEDIUM: { length: 0.8, height: 0.5 },
  ANIMAL_DOG_LARGE: { length: 1.0, height: 0.7 },
  ANIMAL_WOLF: { length: 1.3, height: 0.8 },
  ANIMAL_HORSE: { length: 2.4, height: 1.6 },
  ANIMAL_COW: { length: 2.0, height: 1.4 },
  ANIMAL_PIG: { length: 1.0, height: 0.6 },
  ANIMAL_SHEEP: { length: 1.0, height: 0.7 },
  ANIMAL_DEER: { length: 1.5, height: 1.0 },
  ANIMAL_BEAR: { length: 2.0, height: 1.0 },              // At shoulder
  ANIMAL_LION: { length: 1.8, height: 1.0 },
  ANIMAL_ELEPHANT: { length: 6.0, height: 3.0 },
  
  // Birds (body length, not wingspan)
  BIRD_SMALL: 0.1,               // Sparrow
  BIRD_MEDIUM: 0.3,              // Crow
  BIRD_LARGE: 0.6,               // Eagle body
  BIRD_GIANT: 1.0,               // Ostrich height: 2.5m
  
  // Fantasy Creatures
  CREATURE_GOBLIN: 1.0,          // Height
  CREATURE_ORC: 1.9,
  CREATURE_OGRE: 2.8,
  CREATURE_TROLL: 3.5,
  CREATURE_GIANT: 6.0,
  CREATURE_DRAGON_SMALL: { length: 3.0, height: feetToUnits(8), wingspan: 5.0 },   // 8ft tall
  CREATURE_DRAGON_MEDIUM: { length: 6.0, height: feetToUnits(13), wingspan: 10.0 }, // 12-14ft tall
  CREATURE_DRAGON_LARGE: { length: 12.0, height: feetToUnits(22), wingspan: 20.0 }, // 22ft tall
  CREATURE_SPIDER_GIANT: { legSpan: 3.0, bodyHeight: 1.0 },
  CREATURE_SNAKE_GIANT: { length: 8.0, bodyDiameter: 0.4 },
  
  // Undead
  CREATURE_SKELETON: 1.7,        // Human-sized
  CREATURE_ZOMBIE: 1.7,
  CREATURE_GHOUL: 1.5,
  CREATURE_WRAITH: 2.0,
};

// Helper function to auto-scale imported models to target real-world size
export function autoScaleToRealWorld(
  currentBoundingHeight: number,
  targetCategory: 'character' | 'furniture' | 'vehicle' | 'nature' | 'prop',
  specificType?: string
): { scale: number; targetHeight: number; message: string } {
  let targetHeight = 1.0; // Default 1 meter
  let typeName = 'object';
  
  switch (targetCategory) {
    case 'character':
      targetHeight = CHARACTER_HEIGHTS.DEFAULT;
      typeName = 'character (4ft)';
      break;
    case 'furniture':
      targetHeight = FURNITURE.CHAIR_DINING.height;
      typeName = 'chair height';
      break;
    case 'vehicle':
      targetHeight = VEHICLES.CAR_SEDAN.height;
      typeName = 'car height';
      break;
    case 'nature':
      targetHeight = NATURE.TREE_MEDIUM.height;
      typeName = 'medium tree';
      break;
    case 'prop':
      targetHeight = PROPS.WEAPON_SWORD_LONG;
      typeName = 'sword length';
      break;
  }
  
  const scale = targetHeight / currentBoundingHeight;
  
  return {
    scale,
    targetHeight,
    message: `Scaled to ${formatHeight(targetHeight)} (${typeName})`
  };
}

// Quick reference for common size comparisons
export function getSizeReference(heightInUnits: number): string {
  const feet = unitsToFeet(heightInUnits);
  
  if (heightInUnits < 0.1) return 'coin-sized';
  if (heightInUnits < 0.3) return 'book-sized';
  if (heightInUnits < 0.5) return 'chair-height';
  if (heightInUnits < 1.0) return 'waist-height';
  if (heightInUnits < 1.5) return 'child-height';
  if (heightInUnits < 2.0) return 'person-height';
  if (heightInUnits < 3.0) return 'door-height';
  if (heightInUnits < 5.0) return 'room-height';
  if (heightInUnits < 10.0) return 'small-tree';
  if (heightInUnits < 20.0) return 'large-tree';
  if (heightInUnits < 50.0) return 'building-height';
  return 'massive structure';
}

// Grid and snap settings
export const GRID_SETTINGS = {
  SMALL_GRID: 0.25,    // 25cm snap
  MEDIUM_GRID: 0.5,    // 50cm snap
  LARGE_GRID: 1.0,     // 1m snap
  EXTRA_LARGE: 2.0,    // 2m snap
};

// Calculate scale factor to make a mesh a target height
export function calculateScaleForHeight(currentHeight: number, targetHeightFeet: number): number {
  const targetUnits = feetToUnits(targetHeightFeet);
  if (currentHeight <= 0) return 1;
  return targetUnits / currentHeight;
}

// Calculate scale factor to fit mesh to target units directly
export function calculateScaleForUnits(currentHeight: number, targetUnits: number): number {
  if (currentHeight <= 0) return 1;
  return targetUnits / currentHeight;
}

// Format height for display
export function formatHeight(units: number, useMetric: boolean = false): string {
  if (useMetric) {
    const meters = unitsToMeters(units);
    if (meters < 1) {
      return `${(meters * 100).toFixed(0)}cm`;
    }
    return `${meters.toFixed(2)}m`;
  } else {
    const totalInches = unitsToInches(units);
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    if (feet === 0) {
      return `${inches}"`;
    }
    return `${feet}'${inches}"`;
  }
}

// Polygon count guidelines for performance
export const POLY_BUDGET = {
  // Per-object recommendations
  BACKGROUND_PROP: 500,        // Trees, rocks, simple objects
  FOREGROUND_PROP: 2000,       // Interactive objects, furniture
  CHARACTER_LOW: 5000,         // Mobile/simple characters
  CHARACTER_MED: 15000,        // Standard game characters
  CHARACTER_HIGH: 30000,       // Hero/main characters
  VEHICLE: 20000,              // Cars, mounts
  ENVIRONMENT_CHUNK: 50000,    // Terrain sections
  
  // Scene totals
  SCENE_MOBILE: 100000,        // Mobile game target
  SCENE_STANDARD: 500000,      // Standard PC game
  SCENE_HIGH_END: 2000000,     // High-end PC
};

// LOD (Level of Detail) distance thresholds
export const LOD_DISTANCES = {
  HIGH_DETAIL: 10,      // Full detail within 10 units
  MEDIUM_DETAIL: 30,    // Medium detail 10-30 units
  LOW_DETAIL: 60,       // Low detail 30-60 units
  BILLBOARD: 100,       // Billboard/impostor beyond 60 units
};

// Validate mesh polygon count
// Note: Pass triangle count directly (indices / 3), not vertex count
export function validatePolyCount(triangleCount: number, category: keyof typeof POLY_BUDGET): {
  valid: boolean;
  percentage: number;
  message: string;
} {
  const budget = POLY_BUDGET[category];
  const percentage = (triangleCount / budget) * 100;
  
  if (percentage <= 100) {
    return {
      valid: true,
      percentage,
      message: `${triangleCount.toLocaleString()} tris (${percentage.toFixed(0)}% of ${category} budget)`
    };
  } else {
    return {
      valid: false,
      percentage,
      message: `${triangleCount.toLocaleString()} tris exceeds ${category} budget by ${(percentage - 100).toFixed(0)}%`
    };
  }
}

// Calculate triangle count from mesh indices (or estimate from vertices if no indices)
export function getTriangleCount(mesh: { getTotalIndices?: () => number; getTotalVertices?: () => number }): number {
  // Prefer indices for accurate triangle count
  if (mesh.getTotalIndices && mesh.getTotalIndices() > 0) {
    return Math.floor(mesh.getTotalIndices() / 3);
  }
  // Fall back to vertex estimate (non-indexed meshes)
  if (mesh.getTotalVertices) {
    return Math.floor(mesh.getTotalVertices() / 3);
  }
  return 0;
}

// Get bounding box dimensions
export function getMeshDimensions(boundingInfo: { minimum: { x: number; y: number; z: number }; maximum: { x: number; y: number; z: number } }): {
  width: number;
  height: number;
  depth: number;
  widthFeet: number;
  heightFeet: number;
  depthFeet: number;
} {
  const width = boundingInfo.maximum.x - boundingInfo.minimum.x;
  const height = boundingInfo.maximum.y - boundingInfo.minimum.y;
  const depth = boundingInfo.maximum.z - boundingInfo.minimum.z;
  
  return {
    width,
    height,
    depth,
    widthFeet: unitsToFeet(width),
    heightFeet: unitsToFeet(height),
    depthFeet: unitsToFeet(depth),
  };
}
