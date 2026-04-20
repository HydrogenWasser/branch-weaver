import { create } from "zustand";
import { exampleProject } from "../data/exampleProject";
import { duplicateProject, getChoiceBySelection } from "../lib/story";
import { createChoiceSlice } from "./slices/choiceSlice";
import { createCoreSlice } from "./slices/coreSlice";
import { createGlobalSlice } from "./slices/globalSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createNodeSlice } from "./slices/nodeSlice";
import { resetState } from "./storeUtils";
import type { EditorStore } from "./types";

const initialProject = duplicateProject(exampleProject);

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...resetState(initialProject),
  ...createCoreSlice(set, get),
  ...createGlobalSlice(set, get),
  ...createNodeSlice(set, get),
  ...createChoiceSlice(set, get),
  ...createHistorySlice(set, get)
}));

export function getSelectedChoiceTarget(): string | null {
  const state = useEditorStore.getState();
  if (state.selection?.type !== "choice") {
    return null;
  }

  const choice = getChoiceBySelection(state.project, state.selection);
  if (!choice) {
    return null;
  }

  return choice.route.mode === "direct" ? choice.route.targetNodeId : choice.route.fallbackTargetNodeId;
}
