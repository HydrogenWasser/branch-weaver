import type { StoryNode } from "../types/story";

export type StoryMapGroup = {
  name: string;
  nodes: StoryNode[];
};

export const STORY_MAP_PRIORITY_GROUPS = ["Start", "End", "Core"] as const;

export function compareStoryMapNodes(left: StoryNode, right: StoryNode): number {
  const leftIsStart = left.tags.includes("Start");
  const rightIsStart = right.tags.includes("Start");

  if (leftIsStart !== rightIsStart) {
    return leftIsStart ? -1 : 1;
  }

  const leftTitle = (left.title || "Untitled Node").trim();
  const rightTitle = (right.title || "Untitled Node").trim();
  const titleComparison = leftTitle.localeCompare(rightTitle, undefined, {
    numeric: true,
    sensitivity: "base"
  });

  if (titleComparison !== 0) {
    return titleComparison;
  }

  return left.id.localeCompare(right.id);
}

export function getStoryMapGroupNames(node: StoryNode): string[] {
  return node.tags.length > 0 ? node.tags : ["Untagged"];
}

export function buildStoryMapGroups(nodes: StoryNode[]): StoryMapGroup[] {
  const groups = new Map<string, StoryNode[]>();

  for (const node of nodes) {
    for (const groupName of getStoryMapGroupNames(node)) {
      const existingGroup = groups.get(groupName);
      if (existingGroup) {
        existingGroup.push(node);
      } else {
        groups.set(groupName, [node]);
      }
    }
  }

  const orderedNames = [
    ...STORY_MAP_PRIORITY_GROUPS.filter((groupName) => groups.has(groupName)),
    ...[...groups.keys()]
      .filter((groupName) => !STORY_MAP_PRIORITY_GROUPS.includes(groupName as (typeof STORY_MAP_PRIORITY_GROUPS)[number]) && groupName !== "Untagged")
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })),
    ...(groups.has("Untagged") ? ["Untagged"] : [])
  ];

  return orderedNames.map((name) => ({
    name,
    nodes: [...(groups.get(name) ?? [])].sort(compareStoryMapNodes)
  }));
}
