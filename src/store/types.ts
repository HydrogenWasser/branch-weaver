import type {
  ChoiceSelection,
  EditorSelection,
  GlobalValueType,
  NodeColorToken,
  StoryCondition,
  StoryNode,
  StoryProject,
  ViewportState,
  XYPosition
} from "../types/story";

export type HistoryEntry = {
  project: StoryProject;
  revision: number;
};

export type NodePatch = {
  title?: string;
  body?: string;
};

export type ChoiceRouteMode = "direct" | "conditional";

export type EditorStore = {
  project: StoryProject;
  selection: EditorSelection;
  viewport: ViewportState;
  currentFilePath: string | null;
  dirty: boolean;
  lastError: string | null;
  copiedNode: StoryNode | null;
  historyPast: HistoryEntry[];
  historyFuture: HistoryEntry[];
  projectRevision: number;
  savedRevision: number;
  newProject: () => void;
  loadExample: () => void;
  loadProject: (project: StoryProject, filePath?: string | null) => void;
  updateProjectTitle: (title: string) => void;
  markSaved: (filePath?: string | null) => void;
  clearError: () => void;
  setError: (message: string | null) => void;
  setSelection: (selection: EditorSelection) => void;
  setViewport: (viewport: ViewportState) => void;
  copySelectedNode: () => void;
  pasteCopiedNode: (position: XYPosition) => void;
  addGlobal: (valueType: GlobalValueType) => void;
  updateGlobalName: (globalId: string, name: string) => void;
  updateGlobalValueType: (globalId: string, valueType: GlobalValueType) => void;
  updateGlobalDefaultValue: (globalId: string, defaultValue: boolean | number) => void;
  removeGlobal: (globalId: string) => void;
  addNode: (position?: XYPosition) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, patch: NodePatch) => void;
  moveNode: (nodeId: string, position: XYPosition) => void;
  applyNodeLayout: (positions: Record<string, XYPosition>) => void;
  addNodeTag: (nodeId: string, tag: string) => void;
  removeNodeTag: (nodeId: string, tag: string) => void;
  setNodeColor: (nodeId: string, colorToken: NodeColorToken) => void;
  addNodeFileTrigger: (nodeId: string, fileName: string) => void;
  removeNodeFileTrigger: (nodeId: string, fileName: string) => void;
  addChoice: (nodeId: string) => void;
  removeChoice: (selection: ChoiceSelection) => void;
  updateChoiceText: (selection: ChoiceSelection, text: string) => void;
  connectChoice: (selection: ChoiceSelection, targetNodeId: string | null) => void;
  setChoiceVisibilityCondition: (selection: ChoiceSelection, condition: StoryCondition | null) => void;
  setChoiceRouteMode: (selection: ChoiceSelection, mode: ChoiceRouteMode) => void;
  addConditionalBranch: (selection: ChoiceSelection) => void;
  removeConditionalBranch: (selection: ChoiceSelection, index: number) => void;
  moveConditionalBranch: (selection: ChoiceSelection, index: number, direction: -1 | 1) => void;
  updateConditionalBranchCondition: (
    selection: ChoiceSelection,
    index: number,
    condition: StoryCondition
  ) => void;
  updateConditionalBranchTarget: (
    selection: ChoiceSelection,
    index: number,
    targetNodeId: string | null
  ) => void;
  updateConditionalFallbackTarget: (selection: ChoiceSelection, targetNodeId: string | null) => void;
  addChoiceEffect: (selection: ChoiceSelection, globalId: string) => void;
  removeChoiceEffect: (selection: ChoiceSelection, index: number) => void;
  updateChoiceEffect: (selection: ChoiceSelection, index: number, value: boolean | number) => void;
  updateChoiceEffectGlobal: (selection: ChoiceSelection, index: number, globalId: string) => void;
  updateChoiceEffectOperator: (
    selection: ChoiceSelection,
    index: number,
    operator: "set" | "change"
  ) => void;
  setStartNode: (nodeId: string) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getExportIssues: () => string[];
  getDefaultFileName: () => string;
};

export type EditorSet = (
  partial: Partial<EditorStore> | ((state: EditorStore) => Partial<EditorStore>)
) => void;
export type EditorGet = () => EditorStore;
