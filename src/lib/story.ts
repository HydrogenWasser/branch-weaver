import {
  nodeColorTokens,
  storyProjectSchema,
  type ChoiceSelection,
  type GlobalValueType,
  type NodeColorToken,
  type StoryAtomicCondition,
  type StoryChoice,
  type StoryCondition,
  type StoryEffect,
  type StoryGlobal,
  type StoryNode,
  type StoryProject,
  type StoryProjectInput
} from "../types/story";
import { coerceConditionValue, createDefaultCondition, getAllowedOperators, getChoiceReferencedGlobalIds } from "./conditions";
import { normalizeNodeTag, sortNodeTags } from "./nodeTags";

const DEFAULT_PROJECT_TITLE = "Untitled Story";
const DEFAULT_NODE_COLOR: NodeColorToken = "sand";

function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function createGlobal(valueType: GlobalValueType = "boolean"): StoryGlobal {
  const id = createId("global");
  return valueType === "boolean"
    ? {
        id,
        name: `Flag ${id.slice(-4)}`,
        valueType,
        defaultValue: false
      }
    : {
        id,
        name: `Value ${id.slice(-4)}`,
        valueType,
        defaultValue: 0
      };
}

export function createChoice(): StoryChoice {
  return {
    id: createId("choice"),
    text: "",
    visibilityCondition: null,
    effects: [],
    route: {
      mode: "direct",
      targetNodeId: null
    }
  };
}

export function createNode(position = { x: 80, y: 80 }): StoryNode {
  return {
    id: createId("node"),
    title: "New Node",
    body: "",
    position,
    tags: [],
    colorToken: DEFAULT_NODE_COLOR,
    choices: [],
    fileTriggers: []
  };
}

export function createEmptyProject(): StoryProject {
  const startNode = {
    ...createNode({ x: 120, y: 120 }),
    title: "Start",
    body: "Write your opening scene here.",
    tags: ["Start"],
    colorToken: "amber" as NodeColorToken
  };

  return {
    version: 2,
    metadata: {
      title: DEFAULT_PROJECT_TITLE,
      startNodeId: startNode.id
    },
    globals: [],
    nodes: [startNode]
  };
}

export function duplicateProject(project: StoryProject): StoryProject {
  return JSON.parse(JSON.stringify(project)) as StoryProject;
}

function migrateChoice(
  choice: StoryProjectInput extends never ? never : StoryProjectInput["nodes"][number]["choices"][number]
): StoryChoice {
  if ("route" in choice) {
    return {
      id: choice.id,
      text: choice.text,
      visibilityCondition: choice.visibilityCondition ?? null,
      effects: (("effects" in choice ? choice.effects : []) ?? []).map((effect) => ({
        ...effect,
        operator: effect.operator ?? "set"
      })),
      route: choice.route.mode === "direct"
        ? {
            mode: "direct",
            targetNodeId: choice.route.targetNodeId ?? null
          }
        : {
            mode: "conditional",
            branches: choice.route.branches.map((branch) => ({
              condition: branch.condition,
              targetNodeId: branch.targetNodeId ?? null
            })),
            fallbackTargetNodeId: choice.route.fallbackTargetNodeId ?? null
          }
    };
  }

  return {
    id: choice.id,
    text: choice.text,
    visibilityCondition: null,
    effects: [],
    route: {
      mode: "direct",
      targetNodeId: choice.targetNodeId ?? null
    }
  };
}

function migrateProject(input: StoryProjectInput): StoryProject {
  const globals = "globals" in input ? input.globals : [];

  return {
    version: 2,
    metadata: input.metadata,
    globals: globals.map((storyGlobal) => ({
      ...storyGlobal,
      defaultValue: storyGlobal.defaultValue
    })) as StoryGlobal[],
    nodes: input.nodes.map((node) => ({
      ...node,
      fileTriggers: "fileTriggers" in node ? node.fileTriggers : [],
      choices: node.choices.map((choice) => migrateChoice(choice))
    }))
  };
}

function normalizeNode(node: StoryNode): StoryNode {
  const uniqueTags = new Set<string>();

  for (const rawTag of node.tags ?? []) {
    const normalizedTag = normalizeNodeTag(rawTag);
    if (normalizedTag) {
      uniqueTags.add(normalizedTag);
    }
  }

  const uniqueFileTriggers = new Set<string>();

  for (const rawFileTrigger of node.fileTriggers ?? []) {
    const trimmed = rawFileTrigger.trim();
    if (trimmed) {
      uniqueFileTriggers.add(trimmed);
    }
  }

  return {
    ...node,
    tags: sortNodeTags([...uniqueTags]),
    colorToken: nodeColorTokens.includes(node.colorToken) ? node.colorToken : DEFAULT_NODE_COLOR,
    fileTriggers: [...uniqueFileTriggers]
  };
}

function normalizeGlobals(globals: StoryGlobal[]): StoryGlobal[] {
  return globals.map((storyGlobal) =>
    storyGlobal.valueType === "boolean"
      ? {
          ...storyGlobal,
          name: storyGlobal.name.trim(),
          defaultValue: storyGlobal.defaultValue === true
        }
      : {
          ...storyGlobal,
          name: storyGlobal.name.trim(),
          defaultValue:
            typeof storyGlobal.defaultValue === "number" && Number.isFinite(storyGlobal.defaultValue)
              ? storyGlobal.defaultValue
              : 0
        }
  );
}

function getConditionValidationError(
  condition: StoryCondition,
  globalsById: Map<string, StoryGlobal>,
  label: string
): string | null {
  if (condition.type === "atomic") {
    const storyGlobal = globalsById.get(condition.globalId);
    if (!storyGlobal) {
      return `${label} references a missing global "${condition.globalId}".`;
    }

    if (!getAllowedOperators(storyGlobal.valueType).includes(condition.operator)) {
      return `${label} uses an invalid operator for global "${storyGlobal.name}".`;
    }

    if (storyGlobal.valueType === "boolean" && typeof condition.value !== "boolean") {
      return `${label} must compare boolean global "${storyGlobal.name}" against true/false.`;
    }

    if (
      storyGlobal.valueType === "number" &&
      (typeof condition.value !== "number" || !Number.isFinite(condition.value))
    ) {
      return `${label} must compare number global "${storyGlobal.name}" against a finite number.`;
    }

    return null;
  }

  for (let i = 0; i < condition.conditions.length; i++) {
    const childError = getConditionValidationError(
      condition.conditions[i],
      globalsById,
      `${label} (item ${i + 1})`
    );
    if (childError) {
      return childError;
    }
  }

  return null;
}

function validateCondition(
  condition: StoryCondition,
  globalsById: Map<string, StoryGlobal>,
  label: string
): void {
  const error = getConditionValidationError(condition, globalsById, label);
  if (error) {
    throw new Error(error);
  }
}

function getEffectValidationError(
  effect: StoryEffect,
  globalsById: Map<string, StoryGlobal>,
  label: string
): string | null {
  const storyGlobal = globalsById.get(effect.globalId);
  if (!storyGlobal) {
    return `${label} references a missing global "${effect.globalId}".`;
  }

  if (storyGlobal.valueType === "boolean" && effect.operator !== "set") {
    return `${label} cannot use "${effect.operator}" on boolean global "${storyGlobal.name}".`;
  }

  if (
    storyGlobal.valueType === "number" &&
    !["set", "change"].includes(effect.operator)
  ) {
    return `${label} uses an invalid operator for number global "${storyGlobal.name}".`;
  }

  if (storyGlobal.valueType === "boolean" && typeof effect.value !== "boolean") {
    return `${label} must set boolean global "${storyGlobal.name}" to true/false.`;
  }

  if (
    storyGlobal.valueType === "number" &&
    (typeof effect.value !== "number" || !Number.isFinite(effect.value))
  ) {
    return `${label} must use a finite number for global "${storyGlobal.name}".`;
  }

  return null;
}

function validateEffect(
  effect: StoryEffect,
  globalsById: Map<string, StoryGlobal>,
  label: string
): void {
  const error = getEffectValidationError(effect, globalsById, label);
  if (error) {
    throw new Error(error);
  }
}

export function validateStoryProject(input: unknown): StoryProject {
  const parsedProject = storyProjectSchema.parse(input) as StoryProjectInput;
  const migratedProject = migrateProject(parsedProject);
  const project = {
    ...migratedProject,
    globals: normalizeGlobals(migratedProject.globals),
    nodes: migratedProject.nodes.map((node) => normalizeNode(node))
  };
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

  const normalizedGlobalNames = new Set<string>();
  const globalsById = new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal]));

  for (const storyGlobal of project.globals) {
    if (!storyGlobal.name.trim()) {
      throw new Error(`Global "${storyGlobal.id}" must have a name.`);
    }

    const normalizedName = storyGlobal.name.trim().toLowerCase();
    if (normalizedGlobalNames.has(normalizedName)) {
      throw new Error(`Duplicate global name "${storyGlobal.name}" detected.`);
    }
    normalizedGlobalNames.add(normalizedName);

    const defaultValue: unknown = storyGlobal.defaultValue;

    if (storyGlobal.valueType === "boolean" && typeof defaultValue !== "boolean") {
      throw new Error(`Boolean global "${storyGlobal.name}" must use a true/false default value.`);
    }

    if (
      storyGlobal.valueType === "number" &&
      (typeof defaultValue !== "number" || !Number.isFinite(defaultValue))
    ) {
      throw new Error(`Number global "${storyGlobal.name}" must use a finite numeric default value.`);
    }
  }

  for (const node of project.nodes) {
    const choiceIds = new Set<string>();

    for (const choice of node.choices) {
      if (choiceIds.has(choice.id)) {
        throw new Error(`Duplicate choice id "${choice.id}" found in node "${node.id}".`);
      }

      choiceIds.add(choice.id);

      if (choice.visibilityCondition) {
        validateCondition(choice.visibilityCondition, globalsById, `Choice "${choice.id}" visibility`);
      }

      for (const [index, effect] of choice.effects.entries()) {
        validateEffect(effect, globalsById, `Choice "${choice.id}" effect ${index + 1}`);
      }

      if (choice.route.mode === "direct") {
        if (choice.route.targetNodeId && !nodeIds.has(choice.route.targetNodeId)) {
          throw new Error(
            `Choice "${choice.id}" in node "${node.id}" targets missing node "${choice.route.targetNodeId}".`
          );
        }
      } else {
        for (const [index, branch] of choice.route.branches.entries()) {
          validateCondition(branch.condition, globalsById, `Choice "${choice.id}" branch ${index + 1}`);

          if (branch.targetNodeId && !nodeIds.has(branch.targetNodeId)) {
            throw new Error(
              `Choice "${choice.id}" branch ${index + 1} in node "${node.id}" targets missing node "${branch.targetNodeId}".`
            );
          }
        }

        if (
          choice.route.fallbackTargetNodeId &&
          !nodeIds.has(choice.route.fallbackTargetNodeId)
        ) {
          throw new Error(
            `Choice "${choice.id}" fallback in node "${node.id}" targets missing node "${choice.route.fallbackTargetNodeId}".`
          );
        }
      }
    }
  }

  const startTagNodes = project.nodes.filter((node) => node.tags.includes("Start"));

  if (startTagNodes.length > 1) {
    throw new Error('Only one node can use the "Start" tag.');
  }

  if (startTagNodes.length === 1) {
    project.metadata.startNodeId = startTagNodes[0].id;
  } else {
    project.nodes = project.nodes.map((node) =>
      node.id === project.metadata.startNodeId
        ? { ...node, tags: sortNodeTags([...node.tags, "Start"]) }
        : node
    );
  }

  return project;
}

export function serializeProject(project: StoryProject): string {
  return JSON.stringify({ ...project, version: 2 }, null, 2);
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
  const globalIds = new Set<string>();
  const globalNames = new Set<string>();
  const globalsById = new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal]));

  if (!project.metadata.startNodeId) {
    errors.push("Start node is required.");
  } else if (!allNodeIds.has(project.metadata.startNodeId)) {
    errors.push("Start node must reference an existing node.");
  }

  const startTaggedNodes = project.nodes.filter((node) => node.tags.includes("Start"));
  if (startTaggedNodes.length !== 1) {
    errors.push('Exactly one node must have the "Start" tag.');
  } else if (startTaggedNodes[0].id !== project.metadata.startNodeId) {
    errors.push('The "Start" tag must match metadata.startNodeId.');
  }

  for (const storyGlobal of project.globals) {
    if (globalIds.has(storyGlobal.id)) {
      errors.push(`Duplicate global id: ${storyGlobal.id}`);
    }
    globalIds.add(storyGlobal.id);

    const trimmedName = storyGlobal.name.trim();
    if (!trimmedName) {
      errors.push(`Global "${storyGlobal.id}" must have a name.`);
    } else {
      const normalizedName = trimmedName.toLowerCase();
      if (globalNames.has(normalizedName)) {
        errors.push(`Duplicate global name: ${trimmedName}`);
      }
      globalNames.add(normalizedName);
    }

    const defaultValue: unknown = storyGlobal.defaultValue;

    if (storyGlobal.valueType === "boolean" && typeof defaultValue !== "boolean") {
      errors.push(`Global "${trimmedName || storyGlobal.id}" must use a true/false default value.`);
    }

    if (
      storyGlobal.valueType === "number" &&
      (typeof defaultValue !== "number" || !Number.isFinite(defaultValue))
    ) {
      errors.push(`Global "${trimmedName || storyGlobal.id}" must use a finite numeric default value.`);
    }
  }

  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (!nodeColorTokens.includes(node.colorToken)) {
      errors.push(`Invalid node color in node ${node.id}: ${node.colorToken}`);
    }

    const choiceIds = new Set<string>();

    for (const choice of node.choices) {
      if (choiceIds.has(choice.id)) {
        errors.push(`Duplicate choice id in node ${node.id}: ${choice.id}`);
      }
      choiceIds.add(choice.id);

      if (choice.visibilityCondition) {
        appendConditionValidationErrors(
          errors,
          choice.visibilityCondition,
          globalsById,
          `Choice "${choice.text || choice.id}" visibility`
        );
      }

      for (const [index, effect] of choice.effects.entries()) {
        appendEffectValidationErrors(
          errors,
          effect,
          globalsById,
          `Choice "${choice.text || choice.id}" effect ${index + 1}`
        );
      }

      if (choice.route.mode === "direct") {
        if (!choice.route.targetNodeId) {
          errors.push(`Choice "${choice.text || choice.id}" in node "${node.title || node.id}" has no target.`);
        } else if (!allNodeIds.has(choice.route.targetNodeId)) {
          errors.push(`Choice "${choice.text || choice.id}" in node "${node.title || node.id}" points to a missing node.`);
        }
      } else {
        if (!choice.route.fallbackTargetNodeId) {
          errors.push(`Conditional choice "${choice.text || choice.id}" in node "${node.title || node.id}" needs an else target.`);
        } else if (!allNodeIds.has(choice.route.fallbackTargetNodeId)) {
          errors.push(`Conditional choice "${choice.text || choice.id}" in node "${node.title || node.id}" points else to a missing node.`);
        }

        choice.route.branches.forEach((branch, index) => {
          appendConditionValidationErrors(
            errors,
            branch.condition,
            globalsById,
            `Choice "${choice.text || choice.id}" branch ${index + 1}`
          );

          if (!branch.targetNodeId) {
            errors.push(`Choice "${choice.text || choice.id}" branch ${index + 1} in node "${node.title || node.id}" has no target.`);
          } else if (!allNodeIds.has(branch.targetNodeId)) {
            errors.push(`Choice "${choice.text || choice.id}" branch ${index + 1} in node "${node.title || node.id}" points to a missing node.`);
          }
        });
      }
    }
  }

  return errors;
}

function appendConditionValidationErrors(
  errors: string[],
  condition: StoryCondition,
  globalsById: Map<string, StoryGlobal>,
  label: string
): void {
  if (condition.type === "all" || condition.type === "any") {
    for (let i = 0; i < condition.conditions.length; i++) {
      appendConditionValidationErrors(
        errors,
        condition.conditions[i],
        globalsById,
        `${label} (item ${i + 1})`
      );
    }
    return;
  }

  const error = getConditionValidationError(condition, globalsById, label);
  if (error) {
    errors.push(error);
  }
}

function appendEffectValidationErrors(
  errors: string[],
  effect: StoryEffect,
  globalsById: Map<string, StoryGlobal>,
  label: string
): void {
  const error = getEffectValidationError(effect, globalsById, label);
  if (error) {
    errors.push(error);
  }
}

export function getNodeById(project: StoryProject, nodeId: string): StoryNode | undefined {
  return project.nodes.find((node) => node.id === nodeId);
}

export function getChoiceBySelection(project: StoryProject, selection: ChoiceSelection): StoryChoice | undefined {
  return getNodeById(project, selection.nodeId)?.choices.find((choice) => choice.id === selection.choiceId);
}

export function getGlobalById(project: StoryProject, globalId: string): StoryGlobal | undefined {
  return project.globals.find((storyGlobal) => storyGlobal.id === globalId);
}

export function isGlobalReferenced(project: StoryProject, globalId: string): boolean {
  return project.nodes.some((node) =>
    node.choices.some((choice) => getChoiceReferencedGlobalIds(choice).includes(globalId))
  );
}

export function createConditionForGlobal(storyGlobal: StoryGlobal | undefined): StoryCondition | null {
  if (!storyGlobal) {
    return null;
  }

  return createDefaultCondition(storyGlobal);
}

export function normalizeAtomicCondition(
  condition: StoryAtomicCondition,
  storyGlobal: StoryGlobal | undefined
): StoryAtomicCondition | null {
  if (!storyGlobal) {
    return null;
  }

  const operator = getAllowedOperators(storyGlobal.valueType).includes(condition.operator)
    ? condition.operator
    : "eq";

  return {
    type: "atomic",
    globalId: storyGlobal.id,
    operator,
    value: coerceConditionValue(storyGlobal.valueType, condition.value)
  };
}

export function normalizeCondition(
  condition: StoryCondition,
  globals: StoryGlobal[]
): StoryCondition | null {
  if (condition.type === "atomic") {
    const storyGlobal = globals.find((g) => g.id === condition.globalId);
    if (!storyGlobal) {
      return null;
    }
    return normalizeAtomicCondition(condition, storyGlobal);
  }

  const normalizedChildren = condition.conditions
    .map((child) => normalizeCondition(child, globals))
    .filter((child): child is StoryCondition => child !== null);

  return {
    type: condition.type,
    conditions: normalizedChildren
  };
}

export function fileNameFromTitle(title: string): string {
  const safeTitle = title
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeTitle || "story-project"}.json`;
}
