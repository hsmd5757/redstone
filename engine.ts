import { RedstoneComponent, Particle } from '../types';
import { soundEngine } from '../utils/audio';

export function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parsePosKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export const CARDINALS: { dx: number; dy: number; rot: number; name: 'up' | 'right' | 'down' | 'left' }[] = [
  { dx: 0, dy: -1, rot: 0, name: 'up' },
  { dx: 1, dy: 0, rot: 90, name: 'right' },
  { dx: 0, dy: 1, rot: 180, name: 'down' },
  { dx: -1, dy: 0, rot: 270, name: 'left' },
];

export function getFacingOffset(rotation: number): { dx: number; dy: number } {
  const norm = ((rotation % 360) + 360) % 360;
  switch (norm) {
    case 0:
      return { dx: 0, dy: -1 };
    case 90:
      return { dx: 1, dy: 0 };
    case 180:
      return { dx: 0, dy: 1 };
    case 270:
      return { dx: -1, dy: 0 };
    default:
      return { dx: 0, dy: -1 };
  }
}

export function getOppositeRotation(rotation: number): number {
  return (rotation + 180) % 360;
}

export function getPerpendicularOffsets(rotation: number): { left: { dx: number; dy: number }; right: { dx: number; dy: number } } {
  const norm = ((rotation % 360) + 360) % 360;
  switch (norm) {
    case 0: // Facing Up
      return { left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };
    case 90: // Facing Right
      return { left: { dx: 0, dy: -1 }, right: { dx: 0, dy: 1 } };
    case 180: // Facing Down
      return { left: { dx: 1, dy: 0 }, right: { dx: -1, dy: 0 } };
    case 270: // Facing Left
      return { left: { dx: 0, dy: 1 }, right: { dx: 0, dy: -1 } };
    default:
      return { left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };
  }
}

/**
 * Checks whether an adjacent component connects to redstone dust.
 */
export function connectsToDust(
  dust: RedstoneComponent,
  other: RedstoneComponent | undefined,
  dx: number,
  dy: number
): boolean {
  if (!other) return false;

  // Dust always connects to adjacent dust
  if (other.type === 'redstone_dust') return true;

  // Power sources and inputs/outputs connect
  if (
    other.type === 'lever' ||
    other.type === 'stone_button' ||
    other.type === 'wooden_button' ||
    other.type === 'pressure_plate' ||
    other.type === 'redstone_block' ||
    other.type === 'daylight_detector' ||
    other.type === 'redstone_lamp' ||
    other.type === 'target_block' ||
    other.type === 'note_block' ||
    other.type === 'tnt' ||
    other.type === 'trapped_chest'
  ) {
    return true;
  }

  // Directional components connect on their respective inputs / outputs
  if (other.type === 'redstone_repeater' || other.type === 'redstone_comparator') {
    const facing = getFacingOffset(other.rotation);
    // Repeater/Comparator output is at front (dx === facing.dx, dy === facing.dy from other's perspective)
    // From dust's perspective, dust is at (other.x + dx, other.y + dy)
    // If dust is in front of other: other's front points into dust
    if (other.x + facing.dx === dust.x && other.y + facing.dy === dust.y) {
      return true;
    }
    // If dust is behind other: dust feeds into other's back
    if (other.x - facing.dx === dust.x && other.y - facing.dy === dust.y) {
      return true;
    }
    // Comparator also accepts side inputs
    if (other.type === 'redstone_comparator') {
      const perps = getPerpendicularOffsets(other.rotation);
      if (
        (other.x + perps.left.dx === dust.x && other.y + perps.left.dy === dust.y) ||
        (other.x + perps.right.dx === dust.x && other.y + perps.right.dy === dust.y)
      ) {
        return true;
      }
    }
    return false;
  }

  // Redstone torch: dust connects if adjacent
  if (other.type === 'redstone_torch') {
    return true;
  }

  // Observer: back outputs power, front monitors
  if (other.type === 'observer') {
    const facing = getFacingOffset(other.rotation);
    // Back points into dust
    if (other.x - facing.dx === dust.x && other.y - facing.dy === dust.y) {
      return true;
    }
    return false;
  }

  // Piston, Dispenser, Dropper, Hopper
  if (
    other.type === 'piston' ||
    other.type === 'sticky_piston' ||
    other.type === 'dispenser' ||
    other.type === 'dropper' ||
    other.type === 'hopper'
  ) {
    return true;
  }

  return false;
}

/**
 * Propagates combinational redstone dust power across the network.
 * Redstone signals decay by 1 each step (from max 15 down to 0).
 */
export function propagateRedstoneSignals(
  components: Map<string, RedstoneComponent>
): { updatedCount: number; newParticles: Particle[] } {
  const newParticles: Particle[] = [];

  // 1. Identify all direct power injectors into adjacent cells
  // Map of (x, y) -> maximum power received
  const receivedPower = new Map<string, number>();

  const injectPower = (x: number, y: number, power: number) => {
    if (power <= 0) return;
    const k = posKey(x, y);
    const curr = receivedPower.get(k) || 0;
    if (power > curr) {
      receivedPower.set(k, power);
    }
  };

  // Inspect each component to see what it injects into neighbors
  for (const comp of components.values()) {
    switch (comp.type) {
      case 'redstone_block':
        for (const c of CARDINALS) {
          injectPower(comp.x + c.dx, comp.y + c.dy, 15);
        }
        break;

      case 'lever':
        if (comp.properties.active) {
          for (const c of CARDINALS) {
            injectPower(comp.x + c.dx, comp.y + c.dy, 15);
          }
        }
        break;

      case 'stone_button':
      case 'wooden_button':
      case 'pressure_plate':
      case 'trapped_chest':
      case 'target_block':
        if (comp.properties.active) {
          for (const c of CARDINALS) {
            injectPower(comp.x + c.dx, comp.y + c.dy, 15);
          }
        }
        break;

      case 'daylight_detector':
        if (comp.properties.active) {
          const power = comp.properties.inverted ? 0 : 15;
          for (const c of CARDINALS) {
            injectPower(comp.x + c.dx, comp.y + c.dy, power);
          }
        }
        break;

      case 'redstone_torch':
        // Torch emits power 15 to all orthogonal neighbors EXCEPT its back/mount cell
        if (comp.power > 0) {
          const back = getFacingOffset(getOppositeRotation(comp.rotation));
          for (const c of CARDINALS) {
            if (c.dx !== back.dx || c.dy !== back.dy) {
              injectPower(comp.x + c.dx, comp.y + c.dy, 15);
            }
          }
        }
        break;

      case 'redstone_repeater':
        // Outputs power 15 strictly to the front cell
        if (comp.power > 0) {
          const front = getFacingOffset(comp.rotation);
          injectPower(comp.x + front.dx, comp.y + front.dy, 15);
        }
        break;

      case 'redstone_comparator':
        // Outputs comparator power to the front cell
        if (comp.power > 0) {
          const front = getFacingOffset(comp.rotation);
          injectPower(comp.x + front.dx, comp.y + front.dy, comp.power);
        }
        break;

      case 'observer':
        // Emits power 15 strictly out the back cell when pulsing
        if (comp.power > 0) {
          const back = getFacingOffset(getOppositeRotation(comp.rotation));
          injectPower(comp.x + back.dx, comp.y + back.dy, 15);
        }
        break;

      default:
        break;
    }
  }

  // 2. Propagate power through redstone dust using BFS Dijkstra
  // Priority queue / simple bucket queue from 15 down to 1
  const dustQueue: { x: number; y: number; power: number }[] = [];

  // Initialize dust directly powered by sources
  for (const comp of components.values()) {
    if (comp.type === 'redstone_dust') {
      const k = posKey(comp.x, comp.y);
      const direct = receivedPower.get(k) || 0;
      if (direct > 0) {
        dustQueue.push({ x: comp.x, y: comp.y, power: direct });
      }
    }
  }

  // Keep track of dust power
  const dustPowerMap = new Map<string, number>();

  // Sort initially descending
  dustQueue.sort((a, b) => b.power - a.power);

  while (dustQueue.length > 0) {
    const item = dustQueue.shift()!;
    const k = posKey(item.x, item.y);
    const existing = dustPowerMap.get(k) || 0;
    if (item.power <= existing) continue;

    dustPowerMap.set(k, item.power);

    if (item.power > 1) {
      // Propagate to adjacent dust
      for (const c of CARDINALS) {
        const nx = item.x + c.dx;
        const ny = item.y + c.dy;
        const neighbor = components.get(posKey(nx, ny));
        if (neighbor && neighbor.type === 'redstone_dust') {
          const nextPower = item.power - 1;
          const neighborExisting = dustPowerMap.get(posKey(nx, ny)) || 0;
          if (nextPower > neighborExisting) {
            dustQueue.push({ x: nx, y: ny, power: nextPower });
          }
        }
      }
    }
  }

  // Update dust power values and inject into consumers
  let updatedCount = 0;
  for (const comp of components.values()) {
    if (comp.type === 'redstone_dust') {
      const newPower = dustPowerMap.get(posKey(comp.x, comp.y)) || 0;
      if (comp.power !== newPower) {
        comp.power = newPower;
        updatedCount++;
      }
      // Dust also powers adjacent non-dust blocks
      if (comp.power > 0) {
        for (const c of CARDINALS) {
          injectPower(comp.x + c.dx, comp.y + c.dy, comp.power);
        }
      }
    }
  }

  // 3. Update passive consumers (Lamp, Note Block rising edge, etc.)
  for (const comp of components.values()) {
    const k = posKey(comp.x, comp.y);
    const incoming = receivedPower.get(k) || 0;

    if (comp.type === 'redstone_lamp') {
      const shouldBeLit = incoming > 0;
      const wasLit = comp.power > 0;
      if (shouldBeLit !== wasLit) {
        comp.power = shouldBeLit ? 15 : 0;
        updatedCount++;
      }
    } else if (comp.type === 'note_block') {
      const wasPowered = comp.power > 0;
      const isPowered = incoming > 0;
      if (!wasPowered && isPowered) {
        // Rising edge! Play sound
        soundEngine.playNote(comp.properties.pitch ?? 0, comp.properties.instrument ?? 'harp');
        // Spawn musical note particle
        newParticles.push({
          id: `note-${Date.now()}-${Math.random()}`,
          x: comp.x + 0.5,
          y: comp.y + 0.2,
          vx: (Math.random() - 0.5) * 0.05,
          vy: -0.06 - Math.random() * 0.04,
          color: '#38bdf8',
          life: 0,
          maxLife: 30,
          size: 14,
          type: 'note',
        });
      }
      comp.power = incoming;
    }
  }

  return { updatedCount, newParticles };
}

/**
 * Executes a single discrete Redstone Tick (100ms standard Minecraft redstone tick).
 * Handles components with tick delays, scheduled updates, timers, pistons, repeaters,
 * torches, comparators, observers, and explosions.
 */
export function stepSimulationTick(
  components: Map<string, RedstoneComponent>
): { particles: Particle[]; pushedBlocks: boolean } {
  const particles: Particle[] = [];
  let pushedBlocks = false;

  // Pre-propagation to get current incoming power map
  propagateRedstoneSignals(components);

  // Helper to query input power entering a specific cell
  const getCellPower = (x: number, y: number): number => {
    const comp = components.get(posKey(x, y));
    if (!comp) return 0;
    return comp.power;
  };

  // 1. Process Buttons & Momentary Timers
  for (const comp of components.values()) {
    if (comp.type === 'stone_button' || comp.type === 'wooden_button' || comp.type === 'pressure_plate' || comp.type === 'target_block') {
      if (comp.properties.active && comp.properties.timer !== undefined) {
        comp.properties.timer -= 1;
        if (comp.properties.timer <= 0) {
          comp.properties.active = false;
          comp.properties.timer = 0;
          comp.power = 0;
          soundEngine.playButton();
        }
      }
    }
  }

  // 2. Process Redstone Torches (1 tick delay inverter)
  // In Minecraft: torch is attached to a back block.
  // If the cell behind the torch has power > 0, the torch turns OFF.
  // If unpowered, torch turns ON.
  for (const comp of components.values()) {
    if (comp.type === 'redstone_torch') {
      const backOffset = getFacingOffset(getOppositeRotation(comp.rotation));
      const backPower = getCellPower(comp.x + backOffset.dx, comp.y + backOffset.dy);
      const shouldBeOn = backPower === 0;

      // Update state with 1-tick delay
      const nextPower = shouldBeOn ? 15 : 0;
      if (comp.power !== nextPower) {
        comp.power = nextPower;
      }
    }
  }

  // 3. Process Repeaters (delay 1-4 ticks, locking from sides)
  for (const comp of components.values()) {
    if (comp.type === 'redstone_repeater') {
      // Check locking from perpendicular sides
      const perps = getPerpendicularOffsets(comp.rotation);
      const leftNeighbor = components.get(posKey(comp.x + perps.left.dx, comp.y + perps.left.dy));
      const rightNeighbor = components.get(posKey(comp.x + perps.right.dx, comp.y + perps.right.dy));

      let isLocked = false;
      if (
        leftNeighbor &&
        (leftNeighbor.type === 'redstone_repeater' || leftNeighbor.type === 'redstone_comparator') &&
        leftNeighbor.power > 0
      ) {
        const leftFacing = getFacingOffset(leftNeighbor.rotation);
        if (leftNeighbor.x + leftFacing.dx === comp.x && leftNeighbor.y + leftFacing.dy === comp.y) {
          isLocked = true;
        }
      }
      if (
        rightNeighbor &&
        (rightNeighbor.type === 'redstone_repeater' || rightNeighbor.type === 'redstone_comparator') &&
        rightNeighbor.power > 0
      ) {
        const rightFacing = getFacingOffset(rightNeighbor.rotation);
        if (rightNeighbor.x + rightFacing.dx === comp.x && rightNeighbor.y + rightFacing.dy === comp.y) {
          isLocked = true;
        }
      }
      comp.properties.locked = isLocked;

      if (!isLocked) {
        // Back input
        const backOffset = getFacingOffset(getOppositeRotation(comp.rotation));
        const backPower = getCellPower(comp.x + backOffset.dx, comp.y + backOffset.dy);
        const hasInput = backPower > 0;
        const targetOutput = hasInput ? 15 : 0;

        const delay = comp.properties.delay || 1;

        if (comp.properties.scheduledTicks === undefined) {
          comp.properties.scheduledTicks = 0;
        }

        if (comp.power !== targetOutput) {
          if (comp.properties.scheduledTicks <= 0) {
            comp.properties.scheduledTicks = delay;
            comp.properties.scheduledOutput = targetOutput;
          } else {
            comp.properties.scheduledTicks -= 1;
            if (comp.properties.scheduledTicks <= 0) {
              comp.power = comp.properties.scheduledOutput ?? targetOutput;
            }
          }
        } else {
          comp.properties.scheduledTicks = 0;
        }
      }
    }
  }

  // 4. Process Comparators (Compare or Subtract)
  for (const comp of components.values()) {
    if (comp.type === 'redstone_comparator') {
      const backOffset = getFacingOffset(getOppositeRotation(comp.rotation));
      const inputA = getCellPower(comp.x + backOffset.dx, comp.y + backOffset.dy);

      const perps = getPerpendicularOffsets(comp.rotation);
      const sideLeftPower = getCellPower(comp.x + perps.left.dx, comp.y + perps.left.dy);
      const sideRightPower = getCellPower(comp.x + perps.right.dx, comp.y + perps.right.dy);
      const sidePower = Math.max(sideLeftPower, sideRightPower);

      let targetOutput = 0;
      if (comp.properties.mode === 'subtract') {
        targetOutput = Math.max(0, inputA - sidePower);
      } else {
        targetOutput = inputA >= sidePower ? inputA : 0;
      }

      comp.power = targetOutput;
    }
  }

  // 5. Process Observers (monitor block in front)
  for (const comp of components.values()) {
    if (comp.type === 'observer') {
      const frontOffset = getFacingOffset(comp.rotation);
      const frontComp = components.get(posKey(comp.x + frontOffset.dx, comp.y + frontOffset.dy));

      // Hash front state
      const currentState = frontComp
        ? `${frontComp.type}:${frontComp.power}:${frontComp.properties.active}:${frontComp.properties.extended}`
        : 'empty';

      if (comp.properties.previousFrontState !== undefined && comp.properties.previousFrontState !== currentState) {
        // Front block state changed! Trigger observer pulse
        comp.power = 15;
        comp.properties.timer = 2; // 2 tick pulse
      } else if (comp.properties.timer && comp.properties.timer > 0) {
        comp.properties.timer -= 1;
        if (comp.properties.timer <= 0) {
          comp.power = 0;
        }
      }
      comp.properties.previousFrontState = currentState;
    }
  }

  // 6. Process Pistons & Sticky Pistons
  for (const comp of components.values()) {
    if (comp.type === 'piston' || comp.type === 'sticky_piston') {
      const front = getFacingOffset(comp.rotation);
      // Check if powered from any of the other 3 non-front sides
      let isPowered = false;
      for (const c of CARDINALS) {
        if (c.dx !== front.dx || c.dy !== front.dy) {
          if (getCellPower(comp.x + c.dx, comp.y + c.dy) > 0) {
            isPowered = true;
            break;
          }
        }
      }

      const wasExtended = !!comp.properties.extended;

      if (isPowered && !wasExtended) {
        // Extend piston!
        const targetX = comp.x + front.dx;
        const targetY = comp.y + front.dy;
        const targetKey = posKey(targetX, targetY);
        const blockInFront = components.get(targetKey);

        if (!blockInFront) {
          // Free space, simple extension
          comp.properties.extended = true;
          soundEngine.playPiston(true);
        } else {
          // Pushable block?
          const pushX = targetX + front.dx;
          const pushY = targetY + front.dy;
          const pushKey = posKey(pushX, pushY);
          const pushDestination = components.get(pushKey);

          // Can push if destination is free
          if (!pushDestination) {
            components.delete(targetKey);
            blockInFront.x = pushX;
            blockInFront.y = pushY;
            components.set(pushKey, blockInFront);
            comp.properties.extended = true;
            pushedBlocks = true;
            soundEngine.playPiston(true);
          }
        }
      } else if (!isPowered && wasExtended) {
        // Retract piston!
        comp.properties.extended = false;
        soundEngine.playPiston(false);

        // Sticky piston pulls block back
        if (comp.type === 'sticky_piston') {
          const frontX = comp.x + front.dx;
          const frontY = comp.y + front.dy;
          const pullTargetX = frontX + front.dx;
          const pullTargetY = frontY + front.dy;
          const pullKey = posKey(pullTargetX, pullTargetY);
          const blockToPull = components.get(pullKey);

          if (blockToPull && !components.has(posKey(frontX, frontY))) {
            components.delete(pullKey);
            blockToPull.x = frontX;
            blockToPull.y = frontY;
            components.set(posKey(frontX, frontY), blockToPull);
            pushedBlocks = true;
          }
        }
      }
    }
  }

  // 7. Process Dispensers & Droppers (Rising edge activation)
  for (const comp of components.values()) {
    if (comp.type === 'dispenser' || comp.type === 'dropper') {
      let isPowered = false;
      for (const c of CARDINALS) {
        if (getCellPower(comp.x + c.dx, comp.y + c.dy) > 0) {
          isPowered = true;
          break;
        }
      }

      const wasPowered = comp.power > 0;
      if (!wasPowered && isPowered) {
        // Rising edge! Eject projectile particle
        soundEngine.playDispense();
        const front = getFacingOffset(comp.rotation);
        particles.push({
          id: `disp-${Date.now()}-${Math.random()}`,
          x: comp.x + 0.5 + front.dx * 0.5,
          y: comp.y + 0.5 + front.dy * 0.5,
          vx: front.dx * 0.25,
          vy: front.dy * 0.25,
          color: comp.type === 'dispenser' ? '#f59e0b' : '#94a3b8',
          life: 0,
          maxLife: 20,
          size: 6,
          type: 'projectile',
        });
        if (comp.properties.count && comp.properties.count > 0) {
          comp.properties.count -= 1;
        }
      }
      comp.power = isPowered ? 15 : 0;
    }
  }

  // 8. Process TNT (detonation countdown)
  const tntToExplode: string[] = [];
  for (const comp of components.values()) {
    if (comp.type === 'tnt') {
      let isPowered = false;
      for (const c of CARDINALS) {
        if (getCellPower(comp.x + c.dx, comp.y + c.dy) > 0) {
          isPowered = true;
          break;
        }
      }

      if (isPowered && !comp.properties.primed) {
        comp.properties.primed = true;
        comp.properties.timer = 8; // 8 ticks fuse (approx 0.8s)
      } else if (comp.properties.primed) {
        comp.properties.timer = (comp.properties.timer ?? 8) - 1;
        if (comp.properties.timer <= 0) {
          tntToExplode.push(comp.id);
        }
      }
    }
  }

  for (const tntId of tntToExplode) {
    const tntComp = Array.from(components.values()).find((c) => c.id === tntId);
    if (tntComp) {
      soundEngine.playExplosion();
      // Spawn explosion shockwave particles
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        const speed = 0.15 + Math.random() * 0.25;
        particles.push({
          id: `blast-${Date.now()}-${i}`,
          x: tntComp.x + 0.5,
          y: tntComp.y + 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b',
          life: 0,
          maxLife: 25,
          size: 10 + Math.random() * 8,
          type: 'spark',
        });
      }
      // Remove the TNT block
      components.delete(posKey(tntComp.x, tntComp.y));
    }
  }

  // Final propagation to reconcile all combinational signals
  propagateRedstoneSignals(components);

  return { particles, pushedBlocks };
}
