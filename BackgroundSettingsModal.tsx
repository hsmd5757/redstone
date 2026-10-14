import React, { useRef } from 'react';
import { X, Image, RotateCcw, Check, Upload, Trash2 } from 'lucide-react';
import { BackgroundSettings } from '../types';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BackgroundSettings;
  onUpdateSettings: (newSettings: Partial<BackgroundSettings>) => void;
  onUploadImage: (file: File) => void;
  onRemoveImage: () => void;
  onResetDefault: () => void;
}

export const PRESET_COLORS = [
  { label: 'Dark Gray', value: '#171717' },
  { label: 'Black', value: '#0a0a0a' },
  { label: 'Light Gray', value: '#e5e5e5' },
  { label: 'White', value: '#ffffff' },
  { label: 'Muted Green', value: '#1a241b' },
  { label: 'Muted Blue', value: '#151c28' },
];

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onUploadImage,
  onRemoveImage,
  onResetDefault,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      e.target.value = '';
    }
  };

  const currentOpacity = Math.round((settings.imageOpacity ?? 0.35) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-[#383838] rounded w-full max-w-sm flex flex-col shadow-2xl text-xs text-[#E5E5E5]">
        {/* Header */}
        <div className="h-10 px-3 border-b border-[#303030] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2">
            <Image size={13} className="text-[#888888]" />
            <span className="font-semibold text-xs text-white">Background Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-4">
          {/* Preset Colors */}
          <div>
            <div className="text-[11px] text-[#888888] mb-1.5 font-medium">Color Presets</div>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESET_COLORS.map((preset) => {
                const isActive = settings.color.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    onClick={() => onUpdateSettings({ color: preset.value })}
                    className={`flex items-center gap-1.5 p-1.5 rounded border text-left transition-colors ${
                      isActive
                        ? 'border-[#555555] bg-[#292929]'
                        : 'border-[#2d2d2d] bg-[#1a1a1a] hover:bg-[#242424]'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-xs shrink-0 border border-white/10"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span className="text-[10px] text-[#CCCCCC] truncate flex-1">
                      {preset.label}
                    </span>
                    {isActive && <Check size={10} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div>
            <div className="text-[11px] text-[#888888] mb-1.5 font-medium">Custom Color</div>
            <div className="flex items-center gap-2 bg-[#171717] p-1.5 rounded border border-[#2b2b2b]">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => onUpdateSettings({ color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={settings.color}
                onChange={(e) => onUpdateSettings({ color: e.target.value })}
                className="bg-transparent text-xs font-mono text-[#E5E5E5] outline-none flex-1"
                placeholder="#171717"
              />
            </div>
          </div>

          {/* Background Image Upload */}
          <div>
            <div className="text-[11px] text-[#888888] mb-1.5 font-medium flex items-center justify-between">
              <span>Background Image</span>
              {settings.imageUrl && (
                <button
                  onClick={onRemoveImage}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px]"
                >
                  <Trash2 size={10} />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />

            {!settings.imageUrl ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#222222] hover:bg-[#282828] border border-dashed border-[#383838] rounded text-[#AAAAAA] hover:text-white transition-colors"
              >
                <Upload size={12} />
                <span>Upload PNG, JPG, or WebP</span>
              </button>
            ) : (
              <div className="space-y-2.5 bg-[#171717] p-2.5 rounded border border-[#2b2b2b]">
                {/* Fit Mode Switcher */}
                <div>
                  <div className="text-[10px] text-[#777777] mb-1">Image Fit</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['cover', 'contain', 'tile'] as const).map((fit) => (
                      <button
                        key={fit}
                        onClick={() => onUpdateSettings({ imageFit: fit })}
                        className={`py-1 text-[10px] rounded capitalize transition-colors ${
                          (settings.imageFit || 'cover') === fit
                            ? 'bg-[#3b82f6] text-white font-medium'
                            : 'bg-[#222222] text-[#888888] hover:bg-[#2a2a2a]'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#777777] mb-1">
                    <span>Opacity</span>
                    <span className="font-mono text-[#CCCCCC]">{currentOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={currentOpacity}
                    onChange={(e) =>
                      onUpdateSettings({ imageOpacity: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-[#3b82f6] cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1 text-[10px] bg-[#222222] hover:bg-[#2a2a2a] text-[#AAAAAA] hover:text-white rounded transition-colors"
                >
                  Change Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 px-3 border-t border-[#303030] flex items-center justify-between bg-[#191919]">
          <button
            onClick={onResetDefault}
            className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-white transition-colors"
          >
            <RotateCcw size={11} />
            <span>Reset Default</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
