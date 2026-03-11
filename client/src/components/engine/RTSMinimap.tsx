import { useEffect, useRef, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import { FACTIONS, type FactionId } from '@/lib/faction-assets';

interface MinimapObject {
  position: { x: number; z: number };
  faction?: FactionId;
  type: 'building' | 'unit' | 'resource' | 'terrain';
}

interface RTSMinimapProps {
  scene: BABYLON.Scene | null;
  camera: BABYLON.ArcRotateCamera | null;
  objects: MinimapObject[];
  playerFaction: FactionId;
  mapSize?: number;      // world units (default 800)
  minimapSize?: number;  // pixel size (default 200)
  fogEnabled?: boolean;
  fogRadius?: number;    // vision radius per unit (world units)
}

export function RTSMinimap({
  scene,
  camera,
  objects,
  playerFaction,
  mapSize = 800,
  minimapSize = 200,
  fogEnabled = true,
  fogRadius = 80,
}: RTSMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const worldToMinimap = useCallback((worldX: number, worldZ: number): [number, number] => {
    const half = mapSize / 2;
    const nx = (worldX + half) / mapSize;
    const nz = (worldZ + half) / mapSize;
    return [nx * minimapSize, (1 - nz) * minimapSize]; // flip Z for top-down
  }, [mapSize, minimapSize]);

  const minimapToWorld = useCallback((mx: number, my: number): [number, number] => {
    const half = mapSize / 2;
    const worldX = (mx / minimapSize) * mapSize - half;
    const worldZ = (1 - my / minimapSize) * mapSize - half;
    return [worldX, worldZ];
  }, [mapSize, minimapSize]);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, minimapSize, minimapSize);

      // Background terrain
      ctx.fillStyle = '#2a3a1a';
      ctx.fillRect(0, 0, minimapSize, minimapSize);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      const gridStep = minimapSize / 8;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridStep, 0);
        ctx.lineTo(i * gridStep, minimapSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridStep);
        ctx.lineTo(minimapSize, i * gridStep);
        ctx.stroke();
      }

      // Base zone indicators
      const baseZones = [
        { faction: 'orc' as FactionId, x: -250, z: -250 },
        { faction: 'elf' as FactionId, x: 250, z: -250 },
        { faction: 'human' as FactionId, x: 0, z: 280 },
      ];
      baseZones.forEach(zone => {
        const [mx, my] = worldToMinimap(zone.x, zone.z);
        ctx.fillStyle = FACTIONS[zone.faction].color + '30';
        ctx.beginPath();
        ctx.arc(mx, my, 15, 0, Math.PI * 2);
        ctx.fill();
      });

      // Fog of war (if enabled)
      if (fogEnabled) {
        // Create fog overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, minimapSize, minimapSize);

        // Clear fog around player units
        ctx.globalCompositeOperation = 'destination-out';
        objects
          .filter(o => o.faction === playerFaction)
          .forEach(o => {
            const [mx, my] = worldToMinimap(o.position.x, o.position.z);
            const fogPx = (fogRadius / mapSize) * minimapSize;
            const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, fogPx);
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mx, my, fogPx, 0, Math.PI * 2);
            ctx.fill();
          });
        ctx.globalCompositeOperation = 'source-over';
      }

      // Draw objects
      objects.forEach(obj => {
        const [mx, my] = worldToMinimap(obj.position.x, obj.position.z);

        // Skip objects outside fog of war visibility (if fog enabled)
        if (fogEnabled && obj.faction !== playerFaction) {
          const visible = objects
            .filter(o => o.faction === playerFaction)
            .some(o => {
              const dx = o.position.x - obj.position.x;
              const dz = o.position.z - obj.position.z;
              return Math.sqrt(dx * dx + dz * dz) < fogRadius;
            });
          if (!visible) return;
        }

        let color: string;
        let size: number;

        if (obj.type === 'resource') {
          color = '#daa520';
          size = 2.5;
        } else if (obj.type === 'terrain') {
          color = '#3a5a2a';
          size = 1.5;
        } else {
          color = obj.faction ? FACTIONS[obj.faction].color : '#aaa';
          size = obj.type === 'building' ? 3.5 : 2;
        }

        ctx.fillStyle = color;
        if (obj.type === 'building') {
          ctx.fillRect(mx - size / 2, my - size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(mx, my, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Camera viewport indicator
      if (camera) {
        const target = camera.target;
        const [cx, cy] = worldToMinimap(target.x, target.z);
        const viewSize = Math.max(20, (camera.radius / mapSize) * minimapSize * 1.5);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - viewSize / 2, cy - viewSize / 2, viewSize, viewSize);
      }

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, minimapSize, minimapSize);
    };

    const interval = setInterval(draw, 200); // 5 FPS for minimap
    draw();

    return () => clearInterval(interval);
  }, [objects, camera, playerFaction, fogEnabled, fogRadius, minimapSize, mapSize, worldToMinimap]);

  // Click to pan camera
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const [worldX, worldZ] = minimapToWorld(mx, my);

    camera.target = new BABYLON.Vector3(worldX, 0, worldZ);
  }, [camera, minimapToWorld]);

  return (
    <div
      className="absolute bottom-2 right-2 rounded-md overflow-hidden shadow-lg border border-border/50"
      style={{ width: minimapSize, height: minimapSize }}
      data-testid="rts-minimap"
    >
      <canvas
        ref={canvasRef}
        width={minimapSize}
        height={minimapSize}
        className="cursor-crosshair"
        onClick={handleClick}
      />
      <div className="absolute top-1 left-1 text-[9px] text-white/60 font-mono bg-black/40 px-1 rounded">
        MAP
      </div>
    </div>
  );
}
