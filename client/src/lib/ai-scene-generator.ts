import { aiChat, isPuterAvailable } from './puter';

export interface SceneAsset {
  name: string;
  path: string;
  category: string;
  subcategory: string;
  tags: string[];
  animations?: string[];
  scale?: number;
  isAnimated?: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  assetPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  animation?: string;
  tags?: string[];
}

export interface GeneratedScene {
  name: string;
  description: string;
  theme: string;
  objects: SceneObject[];
  lighting: {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; direction: { x: number; y: number; z: number } };
  };
  environment: {
    skyColor: string;
    groundColor: string;
    fogEnabled: boolean;
    fogColor?: string;
    fogDensity?: number;
  };
}

export const ASSET_DATABASE: SceneAsset[] = [
  // Kenney Pirate Kit (66 assets)
  { name: "Barrel", path: "/assets/props/pirate/barrel.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "wood", "dock"] },
  { name: "Barrel Group", path: "/assets/props/pirate/barrel-group.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "wood", "dock", "group"] },
  { name: "Boat Large", path: "/assets/props/pirate/boat-large.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "boat"] },
  { name: "Boat Row", path: "/assets/props/pirate/boat-row.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "small"] },
  { name: "Boat Small", path: "/assets/props/pirate/boat-small.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "small"] },
  { name: "Cannon", path: "/assets/props/pirate/cannon.glb", category: "weapons", subcategory: "artillery", tags: ["pirate", "combat", "ship", "defense"] },
  { name: "Cannon Balls", path: "/assets/props/pirate/cannon-balls.glb", category: "props", subcategory: "ammunition", tags: ["pirate", "combat", "ammunition"] },
  { name: "Chest", path: "/assets/props/pirate/chest.glb", category: "props", subcategory: "containers", tags: ["pirate", "treasure", "storage", "loot"] },
  { name: "Chest Gold", path: "/assets/props/pirate/chest-gold.glb", category: "props", subcategory: "containers", tags: ["pirate", "treasure", "gold", "loot", "valuable"] },
  { name: "Crate", path: "/assets/props/pirate/crate.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "cargo", "wood"] },
  { name: "Dock Corner", path: "/assets/props/pirate/dock-corner.glb", category: "structures", subcategory: "docks", tags: ["pirate", "water", "platform", "corner"] },
  { name: "Dock Straight", path: "/assets/props/pirate/dock-straight.glb", category: "structures", subcategory: "docks", tags: ["pirate", "water", "platform"] },
  { name: "Flag Pirate", path: "/assets/props/pirate/flag-pirate.glb", category: "props", subcategory: "flags", tags: ["pirate", "decoration", "skull", "banner"] },
  { name: "Palm Tree", path: "/assets/props/pirate/palm-tree.glb", category: "nature", subcategory: "trees", tags: ["tropical", "island", "beach", "vegetation"] },
  { name: "Palm Tree Bent", path: "/assets/props/pirate/palm-tree-bent.glb", category: "nature", subcategory: "trees", tags: ["tropical", "island", "beach", "vegetation"] },
  { name: "Rock Formation", path: "/assets/props/pirate/rock-formation.glb", category: "nature", subcategory: "rocks", tags: ["island", "terrain", "environment"] },
  { name: "Ship Dark", path: "/assets/props/pirate/ship-dark.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "large", "transport", "ocean"] },
  { name: "Ship Light", path: "/assets/props/pirate/ship-light.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "large", "transport", "ocean"] },
  { name: "Ship Wreck", path: "/assets/props/pirate/ship-wreck.glb", category: "structures", subcategory: "ruins", tags: ["pirate", "destroyed", "beach", "abandoned"] },
  { name: "Sword", path: "/assets/props/pirate/sword.glb", category: "weapons", subcategory: "melee", tags: ["pirate", "combat", "blade"] },
  
  // Racalvin Warrior (52 Mixamo animations - player character)
  { name: "Orc Warrior", path: "/assets/animations/racalvin-warrior/character-model.glb", category: "characters", subcategory: "player", tags: ["warrior", "orc", "player", "combat", "melee", "fantasy", "hero"], animations: ["idle","walk","run","sprint","jump","slash","heavy-attack","block","crouch","dodge","kick","cast","power-up","draw-sword","sheath-sword","death"], isAnimated: true },

  // Quaternius Monsters (4 animated)
  { name: "Bat", path: "/assets/monsters/quaternius/Bat.glb", category: "characters", subcategory: "monsters", tags: ["flying", "enemy", "creature", "cave", "night"], animations: ["Bat_Attack", "Bat_Attack2", "Bat_Death", "Bat_Flying", "Bat_Hit"], isAnimated: true },
  { name: "Dragon", path: "/assets/monsters/quaternius/Dragon.glb", category: "characters", subcategory: "monsters", tags: ["flying", "boss", "creature", "fantasy", "fire"], animations: ["Dragon_Attack", "Dragon_Attack2", "Dragon_Death", "Dragon_Flying", "Dragon_Hit"], isAnimated: true },
  { name: "Skeleton", path: "/assets/monsters/quaternius/Skeleton.glb", category: "characters", subcategory: "undead", tags: ["enemy", "undead", "dungeon", "warrior"], animations: ["Skeleton_Attack", "Skeleton_Death", "Skeleton_Idle", "Skeleton_Running", "Skeleton_Spawn"], isAnimated: true },
  { name: "Slime", path: "/assets/monsters/quaternius/Slime.glb", category: "characters", subcategory: "monsters", tags: ["enemy", "creature", "simple", "dungeon"], animations: ["Slime_Attack", "Slime_Death", "Slime_Idle", "Slime_Walk"], isAnimated: true },

  // Easy Enemies (6 animated)
  { name: "Frog", path: "/assets/monsters/easy-enemies/Frog.glb", category: "characters", subcategory: "creatures", tags: ["animal", "swamp", "enemy", "nature"], animations: ["Frog_Attack", "Frog_Death", "Frog_Idle", "Frog_Jump"], isAnimated: true },
  { name: "Rat", path: "/assets/monsters/easy-enemies/Rat.glb", category: "characters", subcategory: "creatures", tags: ["animal", "dungeon", "enemy", "pest"], animations: ["Rat_Attack", "Rat_Death", "Rat_Idle", "Rat_Jump", "Rat_Run", "Rat_Walk"], isAnimated: true },
  { name: "Snake", path: "/assets/monsters/easy-enemies/Snake.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "desert", "nature"], animations: ["Snake_Attack", "Snake_Idle", "Snake_Jump", "Snake_Walk"], isAnimated: true },
  { name: "Snake Angry", path: "/assets/monsters/easy-enemies/Snake_angry.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "aggressive", "desert"], animations: ["Snake_Attack", "Snake_Idle", "Snake_Jump", "Snake_Walk"], isAnimated: true },
  { name: "Spider", path: "/assets/monsters/easy-enemies/Spider.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "cave", "dungeon", "creepy"], animations: ["Spider_Attack", "Spider_Death", "Spider_Idle", "Spider_Jump", "Spider_Walk"], isAnimated: true },
  { name: "Wasp", path: "/assets/monsters/easy-enemies/Wasp.glb", category: "characters", subcategory: "creatures", tags: ["flying", "enemy", "insect", "nature"], animations: ["Wasp_Attack", "Wasp_Death", "Wasp_Flying"], isAnimated: true },

  // Men Characters (8 animated)
  { name: "Male Casual", path: "/assets/characters/men/Male_Casual.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Long Sleeve", path: "/assets/characters/men/Male_LongSleeve.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Shirt", path: "/assets/characters/men/Male_Shirt.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Suit", path: "/assets/characters/men/Male_Suit.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "businessman", "formal"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Casual", path: "/assets/characters/men/Smooth_Male_Casual.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Long Sleeve", path: "/assets/characters/men/Smooth_Male_LongSleeve.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Shirt", path: "/assets/characters/men/Smooth_Male_Shirt.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Suit", path: "/assets/characters/men/Smooth_Male_Suit.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "businessman", "formal", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },

  // Survival Props (selection of key items)
  { name: "Axe", path: "/assets/props/survival/Axe.glb", category: "weapons", subcategory: "tools", tags: ["survival", "tool", "wood", "chop"] },
  { name: "Bow", path: "/assets/props/survival/Bow.glb", category: "weapons", subcategory: "ranged", tags: ["survival", "hunting", "combat"] },
  { name: "Campfire", path: "/assets/props/survival/Fire.glb", category: "props", subcategory: "effects", tags: ["survival", "camping", "light", "warmth"] },
  { name: "Tent", path: "/assets/props/survival/Tent.glb", category: "structures", subcategory: "camping", tags: ["survival", "shelter", "camping"] },
  { name: "Knife", path: "/assets/props/survival/Knife.glb", category: "weapons", subcategory: "melee", tags: ["survival", "tool", "combat"] },
  { name: "Lantern", path: "/assets/props/survival/Lantern.glb", category: "props", subcategory: "lighting", tags: ["survival", "light", "night"] },
  { name: "Hammock", path: "/assets/props/survival/Hammock.glb", category: "props", subcategory: "furniture", tags: ["survival", "rest", "camping"] },
  { name: "Fishing Rod", path: "/assets/props/survival/Fishing_Rod.glb", category: "props", subcategory: "tools", tags: ["survival", "fishing", "food"] },
  { name: "Compass", path: "/assets/props/survival/Compass.glb", category: "props", subcategory: "navigation", tags: ["survival", "exploration", "navigation"] },
  { name: "Map", path: "/assets/props/survival/Map.glb", category: "props", subcategory: "navigation", tags: ["survival", "exploration", "navigation"] },

  // Environment Scenes
  { name: "Floating Town", path: "/assets/environments/floating-town/scene.gltf", category: "environments", subcategory: "fantasy", tags: ["town", "floating", "fantasy", "complete"] },
  { name: "Pirate Adventure Map", path: "/assets/environments/pirate-map/scene.gltf", category: "environments", subcategory: "adventure", tags: ["pirate", "island", "adventure", "complete"] },
  { name: "Pirate Hunter Character", path: "/assets/environments/pirate-hunter/scene.gltf", category: "characters", subcategory: "humans", tags: ["pirate", "hunter", "viking", "medieval"] },
  { name: "Fantasy Island", path: "/assets/environments/fantasy-island/scene.gltf", category: "environments", subcategory: "fantasy", tags: ["island", "fantasy", "nature", "complete"] },

  // Kenney Prototype Kit (145 assets)
  { name: "Animal Bison", path: "/assets/structures/prototype/animal-bison.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Animal Dog", path: "/assets/structures/prototype/animal-dog.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Animal Horse", path: "/assets/structures/prototype/animal-horse.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Button Floor Round", path: "/assets/structures/prototype/button-floor-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Round Small", path: "/assets/structures/prototype/button-floor-round-small.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Square", path: "/assets/structures/prototype/button-floor-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Square Small", path: "/assets/structures/prototype/button-floor-square-small.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Coin", path: "/assets/structures/prototype/coin.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Column", path: "/assets/structures/prototype/column.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Low", path: "/assets/structures/prototype/column-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Rounded", path: "/assets/structures/prototype/column-rounded.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Rounded Low", path: "/assets/structures/prototype/column-rounded-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Triangle", path: "/assets/structures/prototype/column-triangle.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Triangle Low", path: "/assets/structures/prototype/column-triangle-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Crate", path: "/assets/structures/prototype/crate.glb", category: "props", subcategory: "containers", tags: ["prototype", "storage"] },
  { name: "Crate Color", path: "/assets/structures/prototype/crate-color.glb", category: "props", subcategory: "containers", tags: ["prototype", "storage"] },
  { name: "Door Garage", path: "/assets/structures/prototype/door-garage.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Rotate", path: "/assets/structures/prototype/door-rotate.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding", path: "/assets/structures/prototype/door-sliding.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double", path: "/assets/structures/prototype/door-sliding-double.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double Round", path: "/assets/structures/prototype/door-sliding-double-round.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double Wide", path: "/assets/structures/prototype/door-sliding-double-wide.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Figurine", path: "/assets/structures/prototype/figurine.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Cube", path: "/assets/structures/prototype/figurine-cube.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Cube Detailed", path: "/assets/structures/prototype/figurine-cube-detailed.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Large", path: "/assets/structures/prototype/figurine-large.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Flag", path: "/assets/structures/prototype/flag.glb", category: "props", subcategory: "decorations", tags: ["prototype", "flag"] },
  { name: "Floor Diagonal", path: "/assets/structures/prototype/floor-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Small Diagonal", path: "/assets/structures/prototype/floor-small-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Small Square", path: "/assets/structures/prototype/floor-small-square.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Square", path: "/assets/structures/prototype/floor-square.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick", path: "/assets/structures/prototype/floor-thick.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Diagonal", path: "/assets/structures/prototype/floor-thick-corner-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Round", path: "/assets/structures/prototype/floor-thick-corner-round.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Rounded", path: "/assets/structures/prototype/floor-thick-corner-rounded.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Hat Cap", path: "/assets/structures/prototype/hat-cap.glb", category: "props", subcategory: "clothing", tags: ["prototype", "wearable"] },
  { name: "Hat Hard", path: "/assets/structures/prototype/hat-hard.glb", category: "props", subcategory: "clothing", tags: ["prototype", "wearable"] },
  { name: "Indicator Doorway", path: "/assets/structures/prototype/indicator-doorway.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round A", path: "/assets/structures/prototype/indicator-round-a.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round B", path: "/assets/structures/prototype/indicator-round-b.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round C", path: "/assets/structures/prototype/indicator-round-c.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round D", path: "/assets/structures/prototype/indicator-round-d.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round E", path: "/assets/structures/prototype/indicator-round-e.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round F", path: "/assets/structures/prototype/indicator-round-f.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Area", path: "/assets/structures/prototype/indicator-special-area.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Arrow", path: "/assets/structures/prototype/indicator-special-arrow.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Cross", path: "/assets/structures/prototype/indicator-special-cross.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Lines", path: "/assets/structures/prototype/indicator-special-lines.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square A", path: "/assets/structures/prototype/indicator-square-a.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square B", path: "/assets/structures/prototype/indicator-square-b.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square C", path: "/assets/structures/prototype/indicator-square-c.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square D", path: "/assets/structures/prototype/indicator-square-d.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square E", path: "/assets/structures/prototype/indicator-square-e.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square F", path: "/assets/structures/prototype/indicator-square-f.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Ladder", path: "/assets/structures/prototype/ladder.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Ladder Color", path: "/assets/structures/prototype/ladder-color.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Ladder Top", path: "/assets/structures/prototype/ladder-top.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Lever Double", path: "/assets/structures/prototype/lever-double.glb", category: "props", subcategory: "interactive", tags: ["prototype", "mechanism"] },
  { name: "Lever Single", path: "/assets/structures/prototype/lever-single.glb", category: "props", subcategory: "interactive", tags: ["prototype", "mechanism"] },
  { name: "Number 0", path: "/assets/structures/prototype/number-0.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 1", path: "/assets/structures/prototype/number-1.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 2", path: "/assets/structures/prototype/number-2.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 3", path: "/assets/structures/prototype/number-3.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 4", path: "/assets/structures/prototype/number-4.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 5", path: "/assets/structures/prototype/number-5.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 6", path: "/assets/structures/prototype/number-6.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 7", path: "/assets/structures/prototype/number-7.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 8", path: "/assets/structures/prototype/number-8.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 9", path: "/assets/structures/prototype/number-9.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 0", path: "/assets/structures/prototype/number-double-0.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 1", path: "/assets/structures/prototype/number-double-1.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 2", path: "/assets/structures/prototype/number-double-2.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 3", path: "/assets/structures/prototype/number-double-3.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 4", path: "/assets/structures/prototype/number-double-4.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 5", path: "/assets/structures/prototype/number-double-5.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 6", path: "/assets/structures/prototype/number-double-6.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 7", path: "/assets/structures/prototype/number-double-7.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 8", path: "/assets/structures/prototype/number-double-8.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 9", path: "/assets/structures/prototype/number-double-9.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Pipe", path: "/assets/structures/prototype/pipe.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Corner", path: "/assets/structures/prototype/pipe-corner.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Half", path: "/assets/structures/prototype/pipe-half.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Half Section", path: "/assets/structures/prototype/pipe-half-section.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Section", path: "/assets/structures/prototype/pipe-section.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Split", path: "/assets/structures/prototype/pipe-split.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Shape Cube", path: "/assets/structures/prototype/shape-cube.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cube Half", path: "/assets/structures/prototype/shape-cube-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cube Rounded", path: "/assets/structures/prototype/shape-cube-rounded.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder", path: "/assets/structures/prototype/shape-cylinder.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Detailed", path: "/assets/structures/prototype/shape-cylinder-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Half", path: "/assets/structures/prototype/shape-cylinder-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Half Detailed", path: "/assets/structures/prototype/shape-cylinder-half-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hexagon", path: "/assets/structures/prototype/shape-hexagon.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hexagon Half", path: "/assets/structures/prototype/shape-hexagon-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder", path: "/assets/structures/prototype/shape-hollow-cylinder.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Detailed", path: "/assets/structures/prototype/shape-hollow-cylinder-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Half", path: "/assets/structures/prototype/shape-hollow-cylinder-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Half Detailed", path: "/assets/structures/prototype/shape-hollow-cylinder-half-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Hexagon", path: "/assets/structures/prototype/shape-hollow-hexagon.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Hexagon Half", path: "/assets/structures/prototype/shape-hollow-hexagon-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Slope", path: "/assets/structures/prototype/shape-slope.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Triangular Prism", path: "/assets/structures/prototype/shape-triangular-prism.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Triangular Prism Low", path: "/assets/structures/prototype/shape-triangular-prism-low.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Stairs", path: "/assets/structures/prototype/stairs.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal", path: "/assets/structures/prototype/stairs-diagonal.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Narrow", path: "/assets/structures/prototype/stairs-diagonal-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Small", path: "/assets/structures/prototype/stairs-diagonal-small.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Small Narrow", path: "/assets/structures/prototype/stairs-diagonal-small-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Narrow", path: "/assets/structures/prototype/stairs-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Small", path: "/assets/structures/prototype/stairs-small.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Small Narrow", path: "/assets/structures/prototype/stairs-small-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Target A Round", path: "/assets/structures/prototype/target-a-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target A Square", path: "/assets/structures/prototype/target-a-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target B Round", path: "/assets/structures/prototype/target-b-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target B Square", path: "/assets/structures/prototype/target-b-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Vehicle", path: "/assets/structures/prototype/vehicle.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },
  { name: "Vehicle Convertible", path: "/assets/structures/prototype/vehicle-convertible.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },
  { name: "Wall", path: "/assets/structures/prototype/wall.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner", path: "/assets/structures/prototype/wall-corner.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Low", path: "/assets/structures/prototype/wall-corner-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Rounded", path: "/assets/structures/prototype/wall-corner-rounded.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Rounded Low", path: "/assets/structures/prototype/wall-corner-rounded-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Diagonal", path: "/assets/structures/prototype/wall-diagonal.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Diagonal Low", path: "/assets/structures/prototype/wall-diagonal-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway", path: "/assets/structures/prototype/wall-doorway.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Garage", path: "/assets/structures/prototype/wall-doorway-garage.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Round", path: "/assets/structures/prototype/wall-doorway-round.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Sliding", path: "/assets/structures/prototype/wall-doorway-sliding.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Wide", path: "/assets/structures/prototype/wall-doorway-wide.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Wide Sliding", path: "/assets/structures/prototype/wall-doorway-wide-sliding.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Low", path: "/assets/structures/prototype/wall-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Round", path: "/assets/structures/prototype/wall-round.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Round Low", path: "/assets/structures/prototype/wall-round-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Large", path: "/assets/structures/prototype/wall-window-barred-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Medium", path: "/assets/structures/prototype/wall-window-barred-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Small", path: "/assets/structures/prototype/wall-window-barred-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Large", path: "/assets/structures/prototype/wall-window-cutout-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Medium", path: "/assets/structures/prototype/wall-window-cutout-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Small", path: "/assets/structures/prototype/wall-window-cutout-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Large", path: "/assets/structures/prototype/wall-window-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Medium", path: "/assets/structures/prototype/wall-window-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Small", path: "/assets/structures/prototype/wall-window-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Weapon Shield", path: "/assets/structures/prototype/weapon-shield.glb", category: "weapons", subcategory: "melee", tags: ["prototype", "combat"] },
  { name: "Weapon Sword", path: "/assets/structures/prototype/weapon-sword.glb", category: "weapons", subcategory: "melee", tags: ["prototype", "combat"] },
  { name: "Wheelchair", path: "/assets/structures/prototype/wheelchair.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },

  // Kenney Medieval Kit (105 assets)
  { name: "Barrels", path: "/assets/structures/medieval/barrels.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Battlement", path: "/assets/structures/medieval/battlement.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Corner Inner", path: "/assets/structures/medieval/battlement-corner-inner.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Corner Outer", path: "/assets/structures/medieval/battlement-corner-outer.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Half", path: "/assets/structures/medieval/battlement-half.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Bricks", path: "/assets/structures/medieval/bricks.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column", path: "/assets/structures/medieval/column.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Damaged", path: "/assets/structures/medieval/column-damaged.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Paint", path: "/assets/structures/medieval/column-paint.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Paint Damaged", path: "/assets/structures/medieval/column-paint-damaged.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Wood", path: "/assets/structures/medieval/column-wood.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Detail Barrel", path: "/assets/structures/medieval/detail-barrel.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate", path: "/assets/structures/medieval/detail-crate.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate Ropes", path: "/assets/structures/medieval/detail-crate-ropes.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate Small", path: "/assets/structures/medieval/detail-crate-small.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Dock Corner", path: "/assets/structures/medieval/dock-corner.glb", category: "structures", subcategory: "docks", tags: ["medieval", "water", "dock"] },
  { name: "Dock Side", path: "/assets/structures/medieval/dock-side.glb", category: "structures", subcategory: "docks", tags: ["medieval", "water", "dock"] },
  { name: "Fence", path: "/assets/structures/medieval/fence.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Fence Top", path: "/assets/structures/medieval/fence-top.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Fence Wood", path: "/assets/structures/medieval/fence-wood.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Floor", path: "/assets/structures/medieval/floor.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Flat", path: "/assets/structures/medieval/floor-flat.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs", path: "/assets/structures/medieval/floor-stairs.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs Corner Inner", path: "/assets/structures/medieval/floor-stairs-corner-inner.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs Corner Outer", path: "/assets/structures/medieval/floor-stairs-corner-outer.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps", path: "/assets/structures/medieval/floor-steps.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps Corner Inner", path: "/assets/structures/medieval/floor-steps-corner-inner.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps Corner Outer", path: "/assets/structures/medieval/floor-steps-corner-outer.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Ladder", path: "/assets/structures/medieval/ladder.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Overhang", path: "/assets/structures/medieval/overhang.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Fence", path: "/assets/structures/medieval/overhang-fence.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Round", path: "/assets/structures/medieval/overhang-round.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Round Railing", path: "/assets/structures/medieval/overhang-round-railing.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Pulley", path: "/assets/structures/medieval/pulley.glb", category: "props", subcategory: "mechanism", tags: ["medieval", "interactive"] },
  { name: "Pulley Crate", path: "/assets/structures/medieval/pulley-crate.glb", category: "props", subcategory: "mechanism", tags: ["medieval", "interactive"] },
  { name: "Roof", path: "/assets/structures/medieval/roof.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Corner", path: "/assets/structures/medieval/roof-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Edge", path: "/assets/structures/medieval/roof-edge.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side", path: "/assets/structures/medieval/roof-high-side.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side Corner", path: "/assets/structures/medieval/roof-high-side-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side Corner Inner", path: "/assets/structures/medieval/roof-high-side-corner-inner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side", path: "/assets/structures/medieval/roof-side.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side Corner", path: "/assets/structures/medieval/roof-side-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side Corner Inner", path: "/assets/structures/medieval/roof-side-corner-inner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Stairs Corner", path: "/assets/structures/medieval/stairs-corner.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Stairs Stone", path: "/assets/structures/medieval/stairs-stone.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Stairs Wood", path: "/assets/structures/medieval/stairs-wood.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Structure", path: "/assets/structures/medieval/structure.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Cross", path: "/assets/structures/medieval/structure-cross.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Pole", path: "/assets/structures/medieval/structure-pole.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Poles", path: "/assets/structures/medieval/structure-poles.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Wall", path: "/assets/structures/medieval/structure-wall.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Wall Cross", path: "/assets/structures/medieval/structure-wall-cross.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Tower", path: "/assets/structures/medieval/tower.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Base", path: "/assets/structures/medieval/tower-base.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Edge", path: "/assets/structures/medieval/tower-edge.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Paint", path: "/assets/structures/medieval/tower-paint.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Paint Base", path: "/assets/structures/medieval/tower-paint-base.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Top", path: "/assets/structures/medieval/tower-top.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tree Large", path: "/assets/structures/medieval/tree-large.glb", category: "environments", subcategory: "vegetation", tags: ["medieval", "nature"] },
  { name: "Tree Shrub", path: "/assets/structures/medieval/tree-shrub.glb", category: "environments", subcategory: "vegetation", tags: ["medieval", "nature"] },
  { name: "Wall", path: "/assets/structures/medieval/wall.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Detail", path: "/assets/structures/medieval/wall-detail.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Door", path: "/assets/structures/medieval/wall-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Flat Gate", path: "/assets/structures/medieval/wall-flat-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified", path: "/assets/structures/medieval/wall-fortified.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Door", path: "/assets/structures/medieval/wall-fortified-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Gate", path: "/assets/structures/medieval/wall-fortified-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Gate Half", path: "/assets/structures/medieval/wall-fortified-gate-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Half", path: "/assets/structures/medieval/wall-fortified-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint", path: "/assets/structures/medieval/wall-fortified-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Door", path: "/assets/structures/medieval/wall-fortified-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Gate", path: "/assets/structures/medieval/wall-fortified-paint-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Half", path: "/assets/structures/medieval/wall-fortified-paint-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Window", path: "/assets/structures/medieval/wall-fortified-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Window", path: "/assets/structures/medieval/wall-fortified-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Gate", path: "/assets/structures/medieval/wall-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Gate Half", path: "/assets/structures/medieval/wall-gate-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Half", path: "/assets/structures/medieval/wall-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Low", path: "/assets/structures/medieval/wall-low.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint", path: "/assets/structures/medieval/wall-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Detail", path: "/assets/structures/medieval/wall-paint-detail.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Door", path: "/assets/structures/medieval/wall-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Flat", path: "/assets/structures/medieval/wall-paint-flat.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Gate", path: "/assets/structures/medieval/wall-paint-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Half", path: "/assets/structures/medieval/wall-paint-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Window", path: "/assets/structures/medieval/wall-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane", path: "/assets/structures/medieval/wall-pane.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Door", path: "/assets/structures/medieval/wall-pane-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint", path: "/assets/structures/medieval/wall-pane-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint Door", path: "/assets/structures/medieval/wall-pane-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood", path: "/assets/structures/medieval/wall-pane-painted-wood.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood Door", path: "/assets/structures/medieval/wall-pane-painted-wood-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood Window", path: "/assets/structures/medieval/wall-pane-painted-wood-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint Window", path: "/assets/structures/medieval/wall-pane-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Window", path: "/assets/structures/medieval/wall-pane-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood", path: "/assets/structures/medieval/wall-pane-wood.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood Door", path: "/assets/structures/medieval/wall-pane-wood-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood Window", path: "/assets/structures/medieval/wall-pane-wood-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Window", path: "/assets/structures/medieval/wall-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Water", path: "/assets/structures/medieval/water.glb", category: "environments", subcategory: "water", tags: ["medieval", "water"] },
  { name: "Wood Floor", path: "/assets/structures/medieval/wood-floor.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Half", path: "/assets/structures/medieval/wood-floor-half.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Quarter", path: "/assets/structures/medieval/wood-floor-quarter.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Railing", path: "/assets/structures/medieval/wood-floor-railing.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },

  // Kenney Dungeon Kit (37 assets)
  { name: "Corridor", path: "/assets/structures/dungeon/corridor.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Corner", path: "/assets/structures/dungeon/corridor-corner.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor End", path: "/assets/structures/dungeon/corridor-end.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Intersection", path: "/assets/structures/dungeon/corridor-intersection.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Junction", path: "/assets/structures/dungeon/corridor-junction.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Transition", path: "/assets/structures/dungeon/corridor-transition.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide", path: "/assets/structures/dungeon/corridor-wide.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Corner", path: "/assets/structures/dungeon/corridor-wide-corner.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide End", path: "/assets/structures/dungeon/corridor-wide-end.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Intersection", path: "/assets/structures/dungeon/corridor-wide-intersection.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Junction", path: "/assets/structures/dungeon/corridor-wide-junction.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Gate", path: "/assets/structures/dungeon/gate.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Gate Door", path: "/assets/structures/dungeon/gate-door.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Gate Door Window", path: "/assets/structures/dungeon/gate-door-window.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Room Corner", path: "/assets/structures/dungeon/room-corner.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Large", path: "/assets/structures/dungeon/room-large.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Large Variation", path: "/assets/structures/dungeon/room-large-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Small", path: "/assets/structures/dungeon/room-small.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Small Variation", path: "/assets/structures/dungeon/room-small-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Wide", path: "/assets/structures/dungeon/room-wide.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Wide Variation", path: "/assets/structures/dungeon/room-wide-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Stairs", path: "/assets/structures/dungeon/stairs.glb", category: "structures", subcategory: "traversal", tags: ["dungeon", "stairs", "underground"] },
  { name: "Stairs Wide", path: "/assets/structures/dungeon/stairs-wide.glb", category: "structures", subcategory: "traversal", tags: ["dungeon", "stairs", "underground"] },
  { name: "Template Corner", path: "/assets/structures/dungeon/template-corner.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Detail", path: "/assets/structures/dungeon/template-detail.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor", path: "/assets/structures/dungeon/template-floor.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Big", path: "/assets/structures/dungeon/template-floor-big.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Detail", path: "/assets/structures/dungeon/template-floor-detail.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Detail A", path: "/assets/structures/dungeon/template-floor-detail-a.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Layer", path: "/assets/structures/dungeon/template-floor-layer.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Layer Raised", path: "/assets/structures/dungeon/template-floor-layer-raised.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall", path: "/assets/structures/dungeon/template-wall.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Corner", path: "/assets/structures/dungeon/template-wall-corner.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Detail A", path: "/assets/structures/dungeon/template-wall-detail-a.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Half", path: "/assets/structures/dungeon/template-wall-half.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Stairs", path: "/assets/structures/dungeon/template-wall-stairs.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Top", path: "/assets/structures/dungeon/template-wall-top.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
];

export const SCENE_THEMES = {
  pirate: {
    name: "Pirate Adventure",
    keywords: ["pirate", "ship", "treasure", "island", "ocean", "dock", "cannon", "sail"],
    skyColor: "#87CEEB",
    groundColor: "#C2B280",
    lighting: { ambient: 0.4, directional: 0.8 },
    fogColor: "#B0C4DE"
  },
  dungeon: {
    name: "Dark Dungeon",
    keywords: ["dungeon", "cave", "skeleton", "spider", "dark", "torch", "underground"],
    skyColor: "#1a1a2e",
    groundColor: "#2d2d2d",
    lighting: { ambient: 0.2, directional: 0.3 },
    fogColor: "#1a1a2e"
  },
  forest: {
    name: "Enchanted Forest",
    keywords: ["forest", "tree", "nature", "animal", "frog", "snake", "green", "woodland"],
    skyColor: "#228B22",
    groundColor: "#355E3B",
    lighting: { ambient: 0.5, directional: 0.7 },
    fogColor: "#90EE90"
  },
  medieval: {
    name: "Medieval Village",
    keywords: ["medieval", "castle", "knight", "village", "stone", "fortress", "kingdom"],
    skyColor: "#87CEEB",
    groundColor: "#8B4513",
    lighting: { ambient: 0.45, directional: 0.75 },
    fogColor: "#D3D3D3"
  },
  survival: {
    name: "Survival Camp",
    keywords: ["survival", "camping", "wilderness", "tent", "fire", "hunting", "shelter"],
    skyColor: "#FF8C00",
    groundColor: "#556B2F",
    lighting: { ambient: 0.35, directional: 0.6 },
    fogColor: "#FFA07A"
  },
  fantasy: {
    name: "Fantasy Realm",
    keywords: ["fantasy", "dragon", "magic", "floating", "mystical", "enchanted"],
    skyColor: "#9370DB",
    groundColor: "#4B0082",
    lighting: { ambient: 0.5, directional: 0.65 },
    fogColor: "#DDA0DD"
  }
};

export function searchAssets(query: string): SceneAsset[] {
  const terms = query.toLowerCase().split(/\s+/);
  return ASSET_DATABASE.filter(asset => {
    const searchText = `${asset.name} ${asset.category} ${asset.subcategory} ${asset.tags.join(' ')}`.toLowerCase();
    return terms.some(term => searchText.includes(term));
  });
}

export function getAssetsByCategory(category: string): SceneAsset[] {
  return ASSET_DATABASE.filter(a => a.category === category);
}

export function getAssetsByTags(tags: string[]): SceneAsset[] {
  return ASSET_DATABASE.filter(asset => 
    tags.some(tag => asset.tags.includes(tag.toLowerCase()))
  );
}

export function getAnimatedAssets(): SceneAsset[] {
  return ASSET_DATABASE.filter(a => a.isAnimated);
}

function detectTheme(prompt: string): keyof typeof SCENE_THEMES {
  const lowerPrompt = prompt.toLowerCase();
  let bestMatch: keyof typeof SCENE_THEMES = 'fantasy';
  let bestScore = 0;

  for (const [themeKey, theme] of Object.entries(SCENE_THEMES)) {
    const score = theme.keywords.filter(kw => lowerPrompt.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = themeKey as keyof typeof SCENE_THEMES;
    }
  }

  return bestMatch;
}

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function selectAssetsForPrompt(prompt: string, count: number = 10): SceneAsset[] {
  const terms = prompt.toLowerCase().split(/\s+/);
  const scored = ASSET_DATABASE.map(asset => {
    const searchText = `${asset.name} ${asset.category} ${asset.subcategory} ${asset.tags.join(' ')}`.toLowerCase();
    const score = terms.filter(term => searchText.includes(term)).length;
    return { asset, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.asset);
}

function arrangeAssetsInScene(assets: SceneAsset[]): SceneObject[] {
  const objects: SceneObject[] = [];
  const usedPositions: Set<string> = new Set();

  const getRandomPosition = (radius: number = 10): { x: number; y: number; z: number } => {
    let attempts = 0;
    while (attempts < 100) {
      const x = (Math.random() - 0.5) * radius * 2;
      const z = (Math.random() - 0.5) * radius * 2;
      const key = `${Math.round(x)}_${Math.round(z)}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        return { x, y: 0, z };
      }
      attempts++;
    }
    return { x: Math.random() * radius, y: 0, z: Math.random() * radius };
  };

  assets.forEach((asset, index) => {
    const position = getRandomPosition(15);
    
    if (asset.category === 'characters') {
      position.y = 0;
    } else if (asset.subcategory === 'trees') {
      position.y = 0;
    } else if (asset.category === 'vehicles' && asset.subcategory === 'ships') {
      position.y = -0.5;
    }

    const sceneObject: SceneObject = {
      id: generateId(),
      name: asset.name,
      assetPath: asset.path,
      position,
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      tags: asset.tags
    };

    if (asset.isAnimated && asset.animations && asset.animations.length > 0) {
      const idleAnim = asset.animations.find(a => a.toLowerCase().includes('idle'));
      sceneObject.animation = idleAnim || asset.animations[0];
    }

    objects.push(sceneObject);
  });

  return objects;
}

export function generateSceneFromPrompt(prompt: string): GeneratedScene {
  const theme = detectTheme(prompt);
  const themeConfig = SCENE_THEMES[theme];
  const selectedAssets = selectAssetsForPrompt(prompt, 12);
  const objects = arrangeAssetsInScene(selectedAssets);

  return {
    name: `Generated: ${prompt.slice(0, 30)}...`,
    description: prompt,
    theme,
    objects,
    lighting: {
      ambient: { color: "#ffffff", intensity: themeConfig.lighting.ambient },
      directional: { 
        color: "#ffffff", 
        intensity: themeConfig.lighting.directional,
        direction: { x: -1, y: -2, z: -1 }
      }
    },
    environment: {
      skyColor: themeConfig.skyColor,
      groundColor: themeConfig.groundColor,
      fogEnabled: true,
      fogColor: themeConfig.fogColor,
      fogDensity: 0.02
    }
  };
}

export async function generateSceneWithAI(prompt: string): Promise<GeneratedScene> {
  if (!isPuterAvailable()) {
    console.log("Puter.js not available, using local generation");
    return generateSceneFromPrompt(prompt);
  }

  try {
    const assetSummary = ASSET_DATABASE.map(a => 
      `${a.name} (${a.category}/${a.subcategory}): ${a.tags.join(', ')}`
    ).join('\n');

    const aiPrompt = `You are a 3D scene designer for a game engine. Given this user request and available assets, create a scene configuration.

USER REQUEST: "${prompt}"

AVAILABLE ASSETS:
${assetSummary}

THEMES: ${Object.keys(SCENE_THEMES).join(', ')}

Return a JSON object with:
{
  "selectedAssets": ["asset names to use"],
  "theme": "theme name",
  "arrangement": "description of how to arrange objects",
  "lighting": "bright/dim/dark",
  "atmosphere": "description"
}

Be creative but only use assets from the list above.`;

    const response = await aiChat(aiPrompt, 'gpt-4o');
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiConfig = JSON.parse(jsonMatch[0]);
        const selectedAssetNames = aiConfig.selectedAssets || [];
        const selectedAssets = ASSET_DATABASE.filter(a => 
          selectedAssetNames.some((name: string) => 
            a.name.toLowerCase().includes(name.toLowerCase())
          )
        );

        if (selectedAssets.length > 0) {
          const theme = (aiConfig.theme?.toLowerCase() as keyof typeof SCENE_THEMES) || detectTheme(prompt);
          const themeConfig = SCENE_THEMES[theme] || SCENE_THEMES.fantasy;
          const objects = arrangeAssetsInScene(selectedAssets);

          return {
            name: `AI Generated: ${prompt.slice(0, 25)}...`,
            description: `${prompt}\n\nAI Notes: ${aiConfig.atmosphere || ''}`,
            theme,
            objects,
            lighting: {
              ambient: { 
                color: "#ffffff", 
                intensity: aiConfig.lighting === 'dark' ? 0.2 : aiConfig.lighting === 'dim' ? 0.35 : 0.5 
              },
              directional: { 
                color: "#ffffff", 
                intensity: aiConfig.lighting === 'dark' ? 0.3 : aiConfig.lighting === 'dim' ? 0.5 : 0.8,
                direction: { x: -1, y: -2, z: -1 }
              }
            },
            environment: {
              skyColor: themeConfig.skyColor,
              groundColor: themeConfig.groundColor,
              fogEnabled: true,
              fogColor: themeConfig.fogColor,
              fogDensity: 0.02
            }
          };
        }
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response, using local generation:", parseError);
    }
  } catch (error) {
    console.error("AI scene generation failed:", error);
  }

  return generateSceneFromPrompt(prompt);
}

export function getAssetCatalogSummary(): string {
  const categories: Record<string, number> = {};
  const animatedCount = ASSET_DATABASE.filter(a => a.isAnimated).length;
  
  ASSET_DATABASE.forEach(asset => {
    categories[asset.category] = (categories[asset.category] || 0) + 1;
  });

  return `Asset Library Summary:
Total Assets: ${ASSET_DATABASE.length}
Animated Assets: ${animatedCount}

By Category:
${Object.entries(categories).map(([cat, count]) => `  - ${cat}: ${count}`).join('\n')}

Themes Available: ${Object.keys(SCENE_THEMES).join(', ')}`;
}

export const EXAMPLE_PROMPTS = [
  "Create a pirate island with ships, treasure chests, and palm trees",
  "Build a dark dungeon with skeletons, spiders, and torches",
  "Design a survival camp in the forest with a tent and campfire",
  "Make a medieval village scene with buildings and NPCs",
  "Create a fantasy dragon lair with treasure",
  "Build a tropical beach with boats and a dock"
];
