import { Camera, RedstoneComponent, Particle } from '../types';
import * as Pixels from './pixelAssets';

export const BASE_CELL_SIZE = 48;

export interface ScreenTransform {
  worldToScreen: (wx: number, wy: number) => { sx: number; sy: number };
  screenToWorld: (sx: number, sy: number) => { wx: number; wy: number };
  screenToCell: (sx: number, sy: number) => { cx: number; cy: number };
}

export function createTransform(camera: Camera, width: number, height: number): ScreenTransform {
  const scaledCell = BASE_CELL_SIZE * camera.zoom;

  const worldToScreen = (wx: number, wy: number) => ({
    sx: (wx * BASE_CELL_SIZE - camera.x) * camera.zoom + width / 2,
    sy: (wy * BASE_CELL_SIZE - camera.y) * camera.zoom + height / 2,
  });

  const screenToWorld = (sx: number, sy: number) => ({
    wx: (sx - width / 2) / camera.zoom + camera.x,
    wy: (sy - height / 2) / camera.zoom + camera.y,
  });

  const screenToCell = (sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    return {
      cx: Math.floor(w.wx / BASE_CELL_SIZE),
      cy: Math.floor(w.wy / BASE_CELL_SIZE),
    };
  };

  return { worldToScreen, screenToWorld, screenToCell };
}

export function isLightColor(hex?: string): boolean {
  if (!hex || hex[0] !== '#') return false;
  const clean = hex.slice(1);
  if (clean.length !== 3 && clean.length !== 6) return false;
  const rgb =
    clean.length === 3
      ? clean.split('').map((c) => parseInt(c + c, 16))
      : [
          parseInt(clean.slice(0, 2), 16),
          parseInt(clean.slice(2, 4), 16),
          parseInt(clean.slice(4, 6), 16),
        ];
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.6;
}

export function renderGridAndComponents({
  ctx,
  width,
  height,
  camera,
  components,
  selectedIds,
  hoverCell,
  previewComponent,
  marqueeBox,
  particles,
  backgroundColor = '#171717',
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: Camera;
  components: Map<string, RedstoneComponent>;
  selectedIds: Set<string>;
  hoverCell: { cx: number; cy: number } | null;
  previewComponent: { type: string; rotation: number } | null;
  marqueeBox: { x1: number; y1: number; x2: number; y2: number } | null;
  particles: Particle[];
  backgroundColor?: string;
}) {
  const { worldToScreen, screenToWorld } = createTransform(camera, width, height);
  const cellSize = BASE_CELL_SIZE * camera.zoom;
  const lightBg = isLightColor(backgroundColor);

  // 1. Clear canvas transparently so underlying CSS background container shows
  ctx.clearRect(0, 0, width, height);

  // 2. Visible world bounds for culling
  const topLeftWorld = screenToWorld(0, 0);
  const bottomRightWorld = screenToWorld(width, height);

  const startCol = Math.floor(topLeftWorld.wx / BASE_CELL_SIZE) - 1;
  const endCol = Math.ceil(bottomRightWorld.wx / BASE_CELL_SIZE) + 1;
  const startRow = Math.floor(topLeftWorld.wy / BASE_CELL_SIZE) - 1;
  const endRow = Math.ceil(bottomRightWorld.wy / BASE_CELL_SIZE) + 1;

  // 3. Draw subtle grid lines (adaptive contrast)
  ctx.lineWidth = 1;
  ctx.strokeStyle = lightBg ? 'rgba(0, 0, 0, 0.14)' : '#242424';

  ctx.beginPath();
  for (let c = startCol; c <= endCol; c++) {
    const { sx } = worldToScreen(c, 0);
    ctx.moveTo(Math.floor(sx) + 0.5, 0);
    ctx.lineTo(Math.floor(sx) + 0.5, height);
  }
  for (let r = startRow; r <= endRow; r++) {
    const { sy } = worldToScreen(0, r);
    ctx.moveTo(0, Math.floor(sy) + 0.5);
    ctx.lineTo(width, Math.floor(sy) + 0.5);
  }
  ctx.stroke();

  // Draw origin crosshair (0, 0)
  const originScreen = worldToScreen(0, 0);
  if (
    originScreen.sx >= -50 &&
    originScreen.sx <= width + 50 &&
    originScreen.sy >= -50 &&
    originScreen.sy <= height + 50
  ) {
    ctx.strokeStyle = lightBg ? 'rgba(0, 0, 0, 0.35)' : '#383838';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originScreen.sx - 8, originScreen.sy);
    ctx.lineTo(originScreen.sx + 8, originScreen.sy);
    ctx.moveTo(originScreen.sx, originScreen.sy - 8);
    ctx.lineTo(originScreen.sx, originScreen.sy + 8);
    ctx.stroke();
  }

  // 4. Render components (culled)
  // Render solid blocks and wiring first, then overlays
  const sortedComponents = Array.from(components.values()).filter(
    (c) => c.x >= startCol && c.x <= endCol && c.y >= startRow && c.y <= endRow
  );

  for (const comp of sortedComponents) {
    const { sx, sy } = worldToScreen(comp.x, comp.y);

    ctx.save();
    ctx.translate(sx, sy);

    switch (comp.type) {
      case 'redstone_dust':
        Pixels.drawRedstoneDust(ctx, comp, components, cellSize);
        break;
      case 'redstone_torch':
        Pixels.drawRedstoneTorch(ctx, comp, cellSize);
        break;
      case 'redstone_repeater':
        Pixels.drawRepeater(ctx, comp, cellSize);
        break;
      case 'redstone_comparator':
        Pixels.drawComparator(ctx, comp, cellSize);
        break;
      case 'lever':
        Pixels.drawLever(ctx, comp, cellSize);
        break;
      case 'stone_button':
        Pixels.drawButton(ctx, comp, cellSize, false);
        break;
      case 'wooden_button':
        Pixels.drawButton(ctx, comp, cellSize, true);
        break;
      case 'pressure_plate':
        Pixels.drawPressurePlate(ctx, comp, cellSize);
        break;
      case 'redstone_block':
        Pixels.drawRedstoneBlock(ctx, cellSize);
        break;
      case 'redstone_lamp':
        Pixels.drawRedstoneLamp(ctx, comp, cellSize);
        break;
      case 'observer':
        Pixels.drawObserver(ctx, comp, cellSize);
        break;
      case 'piston':
        Pixels.drawPiston(ctx, comp, cellSize, false);
        break;
      case 'sticky_piston':
        Pixels.drawPiston(ctx, comp, cellSize, true);
        break;
      case 'note_block':
        Pixels.drawNoteBlock(ctx, comp, cellSize);
        break;
      case 'tnt':
        Pixels.drawTNT(ctx, comp, cellSize);
        break;
      case 'dispenser':
        Pixels.drawDispenser(ctx, comp, cellSize, false);
        break;
      case 'dropper':
        Pixels.drawDispenser(ctx, comp, cellSize, true);
        break;
      case 'hopper':
        Pixels.drawHopper(ctx, comp, cellSize);
        break;
      case 'daylight_detector':
        Pixels.drawDaylightDetector(ctx, comp, cellSize);
        break;
      case 'stone_block':
        Pixels.drawSmoothStone(ctx, cellSize);
        break;
      case 'target_block':
        Pixels.drawTargetBlock(ctx, comp, cellSize);
        break;
      case 'tripwire_hook':
        Pixels.drawTripwireHook(ctx, comp, cellSize);
        break;
      case 'tripwire':
        Pixels.drawTripwire(ctx, comp, cellSize);
        break;
      case 'trapped_chest':
        Pixels.drawTrappedChest(ctx, comp, cellSize);
        break;
      default:
        break;
    }

    ctx.restore();

    // Selection highlight
    if (selectedIds.has(comp.id)) {
      ctx.save();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

      // Subtle corner markers
      ctx.fillStyle = '#ffffff';
      const mark = 3;
      ctx.fillRect(sx, sy, mark, mark);
      ctx.fillRect(sx + cellSize - mark, sy, mark, mark);
      ctx.fillRect(sx, sy + cellSize - mark, mark, mark);
      ctx.fillRect(sx + cellSize - mark, sy + cellSize - mark, mark, mark);
      ctx.restore();
    }
  }

  // 5. Draw Placement Ghost Preview
  if (hoverCell && previewComponent) {
    const { sx, sy } = worldToScreen(hoverCell.cx, hoverCell.cy);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.translate(sx, sy);

    const dummyComp: RedstoneComponent = {
      id: 'ghost',
      type: previewComponent.type as any,
      x: hoverCell.cx,
      y: hoverCell.cy,
      rotation: previewComponent.rotation,
      power: 0,
      properties: { delay: 1, mode: 'compare' },
    };

    switch (previewComponent.type) {
      case 'redstone_dust':
        Pixels.drawRedstoneDust(ctx, dummyComp, components, cellSize);
        break;
      case 'redstone_torch':
        Pixels.drawRedstoneTorch(ctx, dummyComp, cellSize);
        break;
      case 'redstone_repeater':
        Pixels.drawRepeater(ctx, dummyComp, cellSize);
        break;
      case 'redstone_comparator':
        Pixels.drawComparator(ctx, dummyComp, cellSize);
        break;
      case 'lever':
        Pixels.drawLever(ctx, dummyComp, cellSize);
        break;
      case 'stone_button':
        Pixels.drawButton(ctx, dummyComp, cellSize, false);
        break;
      case 'wooden_button':
        Pixels.drawButton(ctx, dummyComp, cellSize, true);
        break;
      case 'pressure_plate':
        Pixels.drawPressurePlate(ctx, dummyComp, cellSize);
        break;
      case 'redstone_block':
        Pixels.drawRedstoneBlock(ctx, cellSize);
        break;
      case 'redstone_lamp':
        Pixels.drawRedstoneLamp(ctx, dummyComp, cellSize);
        break;
      case 'observer':
        Pixels.drawObserver(ctx, dummyComp, cellSize);
        break;
      case 'piston':
        Pixels.drawPiston(ctx, dummyComp, cellSize, false);
        break;
      case 'sticky_piston':
        Pixels.drawPiston(ctx, dummyComp, cellSize, true);
        break;
      case 'note_block':
        Pixels.drawNoteBlock(ctx, dummyComp, cellSize);
        break;
      case 'tnt':
        Pixels.drawTNT(ctx, dummyComp, cellSize);
        break;
      case 'dispenser':
        Pixels.drawDispenser(ctx, dummyComp, cellSize, false);
        break;
      case 'dropper':
        Pixels.drawDispenser(ctx, dummyComp, cellSize, true);
        break;
      case 'hopper':
        Pixels.drawHopper(ctx, dummyComp, cellSize);
        break;
      case 'daylight_detector':
        Pixels.drawDaylightDetector(ctx, dummyComp, cellSize);
        break;
      case 'stone_block':
        Pixels.drawSmoothStone(ctx, cellSize);
        break;
      case 'target_block':
        Pixels.drawTargetBlock(ctx, dummyComp, cellSize);
        break;
      case 'tripwire_hook':
        Pixels.drawTripwireHook(ctx, dummyComp, cellSize);
        break;
      case 'tripwire':
        Pixels.drawTripwire(ctx, dummyComp, cellSize);
        break;
      case 'trapped_chest':
        Pixels.drawTrappedChest(ctx, dummyComp, cellSize);
        break;
      default:
        break;
    }
    ctx.restore();

    // Cell cursor outline
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, cellSize, cellSize);
    ctx.restore();
  }

  // 6. Draw Marquee Selection Box
  if (marqueeBox) {
    const x = Math.min(marqueeBox.x1, marqueeBox.x2);
    const y = Math.min(marqueeBox.y1, marqueeBox.y2);
    const w = Math.abs(marqueeBox.x2 - marqueeBox.x1);
    const h = Math.abs(marqueeBox.y2 - marqueeBox.y1);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  // 7. Render dynamic particles
  for (const p of particles) {
    const { sx, sy } = worldToScreen(p.x, p.y);
    const alpha = 1 - p.life / p.maxLife;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (p.type === 'note') {
      ctx.fillStyle = p.color;
      ctx.font = `bold ${Math.round(p.size * camera.zoom)}px monospace`;
      ctx.fillText('♪', sx, sy);
    } else if (p.type === 'projectile') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, (p.size / 2) * camera.zoom), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      const sz = Math.max(2, p.size * camera.zoom * (1 - p.life / p.maxLife));
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }

    ctx.restore();
  }
}
