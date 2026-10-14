import { CircuitProject, RedstoneComponent, Camera } from '../types';

const STORAGE_KEY_PREFIX = 'redstone_sandbox_project_';
const RECENT_PROJECT_KEY = 'redstone_sandbox_current_id';

export function saveProjectToStorage(project: CircuitProject): void {
  try {
    const projectCopy = { ...project };
    if (
      projectCopy.background &&
      projectCopy.background.imageUrl &&
      projectCopy.background.imageUrl.length > 30000
    ) {
      // Omit huge base64 from localStorage; IndexedDB handles persistence
      projectCopy.background = {
        ...projectCopy.background,
        imageUrl: null,
      };
    }
    localStorage.setItem(STORAGE_KEY_PREFIX + project.id, JSON.stringify(projectCopy));
    localStorage.setItem(RECENT_PROJECT_KEY, project.id);
  } catch (e) {
    console.error('Failed to save project to localStorage', e);
  }
}

export function loadProjectFromStorage(id: string): CircuitProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load project from localStorage', e);
    return null;
  }
}

export function listSavedProjects(): { id: string; name: string; updatedAt: number; count: number }[] {
  const results: { id: string; name: string; updatedAt: number; count: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw) as CircuitProject;
          results.push({
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt,
            count: p.components?.length || 0,
          });
        }
      }
    }
  } catch (e) {
    console.error('Failed to list saved projects', e);
  }
  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteSavedProject(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + id);
  } catch (e) {
    console.error('Failed to delete saved project', e);
  }
}

export function exportProjectToJson(project: CircuitProject): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_circuit.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(file: File): Promise<CircuitProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.components || !Array.isArray(parsed.components)) {
          throw new Error('Invalid circuit file: missing components array');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
