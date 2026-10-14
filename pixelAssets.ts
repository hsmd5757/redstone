import { RedstoneComponent, Particle } from '../types';
import { connectsToDust, getFacingOffset, getOppositeRotation, CARDINALS, posKey } from '../simulation/engine';

/**
 * Returns color hex for redstone dust power (0 to 15).
 * 0 is dark dried blood / burgundy, 15 is vivid glowing scarlet.
 */
export function getRedstoneDustColor(power: number): string {
  if (power <= 0) return '#4d0f0f';
  // Scale between dark red and vivid red
  const t = Math.min(15, Math.max(1, power)) / 15;
  const r = Math.round(180 + t * 75);
  const g = Math.round(15 + t * 40);
  const b = Math.round(15 + t * 25);
  return `rgb(${r},${g},${b})`;
}

export function drawRedstoneDust(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  componentsMap: Map<string, RedstoneComponent>,
  cellSize: number
) {
  const p = comp.power;
  const color = getRedstoneDustColor(p);
  const isPowered = p > 0;

  // Check 4 orthogonal neighbors to determine connections
  const up = connectsToDust(comp, componentsMap.get(posKey(comp.x, comp.y - 1)), 0, -1);
  const right = connectsToDust(comp, componentsMap.get(posKey(comp.x + 1, comp.y)), 1, 0);
  const down = connectsToDust(comp, componentsMap.get(posKey(comp.x, comp.y + 1)), 0, 1);
  const left = connectsToDust(comp, componentsMap.get(posKey(comp.x - 1, comp.y)), -1, 0);

  const numConn = (up ? 1 : 0) + (right ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0);

  const wireWidth = cellSize * 0.22;
  const halfWire = wireWidth / 2;
  const center = cellSize / 2;

  ctx.save();

  // Glow halo if powered
  if (isPowered) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
  }

  ctx.fillStyle = color;

  // If isolated (0 connections), draw dot / small cross
  if (numConn === 0) {
    const dotSize = cellSize * 0.36;
    ctx.fillRect(center - dotSize / 2, center - dotSize / 2, dotSize, dotSize);
    // Dark core / bevel
    ctx.fillStyle = isPowered ? '#ff7373' : '#330808';
    ctx.fillRect(center - dotSize / 4, center - dotSize / 4, dotSize / 2, dotSize / 2);
  } else {
    // Draw central hub
    ctx.fillRect(center - halfWire, center - halfWire, wireWidth, wireWidth);

    // Draw connected branches
    if (up) ctx.fillRect(center - halfWire, 0, wireWidth, center);
    if (down) ctx.fillRect(center - halfWire, center, wireWidth, center);
    if (left) ctx.fillRect(0, center - halfWire, center, wireWidth);
    if (right) ctx.fillRect(center, center - halfWire, center, wireWidth);

    // Highlight ridge along the wires
    ctx.fillStyle = isPowered ? '#ff7878' : '#3a0808';
    const highlightW = Math.max(1, wireWidth * 0.3);
    const halfH = highlightW / 2;

    ctx.fillRect(center - halfH, center - halfH, highlightW, highlightW);
    if (up) ctx.fillRect(center - halfH, 0, highlightW, center);
    if (down) ctx.fillRect(center - halfH, center, highlightW, center);
    if (left) ctx.fillRect(0, center - halfH, center, highlightW);
    if (right) ctx.fillRect(center, center - halfH, center, highlightW);
  }

  // Draw signal strength number if cell is large enough
  if (cellSize >= 38 && p > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(cellSize * 0.22)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p}`, center, center);
  }

  ctx.restore();
}

export function drawRedstoneTorch(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isLit = comp.power > 0;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Mount stick backing
  ctx.fillStyle = '#5c4033'; // Dark wood
  ctx.fillRect(-cellSize * 0.08, cellSize * 0.05, cellSize * 0.16, cellSize * 0.35);

  // Redstone head
  if (isLit) {
    ctx.shadowColor = '#ff2b2b';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff2222';
  } else {
    ctx.fillStyle = '#420a0a';
  }

  // Torch tip
  ctx.fillRect(-cellSize * 0.12, -cellSize * 0.22, cellSize * 0.24, cellSize * 0.28);

  // Tip highlight
  ctx.fillStyle = isLit ? '#ff9999' : '#2b0505';
  ctx.fillRect(-cellSize * 0.06, -cellSize * 0.18, cellSize * 0.12, cellSize * 0.12);

  ctx.restore();
}

export function drawRepeater(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isPowered = comp.power > 0;
  const isLocked = !!comp.properties.locked;
  const delay = comp.properties.delay || 1; // 1 to 4
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Smooth stone slab base
  ctx.fillStyle = '#6e7075';
  ctx.fillRect(-cellSize * 0.44, -cellSize * 0.44, cellSize * 0.88, cellSize * 0.88);

  // Slab top texture
  ctx.fillStyle = '#83858a';
  ctx.fillRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  // Directional arrow on base pointing North (front)
  ctx.fillStyle = isPowered ? '#ef4444' : '#55585e';
  ctx.beginPath();
  ctx.moveTo(0, -cellSize * 0.28);
  ctx.lineTo(cellSize * 0.14, -cellSize * 0.08);
  ctx.lineTo(-cellSize * 0.14, -cellSize * 0.08);
  ctx.closePath();
  ctx.fill();

  // Fixed output torch (near front)
  const frontTorchLit = isPowered;
  ctx.fillStyle = frontTorchLit ? '#ff2222' : '#450b0b';
  if (frontTorchLit) {
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 6;
  }
  ctx.fillRect(-cellSize * 0.08, -cellSize * 0.32, cellSize * 0.16, cellSize * 0.16);

  // Delay torch (moves backward depending on delay 1..4)
  // 1: y = -0.05, 4: y = 0.28
  const delayY = -cellSize * 0.08 + (delay - 1) * (cellSize * 0.11);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3e2723'; // stick
  ctx.fillRect(-cellSize * 0.06, delayY, cellSize * 0.12, cellSize * 0.14);

  ctx.fillStyle = frontTorchLit ? '#ff3333' : '#450b0b';
  if (frontTorchLit) {
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 6;
  }
  ctx.fillRect(-cellSize * 0.08, delayY - cellSize * 0.05, cellSize * 0.16, cellSize * 0.14);

  // Bedrock lock bar if locked
  if (isLocked) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222222';
    ctx.fillRect(-cellSize * 0.35, -cellSize * 0.05, cellSize * 0.7, cellSize * 0.1);
  }

  ctx.restore();
}

export function drawComparator(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isPowered = comp.power > 0;
  const isSubtract = comp.properties.mode === 'subtract';
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Quartz/Stone base slab
  ctx.fillStyle = '#7a7c80';
  ctx.fillRect(-cellSize * 0.44, -cellSize * 0.44, cellSize * 0.88, cellSize * 0.88);

  ctx.fillStyle = '#8f9296';
  ctx.fillRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  // Two rear torches
  const rearLit = isPowered;
  ctx.fillStyle = rearLit ? '#ff2b2b' : '#450b0b';
  if (rearLit) {
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 4;
  }
  ctx.fillRect(-cellSize * 0.26, cellSize * 0.14, cellSize * 0.14, cellSize * 0.14);
  ctx.fillRect(cellSize * 0.12, cellSize * 0.14, cellSize * 0.14, cellSize * 0.14);

  // Front mode torch (on = subtraction mode)
  ctx.fillStyle = isSubtract ? '#ff3b3b' : '#330808';
  if (isSubtract) {
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 5;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillRect(-cellSize * 0.07, -cellSize * 0.28, cellSize * 0.14, cellSize * 0.14);

  ctx.restore();
}

export function drawLever(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isOn = !!comp.properties.active;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Cobblestone mounting plate
  ctx.fillStyle = '#4f5052';
  ctx.fillRect(-cellSize * 0.36, -cellSize * 0.36, cellSize * 0.72, cellSize * 0.72);
  ctx.fillStyle = '#656669';
  ctx.fillRect(-cellSize * 0.3, -cellSize * 0.3, cellSize * 0.6, cellSize * 0.6);

  // Wooden lever handle
  ctx.lineWidth = Math.max(3, cellSize * 0.12);
  ctx.strokeStyle = '#5a3d28';
  ctx.beginPath();
  if (isOn) {
    // Toggled Right / Down
    ctx.moveTo(-cellSize * 0.1, -cellSize * 0.1);
    ctx.lineTo(cellSize * 0.22, cellSize * 0.22);
  } else {
    // Toggled Left / Up
    ctx.moveTo(cellSize * 0.1, cellSize * 0.1);
    ctx.lineTo(-cellSize * 0.22, -cellSize * 0.22);
  }
  ctx.stroke();

  // Handle tip
  ctx.fillStyle = '#2d1f14';
  if (isOn) {
    ctx.fillRect(cellSize * 0.16, cellSize * 0.16, cellSize * 0.14, cellSize * 0.14);
  } else {
    ctx.fillRect(-cellSize * 0.28, -cellSize * 0.28, cellSize * 0.14, cellSize * 0.14);
  }

  ctx.restore();
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number,
  isWood: boolean
) {
  const isPressed = !!comp.properties.active;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Stone base plate
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  // Button rectangle
  const btnColor = isWood ? (isPressed ? '#6e472a' : '#8a5933') : (isPressed ? '#555555' : '#777777');
  ctx.fillStyle = btnColor;
  const scale = isPressed ? 0.85 : 1.0;
  const w = cellSize * 0.45 * scale;
  const h = cellSize * 0.28 * scale;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Bevel highlight
  ctx.fillStyle = isWood ? '#9c663b' : '#888888';
  ctx.fillRect(-w / 2, -h / 2, w, Math.max(1, h * 0.25));

  ctx.restore();
}

export function drawPressurePlate(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isPressed = !!comp.properties.active;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Background cell floor
  ctx.fillStyle = '#222222';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Plate
  ctx.fillStyle = isPressed ? '#595b5e' : '#7b7d82';
  const margin = isPressed ? cellSize * 0.18 : cellSize * 0.12;
  const size = cellSize - margin * 2;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.restore();
}

export function drawRedstoneBlock(
  ctx: CanvasRenderingContext2D,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  // Deep rich ruby block
  ctx.fillStyle = '#9e1313';
  ctx.fillRect(-cellSize * 0.44, -cellSize * 0.44, cellSize * 0.88, cellSize * 0.88);

  // Crystalline facets
  ctx.fillStyle = '#d41c1c';
  ctx.fillRect(-cellSize * 0.36, -cellSize * 0.36, cellSize * 0.72, cellSize * 0.72);

  ctx.fillStyle = '#ff4242';
  ctx.fillRect(-cellSize * 0.3, -cellSize * 0.3, cellSize * 0.25, cellSize * 0.25);
  ctx.fillRect(cellSize * 0.05, cellSize * 0.05, cellSize * 0.25, cellSize * 0.25);

  ctx.restore();
}

export function drawRedstoneLamp(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isLit = comp.power > 0;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Outer dark wood frame
  ctx.fillStyle = '#26170d';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Lamp glass
  if (isLit) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f59e0b';
  } else {
    ctx.fillStyle = '#4a2c16';
  }
  ctx.fillRect(-cellSize * 0.38, -cellSize * 0.38, cellSize * 0.76, cellSize * 0.76);

  // Incandescent filaments/cross lattice
  ctx.fillStyle = isLit ? '#fbbf24' : '#331c0e';
  const halfBar = Math.max(1, cellSize * 0.04);
  ctx.fillRect(-cellSize * 0.38, -halfBar, cellSize * 0.76, halfBar * 2);
  ctx.fillRect(-halfBar, -cellSize * 0.38, halfBar * 2, cellSize * 0.76);

  ctx.restore();
}

export function drawObserver(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isPulsing = comp.power > 0;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Stone block chassis
  ctx.fillStyle = '#5c5e63';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Observer Face at North / Front (monitoring eye)
  ctx.fillStyle = '#2a2b2e';
  ctx.fillRect(-cellSize * 0.32, -cellSize * 0.42, cellSize * 0.64, cellSize * 0.22);
  // Red detector iris
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-cellSize * 0.12, -cellSize * 0.36, cellSize * 0.24, cellSize * 0.12);

  // Back output indicator light (South)
  ctx.fillStyle = isPulsing ? '#ff2222' : '#3d0a0a';
  if (isPulsing) {
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 6;
  }
  ctx.fillRect(-cellSize * 0.14, cellSize * 0.26, cellSize * 0.28, cellSize * 0.14);

  ctx.restore();
}

export function drawPiston(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number,
  isSticky: boolean
) {
  const isExtended = !!comp.properties.extended;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Cobblestone/Iron base
  ctx.fillStyle = '#555659';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Mechanism rod
  if (isExtended) {
    ctx.fillStyle = '#8f9296';
    ctx.fillRect(-cellSize * 0.1, -cellSize * 0.45, cellSize * 0.2, cellSize * 0.4);
  }

  // Wooden Head face (North/Up)
  ctx.fillStyle = '#8f5c35'; // Wood plank
  const headY = isExtended ? -cellSize * 0.95 : -cellSize * 0.45;
  ctx.fillRect(-cellSize * 0.42, headY, cellSize * 0.84, cellSize * 0.3);

  // Sticky slime layer
  if (isSticky) {
    ctx.fillStyle = '#58a038';
    ctx.fillRect(-cellSize * 0.34, headY, cellSize * 0.68, cellSize * 0.1);
  }

  ctx.restore();
}

export function drawNoteBlock(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  // Wood planks body
  ctx.fillStyle = '#7a4b27';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  ctx.fillStyle = '#945c30';
  ctx.fillRect(-cellSize * 0.38, -cellSize * 0.38, cellSize * 0.76, cellSize * 0.76);

  // Stylized music eighth note icon
  ctx.fillStyle = '#3a200e';
  const s = cellSize * 0.18;
  ctx.beginPath();
  ctx.arc(-s * 0.5, s * 0.6, s * 0.4, 0, Math.PI * 2);
  ctx.arc(s * 0.6, s * 0.2, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-s * 0.2, -s * 0.7, s * 0.3, s * 1.3);
  ctx.fillRect(s * 0.7, -s * 0.7, s * 0.3, s * 0.9);
  ctx.fillRect(-s * 0.2, -s * 0.7, s * 1.2, s * 0.35);

  ctx.restore();
}

export function drawTNT(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isPrimed = !!comp.properties.primed;
  const timer = comp.properties.timer ?? 0;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Flashes white if primed
  const flash = isPrimed && Math.floor(timer * 2) % 2 === 0;

  ctx.fillStyle = flash ? '#ffffff' : '#b91c1c';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // White middle band
  ctx.fillStyle = flash ? '#f3f4f6' : '#ffffff';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.14, cellSize * 0.9, cellSize * 0.28);

  // TNT text
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${Math.round(cellSize * 0.2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TNT', 0, 0);

  ctx.restore();
}

export function drawDispenser(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number,
  isDropper: boolean
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Cobblestone body
  ctx.fillStyle = '#525459';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Mouth: round for dispenser, triangle for dropper
  ctx.fillStyle = '#1e1f21';
  if (isDropper) {
    ctx.beginPath();
    ctx.moveTo(0, -cellSize * 0.32);
    ctx.lineTo(cellSize * 0.18, -cellSize * 0.08);
    ctx.lineTo(-cellSize * 0.18, -cellSize * 0.08);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -cellSize * 0.2, cellSize * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawDaylightDetector(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isInverted = !!comp.properties.inverted;
  const center = cellSize / 2;

  ctx.save();
  ctx.translate(center, center);

  // Wood base
  ctx.fillStyle = '#7a4b27';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Solar cells
  ctx.fillStyle = isInverted ? '#1e3a8a' : '#0284c7';
  const quad = cellSize * 0.32;
  ctx.fillRect(-cellSize * 0.38, -cellSize * 0.38, quad, quad);
  ctx.fillRect(cellSize * 0.06, -cellSize * 0.38, quad, quad);
  ctx.fillRect(-cellSize * 0.38, cellSize * 0.06, quad, quad);
  ctx.fillRect(cellSize * 0.06, cellSize * 0.06, quad, quad);

  ctx.restore();
}

export function drawSmoothStone(
  ctx: CanvasRenderingContext2D,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  ctx.fillStyle = '#65676b';
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  ctx.fillStyle = '#7a7c82';
  ctx.fillRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  ctx.restore();
}

export function drawHopper(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Metal body
  ctx.fillStyle = '#3f4247';
  ctx.fillRect(-cellSize * 0.42, -cellSize * 0.42, cellSize * 0.84, cellSize * 0.4);

  // Funnel
  ctx.fillStyle = '#2d2f33';
  ctx.beginPath();
  ctx.moveTo(-cellSize * 0.35, -cellSize * 0.02);
  ctx.lineTo(cellSize * 0.35, -cellSize * 0.02);
  ctx.lineTo(cellSize * 0.16, cellSize * 0.35);
  ctx.lineTo(-cellSize * 0.16, cellSize * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawTargetBlock(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  ctx.fillStyle = '#eae2cf'; // Pale wood/hay
  ctx.fillRect(-cellSize * 0.45, -cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);

  // Red concentric rings
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, cellSize * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eae2cf';
  ctx.beginPath();
  ctx.arc(0, 0, cellSize * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, cellSize * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawTripwireHook(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((comp.rotation * Math.PI) / 180);

  // Wood base
  ctx.fillStyle = '#6d4c33';
  ctx.fillRect(-cellSize * 0.2, cellSize * 0.2, cellSize * 0.4, cellSize * 0.2);

  // Iron hook
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-cellSize * 0.06, -cellSize * 0.1, cellSize * 0.12, cellSize * 0.3);
  ctx.fillRect(-cellSize * 0.12, -cellSize * 0.2, cellSize * 0.24, cellSize * 0.1);

  ctx.restore();
}

export function drawTripwire(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  // Thin line string
  ctx.strokeStyle = comp.properties.tripped ? '#ef4444' : '#94a3b8';
  ctx.lineWidth = Math.max(1.5, cellSize * 0.05);
  ctx.beginPath();
  ctx.moveTo(-cellSize * 0.5, 0);
  ctx.lineTo(cellSize * 0.5, 0);
  ctx.stroke();

  ctx.restore();
}

export function drawTrappedChest(
  ctx: CanvasRenderingContext2D,
  comp: RedstoneComponent,
  cellSize: number
) {
  const isOpen = !!comp.properties.active;
  const center = cellSize / 2;
  ctx.save();
  ctx.translate(center, center);

  // Chest wood
  ctx.fillStyle = '#9a6229';
  ctx.fillRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  // Orange redstone trim (Minecraft trapped chest identifier!)
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = Math.max(1.5, cellSize * 0.06);
  ctx.strokeRect(-cellSize * 0.4, -cellSize * 0.4, cellSize * 0.8, cellSize * 0.8);

  // Front latch
  ctx.fillStyle = isOpen ? '#ff2222' : '#2b2b2b';
  ctx.fillRect(-cellSize * 0.08, -cellSize * 0.05, cellSize * 0.16, cellSize * 0.2);

  ctx.restore();
}
