export function normalizeNodeTag(tag: string): string {
  const compact = tag.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }

  const lower = compact.toLowerCase();
  if (lower === "start") {
    return "Start";
  }
  if (lower === "end") {
    return "End";
  }
  if (lower === "core") {
    return "Core";
  }

  return compact;
}

export function sortNodeTags(tags: string[]): string[] {
  const priority = new Map([
    ["Start", 0],
    ["Core", 1],
    ["End", 2]
  ]);

  return [...tags].sort((left, right) => {
    const leftPriority = priority.get(left) ?? 99;
    const rightPriority = priority.get(right) ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });
}
