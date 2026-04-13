import { create } from "zustand";
import { exampleProject } from "../data/exampleProject";
import {
  createChoice,
  createEmptyProject,
  createNode,
  duplicateProject,
  exportValidationErrors,
  fileNameFromTitle,
  getChoiceBySelection
} from "../lib/story";
import { normalizeNodeTag, sortNodeTags } from "../lib/nodeTags";
import type {
  ChoiceSelection,
  EditorSelection,
  NodeColorToken,
  StoryProject,
  ViewportState,
  XYPosition
} from "../types/story";

type HistoryEntry = {
  project: StoryProject;
};

type NodePatch = {
  title?: string;
  body?: string;
};

type EditorStore = {
  project: StoryProject;
  selection: EditorSelection;
  viewport: ViewportState;
  currentFilePath: string | null;
  dirty: boolean;
  lastError: string | null;
  historyPast: HistoryEntry[];
  historyFuture: HistoryEntry[];
  lastSavedSnapshot: string;
  newProject: () => void;
  loadExample: () => void;
  loadProject: (project: StoryProject, filePath?: string | null) => void;
  updateProjectTitle: (title: string) => void;
  markSaved: (filePath?: string | null) => void;
  clearError: () => void;
  setError: (message: string | null) => void;
  setSelection: (selection: EditorSelection) => void;
  setViewport: (viewport: ViewportState) => void;
  addNode: (position?: XYPosition) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, patch: NodePatch) => void;
  moveNode: (nodeId: string, position: XYPosition) => void;
  applyNodeLayout: (positions: Record<string, XYPosition>) => void;
  addNodeTag: (nodeId: string, tag: string) => void;
  removeNodeTag: (nodeId: string, tag: string) => void;
  setNodeColor: (nodeId: string, colorToken: NodeColorToken) => void;
  addChoice: (nodeId: string) => void;
  removeChoice: (selection: ChoiceSelection) => void;
  updateChoiceText: (selection: ChoiceSelection, text: string) => void;
  connectChoice: (selection: ChoiceSelection, targetNodeId: string | null) => void;
  setStartNode: (nodeId: string) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getExportIssues: () => string[];
  getDefaultFileName: () => string;
};

const initialProject = duplicateProject(exampleProject);

function isSameSelection(left: EditorSelection, right: EditorSelection): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  if (left.type !== right.type) {
    return false;
  }

  if (left.type === "node" && right.type === "node") {
    return left.nodeId === right.nodeId;
  }

  if (left.type === "choice" && right.type === "choice") {
    return left.nodeId === right.nodeId && left.choiceId === right.choiceId;
  }

  return false;
}

function snapshot(project: StoryProject): HistoryEntry {
  return { project: duplicateProject(project) };
}

function snapshotString(project: StoryProject): string {
  return JSON.stringify(project);
}

function syncStartTag(project: StoryProject, nodeId: string): StoryProject {
  project.metadata.startNodeId = nodeId;
  project.nodes = project.nodes.map((node) => {
    const nextTags = node.tags.filter((tag) => tag !== "Start");
    return node.id === nodeId
      ? { ...node, tags: sortNodeTags([...nextTags, "Start"]) }
      : { ...node, tags: nextTags };
  });

  return project;
}

function withProjectMutation(
  state: EditorStore,
  mutate: (project: StoryProject) => { project: StoryProject; selection?: EditorSelection }
): Partial<EditorStore> {
  const nextBase = duplicateProject(state.project);
  const result = mutate(nextBase);
  const nextProject = result.project;
  const nextSnapshot = snapshotString(nextProject);

  return {
    project: nextProject,
    selection: result.selection ?? state.selection,
    historyPast: [...state.historyPast, snapshot(state.project)],
    historyFuture: [],
    dirty: nextSnapshot !== state.lastSavedSnapshot,
    lastError: null
  };
}

function resetState(project: StoryProject, filePath: string | null = null): Pick<
  EditorStore,
  "project" | "selection" | "viewport" | "currentFilePath" | "dirty" | "lastError" | "historyPast" | "historyFuture" | "lastSavedSnapshot"
> {
  const cleanProject = duplicateProject(project);
  return {
    project: cleanProject,
    selection: { type: "node", nodeId: cleanProject.metadata.startNodeId },
    viewport: { x: 0, y: 0, zoom: 1 },
    currentFilePath: filePath,
    dirty: false,
    lastError: null,
    historyPast: [],
    historyFuture: [],
    lastSavedSnapshot: snapshotString(cleanProject)
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...resetState(initialProject),
  newProject: () => {
    set(resetState(createEmptyProject()));
  },
  loadExample: () => {
    set(resetState(exampleProject));
  },
  loadProject: (project, filePath = null) => {
    set(resetState(project, filePath));
  },
  updateProjectTitle: (title) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.metadata.title = title;
        return { project };
      })
    ),
  markSaved: (filePath) =>
    set((state) => ({
      currentFilePath: filePath ?? state.currentFilePath,
      dirty: false,
      lastSavedSnapshot: snapshotString(state.project),
      lastError: null
    })),
  clearError: () => set({ lastError: null }),
  setError: (message) => set({ lastError: message }),
  setSelection: (selection) =>
    set((state) => (isSameSelection(state.selection, selection) ? state : { selection })),
  setViewport: (viewport) => set({ viewport }),
  addNode: (position) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const node = createNode(position ?? { x: 240, y: 240 });
        project.nodes.push(node);
        return {
          project,
          selection: { type: "node", nodeId: node.id }
        };
      })
    ),
  removeNode: (nodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const fallbackNode = project.nodes.find((node) => node.id !== nodeId);
        project.nodes = project.nodes.filter((node) => node.id !== nodeId);

        for (const node of project.nodes) {
          node.choices = node.choices.map((choice) =>
            choice.targetNodeId === nodeId ? { ...choice, targetNodeId: null } : choice
          );
        }

        if (project.metadata.startNodeId === nodeId && fallbackNode) {
          syncStartTag(project, fallbackNode.id);
        }

        return {
          project,
          selection: fallbackNode ? { type: "node", nodeId: fallbackNode.id } : null
        };
      })
    ),
  updateNode: (nodeId, patch) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node
        );
        return { project };
      })
    ),
  moveNode: (nodeId, position) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node
        );
        return {
          project,
          selection: { type: "node", nodeId }
        };
      })
    ),
  applyNodeLayout: (positions) =>
    set((state) => {
      const hasChanges = state.project.nodes.some((node) => {
        const nextPosition = positions[node.id];
        return (
          nextPosition &&
          (node.position.x !== nextPosition.x || node.position.y !== nextPosition.y)
        );
      });

      if (!hasChanges) {
        return state;
      }

      return withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          positions[node.id] ? { ...node, position: positions[node.id] } : node
        );
        return { project };
      });
    }),
  addNodeTag: (nodeId, tag) =>
    set((state) => {
      const normalizedTag = normalizeNodeTag(tag);
      if (!normalizedTag) {
        return state;
      }

      return withProjectMutation(state, (project) => {
        if (normalizedTag === "Start") {
          syncStartTag(project, nodeId);
          return {
            project,
            selection: { type: "node", nodeId }
          };
        }

        project.nodes = project.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (node.tags.includes(normalizedTag)) {
            return node;
          }

          return {
            ...node,
            tags: sortNodeTags([...node.tags, normalizedTag])
          };
        });

        return {
          project,
          selection: { type: "node", nodeId }
        };
      });
    }),
  removeNodeTag: (nodeId, tag) =>
    set((state) => {
      const normalizedTag = normalizeNodeTag(tag);
      if (!normalizedTag) {
        return state;
      }

      if (normalizedTag === "Start") {
        return {
          ...state,
          lastError: 'Assign the "Start" tag to another node before removing it here.'
        };
      }

      return withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                tags: node.tags.filter((nodeTag) => nodeTag !== normalizedTag)
              }
            : node
        );

        return {
          project,
          selection: { type: "node", nodeId }
        };
      });
    }),
  setNodeColor: (nodeId, colorToken) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId ? { ...node, colorToken } : node
        );

        return {
          project,
          selection: { type: "node", nodeId }
        };
      })
    ),
  addChoice: (nodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId ? { ...node, choices: [...node.choices, createChoice()] } : node
        );
        return { project, selection: { type: "node", nodeId } };
      })
    ),
  removeChoice: (selection) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === selection.nodeId
            ? {
                ...node,
                choices: node.choices.filter((choice) => choice.id !== selection.choiceId)
              }
            : node
        );
        return {
          project,
          selection: { type: "node", nodeId: selection.nodeId }
        };
      })
    ),
  updateChoiceText: (selection, text) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === selection.nodeId
            ? {
                ...node,
                choices: node.choices.map((choice) =>
                  choice.id === selection.choiceId ? { ...choice, text } : choice
                )
              }
            : node
        );
        return { project, selection: { type: "choice", ...selection } };
      })
    ),
  connectChoice: (selection, targetNodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === selection.nodeId
            ? {
                ...node,
                choices: node.choices.map((choice) =>
                  choice.id === selection.choiceId ? { ...choice, targetNodeId } : choice
                )
              }
            : node
        );
        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  setStartNode: (nodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        syncStartTag(project, nodeId);
        return {
          project,
          selection: { type: "node", nodeId }
        };
      })
    ),
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
}));

export function getSelectedChoiceTarget(): string | null {
  const state = useEditorStore.getState();
  if (state.selection?.type !== "choice") {
    return null;
  }

  return getChoiceBySelection(state.project, state.selection)?.targetNodeId ?? null;
}
