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
