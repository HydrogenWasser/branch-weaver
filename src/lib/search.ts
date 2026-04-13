import type { StoryProject } from "../types/story";

export type NodeSearchIndexEntry = {
  nodeId: string;
  title: string;
  body: string;
  choices: string[];
  normalizedTitle: string;
  normalizedBody: string;
  normalizedChoices: string[];
};

export type NodeSearchResult = {
  nodeId: string;
  title: string;
  excerpt: string;
  locationLabel: string;
  score: number;
};

function normalize(value: string): string {
  return value.toLowerCase();
}

function trimExcerpt(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function createExcerpt(entry: NodeSearchIndexEntry, terms: string[]): Pick<NodeSearchResult, "excerpt" | "locationLabel"> {
  if (terms.some((term) => entry.normalizedTitle.includes(term))) {
    return {
      excerpt: trimExcerpt(entry.title || "Untitled Node"),
      locationLabel: "Title"
    };
  }

  const matchedChoice = entry.choices.find((choice) => terms.some((term) => choice.toLowerCase().includes(term)));
  if (matchedChoice) {
    return {
      excerpt: trimExcerpt(matchedChoice),
      locationLabel: "Choice"
    };
  }

  if (entry.body.trim()) {
    return {
      excerpt: trimExcerpt(entry.body),
      locationLabel: "Body"
    };
  }

  return {
    excerpt: "Empty scene",
    locationLabel: "Node"
  };
}

export function buildNodeSearchIndex(project: StoryProject): NodeSearchIndexEntry[] {
  return project.nodes.map((node) => ({
    nodeId: node.id,
    title: node.title || "Untitled Node",
    body: node.body,
    choices: node.choices.map((choice) => choice.text).filter(Boolean),
    normalizedTitle: normalize(node.title || ""),
    normalizedBody: normalize(node.body),
    normalizedChoices: node.choices.map((choice) => normalize(choice.text))
  }));
}

export function searchNodeIndex(index: NodeSearchIndexEntry[], query: string): NodeSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const terms = [...new Set(normalize(trimmed).split(/\s+/).filter(Boolean))];

  return index
    .map((entry) => {
      let score = 0;

      for (const term of terms) {
        const inTitle = entry.normalizedTitle.includes(term);
        const inBody = entry.normalizedBody.includes(term);
        const inChoices = entry.normalizedChoices.some((choice) => choice.includes(term));

        if (!inTitle && !inBody && !inChoices) {
          return null;
        }

        if (inTitle) {
          score += 10;
        }
        if (inChoices) {
          score += 6;
        }
        if (inBody) {
          score += 3;
        }
      }

      return {
        nodeId: entry.nodeId,
        title: entry.title,
        score,
        ...createExcerpt(entry, terms)
      };
    })
    .filter((result): result is NodeSearchResult => result !== null)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
