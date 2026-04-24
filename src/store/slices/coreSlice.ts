import { createEmptyProject } from "../../lib/story";
import { exampleProject } from "../../data/exampleProject";
import type { EditorSelection, StoryProject, ViewportState } from "../../types/story";
import { isSameSelection, resetState, withProjectMutation } from "../storeUtils";
import type { EditorGet, EditorSet } from "../types";

export function createCoreSlice(set: EditorSet, _get: EditorGet) {
  return {
    newProject: () => {
      set(() => resetState(createEmptyProject()));
    },
    loadExample: () => {
      set(() => resetState(exampleProject));
    },
    loadProject: (project: StoryProject, filePath: string | null = null) => {
      set(() => resetState(project, filePath));
    },
    updateProjectTitle: (title: string) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.metadata.title = title;
          return { project };
        })
      ),
    markSaved: (filePath?: string | null) =>
      set((state) => ({
        currentFilePath: filePath ?? state.currentFilePath,
        dirty: false,
        savedRevision: state.projectRevision,
        lastError: null
      })),
    clearError: () => set({ lastError: null }),
    setError: (message: string | null) => set({ lastError: message }),
    setSelection: (selection: EditorSelection) =>
      set((state) => (isSameSelection(state.selection, selection) ? state : { selection })),
    setViewport: (viewport: ViewportState) => set({ viewport })
  };
}
