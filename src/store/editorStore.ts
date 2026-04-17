import { create } from "zustand";
import { exampleProject } from "../data/exampleProject";
import {
  createChoice,
  createEmptyProject,
  createGlobal,
  createNode,
  duplicateProject,
  exportValidationErrors,
  fileNameFromTitle,
  getChoiceBySelection,
  getGlobalById,
  isGlobalReferenced,
  normalizeConditionForGlobal
} from "../lib/story";
import { coerceConditionValue, createDefaultCondition, replaceRouteTargetNodeId } from "../lib/conditions";
import { normalizeNodeTag, sortNodeTags } from "../lib/nodeTags";
import type {
  ChoiceSelection,
  EditorSelection,
  GlobalValueType,
  NodeColorToken,
  StoryCondition,
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

type ChoiceRouteMode = "direct" | "conditional";

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

function updateChoiceInProject(
  project: StoryProject,
  selection: ChoiceSelection,
  updateChoice: (choice: StoryProject["nodes"][number]["choices"][number]) => StoryProject["nodes"][number]["choices"][number]
): StoryProject {
  project.nodes = project.nodes.map((node) =>
    node.id === selection.nodeId
      ? {
          ...node,
          choices: node.choices.map((choice) =>
            choice.id === selection.choiceId ? updateChoice(choice) : choice
          )
        }
      : node
  );

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
  addGlobal: (valueType) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.globals.push(createGlobal(valueType));
        return { project };
      })
    ),
  updateGlobalName: (globalId, name) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.globals = project.globals.map((storyGlobal) =>
          storyGlobal.id === globalId ? { ...storyGlobal, name } : storyGlobal
        );
        return { project };
      })
    ),
  updateGlobalValueType: (globalId, valueType) =>
    set((state) => {
      if (isGlobalReferenced(state.project, globalId)) {
        return {
          ...state,
          lastError: "Remove conditions that reference this global before changing its type."
        };
      }

      return withProjectMutation(state, (project) => {
        project.globals = project.globals.map((storyGlobal) => {
          if (storyGlobal.id !== globalId) {
            return storyGlobal;
          }

          return valueType === "boolean"
            ? {
                ...storyGlobal,
                valueType,
                defaultValue: false
              }
            : {
                ...storyGlobal,
                valueType,
                defaultValue: 0
              };
        });
        return { project };
      });
    }),
  updateGlobalDefaultValue: (globalId, defaultValue) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.globals = project.globals.map((storyGlobal) => {
          if (storyGlobal.id !== globalId) {
            return storyGlobal;
          }

          return storyGlobal.valueType === "boolean"
            ? {
                ...storyGlobal,
                defaultValue: defaultValue === true
              }
            : {
                ...storyGlobal,
                defaultValue:
                  typeof defaultValue === "number" && Number.isFinite(defaultValue) ? defaultValue : 0
              };
        });
        return { project };
      })
    ),
  removeGlobal: (globalId) =>
    set((state) => {
      if (isGlobalReferenced(state.project, globalId)) {
        return {
          ...state,
          lastError: "This global is still used by one or more conditions. Remove those references first."
        };
      }

      return withProjectMutation(state, (project) => {
        project.globals = project.globals.filter((storyGlobal) => storyGlobal.id !== globalId);
        return { project };
      });
    }),
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
          node.choices = node.choices.map((choice) => ({
            ...choice,
            route: replaceRouteTargetNodeId(choice.route, nodeId)
          }));
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
  addNodeFileTrigger: (nodeId, fileName) =>
    set((state) => {
      const trimmed = fileName.trim();
      if (!trimmed) {
        return state;
      }

      return withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (node.fileTriggers.includes(trimmed)) {
            return node;
          }

          return {
            ...node,
            fileTriggers: [...node.fileTriggers, trimmed]
          };
        });

        return {
          project,
          selection: { type: "node", nodeId }
        };
      });
    }),
  removeNodeFileTrigger: (nodeId, fileName) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        project.nodes = project.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                fileTriggers: node.fileTriggers.filter((name) => name !== fileName)
              }
            : node
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
        updateChoiceInProject(project, selection, (choice) => ({ ...choice, text }));
        return { project, selection: { type: "choice", ...selection } };
      })
    ),
  connectChoice: (selection, targetNodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) =>
          choice.route.mode === "direct"
            ? {
                ...choice,
                route: {
                  mode: "direct",
                  targetNodeId
                }
              }
            : choice
        );
        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  setChoiceVisibilityCondition: (selection, condition) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const normalizedCondition = condition
          ? normalizeConditionForGlobal(condition, getGlobalById(project, condition.globalId))
          : null;

        updateChoiceInProject(project, selection, (choice) => ({
          ...choice,
          visibilityCondition: normalizedCondition
        }));

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  setChoiceRouteMode: (selection, mode) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          if (mode === choice.route.mode) {
            return choice;
          }

          if (mode === "conditional") {
            return {
              ...choice,
              route: {
                mode: "conditional",
                branches: [],
                fallbackTargetNodeId:
                  choice.route.mode === "direct" ? choice.route.targetNodeId : choice.route.fallbackTargetNodeId
              }
            };
          }

          return {
            ...choice,
            route: {
              mode: "direct",
              targetNodeId:
                choice.route.mode === "conditional"
                  ? choice.route.fallbackTargetNodeId
                  : choice.route.targetNodeId
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  addConditionalBranch: (selection) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const firstGlobal = project.globals[0];
        if (!firstGlobal) {
          return { project, selection: { type: "choice", ...selection } };
        }

        updateChoiceInProject(project, selection, (choice) => {
          if (choice.route.mode !== "conditional") {
            return choice;
          }

          return {
            ...choice,
            route: {
              ...choice.route,
              branches: [
                ...choice.route.branches,
                {
                  condition: createDefaultCondition(firstGlobal),
                  targetNodeId: null
                }
              ]
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  removeConditionalBranch: (selection, index) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          if (choice.route.mode !== "conditional") {
            return choice;
          }

          return {
            ...choice,
            route: {
              ...choice.route,
              branches: choice.route.branches.filter((_, branchIndex) => branchIndex !== index)
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  moveConditionalBranch: (selection, index, direction) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          if (choice.route.mode !== "conditional") {
            return choice;
          }

          const nextIndex = index + direction;
          if (nextIndex < 0 || nextIndex >= choice.route.branches.length) {
            return choice;
          }

          const branches = [...choice.route.branches];
          const [branch] = branches.splice(index, 1);
          branches.splice(nextIndex, 0, branch);

          return {
            ...choice,
            route: {
              ...choice.route,
              branches
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateConditionalBranchCondition: (selection, index, condition) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const normalizedCondition = normalizeConditionForGlobal(
          condition,
          getGlobalById(project, condition.globalId)
        );
        if (!normalizedCondition) {
          return {
            project,
            selection: { type: "choice", ...selection }
          };
        }

        updateChoiceInProject(project, selection, (choice) => {
          if (choice.route.mode !== "conditional") {
            return choice;
          }

          return {
            ...choice,
            route: {
              ...choice.route,
              branches: choice.route.branches.map((branch, branchIndex) =>
                branchIndex === index
                  ? {
                      ...branch,
                      condition: normalizedCondition
                    }
                  : branch
              )
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateConditionalBranchTarget: (selection, index, targetNodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          if (choice.route.mode !== "conditional") {
            return choice;
          }

          return {
            ...choice,
            route: {
              ...choice.route,
              branches: choice.route.branches.map((branch, branchIndex) =>
                branchIndex === index
                  ? {
                      ...branch,
                      targetNodeId
                    }
                  : branch
              )
            }
          };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateConditionalFallbackTarget: (selection, targetNodeId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) =>
          choice.route.mode === "conditional"
            ? {
                ...choice,
                route: {
                  ...choice.route,
                  fallbackTargetNodeId: targetNodeId
                }
              }
            : choice
        );

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  addChoiceEffect: (selection, globalId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const storyGlobal = getGlobalById(project, globalId);
        if (!storyGlobal) {
          return { project };
        }

        updateChoiceInProject(project, selection, (choice) => ({
          ...choice,
          effects: [
            ...choice.effects,
            { globalId: storyGlobal.id, operator: "set", value: storyGlobal.defaultValue }
          ]
        }));

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  removeChoiceEffect: (selection, index) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => ({
          ...choice,
          effects: choice.effects.filter((_, i) => i !== index)
        }));

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateChoiceEffect: (selection, index, value) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          const effect = choice.effects[index];
          if (!effect) {
            return choice;
          }

          const storyGlobal = getGlobalById(project, effect.globalId);
          if (!storyGlobal) {
            return choice;
          }

          const nextEffects = [...choice.effects];
          nextEffects[index] = {
            globalId: storyGlobal.id,
            operator: effect.operator,
            value: coerceConditionValue(storyGlobal.valueType, value)
          };

          return { ...choice, effects: nextEffects };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateChoiceEffectGlobal: (selection, index, globalId) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        const storyGlobal = getGlobalById(project, globalId);
        if (!storyGlobal) {
          return { project };
        }

        updateChoiceInProject(project, selection, (choice) => {
          const effect = choice.effects[index];
          if (!effect) {
            return choice;
          }

          const nextEffects = [...choice.effects];
          nextEffects[index] = {
            globalId: storyGlobal.id,
            operator: "set",
            value: storyGlobal.defaultValue
          };

          return { ...choice, effects: nextEffects };
        });

        return {
          project,
          selection: { type: "choice", ...selection }
        };
      })
    ),
  updateChoiceEffectOperator: (selection, index, operator) =>
    set((state) =>
      withProjectMutation(state, (project) => {
        updateChoiceInProject(project, selection, (choice) => {
          const effect = choice.effects[index];
          if (!effect) {
            return choice;
          }

          const storyGlobal = getGlobalById(project, effect.globalId);
          if (!storyGlobal) {
            return choice;
          }

          const safeOperator = storyGlobal.valueType === "boolean" ? "set" : operator;

          const nextEffects = [...choice.effects];
          nextEffects[index] = {
            ...effect,
            operator: safeOperator
          };

          return { ...choice, effects: nextEffects };
        });

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

  const choice = getChoiceBySelection(state.project, state.selection);
  if (!choice) {
    return null;
  }

  return choice.route.mode === "direct" ? choice.route.targetNodeId : choice.route.fallbackTargetNodeId;
}
