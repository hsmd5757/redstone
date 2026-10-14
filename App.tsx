/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RedstoneComponent, ToolMode, CircuitProject, Particle, BackgroundSettings } from './types';
import { COMPONENT_CATALOG } from './constants/components';
import {
  renderGridAndComponents,
  createTransform,
  BASE_CELL_SIZE,
} from './renderer/canvasRenderer';
import {
  posKey,
  parsePosKey,
  stepSimulationTick,
  propagateRedstoneSignals,
} from './simulation/engine';
import { soundEngine } from './utils/audio';
import {
  saveProjectToStorage,
  loadProjectFromStorage,
  exportProjectToJson,
  importProjectFromJson,
} from './utils/storage';
import {
  saveBackgroundImage,
  getBackgroundImage,
  deleteBackgroundImage,
} from './utils/backgroundStorage';
import { Toolbar } from './components/Toolbar';
import { ComponentSidebar } from './components/ComponentSidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { DocumentationModal } from './components/DocumentationModal';
import { ProjectsModal } from './components/ProjectsModal';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';

const DEFAULT_BACKGROUND: BackgroundSettings = {
  color: '#171717',
  imageUrl: null,
  imageOpacity: 0.35,
  imageFit: 'cover',
};

export default function App() {
  // Project Info
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('My Redstone Circuit');

  // Background Settings
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(DEFAULT_BACKGROUND);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);

  // Infinite Grid Camera
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1.0 });

  // Tool Mode & Placement Rotation
  const [currentTool, setCurrentTool] = useState<ToolMode>('select');
  const [placementRotation, setPlacementRotation] = useState<number>(0);

  // Components State: Map of "x,y" => RedstoneComponent
  const [components, setComponents] = useState<Map<string, RedstoneComponent>>(() => {
    // Initial educational demo circuit: Lever -> Dust -> Lamp
    const map = new Map<string, RedstoneComponent>();

    // Lever at (-3, 0)
    map.set(posKey(-3, 0), {
      id: 'init_lever',
      type: 'lever',
      x: -3,
      y: 0,
      rotation: 0,
      power: 0,
      properties: { active: false },
    });

    // Redstone Dust line
    map.set(posKey(-2, 0), {
      id: 'init_dust_1',
      type: 'redstone_dust',
      x: -2,
      y: 0,
      rotation: 0,
      power: 0,
      properties: {},
    });
    map.set(posKey(-1, 0), {
      id: 'init_dust_2',
      type: 'redstone_dust',
      x: -1,
      y: 0,
      rotation: 0,
      power: 0,
      properties: {},
    });

    // Redstone Lamp at (0, 0)
    map.set(posKey(0, 0), {
      id: 'init_lamp',
      type: 'redstone_lamp',
      x: 0,
      y: 0,
      rotation: 0,
      power: 0,
      properties: {},
    });

    return map;
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [tickRate, setTickRate] = useState<number>(10); // 10 TPS default Minecraft
  const [tickCount, setTickCount] = useState<number>(0);

  // Particles
  const particlesRef = useRef<Particle[]>([]);

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState<boolean>(false);

  // Undo / Redo Stacks (serializable snapshot of components)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Canvas interaction refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isPanningRef = useRef<boolean>(false);
  const isSpacePressedRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverCellRef = useRef<{ cx: number; cy: number } | null>(null);

  // Distinct mouse gesture tracking
  const mouseDownScreenPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownCellRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const hasDraggedBeyondThresholdRef = useRef<boolean>(false);
  const clickedCompAtMouseDownRef = useRef<RedstoneComponent | null>(null);
  const isDraggingPlacementRef = useRef<boolean>(false);
  const isDraggingSelectionRef = useRef<boolean>(false);
  const dragSelectionStartCellRef = useRef<{ cx: number; cy: number } | null>(null);
  const marqueeBoxRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const clipboardRef = useRef<RedstoneComponent[]>([]);

  // Load background image from IndexedDB whenever project changes
  useEffect(() => {
    getBackgroundImage(projectId).then((storedImage) => {
      if (storedImage) {
        setBackgroundSettings((prev) => ({ ...prev, imageUrl: storedImage }));
      }
    });
  }, [projectId]);

  // Save state snapshot for undo
  const pushUndoSnapshot = useCallback(() => {
    const serialized = JSON.stringify(Array.from(components.values()));
    setUndoStack((prev) => [...prev.slice(-30), serialized]);
    setRedoStack([]);
  }, [components]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    const currentSerialized = JSON.stringify(Array.from(components.values()));
    setRedoStack((prev) => [...prev, currentSerialized]);
    setUndoStack(newUndo);

    try {
      const parsed: RedstoneComponent[] = JSON.parse(previous);
      const newMap = new Map<string, RedstoneComponent>();
      for (const comp of parsed) {
        newMap.set(posKey(comp.x, comp.y), comp);
      }
      propagateRedstoneSignals(newMap);
      setComponents(newMap);
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Failed to undo', e);
    }
  }, [undoStack, components]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    const currentSerialized = JSON.stringify(Array.from(components.values()));
    setUndoStack((prev) => [...prev, currentSerialized]);
    setRedoStack(newRedo);

    try {
      const parsed: RedstoneComponent[] = JSON.parse(next);
      const newMap = new Map<string, RedstoneComponent>();
      for (const comp of parsed) {
        newMap.set(posKey(comp.x, comp.y), comp);
      }
      propagateRedstoneSignals(newMap);
      setComponents(newMap);
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Failed to redo', e);
    }
  }, [redoStack, components]);

  // Step single simulation tick
  const handleStepTick = useCallback(() => {
    setComponents((prev) => {
      const nextMap = new Map(prev);
      const { particles } = stepSimulationTick(nextMap);
      if (particles.length > 0) {
        particlesRef.current.push(...particles);
      }
      return nextMap;
    });
    setTickCount((c) => c + 1);
  }, []);

  // Main Simulation Loop
  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = Math.max(20, Math.floor(1000 / tickRate));
    const timer = setInterval(() => {
      setComponents((prev) => {
        const nextMap = new Map(prev);
        const { particles } = stepSimulationTick(nextMap);
        if (particles.length > 0) {
          particlesRef.current.push(...particles);
        }
        return nextMap;
      });
      setTickCount((c) => c + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, tickRate]);

  // Particle animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life + 1,
          }))
          .filter((p) => p.life < p.maxLife);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Canvas redraw trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    renderGridAndComponents({
      ctx,
      width: canvas.width,
      height: canvas.height,
      camera,
      components,
      selectedIds,
      hoverCell: hoverCellRef.current,
      previewComponent:
        currentTool !== 'select' && currentTool !== 'erase'
          ? { type: currentTool, rotation: placementRotation }
          : null,
      marqueeBox: marqueeBoxRef.current,
      particles: particlesRef.current,
      backgroundColor: backgroundSettings.color,
    });
  }, [camera, components, selectedIds, currentTool, placementRotation, tickCount, backgroundSettings]);

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Rotate handler
  const handleRotate = useCallback(() => {
    if (selectedIds.size > 0) {
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        for (const id of selectedIds) {
          for (const [key, comp] of next.entries()) {
            if (comp.id === id) {
              const updated = { ...comp, rotation: (comp.rotation + 90) % 360 };
              next.set(key, updated);
            }
          }
        }
        propagateRedstoneSignals(next);
        return next;
      });
    } else {
      setPlacementRotation((r) => (r + 90) % 360);
    }
  }, [selectedIds, pushUndoSnapshot]);

  // Delete handler
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushUndoSnapshot();
    setComponents((prev) => {
      const next = new Map(prev);
      for (const [key, comp] of prev.entries()) {
        if (selectedIds.has(comp.id)) {
          next.delete(key);
        }
      }
      propagateRedstoneSignals(next);
      return next;
    });
    setSelectedIds(new Set());
  }, [selectedIds, pushUndoSnapshot]);

  // Duplicate handler
  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushUndoSnapshot();
    setComponents((prev) => {
      const next = new Map(prev);
      const newSelected = new Set<string>();

      for (const id of selectedIds) {
        const orig = Array.from(prev.values()).find((c) => c.id === id);
        if (orig) {
          const newX = orig.x + 1;
          const newY = orig.y + 1;
          const newId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const dup: RedstoneComponent = {
            ...orig,
            id: newId,
            x: newX,
            y: newY,
            properties: { ...orig.properties },
          };
          next.set(posKey(newX, newY), dup);
          newSelected.add(newId);
        }
      }
      propagateRedstoneSignals(next);
      setSelectedIds(newSelected);
      return next;
    });
  }, [selectedIds, pushUndoSnapshot]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === ' ' && !e.repeat) {
        isSpacePressedRef.current = true;
      }

      // Hotkey: Space to toggle play/pause (if not holding down to pan)
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setIsRunning((r) => !r);
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Rotate: R
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotate();
        return;
      }

      // Delete: Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const items = Array.from(components.values()).filter((c) => selectedIds.has(c.id));
          clipboardRef.current = items;
        }
        return;
      }

      // Paste: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (clipboardRef.current.length > 0) {
          e.preventDefault();
          pushUndoSnapshot();
          setComponents((prev) => {
            const next = new Map(prev);
            const newSelected = new Set<string>();
            const cursorCell = hoverCellRef.current || { cx: 0, cy: 0 };
            const first = clipboardRef.current[0];
            const offsetX = cursorCell.cx - first.x;
            const offsetY = cursorCell.cy - first.y;

            for (const item of clipboardRef.current) {
              const nx = item.x + offsetX;
              const ny = item.y + offsetY;
              const newId = `paste_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
              const pasted: RedstoneComponent = {
                ...item,
                id: newId,
                x: nx,
                y: ny,
                properties: { ...item.properties },
              };
              next.set(posKey(nx, ny), pasted);
              newSelected.add(newId);
            }
            propagateRedstoneSignals(next);
            setSelectedIds(newSelected);
            return next;
          });
        }
        return;
      }

      // Zoom hotkeys (+, -, 0)
      if (e.key === '+' || e.key === '=') {
        setCamera((c) => ({ ...c, zoom: Math.min(4.0, c.zoom * 1.2) }));
      } else if (e.key === '-' || e.key === '_') {
        setCamera((c) => ({ ...c, zoom: Math.max(0.25, c.zoom / 1.2) }));
      } else if (e.key === '0') {
        setCamera({ x: 0, y: 0, zoom: 1.0 });
      } else if (e.key === 'Escape') {
        // Escape cancels active placement tool and switches to neutral interaction mode
        if (currentTool !== 'select') {
          setCurrentTool('select');
        } else {
          setSelectedIds(new Set());
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleUndo,
    handleRedo,
    handleRotate,
    handleDeleteSelected,
    handleDuplicateSelected,
    selectedIds,
    components,
    currentTool,
    pushUndoSnapshot,
  ]);

  // Places component at specified grid cell (only if empty to avoid accidental overwrites)
  const placeComponentAt = (cx: number, cy: number, type: ToolMode) => {
    if (type === 'select' || type === 'erase') return;
    const targetKey = posKey(cx, cy);

    // Prevent placing on top of existing components in placement mode
    if (components.has(targetKey)) return;

    const meta = COMPONENT_CATALOG.find((c) => c.type === type);

    setComponents((prev) => {
      const next = new Map(prev);
      const newComp: RedstoneComponent = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        x: cx,
        y: cy,
        rotation: meta?.directional ? placementRotation : 0,
        power: type === 'redstone_block' ? 15 : 0,
        properties: { ...(meta?.defaultProperties || {}) },
      };
      next.set(targetKey, newComp);
      propagateRedstoneSignals(next);
      return next;
    });
  };

  // Direct component interaction executor
  const interactWithComponent = (comp: RedstoneComponent, targetKey: string) => {
    if (comp.type === 'lever') {
      const nextActive = !comp.properties.active;
      soundEngine.playLever(nextActive);
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.active = nextActive;
          c.power = nextActive ? 15 : 0;
          propagateRedstoneSignals(next);
        }
        return next;
      });
    } else if (
      comp.type === 'stone_button' ||
      comp.type === 'wooden_button' ||
      comp.type === 'pressure_plate' ||
      comp.type === 'target_block'
    ) {
      soundEngine.playButton();
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.active = true;
          c.properties.timer = comp.type === 'wooden_button' ? 15 : 10;
          c.power = 15;
          propagateRedstoneSignals(next);
        }
        return next;
      });
    } else if (comp.type === 'redstone_repeater') {
      const currentDelay = comp.properties.delay || 1;
      const nextDelay = currentDelay >= 4 ? 1 : currentDelay + 1;
      soundEngine.playButton();
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.delay = nextDelay;
        }
        return next;
      });
    } else if (comp.type === 'redstone_comparator') {
      const nextMode = comp.properties.mode === 'subtract' ? 'compare' : 'subtract';
      soundEngine.playButton();
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.mode = nextMode;
        }
        return next;
      });
    } else if (comp.type === 'daylight_detector') {
      const nextInv = !comp.properties.inverted;
      soundEngine.playButton();
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.inverted = nextInv;
          propagateRedstoneSignals(next);
        }
        return next;
      });
    } else if (comp.type === 'note_block') {
      const nextPitch = ((comp.properties.pitch ?? 0) + 1) % 25;
      soundEngine.playNote(nextPitch, comp.properties.instrument || 'harp');
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.pitch = nextPitch;
        }
        return next;
      });
    } else if (comp.type === 'trapped_chest') {
      const nextActive = !comp.properties.active;
      soundEngine.playButton();
      pushUndoSnapshot();
      setComponents((prev) => {
        const next = new Map(prev);
        const c = next.get(targetKey);
        if (c) {
          c.properties.active = nextActive;
          c.power = nextActive ? 15 : 0;
          propagateRedstoneSignals(next);
        }
        return next;
      });
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    lastMousePosRef.current = { x: sx, y: sy };
    mouseDownScreenPosRef.current = { x: sx, y: sy };
    hasDraggedBeyondThresholdRef.current = false;

    // Middle click OR Space+Left click: Start panning
    if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
      isPanningRef.current = true;
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      const { screenToCell } = createTransform(camera, canvas.width, canvas.height);
      const { cx, cy } = screenToCell(sx, sy);
      mouseDownCellRef.current = { cx, cy };
      const targetKey = posKey(cx, cy);
      const clickedComp = components.get(targetKey) || null;
      clickedCompAtMouseDownRef.current = clickedComp;

      // 1. Erase Mode
      if (currentTool === 'erase') {
        if (clickedComp) {
          pushUndoSnapshot();
          setComponents((prev) => {
            const next = new Map(prev);
            next.delete(targetKey);
            propagateRedstoneSignals(next);
            return next;
          });
        }
        isDraggingPlacementRef.current = true;
        return;
      }

      // 2. Placement Mode (Component selected from sidebar)
      if (currentTool !== 'select') {
        // In placement mode, clicking an empty cell places the block
        if (!clickedComp) {
          pushUndoSnapshot();
          placeComponentAt(cx, cy, currentTool);
          isDraggingPlacementRef.current = true;
        }
        return;
      }

      // 3. Interaction / Select Mode (No component active for placement)
      // If clicking existing component: prepare selection & interaction, do NOT start drag immediately
      if (clickedComp) {
        // Selection tracking
        if (e.shiftKey) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(clickedComp.id)) next.delete(clickedComp.id);
            else next.add(clickedComp.id);
            return next;
          });
        } else {
          if (!selectedIds.has(clickedComp.id)) {
            setSelectedIds(new Set([clickedComp.id]));
          }
        }
        dragSelectionStartCellRef.current = { cx, cy };
      } else {
        // Clicked empty space in interaction mode: does NOT place any component!
        // Prepare marquee box if user drags, otherwise deselect on mouseUp
        if (!e.shiftKey) {
          setSelectedIds(new Set());
        }
      }
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const dx = sx - lastMousePosRef.current.x;
    const dy = sy - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: sx, y: sy };

    // Panning
    if (isPanningRef.current) {
      setCamera((c) => ({
        ...c,
        x: c.x - dx / c.zoom,
        y: c.y - dy / c.zoom,
      }));
      return;
    }

    const { screenToCell } = createTransform(camera, canvas.width, canvas.height);
    const { cx, cy } = screenToCell(sx, sy);
    hoverCellRef.current = { cx, cy };

    // Check if mouse moved beyond threshold to differentiate click vs drag
    const moveDist = Math.hypot(
      sx - mouseDownScreenPosRef.current.x,
      sy - mouseDownScreenPosRef.current.y
    );
    if (moveDist > 6) {
      hasDraggedBeyondThresholdRef.current = true;
    }

    // Marquee box dragging (on empty space in interaction mode)
    if (marqueeBoxRef.current || (currentTool === 'select' && !clickedCompAtMouseDownRef.current && hasDraggedBeyondThresholdRef.current && e.buttons === 1)) {
      if (!marqueeBoxRef.current) {
        marqueeBoxRef.current = {
          x1: mouseDownScreenPosRef.current.x,
          y1: mouseDownScreenPosRef.current.y,
          x2: sx,
          y2: sy,
        };
      } else {
        marqueeBoxRef.current = {
          ...marqueeBoxRef.current,
          x2: sx,
          y2: sy,
        };
      }

      const minSx = Math.min(marqueeBoxRef.current.x1, sx);
      const maxSx = Math.max(marqueeBoxRef.current.x1, sx);
      const minSy = Math.min(marqueeBoxRef.current.y1, sy);
      const maxSy = Math.max(marqueeBoxRef.current.y1, sy);

      const { worldToScreen } = createTransform(camera, canvas.width, canvas.height);
      const enclosedIds = new Set<string>();

      for (const comp of components.values()) {
        const screenPos = worldToScreen(comp.x, comp.y);
        const cellSz = BASE_CELL_SIZE * camera.zoom;
        if (
          screenPos.sx + cellSz >= minSx &&
          screenPos.sx <= maxSx &&
          screenPos.sy + cellSz >= minSy &&
          screenPos.sy <= maxSy
        ) {
          enclosedIds.add(comp.id);
        }
      }
      setSelectedIds(enclosedIds);
      return;
    }

    // Moving selected components (ONLY after explicit drag threshold, never on simple click!)
    if (
      currentTool === 'select' &&
      hasDraggedBeyondThresholdRef.current &&
      dragSelectionStartCellRef.current &&
      e.buttons === 1 &&
      selectedIds.size > 0
    ) {
      isDraggingSelectionRef.current = true;
      const deltaX = cx - dragSelectionStartCellRef.current.cx;
      const deltaY = cy - dragSelectionStartCellRef.current.cy;

      if (deltaX !== 0 || deltaY !== 0) {
        setComponents((prev) => {
          const next = new Map(prev);
          const movingComps = Array.from(prev.values()).filter((c) => selectedIds.has(c.id));

          for (const c of movingComps) {
            next.delete(posKey(c.x, c.y));
          }
          for (const c of movingComps) {
            c.x += deltaX;
            c.y += deltaY;
            next.set(posKey(c.x, c.y), c);
          }
          propagateRedstoneSignals(next);
          return next;
        });

        dragSelectionStartCellRef.current = { cx, cy };
      }
      return;
    }

    // Drag-placement (painting wires or erasing)
    if (isDraggingPlacementRef.current) {
      if (currentTool === 'erase') {
        const targetKey = posKey(cx, cy);
        if (components.has(targetKey)) {
          setComponents((prev) => {
            const next = new Map(prev);
            next.delete(targetKey);
            propagateRedstoneSignals(next);
            return next;
          });
        }
      } else if (currentTool !== 'select') {
        const targetKey = posKey(cx, cy);
        if (!components.has(targetKey)) {
          placeComponentAt(cx, cy, currentTool);
        }
      }
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    // If user clicked (no drag threshold passed)
    if (!hasDraggedBeyondThresholdRef.current) {
      const clickedComp = clickedCompAtMouseDownRef.current;
      const { cx, cy } = mouseDownCellRef.current;
      const targetKey = posKey(cx, cy);

      // In interaction mode: interact with the clicked component!
      if (currentTool === 'select') {
        if (clickedComp) {
          interactWithComponent(clickedComp, targetKey);
        }
        // Clicking empty cell does nothing (already deselected in mouseDown)
      } else if (currentTool !== 'erase') {
        // Placement mode single click: place component if cell is empty
        if (!clickedComp) {
          pushUndoSnapshot();
          placeComponentAt(cx, cy, currentTool);
        }
      }
    }

    // Reset interaction states
    isPanningRef.current = false;
    isDraggingPlacementRef.current = false;
    isDraggingSelectionRef.current = false;
    dragSelectionStartCellRef.current = null;
    marqueeBoxRef.current = null;
    clickedCompAtMouseDownRef.current = null;
    hasDraggedBeyondThresholdRef.current = false;
  };

  // Zoom on wheel towards cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(4.0, Math.max(0.25, camera.zoom * zoomFactor));

    const { screenToWorld } = createTransform(camera, canvas.width, canvas.height);
    const mouseWorld = screenToWorld(mouseX, mouseY);

    const newCamX = mouseWorld.wx - (mouseX - canvas.width / 2) / newZoom;
    const newCamY = mouseWorld.wy - (mouseY - canvas.height / 2) / newZoom;

    setCamera({
      x: newCamX,
      y: newCamY,
      zoom: newZoom,
    });
  };

  // Update component properties from Properties Panel
  const handleUpdateComponent = (id: string, updates: Partial<RedstoneComponent>) => {
    pushUndoSnapshot();
    setComponents((prev) => {
      const next = new Map(prev);
      for (const [key, comp] of prev.entries()) {
        if (comp.id === id) {
          const updated = {
            ...comp,
            ...updates,
            properties: { ...comp.properties, ...(updates.properties || {}) },
          };
          next.set(key, updated);
        }
      }
      propagateRedstoneSignals(next);
      return next;
    });
  };

  // Clear canvas
  const handleClear = () => {
    if (confirm('Clear the entire redstone canvas?')) {
      pushUndoSnapshot();
      setComponents(new Map());
      setSelectedIds(new Set());
    }
  };

  // Save current project (including background settings)
  const handleSave = () => {
    const project: CircuitProject = {
      id: projectId,
      name: projectName,
      updatedAt: Date.now(),
      components: Array.from(components.values()),
      camera,
      background: backgroundSettings,
    };
    saveProjectToStorage(project);
    alert(`Circuit "${projectName}" saved successfully.`);
  };

  // Load project
  const handleLoadProject = (id: string) => {
    const p = loadProjectFromStorage(id);
    if (p) {
      pushUndoSnapshot();
      setProjectId(p.id);
      setProjectName(p.name);
      setCamera(p.camera || { x: 0, y: 0, zoom: 1.0 });

      if (p.background) {
        setBackgroundSettings((prev) => ({
          ...prev,
          ...p.background,
        }));
      }

      const newMap = new Map<string, RedstoneComponent>();
      for (const c of p.components) {
        newMap.set(posKey(c.x, c.y), c);
      }
      propagateRedstoneSignals(newMap);
      setComponents(newMap);
      setSelectedIds(new Set());

      // Attempt loading image from IndexedDB
      getBackgroundImage(p.id).then((storedImage) => {
        if (storedImage) {
          setBackgroundSettings((prev) => ({ ...prev, imageUrl: storedImage }));
        }
      });
    }
  };

  // New Blank Project
  const handleNewProject = () => {
    pushUndoSnapshot();
    setProjectId(`proj_${Date.now()}`);
    setProjectName('Untitled Circuit');
    setComponents(new Map());
    setSelectedIds(new Set());
    setCamera({ x: 0, y: 0, zoom: 1.0 });
    setBackgroundSettings(DEFAULT_BACKGROUND);
  };

  // Export JSON (preserves background settings)
  const handleExport = () => {
    const project: CircuitProject = {
      id: projectId,
      name: projectName,
      updatedAt: Date.now(),
      components: Array.from(components.values()),
      camera,
      background: backgroundSettings,
    };
    exportProjectToJson(project);
  };

  // Import JSON
  const handleImport = async (file: File) => {
    try {
      const imported = await importProjectFromJson(file);
      pushUndoSnapshot();
      setProjectId(imported.id || `proj_${Date.now()}`);
      setProjectName(imported.name || file.name.replace('.json', ''));
      if (imported.camera) {
        setCamera(imported.camera);
      }
      if (imported.background) {
        setBackgroundSettings((prev) => ({
          ...prev,
          ...imported.background,
        }));
        if (imported.background.imageUrl) {
          await saveBackgroundImage(imported.id, imported.background.imageUrl);
        }
      }
      const newMap = new Map<string, RedstoneComponent>();
      for (const c of imported.components) {
        newMap.set(posKey(c.x, c.y), c);
      }
      propagateRedstoneSignals(newMap);
      setComponents(newMap);
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(`Failed to import circuit: ${e.message}`);
    }
  };

  // Background Image Upload Handler
  const handleUploadBackgroundImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setBackgroundSettings((prev) => ({ ...prev, imageUrl: dataUrl }));
        await saveBackgroundImage(projectId, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Background Image Remove Handler
  const handleRemoveBackgroundImage = async () => {
    setBackgroundSettings((prev) => ({ ...prev, imageUrl: null }));
    await deleteBackgroundImage(projectId);
  };

  // Background Reset to Default
  const handleResetBackground = async () => {
    setBackgroundSettings(DEFAULT_BACKGROUND);
    await deleteBackgroundImage(projectId);
  };

  const selectedComponentList = Array.from(components.values()).filter((c) =>
    selectedIds.has(c.id)
  );

  return (
    <div className="w-screen h-screen flex flex-col bg-[#171717] text-[#E5E5E5] overflow-hidden font-sans select-none">
      {/* 1. Compact Top Toolbar */}
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning((r) => !r)}
        onStepTick={handleStepTick}
        tickRate={tickRate}
        onChangeTickRate={setTickRate}
        tickCount={tickCount}
        zoom={camera.zoom}
        onZoomIn={() => setCamera((c) => ({ ...c, zoom: Math.min(4.0, c.zoom * 1.2) }))}
        onZoomOut={() => setCamera((c) => ({ ...c, zoom: Math.max(0.25, c.zoom / 1.2) }))}
        onResetView={() => setCamera({ x: 0, y: 0, zoom: 1.0 })}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenBackground={() => setIsBackgroundModalOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Component Library */}
        <ComponentSidebar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          rotation={placementRotation}
          onRotateTool={handleRotate}
        />

        {/* Center Canvas: Infinite Grid with Layered Background */}
        <div
          ref={containerRef}
          className={`flex-1 h-full relative overflow-hidden ${
            currentTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          }`}
        >
          {/* Layer 1: Background Color */}
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-200"
            style={{ backgroundColor: backgroundSettings.color }}
          >
            {/* Layer 1b: Background Image (Behind Grid and Components) */}
            {backgroundSettings.imageUrl && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${backgroundSettings.imageUrl})`,
                  backgroundSize:
                    backgroundSettings.imageFit === 'tile'
                      ? 'auto'
                      : backgroundSettings.imageFit === 'contain'
                      ? 'contain'
                      : 'cover',
                  backgroundRepeat: backgroundSettings.imageFit === 'tile' ? 'repeat' : 'no-repeat',
                  backgroundPosition: 'center',
                  opacity: backgroundSettings.imageOpacity ?? 0.35,
                }}
              />
            )}
          </div>

          {/* Layers 2, 3, 4, 5: Transparent Canvas (Grid, Components, Signals, Selection Overlays) */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full block relative z-10"
          />

          {/* HUD Overlay (Minimal, bottom-left) */}
          <div className="absolute bottom-2 left-3 z-20 bg-[#1C1C1C]/90 border border-[#303030] px-2.5 py-1 rounded text-[11px] font-mono text-[#888888] flex items-center gap-3 pointer-events-none">
            <span>
              X: <span className="text-[#CCCCCC]">{hoverCellRef.current?.cx ?? 0}</span> Y:{' '}
              <span className="text-[#CCCCCC]">{hoverCellRef.current?.cy ?? 0}</span>
            </span>
            <span>
              Components: <span className="text-[#CCCCCC]">{components.size}</span>
            </span>
            <span>
              Mode:{' '}
              <span className={currentTool === 'select' ? 'text-[#22c55e]' : 'text-[#3b82f6]'}>
                {currentTool === 'select'
                  ? 'Interact'
                  : currentTool === 'erase'
                  ? 'Erase'
                  : 'Place'}
              </span>
            </span>
            <span>
              TPS: <span className="text-[#22c55e]">{isRunning ? tickRate : 'Paused'}</span>
            </span>
          </div>
        </div>

        {/* Right Panel: Context Properties */}
        {selectedComponentList.length > 0 && (
          <PropertiesPanel
            selectedComponents={selectedComponentList}
            onUpdateComponent={handleUpdateComponent}
            onRotateSelected={handleRotate}
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            onClose={() => setSelectedIds(new Set())}
          />
        )}
      </div>

      {/* Modals */}
      <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
        currentProjectId={projectId}
      />
      <BackgroundSettingsModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        settings={backgroundSettings}
        onUpdateSettings={(newSettings) =>
          setBackgroundSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onUploadImage={handleUploadBackgroundImage}
        onRemoveImage={handleRemoveBackgroundImage}
        onResetDefault={handleResetBackground}
      />
    </div>
  );
}
