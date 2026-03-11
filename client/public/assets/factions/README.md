# Faction Assets

Place low-poly 3D models here organized by faction and type.

## Directory Structure

```
factions/
├── orc/
│   ├── buildings/    # Orc huts, war camps, forges, watch towers
│   └── units/        # Orc warrior, shaman, brute, archer
├── elf/
│   ├── buildings/    # Elven halls, tree homes, sanctuaries, towers
│   └── units/        # Elf ranger, mage, sentinel, druid
└── human/
    ├── buildings/    # Castles, barracks, farms, churches, windmills
    └── units/        # Knight, footman, archer, mage, paladin
```

## Model Requirements

- **Format**: GLB preferred (single file with textures embedded). GLTF also supported.
- **Poly count**: < 50,000 triangles per model (low-poly style)
- **Scale**: 1 unit = 1 meter. Buildings ~5-15m tall. Characters ~1.8m tall.
- **Orientation**: Face +Z forward, Y-up
- **Animations**: Units should include idle, walk, attack, death clips if rigged
- **Textures**: Single atlas texture preferred for batch rendering

## Recommended Sources (Low Poly)

- [CraftPix Free Medieval Houses](https://craftpix.net/freebies/free-medieval-houses-3d-low-poly-pack/)
- [CraftPix Free Medieval Props](https://craftpix.net/freebies/free-medieval-props-3d-low-poly-pack/)
- [CraftPix Free Medieval People](https://craftpix.net/freebies/free-medieval-3d-people-low-poly-models/)
- [KayKit Adventurers (CC0)](https://kaylousberg.itch.io/kaykit-adventurers)
- [KayKit Medieval Hexagon (CC0)](https://kaylousberg.itch.io/kaykit-medieval-hexagon)
- [Quaternius Fantasy Town (CC0)](https://quaternius.com/packs/fantasytown.html)
- [Quaternius Ultimate Characters (CC0)](https://quaternius.com/packs/ultimatecharacters.html)

## Naming Convention

Use kebab-case: `orc-war-camp.glb`, `elf-archer.glb`, `human-barracks.glb`
