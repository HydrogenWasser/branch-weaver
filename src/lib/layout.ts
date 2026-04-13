import dagre from "@dagrejs/dagre";
import type { StoryNode, StoryProject, XYPosition } from "../types/story";

const NODE_WIDTH = 260;
const BASE_NODE_HEIGHT = 132;
const CHOICE_HEIGHT = 34;
const BODY_LINE_HEIGHT = 18;
const CHARS_PER_LINE = 34;
const TAG_ROW_HEIGHT = 28;

function estimateNodeHeight(node: StoryNode): number {
  const bodyLines = Math.max(1, Math.ceil((node.body.trim().length || 1) / CHARS_PER_LINE));
  const tagHeight = node.tags.length > 0 ? TAG_ROW_HEIGHT : 0;
  return BASE_NODE_HEIGHT + tagHeight + node.choices.length * CHOICE_HEIGHT + bodyLines * BODY_LINE_HEIGHT;
}

function buildStableNodeOrder(project: StoryProject): string[] {
  const visited = new Set<string>();
  const orderedIds: string[] = [];
  const queue = [project.metadata.startNodeId];
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    orderedIds.push(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }

    for (const choice of node.choices) {
      if (choice.targetNodeId && !visited.has(choice.targetNodeId)) {
        queue.push(choice.targetNodeId);
      }
    }
  }

  const remainingNodes = project.nodes
    .filter((node) => !visited.has(node.id))
    .sort((left, right) => {
      const leftLabel = (left.title || left.id).toLowerCase();
      const rightLabel = (right.title || right.id).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });

  for (const node of remainingNodes) {
    orderedIds.push(node.id);
  }

  return orderedIds;
}

export function buildAutoLayout(project: StoryProject): Record<string, XYPosition> {
  const graph = new dagre.graphlib.Graph();

  graph.setGraph({
    rankdir: "LR",
    nodesep: 48,
    ranksep: 132,
    marginx: 32,
    marginy: 32,
    ranker: "network-simplex"
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const stableOrder = buildStableNodeOrder(project);
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));

  for (const nodeId of stableOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }

    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateNodeHeight(node)
    });
  }

  for (const node of project.nodes) {
    for (const choice of node.choices) {
      if (!choice.targetNodeId) {
        continue;
      }

      graph.setEdge(node.id, choice.targetNodeId);
    }
  }

  dagre.layout(graph);

  const positions: Record<string, XYPosition> = {};

  for (const node of project.nodes) {
    const layoutNode = graph.node(node.id);
    if (!layoutNode) {
      positions[node.id] = node.position;
      continue;
    }

    positions[node.id] = {
      x: Math.round(layoutNode.x - layoutNode.width / 2),
      y: Math.round(layoutNode.y - layoutNode.height / 2)
    };
  }

  return positions;
}
