export interface ManifestAsset {
  id: string;
  name: string;
  category: 'model' | 'texture' | 'material' | 'hdri' | 'audio' | 'sprite';
  source: string;
  license: 'CC0' | 'CC-BY' | 'Royalty-Free';
  thumbnailUrl: string;
  downloadUrl: string;
  format: string;
  size?: string;
  tags: string[];
  description?: string;
}

export interface AssetPack {
  id: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  assets: ManifestAsset[];
}

export const STARTER_ASSET_PACKS: AssetPack[] = [
  {
    id: 'kenney-3d-assets',
    name: 'Kenney 3D Assets',
    description: 'Free game-ready 3D models from Kenney.nl (CC0)',
    source: 'Kenney',
    sourceUrl: 'https://kenney.nl',
    assets: [
      {
        id: 'kenney-crate',
        name: 'Wooden Crate',
        category: 'model',
        source: 'Kenney',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/screenshot/screenshot.png',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/glTF-Binary/Box.glb',
        format: 'GLB',
        size: '~5KB',
        tags: ['box', 'crate', 'prop', 'container'],
        description: 'Simple box/crate model'
      },
      {
        id: 'gltf-duck',
        name: 'Rubber Duck',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/screenshot/screenshot.png',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb',
        format: 'GLB',
        size: '~170KB',
        tags: ['duck', 'toy', 'prop', 'yellow'],
        description: 'Classic rubber duck model'
      },
      {
        id: 'gltf-avocado',
        name: 'Avocado',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/screenshot/screenshot.jpg',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',
        format: 'GLB',
        size: '~8MB',
        tags: ['avocado', 'food', 'fruit', 'pbr'],
        description: 'High-detail avocado with PBR materials'
      },
      {
        id: 'gltf-helmet',
        name: 'Damaged Helmet',
        category: 'model',
        source: 'Khronos',
        license: 'CC-BY',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/screenshot/screenshot.png',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        format: 'GLB',
        size: '~4MB',
        tags: ['helmet', 'sci-fi', 'pbr', 'armor'],
        description: 'Detailed sci-fi helmet with PBR'
      },
      {
        id: 'gltf-lantern',
        name: 'Lantern',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/screenshot/screenshot.jpg',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
        format: 'GLB',
        size: '~2MB',
        tags: ['lantern', 'light', 'prop', 'medieval'],
        description: 'Detailed lantern model'
      },
      {
        id: 'gltf-water-bottle',
        name: 'Water Bottle',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/screenshot/screenshot.jpg',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
        format: 'GLB',
        size: '~4MB',
        tags: ['bottle', 'water', 'prop', 'container'],
        description: 'Water bottle with PBR materials'
      }
    ]
  },
  {
    id: 'gltf-animated',
    name: 'Animated Models',
    description: 'Free animated 3D models from glTF samples',
    source: 'Khronos',
    sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets',
    assets: [
      {
        id: 'gltf-fox',
        name: 'Animated Fox',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/screenshot/screenshot.jpg',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
        format: 'GLB',
        size: '~300KB',
        tags: ['fox', 'animal', 'animated', 'character'],
        description: 'Animated low-poly fox'
      },
      {
        id: 'gltf-brainstem',
        name: 'Animated Character',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/screenshot/screenshot.gif',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
        format: 'GLB',
        size: '~500KB',
        tags: ['robot', 'animated', 'character', 'humanoid'],
        description: 'Animated robot character'
      },
      {
        id: 'gltf-cesium-man',
        name: 'Walking Man',
        category: 'model',
        source: 'Khronos',
        license: 'CC0',
        thumbnailUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/screenshot/screenshot.gif',
        downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
        format: 'GLB',
        size: '~200KB',
        tags: ['man', 'human', 'animated', 'walk'],
        description: 'Animated walking man'
      }
    ]
  },
  {
    id: 'polyhaven-textures',
    name: 'PBR Textures',
    description: 'Sample PBR textures (placeholder thumbnails)',
    source: 'Various',
    sourceUrl: 'https://polyhaven.com',
    assets: [
      {
        id: 'texture-brick',
        name: 'Brick Pattern',
        category: 'texture',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Brick_wall_close-up_view.jpg/256px-Brick_wall_close-up_view.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Brick_wall_close-up_view.jpg/1024px-Brick_wall_close-up_view.jpg',
        format: 'JPG',
        size: '~100KB',
        tags: ['brick', 'wall', 'building', 'texture'],
        description: 'Brick wall texture'
      },
      {
        id: 'texture-wood',
        name: 'Wood Grain',
        category: 'texture',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Wood_grain_pine.jpg/256px-Wood_grain_pine.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Wood_grain_pine.jpg/1024px-Wood_grain_pine.jpg',
        format: 'JPG',
        size: '~80KB',
        tags: ['wood', 'grain', 'floor', 'texture'],
        description: 'Wood grain texture'
      },
      {
        id: 'texture-grass',
        name: 'Grass',
        category: 'texture',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Grass_Normal_Grass.jpg/256px-Grass_Normal_Grass.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Grass_Normal_Grass.jpg/1024px-Grass_Normal_Grass.jpg',
        format: 'JPG',
        size: '~120KB',
        tags: ['grass', 'ground', 'nature', 'texture'],
        description: 'Grass texture'
      },
      {
        id: 'texture-stone',
        name: 'Stone Wall',
        category: 'texture',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stone_wall_1.jpg/256px-Stone_wall_1.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stone_wall_1.jpg/1024px-Stone_wall_1.jpg',
        format: 'JPG',
        size: '~150KB',
        tags: ['stone', 'wall', 'rock', 'texture'],
        description: 'Stone wall texture'
      }
    ]
  },
  {
    id: 'environment-hdri',
    name: 'Environment HDRIs',
    description: 'Skybox and environment images',
    source: 'Various',
    sourceUrl: 'https://polyhaven.com',
    assets: [
      {
        id: 'hdri-blue-sky',
        name: 'Blue Sky',
        category: 'hdri',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Appearance_of_sky_for_NOAA_weather_programs.jpg/256px-Appearance_of_sky_for_NOAA_weather_programs.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Appearance_of_sky_for_NOAA_weather_programs.jpg',
        format: 'JPG',
        size: '~500KB',
        tags: ['sky', 'blue', 'clouds', 'outdoor'],
        description: 'Blue sky with clouds'
      },
      {
        id: 'hdri-sunset',
        name: 'Sunset Sky',
        category: 'hdri',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sunrise_over_the_sea.jpg/256px-Sunrise_over_the_sea.jpg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Sunrise_over_the_sea.jpg',
        format: 'JPG',
        size: '~600KB',
        tags: ['sunset', 'sky', 'orange', 'outdoor'],
        description: 'Sunset/sunrise sky'
      }
    ]
  },
  {
    id: 'grudge-studio-icons',
    name: 'Grudge Studio RPG Icons',
    description: 'RPG item icons from the Grudge Studio ObjectStore (3,300+ assets)',
    source: 'Grudge Studio',
    sourceUrl: 'https://molochdagod.github.io/ObjectStore',
    assets: [
      {
        id: 'gs-sword-icon',
        name: 'Sword Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Sword001.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Sword001.png',
        format: 'PNG',
        size: '~4KB',
        tags: ['sword', 'weapon', 'rpg', 'icon', 'melee'],
        description: 'RPG sword weapon icon'
      },
      {
        id: 'gs-shield-icon',
        name: 'Shield Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/E_Shield01.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/E_Shield01.png',
        format: 'PNG',
        size: '~4KB',
        tags: ['shield', 'armor', 'rpg', 'icon', 'defense'],
        description: 'RPG shield equipment icon'
      },
      {
        id: 'gs-potion-icon',
        name: 'Health Potion',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/P_Red03.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/P_Red03.png',
        format: 'PNG',
        size: '~3KB',
        tags: ['potion', 'health', 'consumable', 'rpg', 'icon'],
        description: 'Red health potion icon'
      },
      {
        id: 'gs-armor-icon',
        name: 'Armor Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/A_Armor04.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/A_Armor04.png',
        format: 'PNG',
        size: '~4KB',
        tags: ['armor', 'chest', 'equipment', 'rpg', 'icon'],
        description: 'Chest armor icon'
      },
      {
        id: 'gs-staff-icon',
        name: 'Magic Staff',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Staff01.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Staff01.png',
        format: 'PNG',
        size: '~4KB',
        tags: ['staff', 'weapon', 'magic', 'mage', 'rpg', 'icon'],
        description: 'Magic staff weapon icon'
      },
      {
        id: 'gs-bow-icon',
        name: 'Bow Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Bow01.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/W_Bow01.png',
        format: 'PNG',
        size: '~4KB',
        tags: ['bow', 'weapon', 'ranged', 'ranger', 'rpg', 'icon'],
        description: 'Bow weapon icon'
      },
      {
        id: 'gs-gem-icon',
        name: 'Gem Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/Ac_Ruby01.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/Ac_Ruby01.png',
        format: 'PNG',
        size: '~3KB',
        tags: ['gem', 'ruby', 'crafting', 'rpg', 'icon', 'material'],
        description: 'Ruby gem icon'
      },
      {
        id: 'gs-scroll-icon',
        name: 'Scroll Icon',
        category: 'sprite',
        source: 'Grudge Studio',
        license: 'CC0',
        thumbnailUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/I_Scroll01.png',
        downloadUrl: 'https://molochdagod.github.io/ObjectStore/icons/496_rpg_icons/I_Scroll01.png',
        format: 'PNG',
        size: '~3KB',
        tags: ['scroll', 'spell', 'magic', 'rpg', 'icon'],
        description: 'Magic scroll icon'
      }
    ]
  },
  {
    id: 'craftpix-rts-buildings',
    name: 'CraftPix RTS Buildings',
    description: 'Free low-poly 3D building packs for RTS factions',
    source: 'CraftPix',
    sourceUrl: 'https://craftpix.net/freebies/',
    assets: [
      { id: 'cp-orc-hall', name: 'Orc Great Hall', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-orc-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['orc', 'building', 'rts', 'lowpoly', 'hall'] },
      { id: 'cp-orc-tower', name: 'Orc Watch Tower', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-orc-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['orc', 'tower', 'defense', 'rts', 'lowpoly'] },
      { id: 'cp-elf-treehouse', name: 'Elf Treehouse', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-elf-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['elf', 'building', 'tree', 'rts', 'lowpoly'] },
      { id: 'cp-elf-sanctuary', name: 'Elf Sanctuary', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-elf-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['elf', 'sanctuary', 'magic', 'rts', 'lowpoly'] },
      { id: 'cp-castle-keep', name: 'Castle Keep', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-castle-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['human', 'castle', 'keep', 'rts', 'lowpoly'] },
      { id: 'cp-castle-wall', name: 'Castle Wall Section', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-castle-buildings-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['human', 'wall', 'defense', 'rts', 'lowpoly'] },
      { id: 'cp-siege-catapult', name: 'Siege Catapult', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-siege-weapons-3d-low-poly-models/', format: 'OBJ/FBX', tags: ['siege', 'catapult', 'weapon', 'rts'] },
      { id: 'cp-siege-ballista', name: 'Siege Ballista', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-siege-weapons-3d-low-poly-models/', format: 'OBJ/FBX', tags: ['siege', 'ballista', 'weapon', 'rts'] },
      { id: 'cp-medieval-sword', name: 'Medieval Sword', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-medieval-weapons-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['weapon', 'sword', 'medieval', 'lowpoly'] },
      { id: 'cp-medieval-axe', name: 'Medieval Axe', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-medieval-weapons-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['weapon', 'axe', 'medieval', 'lowpoly'] },
      { id: 'cp-nature-trees', name: 'Nature Trees Pack', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-nature-props-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['nature', 'tree', 'terrain', 'lowpoly'] },
      { id: 'cp-nature-rocks', name: 'Nature Rocks Pack', category: 'model', source: 'CraftPix', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'https://craftpix.net/freebies/free-nature-props-3d-low-poly-pack/', format: 'OBJ/FBX', tags: ['nature', 'rock', 'terrain', 'lowpoly'] },
    ]
  },
  {
    id: 'kaykit-game-assets',
    name: 'KayKit Game Assets',
    description: 'CC0 low-poly character and environment packs by Kay Lousberg',
    source: 'KayKit',
    sourceUrl: 'https://kaylousberg.itch.io/',
    assets: [
      { id: 'kk-adventurers', name: 'KayKit Adventurers', category: 'model', source: 'KayKit', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://kaylousberg.itch.io/kaykit-adventurers', format: 'GLB/FBX', tags: ['characters', 'adventurer', 'animated', 'lowpoly', 'human'] },
      { id: 'kk-skeletons', name: 'KayKit Skeletons', category: 'model', source: 'KayKit', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://kaylousberg.itch.io/kaykit-skeletons', format: 'GLB/FBX', tags: ['skeleton', 'undead', 'animated', 'lowpoly', 'enemy'] },
      { id: 'kk-medieval', name: 'KayKit Medieval Builder', category: 'model', source: 'KayKit', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://kaylousberg.itch.io/kaykit-medieval-builder-pack', format: 'GLB/FBX', tags: ['medieval', 'buildings', 'walls', 'tower', 'lowpoly'] },
      { id: 'kk-dungeon', name: 'KayKit Dungeon Remastered', category: 'model', source: 'KayKit', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://kaylousberg.itch.io/kaykit-dungeon-remastered', format: 'GLB/FBX', tags: ['dungeon', 'tiles', 'interior', 'lowpoly', 'modular'] },
      { id: 'kk-mini-game', name: 'KayKit Mini Game Base', category: 'model', source: 'KayKit', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://kaylousberg.itch.io/kaykit-mini-game-base', format: 'GLB/FBX', tags: ['game', 'base', 'props', 'lowpoly'] },
    ]
  },
  {
    id: 'quaternius-fantasy',
    name: 'Quaternius Fantasy Packs',
    description: 'CC0 low-poly 3D models — characters, buildings, animals',
    source: 'Quaternius',
    sourceUrl: 'https://quaternius.com',
    assets: [
      { id: 'quat-fantasy-town', name: 'Fantasy Town Kit', category: 'model', source: 'Quaternius', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://quaternius.com/packs/fantasytown.html', format: 'GLB/FBX', tags: ['fantasy', 'town', 'buildings', 'medieval', 'lowpoly'] },
      { id: 'quat-ultimate-chars', name: 'Ultimate Characters', category: 'model', source: 'Quaternius', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://quaternius.com/packs/ultimatecharacters.html', format: 'GLB/FBX', tags: ['characters', 'humanoid', 'animated', 'lowpoly'] },
      { id: 'quat-animated-animals', name: 'Animated Animals', category: 'model', source: 'Quaternius', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://quaternius.com/packs/animatedanimals.html', format: 'GLB/FBX', tags: ['animals', 'animated', 'nature', 'lowpoly'] },
      { id: 'quat-medieval-lowpoly', name: 'Medieval Low-Poly Pack', category: 'model', source: 'Quaternius', license: 'CC0', thumbnailUrl: '', downloadUrl: 'https://quaternius.com/packs/medievallowpoly.html', format: 'GLB/FBX', tags: ['medieval', 'props', 'weapons', 'lowpoly'] },
    ]
  },
  {
    id: 'toon-rts-factions',
    name: 'Toon RTS Faction Models',
    description: 'Orc, Elf, Human faction characters/cavalry/siege from Toon_RTS (local FBX, convert with script/convert-toon-rts.ps1)',
    source: 'Toon_RTS',
    sourceUrl: 'file:///D:/Games/Models/Toon_RTS',
    assets: [
      { id: 'trts-orc-chars', name: 'ORC Characters Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Orcs/models/ORC_Characters_Customizable.FBX', format: 'FBX→GLB', tags: ['orc', 'characters', 'animated', 'rts', 'customizable'] },
      { id: 'trts-orc-cavalry', name: 'ORC Cavalry Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Orcs/models/ORC_Cavalry_Customizable.FBX', format: 'FBX→GLB', tags: ['orc', 'cavalry', 'mounted', 'animated', 'rts'] },
      { id: 'trts-orc-catapult', name: 'ORC Catapult', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Orcs/models/ORC_Catapult.FBX', format: 'FBX→GLB', tags: ['orc', 'catapult', 'siege', 'rts'] },
      { id: 'trts-elf-chars', name: 'ELF Characters Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Elves/models/ELF_Characters_customizable.FBX', format: 'FBX→GLB', tags: ['elf', 'characters', 'animated', 'rts', 'customizable'] },
      { id: 'trts-elf-cavalry', name: 'ELF Cavalry Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Elves/models/ELF_Cavalry_customizable.FBX', format: 'FBX→GLB', tags: ['elf', 'cavalry', 'mounted', 'animated', 'rts'] },
      { id: 'trts-elf-bolt', name: 'ELF Bolt Thrower', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/Elves/models/ELF_BoltThrower.FBX', format: 'FBX→GLB', tags: ['elf', 'boltthrower', 'siege', 'rts'] },
      { id: 'trts-wk-chars', name: 'WK Characters Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/WesternKingdoms/models/WK_Characters_customizable.FBX', format: 'FBX→GLB', tags: ['human', 'characters', 'animated', 'rts', 'customizable'] },
      { id: 'trts-wk-cavalry', name: 'WK Cavalry Customizable', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/WesternKingdoms/models/WK_Cavalry_customizable.FBX', format: 'FBX→GLB', tags: ['human', 'cavalry', 'mounted', 'animated', 'rts'] },
      { id: 'trts-wk-catapult', name: 'WK Catapult', category: 'model', source: 'Toon_RTS', license: 'Royalty-Free', thumbnailUrl: '', downloadUrl: 'file:///D:/Games/Models/Toon_RTS/Toon_RTS/WesternKingdoms/models/WK_Catapult.FBX', format: 'FBX→GLB', tags: ['human', 'catapult', 'siege', 'rts'] },
    ]
  },
  {
    id: 'audio-samples',
    name: 'Audio Samples',
    description: 'Free sound effects and music',
    source: 'Freesound',
    sourceUrl: 'https://freesound.org',
    assets: [
      {
        id: 'audio-click',
        name: 'UI Click',
        category: 'audio',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
        downloadUrl: 'https://cdn.freesound.org/previews/506/506053_7724244-lq.mp3',
        format: 'MP3',
        size: '~10KB',
        tags: ['click', 'ui', 'button', 'interface'],
        description: 'Simple UI click sound'
      },
      {
        id: 'audio-success',
        name: 'Success Chime',
        category: 'audio',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322c55e"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
        downloadUrl: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3',
        format: 'MP3',
        size: '~15KB',
        tags: ['success', 'chime', 'positive', 'notification'],
        description: 'Success notification sound'
      },
      {
        id: 'audio-ambient',
        name: 'Forest Ambience',
        category: 'audio',
        source: 'Sample',
        license: 'CC0',
        thumbnailUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322c55e"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
        downloadUrl: 'https://cdn.freesound.org/previews/531/531015_5674468-lq.mp3',
        format: 'MP3',
        size: '~200KB',
        tags: ['ambient', 'forest', 'nature', 'background'],
        description: 'Forest background ambience'
      }
    ]
  }
];

export function getAssetsByCategory(category: ManifestAsset['category']): ManifestAsset[] {
  return STARTER_ASSET_PACKS.flatMap(pack => 
    pack.assets.filter(asset => asset.category === category)
  );
}

export function searchAssets(query: string): ManifestAsset[] {
  const lowerQuery = query.toLowerCase();
  return STARTER_ASSET_PACKS.flatMap(pack => 
    pack.assets.filter(asset => 
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      asset.description?.toLowerCase().includes(lowerQuery)
    )
  );
}

export function getAllAssets(): ManifestAsset[] {
  return STARTER_ASSET_PACKS.flatMap(pack => pack.assets);
}
