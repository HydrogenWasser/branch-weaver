import {
  storyProjectSchema,
  type ChoiceSelection,
  type StoryChoice,
  type StoryNode,
  type StoryProject
} from "../types/story";

const DEFAULT_PROJECT_TITLE = "Untitled Story";

function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function createChoice(): StoryChoice {
  return {
    id: createId("choice"),
    text: "",
    targetNodeId: null
  };
}

export function createNode(position = { x: 80, y: 80 }): StoryNode {
  return {
    id: createId("node"),
    title: "New Node",
    body: "",
    position,
    choices: []
  };
}

export function createEmptyProject(): StoryProject {
  const startNode = {
    ...createNode({ x: 120, y: 120 }),
    title: "Start",
    body: "Write your opening scene here."
  };

  return {
    version: 1,
    metadata: {
      title: DEFAULT_PROJECT_TITLE,
      startNodeId: startNode.id
    },
    nodes: [startNode]
  };
}

export function duplicateProject(project: StoryProject): StoryProject {
  return JSON.parse(JSON.stringify(project)) as StoryProject;
}

export function validateStoryProject(input: unknown): StoryProject {
  const project = storyProjectSchema.parse(input);
  const nodeIds = new Set(project.nodes.map((node) => node.id));

  if (project.nodes.length === 0) {
    throw new Error("Project must contain at least one node.");
  }

  if (!nodeIds.has(project.metadata.startNodeId)) {
    throw new Error("metadata.startNodeId does not reference an existing node.");
  }

  if (nodeIds.size !== project.nodes.length) {
    throw new Error("Duplicate node ids detected.");
  }

  for (const node of project.nodes) {
    const choiceIds = new Set<string>();

    for (const choice of node.choices) {
      if (choiceIds.has(choice.id)) {
        throw new Error(`Duplicate choice id "${choice.id}" found in node "${node.id}".`);
      }

      choiceIds.add(choice.id);

      if (choice.targetNodeId && !nodeIds.has(choice.targetNodeId)) {
        throw new Error(
          `Choice "${choice.id}" in node "${node.id}" targets missing node "${choice.targetNodeId}".`
        );
      }
    }
  }

  return project;
}

export function serializeProject(project: StoryProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(raw: string): StoryProject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    throw new Error(`JSON parse error: ${message}`);
  }

  return validateStoryProject(parsed);
}

export function exportValidationErrors(project: StoryProject): string[] {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const allNodeIds = new Set(project.nodes.map((node) => node.id));

  if (!project.metadata.startNodeId) {
    errors.push("Start node is required.");
  } else if (!allNodeIds.has(project.metadata.startNodeId)) {
    errors.push("Start node must reference an existing node.");
  }

  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    const choiceIds = new Set<string>();

    for (const choice of node.choices) {
      if (choiceIds.has(choice.id)) {
        errors.push(`Duplicate choice id in node ${node.id}: ${choice.id}`);
      }
      choiceIds.add(choice.id);

      if (!choice.targetNodeId) {
        errors.push(`Choice "${choice.text || choice.id}" in node "${node.title || node.id}" has no target.`);
      } else if (!allNodeIds.has(choice.targetNodeId)) {
        errors.push(`Choice "${choice.text || choice.id}" in node "${node.title || node.id}" points to a missing node.`);
      }
    }
  }

  return errors;
}

export function getNodeById(project: StoryProject, nodeId: string): StoryNode | undefined {
  return project.nodes.find((node) => node.id === nodeId);
}

export function getChoiceBySelection(project: StoryProject, selection: ChoiceSelection): StoryChoice | undefined {
  return getNodeById(project, selection.nodeId)?.choices.find((choice) => choice.id === selection.choiceId);
}

export function fileNameFromTitle(title: string): string {
  const safeTitle = title
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeTitle || "story-project"}.json`;
}
