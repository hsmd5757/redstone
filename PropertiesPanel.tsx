import React from 'react';
import { RotateCw, Copy, Trash2, X, Music, Sliders, Power } from 'lucide-react';
import { RedstoneComponent } from '../types';
import { soundEngine } from '../utils/audio';

interface PropertiesPanelProps {
  selectedComponents: RedstoneComponent[];
  onUpdateComponent: (id: string, updates: Partial<RedstoneComponent>) => void;
  onRotateSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

const NOTE_NAMES = [
  'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5',
  'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5', 'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6',
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedComponents,
  onUpdateComponent,
  onRotateSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onClose,
}) => {
  if (selectedComponents.length === 0) return null;

  const isMulti = selectedComponents.length > 1;
  const single = selectedComponents[0];

  return (
    <aside className="w-64 bg-[#1C1C1C] border-l border-[#303030] flex flex-col shrink-0 select-none text-xs text-[#E5E5E5]">
      {/* Header */}
      <div className="h-10 px-3 border-b border-[#303030] flex items-center justify-between bg-[#191919]">
        <div className="flex items-center gap-2">
          <Sliders size={13} className="text-[#888888]" />
          <span className="font-semibold text-xs text-white">
            {isMulti ? `${selectedComponents.length} Selected` : formatName(single.type)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#282828] transition-colors"
          title="Deselect (Escape)"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Single Component Info */}
        {!isMulti && (
          <>
            {/* Position & Power Metadata */}
            <div className="grid grid-cols-3 gap-2 bg-[#171717] p-2 rounded border border-[#2b2b2b]">
              <div>
                <div className="text-[10px] text-[#777777]">Grid X</div>
                <div className="font-mono text-xs text-white tabular-nums">{single.x}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#777777]">Grid Y</div>
                <div className="font-mono text-xs text-white tabular-nums">{single.y}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#777777]">Signal</div>
                <div className="font-mono text-xs text-red-400 tabular-nums font-bold">
                  {single.power} / 15
                </div>
              </div>
            </div>

            {/* Direction / Rotation */}
            <div>
              <div className="text-[11px] text-[#888888] mb-1.5 flex items-center justify-between">
                <span>Orientation</span>
                <span className="font-mono text-[10px] text-[#AAAAAA]">
                  {single.rotation}° ({getDirectionLabel(single.rotation)})
                </span>
              </div>
              <button
                onClick={onRotateSelected}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252525] hover:bg-[#2d2d2d] border border-[#333333] rounded text-xs text-white transition-colors"
              >
                <RotateCw size={12} />
                <span>Rotate 90° (R)</span>
              </button>
            </div>

            {/* Type-Specific Properties */}
            {single.type === 'redstone_repeater' && (
              <div className="space-y-2">
                <div className="text-[11px] text-[#888888]">Delay (Redstone Ticks)</div>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        onUpdateComponent(single.id, {
                          properties: { ...single.properties, delay: d },
                        })
                      }
                      className={`py-1 rounded text-center font-mono text-xs transition-colors ${
                        (single.properties.delay || 1) === d
                          ? 'bg-[#3b82f6] text-white font-bold'
                          : 'bg-[#252525] text-[#AAAAAA] hover:bg-[#303030]'
                      }`}
                    >
                      {d}t
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-[#666666]">
                  {((single.properties.delay || 1) * 0.1).toFixed(1)} seconds delay
                </div>
              </div>
            )}

            {single.type === 'redstone_comparator' && (
              <div className="space-y-2">
                <div className="text-[11px] text-[#888888]">Operating Mode</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      onUpdateComponent(single.id, {
                        properties: { ...single.properties, mode: 'compare' },
                      })
                    }
                    className={`py-1.5 rounded text-xs transition-colors ${
                      single.properties.mode !== 'subtract'
                        ? 'bg-[#3b82f6] text-white font-medium'
                        : 'bg-[#252525] text-[#AAAAAA] hover:bg-[#303030]'
                    }`}
                  >
                    Compare
                  </button>
                  <button
                    onClick={() =>
                      onUpdateComponent(single.id, {
                        properties: { ...single.properties, mode: 'subtract' },
                      })
                    }
                    className={`py-1.5 rounded text-xs transition-colors ${
                      single.properties.mode === 'subtract'
                        ? 'bg-[#ef4444] text-white font-medium'
                        : 'bg-[#252525] text-[#AAAAAA] hover:bg-[#303030]'
                    }`}
                  >
                    Subtract
                  </button>
                </div>
                <div className="text-[10px] text-[#666666]">
                  {single.properties.mode === 'subtract'
                    ? 'Outputs = Input - Side Signal'
                    : 'Outputs Input if Input >= Side Signal'}
                </div>
              </div>
            )}

            {single.type === 'lever' && (
              <div>
                <button
                  onClick={() => {
                    const nextActive = !single.properties.active;
                    soundEngine.playLever(nextActive);
                    onUpdateComponent(single.id, {
                      power: nextActive ? 15 : 0,
                      properties: { ...single.properties, active: nextActive },
                    });
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-medium transition-colors ${
                    single.properties.active
                      ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                      : 'bg-[#252525] text-[#CCCCCC] hover:bg-[#303030]'
                  }`}
                >
                  <Power size={13} />
                  <span>State: {single.properties.active ? 'ON (15)' : 'OFF (0)'}</span>
                </button>
              </div>
            )}

            {single.type === 'daylight_detector' && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#888888]">Detection Sensor</div>
                <button
                  onClick={() => {
                    const nextInv = !single.properties.inverted;
                    onUpdateComponent(single.id, {
                      properties: { ...single.properties, inverted: nextInv },
                    });
                  }}
                  className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
                    single.properties.inverted
                      ? 'bg-[#1e3a8a] text-blue-200'
                      : 'bg-[#0284c7] text-white'
                  }`}
                >
                  Mode: {single.properties.inverted ? 'Night Sensor (Inverted)' : 'Daylight Sensor'}
                </button>
              </div>
            )}

            {single.type === 'note_block' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#888888] mb-1">
                    <span>Pitch Tuning</span>
                    <span className="font-mono text-white">
                      {NOTE_NAMES[single.properties.pitch ?? 0]} ({single.properties.pitch ?? 0}/24)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={single.properties.pitch ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateComponent(single.id, {
                        properties: { ...single.properties, pitch: val },
                      });
                      soundEngine.playNote(val, single.properties.instrument || 'harp');
                    }}
                    className="w-full accent-[#3b82f6] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="text-[11px] text-[#888888] mb-1">Instrument</div>
                  <select
                    value={single.properties.instrument ?? 'harp'}
                    onChange={(e) => {
                      const inst = e.target.value as any;
                      onUpdateComponent(single.id, {
                        properties: { ...single.properties, instrument: inst },
                      });
                      soundEngine.playNote(single.properties.pitch ?? 0, inst);
                    }}
                    className="w-full bg-[#252525] border border-[#333333] rounded px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="harp">Harp / Piano (Dirt/Wood)</option>
                    <option value="bass">Double Bass (Wood)</option>
                    <option value="snare">Snare Drum (Sand)</option>
                    <option value="click">Click / Rimshot (Glass)</option>
                    <option value="bell">Glockenspiel / Bell (Gold)</option>
                    <option value="flute">Flute (Clay)</option>
                    <option value="chime">Chime (Packed Ice)</option>
                  </select>
                </div>

                <button
                  onClick={() =>
                    soundEngine.playNote(
                      single.properties.pitch ?? 0,
                      single.properties.instrument || 'harp'
                    )
                  }
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] border border-[#333333] rounded text-xs text-white"
                >
                  <Music size={12} />
                  <span>Test Audio Sound</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Multi-Selection Controls */}
        {isMulti && (
          <div className="space-y-2">
            <button
              onClick={onRotateSelected}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252525] hover:bg-[#2d2d2d] border border-[#333333] rounded text-xs text-white transition-colors"
            >
              <RotateCw size={12} />
              <span>Rotate Selection (R)</span>
            </button>
          </div>
        )}

        {/* Common Actions */}
        <div className="pt-2 border-t border-[#2d2d2d] space-y-1.5">
          <button
            onClick={onDuplicateSelected}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252525] hover:bg-[#2d2d2d] border border-[#333333] rounded text-xs text-[#E5E5E5] hover:text-white transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={12} />
            <span>Duplicate (Ctrl+D)</span>
          </button>

          <button
            onClick={onDeleteSelected}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#331c1c] hover:bg-[#472222] border border-[#522929] rounded text-xs text-red-200 transition-colors"
            title="Delete (Del / Backspace)"
          >
            <Trash2 size={12} />
            <span>Delete Component</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

function formatName(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getDirectionLabel(rot: number): string {
  switch (rot % 360) {
    case 0:
      return 'North / Up';
    case 90:
      return 'East / Right';
    case 180:
      return 'South / Down';
    case 270:
      return 'West / Left';
    default:
      return 'North';
  }
}
