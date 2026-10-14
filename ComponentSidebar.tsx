import React, { useState } from 'react';
import { MousePointer, Eraser, RotateCw } from 'lucide-react';
import { ComponentType, ToolMode, Category } from '../types';
import { COMPONENT_CATALOG, CATEGORY_LABELS } from '../constants/components';

interface ComponentSidebarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  rotation: number;
  onRotateTool: () => void;
}

export const ComponentSidebar: React.FC<ComponentSidebarProps> = ({
  currentTool,
  onSelectTool,
  rotation,
  onRotateTool,
}) => {
  const [activeTab, setActiveTab] = useState<Category>('power');

  const categories: Category[] = ['power', 'redstone', 'mechanical', 'utility'];
  const itemsInActiveCategory = COMPONENT_CATALOG.filter((c) => c.category === activeTab);
  const isPlacing = currentTool !== 'select' && currentTool !== 'erase';
  const activePlacementMeta = isPlacing
    ? COMPONENT_CATALOG.find((c) => c.type === currentTool)
    : null;

  return (
    <aside className="w-56 bg-[#1C1C1C] border-r border-[#303030] flex flex-col shrink-0 select-none text-xs">
      {/* Primary Mode Switcher (Select vs Erase) */}
      <div className="p-2 border-b border-[#303030] flex items-center gap-1.5 bg-[#171717]">
        <button
          onClick={() => onSelectTool('select')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition-colors ${
            currentTool === 'select'
              ? 'bg-[#333333] text-white font-medium'
              : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#222222]'
          }`}
          title="Direct Interaction & Select Mode (Click levers, buttons, note blocks)"
        >
          <MousePointer size={13} />
          <span>Interact</span>
        </button>

        <button
          onClick={() => onSelectTool(currentTool === 'erase' ? 'select' : 'erase')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition-colors ${
            currentTool === 'erase'
              ? 'bg-[#4d1f1f] text-red-200 font-medium'
              : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#222222]'
          }`}
          title="Erase Tool (Click component to delete)"
        >
          <Eraser size={13} />
          <span>Erase</span>
        </button>

        {/* Rotate Tool button */}
        <button
          onClick={onRotateTool}
          className="p-1.5 rounded text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222] transition-colors"
          title={`Rotate Placement Direction (R) - Currently ${rotation}°`}
        >
          <RotateCw size={13} />
        </button>
      </div>

      {/* Subtle Active Placement Indicator (Only shown during placement mode) */}
      {isPlacing && activePlacementMeta && (
        <div className="mx-2 mt-2 px-2 py-1.5 bg-[#242424] border border-[#383838] rounded flex items-center justify-between text-[11px] text-[#E5E5E5]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" />
            <span className="truncate font-medium">Placing: {activePlacementMeta.name}</span>
          </div>
          <button
            onClick={() => onSelectTool('select')}
            className="text-[10px] text-[#888888] hover:text-white px-1.5 py-0.5 rounded bg-[#171717] border border-[#303030] shrink-0 transition-colors"
            title="Cancel placement mode (Escape)"
          >
            Esc
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="grid grid-cols-2 p-1 gap-1 border-b border-[#303030] bg-[#1a1a1a] mt-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`py-1 px-1.5 text-[11px] rounded transition-colors text-center truncate ${
              activeTab === cat
                ? 'bg-[#2a2a2a] text-[#FFFFFF] font-medium'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Component Library List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {itemsInActiveCategory.map((item) => {
          const isSelected = currentTool === item.type;
          return (
            <button
              key={item.type}
              onClick={() => {
                // Toggle Deselection: If clicking the active tool again, cancel placement and switch to interaction mode
                if (isSelected) {
                  onSelectTool('select');
                } else {
                  onSelectTool(item.type);
                }
              }}
              className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors group ${
                isSelected
                  ? 'bg-[#2d2d2d] text-white border border-[#444444]'
                  : 'text-[#CCCCCC] hover:bg-[#242424] hover:text-white border border-transparent'
              }`}
              title={
                isSelected
                  ? `${item.name} is active for placement. Click again or press Esc to cancel.`
                  : `${item.name}: ${item.description}`
              }
            >
              {/* Item preview badge */}
              <div className="w-6 h-6 rounded bg-[#171717] border border-[#333333] flex items-center justify-center shrink-0 overflow-hidden">
                {renderComponentIcon(item.type, isSelected)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs leading-none truncate text-[#E5E5E5] group-hover:text-white flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                  {isSelected && (
                    <span className="text-[9px] text-[#3b82f6] font-mono shrink-0 ml-1">Active</span>
                  )}
                </div>
                <div className="text-[10px] text-[#777777] truncate mt-0.5">
                  {item.directional ? `Directional (${rotation}°)` : 'Block'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Instructions */}
      <div className="p-2 border-t border-[#303030] bg-[#171717] text-[10px] text-[#666666] leading-tight space-y-0.5">
        {isPlacing ? (
          <>
            <div className="text-[#999999]">• Click empty cell to place {activePlacementMeta?.name}</div>
            <div>• Click item again or Esc to exit</div>
          </>
        ) : (
          <>
            <div className="text-[#999999]">• Interaction mode: click levers/buttons</div>
            <div>• Middle-drag / Space to pan</div>
          </>
        )}
      </div>
    </aside>
  );
};

function renderComponentIcon(type: ComponentType, isSelected: boolean) {
  switch (type) {
    case 'redstone_dust':
      return <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />;
    case 'redstone_torch':
      return (
        <div className="flex flex-col items-center">
          <div className="w-1.5 h-1.5 bg-[#ef4444]" />
          <div className="w-1 h-2 bg-[#78350f]" />
        </div>
      );
    case 'redstone_repeater':
      return (
        <div className="w-3.5 h-3.5 bg-[#64748b] flex items-center justify-center text-[7px] text-red-400 font-bold">
          ▲
        </div>
      );
    case 'redstone_comparator':
      return (
        <div className="w-3.5 h-3.5 bg-[#64748b] flex items-center justify-center text-[7px] text-amber-400">
          ▲▲
        </div>
      );
    case 'lever':
      return (
        <div className="w-3 h-3 bg-[#525252] flex items-center justify-center">
          <div className="w-0.5 h-2 bg-[#a16207] rotate-45" />
        </div>
      );
    case 'stone_button':
      return <div className="w-2.5 h-1.5 bg-[#737373] rounded-xs" />;
    case 'wooden_button':
      return <div className="w-2.5 h-1.5 bg-[#92400e] rounded-xs" />;
    case 'pressure_plate':
      return <div className="w-3.5 h-1 bg-[#a3a3a3]" />;
    case 'redstone_block':
      return <div className="w-3 h-3 bg-[#dc2626] border border-[#ef4444]" />;
    case 'redstone_lamp':
      return <div className="w-3 h-3 bg-[#78350f] border border-[#f59e0b]" />;
    case 'observer':
      return (
        <div className="w-3 h-3 bg-[#525252] flex items-center justify-center">
          <div className="w-1.5 h-1 bg-red-600" />
        </div>
      );
    case 'piston':
      return (
        <div className="w-3 h-3 bg-[#525252] flex flex-col items-center">
          <div className="w-3 h-1 bg-[#b45309]" />
          <div className="w-1.5 h-1.5 bg-[#737373]" />
        </div>
      );
    case 'sticky_piston':
      return (
        <div className="w-3 h-3 bg-[#525252] flex flex-col items-center">
          <div className="w-3 h-1 bg-[#15803d]" />
          <div className="w-1.5 h-1.5 bg-[#737373]" />
        </div>
      );
    case 'note_block':
      return (
        <div className="w-3 h-3 bg-[#92400e] flex items-center justify-center text-[8px] text-[#fde047]">
          ♪
        </div>
      );
    case 'tnt':
      return (
        <div className="w-3 h-3 bg-[#b91c1c] text-[6px] font-bold text-white flex items-center justify-center">
          TNT
        </div>
      );
    case 'dispenser':
      return (
        <div className="w-3 h-3 bg-[#525252] flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-black" />
        </div>
      );
    case 'dropper':
      return (
        <div className="w-3 h-3 bg-[#525252] flex items-center justify-center">
          <div className="w-1 h-1 bg-black rotate-45" />
        </div>
      );
    case 'hopper':
      return <div className="w-3 h-2.5 bg-[#3f3f46] clip-path-polygon" />;
    case 'daylight_detector':
      return <div className="w-3 h-3 bg-[#0284c7] border border-[#78350f]" />;
    case 'stone_block':
      return <div className="w-3 h-3 bg-[#737373]" />;
    case 'target_block':
      return (
        <div className="w-3 h-3 rounded-full bg-[#ef4444] flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-white" />
        </div>
      );
    case 'tripwire_hook':
      return <div className="w-1.5 h-2.5 bg-[#94a3b8]" />;
    case 'tripwire':
      return <div className="w-3 h-0.5 bg-[#94a3b8]" />;
    case 'trapped_chest':
      return <div className="w-3 h-3 bg-[#92400e] border border-[#ea580c]" />;
    default:
      return <div className="w-2.5 h-2.5 bg-neutral-600" />;
  }
}
