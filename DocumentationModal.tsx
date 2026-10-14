import React from 'react';
import { X, BookOpen, Cpu, Keyboard } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-[#383838] rounded w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-xs text-[#E5E5E5]">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#303030] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-[#888888]" />
            <span className="font-semibold text-sm text-white">Redstone Engineering Reference</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: Philosophy & Engine Rules */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Cpu size={14} className="text-red-400" />
              Engine Architecture & Simulation Rules
            </h3>
            <p className="text-[#A3A3A3] leading-relaxed mb-3">
              This sandbox is an authentic Minecraft-inspired construction environment with no prebuilt logic gates. Every circuit, from basic inverters to complex arithmetic logic units (ALUs), is assembled from individual discrete components.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#CCCCCC]">
              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <div className="font-semibold text-white mb-1">Signal Decay (0..15)</div>
                <div className="text-[11px] text-[#999999]">
                  Redstone dust carries power up to 15. Each block traveled decays the signal by 1 level. Repeaters renew the signal back to level 15.
                </div>
              </div>
              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <div className="font-semibold text-white mb-1">Tick Engine (10 TPS)</div>
                <div className="text-[11px] text-[#999999]">
                  Standard Minecraft redstone tick is 100ms (10 ticks per second). Torches and repeaters have discrete tick latency.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Building Logic from Scratch */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Building Logic Gates From Scratch</h3>
            <div className="space-y-2 text-[#CCCCCC]">
              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <span className="font-semibold text-white">NOT Gate (Inverter):</span>
                <p className="text-[11px] text-[#999999] mt-0.5">
                  Place a Redstone Torch attached to a solid block (or directly facing a wire). When the input backing cell is powered, the torch turns OFF after 1 tick delay.
                </p>
              </div>

              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <span className="font-semibold text-white">OR Gate:</span>
                <p className="text-[11px] text-[#999999] mt-0.5">
                  Connect two or more input lines directly into a shared redstone dust junction. If any input is ON, the output line is powered.
                </p>
              </div>

              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <span className="font-semibold text-white">AND Gate:</span>
                <p className="text-[11px] text-[#999999] mt-0.5">
                  Place two input levers or buttons feeding into two inverting Redstone Torches. Connect both torch outputs with redstone dust to a third inverting torch. By De Morgan's laws (NOT (NOT A OR NOT B)), the final torch only lights when both inputs are active!
                </p>
              </div>

              <div className="bg-[#171717] p-2.5 rounded border border-[#262626]">
                <span className="font-semibold text-white">Clock Pulse Generator:</span>
                <p className="text-[11px] text-[#999999] mt-0.5">
                  Create a loop of 4 Repeaters facing in a circle set to 2-4 ticks delay, or face two Observers directly at each other to produce a rapid high-frequency pulse train.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Keyboard & Mouse Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Keyboard size={14} className="text-[#888888]" />
              Hotkeys & Navigation
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] bg-[#171717] p-3 rounded border border-[#262626]">
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Left Click</kbd> Place or select component</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Space + Drag</kbd> Pan infinite grid</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Middle Drag</kbd> Pan grid</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Mouse Wheel</kbd> Zoom toward cursor</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">R</kbd> Rotate component (90°)</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Delete / Backspace</kbd> Delete selected</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Ctrl + Z</kbd> Undo</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Ctrl + Y</kbd> Redo</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Ctrl + C / V</kbd> Copy / Paste</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Ctrl + D</kbd> Duplicate selected</div>
              <div><kbd className="px-1 py-0.5 bg-[#262626] rounded text-white font-mono">Space</kbd> Play / Pause simulation</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 px-4 border-t border-[#303030] flex items-center justify-end bg-[#191919]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
