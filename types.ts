export type ComponentType =
  // Power Sources
  | 'lever'
  | 'stone_button'
  | 'wooden_button'
  | 'pressure_plate'
  | 'redstone_block'
  | 'daylight_detector'
  // Redstone Components
  | 'redstone_dust'
  | 'redstone_torch'
  | 'redstone_repeater'
  | 'redstone_comparator'
  | 'observer'
  | 'target_block'
  // Mechanical Components
  | 'piston'
  | 'sticky_piston'
  | 'dispenser'
  | 'dropper'
  | 'hopper'
  | 'tripwire_hook'
  | 'tripwire'
  // Utility & Output Blocks
  | 'redstone_lamp'
  | 'note_block'
  | 'trapped_chest'
  | 'tnt'
  | 'stone_block';

export type Category = 'power' | 'redstone' | 'mechanical' | 'utility';

export interface ComponentMetadata {
  type: ComponentType;
  name: string;
  category: Category;
  description: string;
  directional: boolean;
  interactive: boolean;
  defaultProperties?: Record<string, any>;
}

export interface RedstoneComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number; // 0 (North/Up), 90 (East/Right), 180 (South/Down), 270 (West/Left)
  power: number; // 0 to 15
  properties: {
    active?: boolean;
    timer?: number; // Ticks remaining for buttons, tnt, pulse
    delay?: number; // Repeater delay in ticks (1, 2, 3, 4)
    mode?: 'compare' | 'subtract'; // Comparator mode
    locked?: boolean; // Repeater / hopper locked state
    inverted?: boolean; // Daylight detector inverted (night)
    extended?: boolean; // Piston extended state
    pitch?: number; // Note block pitch (0 - 24)
    instrument?: 'harp' | 'bass' | 'snare' | 'click' | 'bell' | 'flute' | 'chime';
    primed?: boolean; // TNT primed
    count?: number; // Inventory counter
    previousFrontState?: any; // Observer internal state
    scheduledOutput?: number; // Repeater / Torch / Comparator internal pipeline
    scheduledTicks?: number; // Countdown until output updates
    [key: string]: any;
  };
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type ToolMode = 'select' | 'erase' | ComponentType;

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  type?: 'spark' | 'smoke' | 'note' | 'projectile';
  label?: string;
}

export interface BackgroundSettings {
  color: string; // e.g. '#171717'
  imageUrl?: string | null;
  imageOpacity?: number; // 0.05 to 1.0 (default 0.35)
  imageFit?: 'cover' | 'contain' | 'tile';
}

export interface CircuitProject {
  id: string;
  name: string;
  updatedAt: number;
  components: RedstoneComponent[];
  camera: Camera;
  background?: BackgroundSettings;
}
