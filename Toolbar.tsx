import React, { useRef } from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  HelpCircle,
  Maximize2,
  Palette,
} from 'lucide-react';

interface ToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStepTick: () => void;
  tickRate: number;
  onChangeTickRate: (rate: number) => void;
  tickCount: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onOpenProjects: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenHelp: () => void;
  onOpenBackground: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  onProjectNameChange,
  isRunning,
  onTogglePlay,
  onStepTick,
  tickRate,
  onChangeTickRate,
  tickCount,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onOpenProjects,
  onExport,
  onImport,
  onOpenHelp,
  onOpenBackground,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-11 bg-[#1C1C1C] border-b border-[#303030] flex items-center justify-between px-3 text-[#E5E5E5] select-none text-xs gap-4 shrink-0">
      {/* Zone 1: Brand & Project Name */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-semibold tracking-tight text-sm text-[#F5F5F5] whitespace-nowrap">
          Redstone Sandbox
        </span>
        <span className="text-[#555555] font-light">/</span>
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          aria-label="Project Name"
          className="bg-transparent border border-transparent hover:border-[#383838] focus:border-[#525252] rounded px-1.5 py-0.5 text-xs text-[#CCCCCC] focus:text-[#FFFFFF] focus:outline-none transition-colors w-36 truncate"
          title="Click to rename project"
        />
      </div>

      {/* Zone 2: History & Simulation Controls */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#242424] border border-[#303030] rounded">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="p-1.5 text-[#CCCCCC] hover:text-[#FFFFFF] disabled:opacity-30 disabled:hover:text-[#CCCCCC] transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <div className="w-[1px] h-3 bg-[#383838]" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="p-1.5 text-[#CCCCCC] hover:text-[#FFFFFF] disabled:opacity-30 disabled:hover:text-[#CCCCCC] transition-colors"
          >
            <Redo2 size={14} />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-[#303030] mx-1" />

        {/* Simulation Play/Pause & Step */}
        <div className="flex items-center gap-1 bg-[#242424] border border-[#303030] rounded p-0.5">
          <button
            onClick={onTogglePlay}
            title={isRunning ? 'Pause Simulation (Space)' : 'Start Simulation (Space)'}
            aria-label={isRunning ? 'Pause' : 'Play'}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors font-medium ${
              isRunning
                ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#22c55e] text-white hover:bg-[#16a34a]'
            }`}
          >
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
            <span className="whitespace-nowrap">{isRunning ? 'Pause' : 'Simulate'}</span>
          </button>

          <button
            onClick={onStepTick}
            disabled={isRunning}
            title="Step 1 Redstone Tick (100ms)"
            aria-label="Step 1 Tick"
            className="p-1 text-[#CCCCCC] hover:text-[#FFFFFF] disabled:opacity-30 transition-colors"
          >
            <StepForward size={14} />
          </button>
        </div>

        {/* Speed / TPS dropdown */}
        <div className="flex items-center bg-[#242424] border border-[#303030] rounded px-1.5 py-1 gap-1">
          <span className="text-[#888888] text-[11px]">Speed:</span>
          <select
            value={tickRate}
            onChange={(e) => onChangeTickRate(Number(e.target.value))}
            aria-label="Simulation speed in ticks per second"
            className="bg-transparent text-[#CCCCCC] hover:text-white text-xs outline-none cursor-pointer"
          >
            <option value={1} className="bg-[#242424]">1 TPS (Slow)</option>
            <option value={5} className="bg-[#242424]">5 TPS (0.5x)</option>
            <option value={10} className="bg-[#242424]">10 TPS (Default)</option>
            <option value={20} className="bg-[#242424]">20 TPS (Fast)</option>
          </select>
        </div>

        {/* Tick counter */}
        <div className="text-[11px] font-mono tabular-nums text-[#888888] px-1 hidden md:block">
          Tick: <span className="text-[#CCCCCC]">{tickCount}</span>
        </div>

        <div className="w-[1px] h-4 bg-[#303030] mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#242424] border border-[#303030] rounded">
          <button
            onClick={onZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
            className="p-1.5 text-[#CCCCCC] hover:text-white transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[11px] font-mono tabular-nums px-1 text-[#888888] min-w-9 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom In"
            className="p-1.5 text-[#CCCCCC] hover:text-white transition-colors"
          >
            <ZoomIn size={13} />
          </button>
          <div className="w-[1px] h-3 bg-[#383838]" />
          <button
            onClick={onResetView}
            title="Center Origin (0)"
            aria-label="Center Origin"
            className="p-1.5 text-[#CCCCCC] hover:text-white transition-colors"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Zone 3: Storage, Help & Clear */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onSave}
          title="Save Project"
          className="flex items-center gap-1 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] px-2 py-1 rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <Save size={13} />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={onOpenProjects}
          title="Open Saved Projects"
          className="flex items-center gap-1 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] px-2 py-1 rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <FolderOpen size={13} />
          <span className="hidden sm:inline">Projects</span>
        </button>

        <button
          onClick={onExport}
          title="Export Circuit JSON"
          className="p-1.5 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <Download size={13} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import Circuit JSON"
          className="p-1.5 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <Upload size={13} />
        </button>

        <button
          onClick={onOpenBackground}
          title="Customize Workspace Background (Color / Image)"
          className="p-1.5 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <Palette size={13} />
        </button>

        <button
          onClick={onClear}
          title="Clear Canvas"
          className="p-1.5 bg-[#242424] hover:bg-[#382020] border border-[#303030] rounded text-[#ef4444] hover:text-[#f87171] transition-colors"
        >
          <Trash2 size={13} />
        </button>

        <button
          onClick={onOpenHelp}
          title="Redstone Rules & Shortcuts"
          className="p-1.5 bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] rounded text-[#CCCCCC] hover:text-white transition-colors"
        >
          <HelpCircle size={13} />
        </button>
      </div>
    </header>
  );
};
