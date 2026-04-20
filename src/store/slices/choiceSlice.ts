import {
  createChoice,
  getGlobalById,
  normalizeCondition
} from "../../lib/story";
import { coerceConditionValue, createDefaultCondition } from "../../lib/conditions";
import type { ChoiceSelection, StoryCondition } from "../../types/story";
import { syncStartTag, updateChoiceInProject, withProjectMutation } from "../storeUtils";
import type { ChoiceRouteMode, EditorGet, EditorSet } from "../types";

export function createChoiceSlice(set: EditorSet, _get: EditorGet) {
  return {
    addChoice: (nodeId: string) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.nodes = project.nodes.map((node) =>
            node.id === nodeId ? { ...node, choices: [...node.choices, createChoice()] } : node
          );
          return { project, selection: { type: "node", nodeId } };
        })
      ),
    removeChoice: (selection: ChoiceSelection) =>
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
    updateChoiceText: (selection: ChoiceSelection, text: string) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          updateChoiceInProject(project, selection, (choice) => ({ ...choice, text }));
          return { project, selection: { type: "choice", ...selection } };
        })
      ),
    connectChoice: (selection: ChoiceSelection, targetNodeId: string | null) =>
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
    setChoiceVisibilityCondition: (selection: ChoiceSelection, condition: StoryCondition | null) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          const normalizedCondition = condition
            ? normalizeCondition(condition, project.globals)
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
    setChoiceRouteMode: (selection: ChoiceSelection, mode: ChoiceRouteMode) =>
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
                    choice.route.mode === "direct"
                      ? choice.route.targetNodeId
                      : choice.route.fallbackTargetNodeId
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
    addConditionalBranch: (selection: ChoiceSelection) =>
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
    removeConditionalBranch: (selection: ChoiceSelection, index: number) =>
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
    moveConditionalBranch: (selection: ChoiceSelection, index: number, direction: -1 | 1) =>
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
    updateConditionalBranchCondition: (
      selection: ChoiceSelection,
      index: number,
      condition: StoryCondition
    ) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          const normalizedCondition = normalizeCondition(condition, project.globals);
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
    updateConditionalBranchTarget: (
      selection: ChoiceSelection,
      index: number,
      targetNodeId: string | null
    ) =>
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
    updateConditionalFallbackTarget: (selection: ChoiceSelection, targetNodeId: string | null) =>
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
    addChoiceEffect: (selection: ChoiceSelection, globalId: string) =>
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
    removeChoiceEffect: (selection: ChoiceSelection, index: number) =>
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
    updateChoiceEffect: (selection: ChoiceSelection, index: number, value: boolean | number) =>
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
    updateChoiceEffectGlobal: (selection: ChoiceSelection, index: number, globalId: string) =>
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
    updateChoiceEffectOperator: (
      selection: ChoiceSelection,
      index: number,
      operator: "set" | "change"
    ) =>
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
    setStartNode: (nodeId: string) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          syncStartTag(project, nodeId);
          return {
            project,
            selection: { type: "node", nodeId }
          };
        })
      )
  };
}
