import { duplicateProject, exportValidationErrors, fileNameFromTitle } from "../lib/story";
import { normalizeNodeTag, sortNodeTags } from "../lib/nodeTags";
import type { ChoiceSelection, EditorSelection, StoryProject } from "../types/story";
import type { EditorStore, HistoryEntry } from "./types";

export function isSameSelection(left: EditorSelection, right: EditorSelection): boolean {
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

export function snapshot(project: StoryProject): HistoryEntry {
  return { project: duplicateProject(project) };
}

export function snapshotString(project: StoryProject): string {
  return JSON.stringify(project);
}

export function syncStartTag(project: StoryProject, nodeId: string): StoryProject {
  project.metadata.startNodeId = nodeId;
  project.nodes = project.nodes.map((node) => {
    const nextTags = node.tags.filter((tag) => tag !== "Start");
    return node.id === nodeId
      ? { ...node, tags: sortNodeTags([...nextTags, "Start"]) }
      : { ...node, tags: nextTags };
  });

  return project;
}

export function updateChoiceInProject(
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

export function withProjectMutation(
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

export function resetState(
  project: StoryProject,
  filePath: string | null = null
): Pick<
  EditorStore,
  | "project"
  | "selection"
  | "viewport"
  | "currentFilePath"
  | "dirty"
  | "lastError"
  | "historyPast"
  | "historyFuture"
  | "lastSavedSnapshot"
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
