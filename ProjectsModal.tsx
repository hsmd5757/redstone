import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Plus, Clock, Cpu } from 'lucide-react';
import { listSavedProjects, deleteSavedProject } from '../utils/storage';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (id: string) => void;
  onNewProject: () => void;
  currentProjectId: string;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  onLoadProject,
  onNewProject,
  currentProjectId,
}) => {
  const [projects, setProjects] = useState<
    { id: string; name: string; updatedAt: number; count: number }[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      setProjects(listSavedProjects());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved circuit project?')) {
      deleteSavedProject(id);
      setProjects(listSavedProjects());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-[#383838] rounded w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl text-xs text-[#E5E5E5]">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#303030] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-[#888888]" />
            <span className="font-semibold text-sm text-white">Saved Circuit Projects</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3 border-b border-[#303030] bg-[#171717] flex justify-between items-center">
          <span className="text-[#888888]">Stored locally in browser storage</span>
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-white border border-[#3a3a3a] rounded transition-colors"
          >
            <Plus size={13} />
            <span>New Blank Circuit</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-[#777777]">
              No saved projects yet. Click "Save" in the top bar to save your current circuit!
            </div>
          ) : (
            projects.map((proj) => {
              const isCurrent = proj.id === currentProjectId;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onLoadProject(proj.id);
                    onClose();
                  }}
                  className={`p-3 rounded border cursor-pointer transition-colors flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-[#262626] border-[#444444]'
                      : 'bg-[#181818] border-[#282828] hover:bg-[#222222]'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-medium text-white flex items-center gap-2">
                      <span className="truncate">{proj.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-[#22c55e] font-mono">(Active)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#777777] mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Cpu size={11} /> {proj.count} components
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {new Date(proj.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="p-1.5 text-[#666666] hover:text-red-400 rounded hover:bg-[#2e1d1d] transition-colors"
                    title="Delete saved project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
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
