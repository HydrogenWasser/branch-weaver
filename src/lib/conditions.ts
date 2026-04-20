import type {
  ConditionOperator,
  GlobalValueType,
  StoryAtomicCondition,
  StoryChoice,
  StoryChoiceRoute,
  StoryCompositeCondition,
  StoryCondition,
  StoryEffect,
  StoryGlobal
} from "../types/story";

export const BOOLEAN_CONDITION_OPERATORS: ConditionOperator[] = ["eq", "neq"];
export const NUMBER_CONDITION_OPERATORS: ConditionOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte"];

export function getAllowedOperators(valueType: GlobalValueType): ConditionOperator[] {
  return valueType === "boolean" ? BOOLEAN_CONDITION_OPERATORS : NUMBER_CONDITION_OPERATORS;
}

export function isOperatorAllowed(valueType: GlobalValueType, operator: ConditionOperator): boolean {
  return getAllowedOperators(valueType).includes(operator);
}

export function getDefaultValueForGlobalType(valueType: GlobalValueType): boolean | number {
  return valueType === "boolean" ? false : 0;
}

export function coerceConditionValue(
  valueType: GlobalValueType,
  value: boolean | number | undefined
): boolean | number {
  if (valueType === "boolean") {
    return value === true;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function createDefaultCondition(storyGlobal: StoryGlobal): StoryAtomicCondition {
  return {
    type: "atomic",
    globalId: storyGlobal.id,
    operator: "eq",
    value: storyGlobal.valueType === "boolean" ? false : 0
  };
}

export function createCompositeCondition(type: "all" | "any"): StoryCompositeCondition {
  return { type, conditions: [] };
}

function compareValues(operator: ConditionOperator, left: boolean | number, right: boolean | number): boolean {
  switch (operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: StoryCondition,
  globalsById: Map<string, StoryGlobal>,
  values: Map<string, boolean | number>
): boolean {
  if (condition.type === "atomic") {
    const storyGlobal = globalsById.get(condition.globalId);
    if (!storyGlobal) {
      return false;
    }

    const currentValue = values.get(condition.globalId) ?? storyGlobal.defaultValue;
    return compareValues(condition.operator, currentValue, condition.value);
  }

  if (condition.type === "all") {
    return condition.conditions.every((child) =>
      evaluateCondition(child, globalsById, values)
    );
  }

  return condition.conditions.some((child) =>
    evaluateCondition(child, globalsById, values)
  );
}

export function isChoiceVisible(
  choice: StoryChoice,
  globalsById: Map<string, StoryGlobal>,
  values: Map<string, boolean | number>
): boolean {
  return choice.visibilityCondition
    ? evaluateCondition(choice.visibilityCondition, globalsById, values)
    : true;
}

export function resolveChoiceTargetNodeId(
  choice: StoryChoice,
  globalsById: Map<string, StoryGlobal>,
  values: Map<string, boolean | number>
): string | null {
  if (choice.route.mode === "direct") {
    return choice.route.targetNodeId;
  }

  const matchedBranch = choice.route.branches.find((branch) =>
    evaluateCondition(branch.condition, globalsById, values)
  );

  return matchedBranch?.targetNodeId ?? choice.route.fallbackTargetNodeId;
}

export function getChoiceRouteTargets(route: StoryChoiceRoute): string[] {
  if (route.mode === "direct") {
    return route.targetNodeId ? [route.targetNodeId] : [];
  }

  return [
    ...route.branches.map((branch) => branch.targetNodeId).filter((targetNodeId): targetNodeId is string => Boolean(targetNodeId)),
    ...(route.fallbackTargetNodeId ? [route.fallbackTargetNodeId] : [])
  ];
}

export function getChoiceReferencedGlobalIds(choice: StoryChoice): string[] {
  const ids = new Set<string>();

  function collectFromCondition(condition: StoryCondition): void {
    if (condition.type === "atomic") {
      ids.add(condition.globalId);
    } else {
      for (const child of condition.conditions) {
        collectFromCondition(child);
      }
    }
  }

  if (choice.visibilityCondition) {
    collectFromCondition(choice.visibilityCondition);
  }

  for (const effect of choice.effects) {
    ids.add(effect.globalId);
  }

  if (choice.route.mode === "conditional") {
    for (const branch of choice.route.branches) {
      collectFromCondition(branch.condition);
    }
  }

  return [...ids];
}

export function applyEffects(
  effects: StoryEffect[],
  globalsById: Map<string, StoryGlobal>,
  values: Map<string, boolean | number>
): void {
  for (const effect of effects) {
    const storyGlobal = globalsById.get(effect.globalId);
    if (!storyGlobal) {
      continue;
    }

    if (storyGlobal.valueType === "boolean" && typeof effect.value === "boolean") {
      values.set(effect.globalId, effect.value);
    } else if (storyGlobal.valueType === "number" && typeof effect.value === "number" && Number.isFinite(effect.value)) {
      if (effect.operator === "change") {
        const current = values.get(effect.globalId) ?? storyGlobal.defaultValue;
        const currentNumber = typeof current === "number" ? current : 0;
        values.set(effect.globalId, currentNumber + effect.value);
      } else {
        values.set(effect.globalId, effect.value);
      }
    }
  }
}

export function replaceRouteTargetNodeId(route: StoryChoiceRoute, removedNodeId: string): StoryChoiceRoute {
  if (route.mode === "direct") {
    return {
      ...route,
      targetNodeId: route.targetNodeId === removedNodeId ? null : route.targetNodeId
    };
  }

  return {
    ...route,
    branches: route.branches.map((branch) => ({
      ...branch,
      targetNodeId: branch.targetNodeId === removedNodeId ? null : branch.targetNodeId
    })),
    fallbackTargetNodeId:
      route.fallbackTargetNodeId === removedNodeId ? null : route.fallbackTargetNodeId
  };
}

export function formatOperatorLabel(operator: ConditionOperator): string {
  switch (operator) {
    case "eq":
      return "=";
    case "neq":
      return "!=";
    case "gt":
      return ">";
    case "gte":
      return ">=";
    case "lt":
      return "<";
    case "lte":
      return "<=";
    default:
      return operator;
  }
}

export function formatConditionSummary(
  condition: StoryCondition,
  globalsById: Map<string, StoryGlobal>
): string {
  if (condition.type === "atomic") {
    const storyGlobal = globalsById.get(condition.globalId);
    const label = storyGlobal?.name || "Unknown";

    if (storyGlobal?.valueType === "boolean") {
      const expectation = condition.value === true ? "true" : "false";
      return condition.operator === "neq" ? `${label} is not ${expectation}` : `${label} is ${expectation}`;
    }

    return `${label} ${formatOperatorLabel(condition.operator)} ${condition.value}`;
  }

  const operatorLabel = condition.type === "all" ? "AND" : "OR";
  if (condition.conditions.length === 0) {
    return condition.type === "all" ? "(always true)" : "(always false)";
  }

  const parts = condition.conditions.map((child) => formatConditionSummary(child, globalsById));
  return `(${parts.join(` ${operatorLabel} `)})`;
}

export function formatEffectsSummary(choice: StoryChoice, globalsById: Map<string, StoryGlobal>): string | null {
  if (choice.effects.length === 0) {
    return null;
  }

  const labels = choice.effects.map((effect) => {
    const storyGlobal = globalsById.get(effect.globalId);
    const name = storyGlobal?.name || "Unknown";
    if (storyGlobal?.valueType === "number" && effect.operator === "change") {
      const numValue = effect.value as number;
      const sign = numValue >= 0 ? "+" : "";
      return `${name} ${sign}${numValue}`;
    }
    return `${name} = ${effect.value}`;
  });

  return `Sets ${labels.join(", ")}`;
}

export function formatChoiceSummary(choice: StoryChoice, globalsById: Map<string, StoryGlobal>): string | null {
  const parts: string[] = [];

  if (choice.visibilityCondition) {
    parts.push(`Visible if ${formatConditionSummary(choice.visibilityCondition, globalsById)}`);
  }

  const effectsSummary = formatEffectsSummary(choice, globalsById);
  if (effectsSummary) {
    parts.push(effectsSummary);
  }

  if (choice.route.mode === "conditional") {
    parts.push(`${choice.route.branches.length} rule${choice.route.branches.length === 1 ? "" : "s"} + else`);
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}
