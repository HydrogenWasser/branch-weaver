import { cloneNodeAsNewNode, createNode } from "../../lib/story";
import { replaceRouteTargetNodeId } from "../../lib/conditions";
import { normalizeNodeTag, sortNodeTags } from "../../lib/nodeTags";
import type { StoryNode } from "../../types/story";
import type { NodeColorToken, XYPosition } from "../../types/story";
import { syncStartTag, withProjectMutation } from "../storeUtils";
import type { EditorGet, EditorSet, NodePatch } from "../types";

function duplicateNodeForClipboard(node: StoryNode): StoryNode {
  return JSON.parse(JSON.stringify(node)) as StoryNode;
}

export function createNodeSlice(set: EditorSet, _get: EditorGet) {
  return {
    copySelectedNode: () =>
      set((state) => {
        if (state.selection?.type !== "node") {
          return state;
        }

        const selectedNode = state.project.nodes.find((node) => node.id === state.selection?.nodeId);
        if (!selectedNode) {
          return state;
        }

        return {
          copiedNode: duplicateNodeForClipboard(selectedNode),
          lastError: null
        };
      }),
    pasteCopiedNode: (position: XYPosition) =>
      set((state) => {
        const copiedNode = state.copiedNode;
        if (!copiedNode) {
          return state;
        }

        return withProjectMutation(state, (project) => {
          const duplicatedNode = cloneNodeAsNewNode(copiedNode, position);
          project.nodes.push(duplicatedNode);
          return {
            project,
            selection: { type: "node", nodeId: duplicatedNode.id }
          };
        });
      }),
    addNode: (position?: XYPosition) =>
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
    removeNode: (nodeId: string) =>
      set((state) => {
        if (state.project.nodes.length <= 1) {
          return { lastError: "At least one node must remain in the project." };
        }

        return withProjectMutation(state, (project) => {
          const fallbackNode = project.nodes.find((node) => node.id !== nodeId);
          if (!fallbackNode) {
            return { project };
          }

          project.nodes = project.nodes.filter((node) => node.id !== nodeId);

          for (const node of project.nodes) {
            node.choices = node.choices.map((choice) => ({
              ...choice,
              route: replaceRouteTargetNodeId(choice.route, nodeId)
            }));
          }

          if (project.metadata.startNodeId === nodeId) {
            syncStartTag(project, fallbackNode.id);
          }

          return {
            project,
            selection: { type: "node", nodeId: fallbackNode.id }
          };
        });
      }),
    updateNode: (nodeId: string, patch: NodePatch) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.nodes = project.nodes.map((node) =>
            node.id === nodeId ? { ...node, ...patch } : node
          );
          return { project };
        })
      ),
    moveNode: (nodeId: string, position: XYPosition) =>
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
    applyNodeLayout: (positions: Record<string, XYPosition>) =>
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
    addNodeTag: (nodeId: string, tag: string) =>
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
    removeNodeTag: (nodeId: string, tag: string) =>
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
    setNodeColor: (nodeId: string, colorToken: NodeColorToken) =>
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
    addNodeFileTrigger: (nodeId: string, fileName: string) =>
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
    removeNodeFileTrigger: (nodeId: string, fileName: string) =>
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
  };
}
