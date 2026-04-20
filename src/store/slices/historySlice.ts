import { duplicateProject, exportValidationErrors, fileNameFromTitle, getChoiceBySelection } from "../../lib/story";
import { snapshot, snapshotString } from "../storeUtils";
import type { EditorGet, EditorSet } from "../types";

export function createHistorySlice(set: EditorSet, get: EditorGet) {
  return {
    deleteSelection: () => {
      const selection = get().selection;

      if (!selection) {
        return;
      }

      if (selection.type === "node") {
        const state = get();
        if (state.project.nodes.length <= 1) {
          set({ lastError: "At least one node must remain in the project." });
          return;
        }
        get().removeNode(selection.nodeId);
        return;
      }

      get().removeChoice({ nodeId: selection.nodeId, choiceId: selection.choiceId });
    },
    undo: () =>
      set((state) => {
        const previous = state.historyPast[state.historyPast.length - 1];
        if (!previous) {
          return {};
        }

        return {
          project: duplicateProject(previous.project),
          historyPast: state.historyPast.slice(0, -1),
          historyFuture: [snapshot(state.project), ...state.historyFuture],
          dirty: snapshotString(previous.project) !== state.lastSavedSnapshot,
          selection: { type: "node", nodeId: previous.project.metadata.startNodeId },
          lastError: null
        };
      }),
    redo: () =>
      set((state) => {
        const next = state.historyFuture[0];
        if (!next) {
          return {};
        }

        return {
          project: duplicateProject(next.project),
          historyPast: [...state.historyPast, snapshot(state.project)],
          historyFuture: state.historyFuture.slice(1),
          dirty: snapshotString(next.project) !== state.lastSavedSnapshot,
          selection: { type: "node", nodeId: next.project.metadata.startNodeId },
          lastError: null
        };
      }),
    canUndo: () => get().historyPast.length > 0,
    canRedo: () => get().historyFuture.length > 0,
    getExportIssues: () => exportValidationErrors(get().project),
    getDefaultFileName: () => fileNameFromTitle(get().project.metadata.title)
  };
}
