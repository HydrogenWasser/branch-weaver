import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import ReactFlow, {
  Background,
  MarkerType,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { formatChoiceSummary, formatConditionSummary } from "../lib/conditions";
import { getNodeMiniMapColor } from "../lib/nodeAppearance";
import { useEditorStore } from "../store/editorStore";
import type { EditorSelection, StoryChoice, StoryGlobal, StoryNode, XYPosition } from "../types/story";
import MiniMapNode from "./MiniMapNode";
import StoryNodeCard, { type StoryNodeData } from "./StoryNodeCard";

type CanvasGraphProps = {
  fitRequest: number;
  focusRequest: number;
  focusNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onFitReady: (fit: () => void) => void;
  onViewportCenterReady: (getViewportCenter: () => XYPosition | null) => void;
  onRequestFocusNode: (nodeId: string) => void;
  onRequestEditChoice: (nodeId: string, choiceId: string) => void;
};

const nodeTypes = {
  storyNode: StoryNodeCard
};

const MINIMAP_DENSE_THRESHOLD = 60;
const MINIMAP_OVERLOADED_THRESHOLD = 120;

type MiniMapMode = "normal" | "dense" | "overloaded";
type MiniMapNodeCategory = "selected" | "search" | "adjacent" | "normal";

function buildEdgeId(nodeId: string, choiceId: string, variant = "direct"): string {
  return `${nodeId}::${choiceId}::${variant}`;
}

function parseEdgeId(edgeId: string): { nodeId: string; choiceId: string } | null {
  const [nodeId, choiceId] = edgeId.split("::");
  return nodeId && choiceId ? { nodeId, choiceId } : null;
}

function getMiniMapMode(nodeCount: number): MiniMapMode {
  if (nodeCount > MINIMAP_OVERLOADED_THRESHOLD) {
    return "overloaded";
  }

  if (nodeCount > MINIMAP_DENSE_THRESHOLD) {
    return "dense";
  }

  return "normal";
}

function collectChoiceTargets(choice: StoryChoice): string[] {
  if (choice.route.mode === "direct") {
    return choice.route.targetNodeId ? [choice.route.targetNodeId] : [];
  }

  const branchTargets = choice.route.branches.flatMap((branch) =>
    branch.targetNodeId ? [branch.targetNodeId] : []
  );

  return choice.route.fallbackTargetNodeId
    ? [...branchTargets, choice.route.fallbackTargetNodeId]
    : branchTargets;
}

function getBodyPreview(body: string): string {
  const excerpt = body.trim() || "Empty scene";
  return excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt;
}

function buildChoiceRenderSignature(choice: StoryChoice, summary: string | null): string {
  if (choice.route.mode === "direct") {
    return [
      choice.id,
      choice.text,
      summary ?? "",
      choice.route.targetNodeId ?? "",
      "direct"
    ].join("::");
  }

  return [
    choice.id,
    choice.text,
    summary ?? "",
    choice.route.fallbackTargetNodeId ?? "",
    choice.route.branches.length.toString(),
    "conditional"
  ].join("::");
}

function buildNodeData(
  storyNode: StoryNode,
  globalsById: Map<string, StoryGlobal>,
  isSearchMatch: boolean
): StoryNodeData {
  const choiceRows = storyNode.choices.map((choice) => {
    const summary = formatChoiceSummary(choice, globalsById);
    return {
      id: choice.id,
      text: choice.text,
      summary,
      previewTargetNodeId:
        choice.route.mode === "direct" ? choice.route.targetNodeId : choice.route.fallbackTargetNodeId,
      isConnectable: choice.route.mode === "direct"
    };
  });
  const layoutSignature = [
    storyNode.title,
    storyNode.body,
    storyNode.tags.join("\u0001"),
    choiceRows.map((choice) => `${choice.id}:${choice.text}:${choice.summary ?? ""}`).join("\u0002")
  ].join("\u0000");
  const renderSignature = [
    layoutSignature,
    storyNode.colorToken,
    choiceRows.map((choice, index) => buildChoiceRenderSignature(storyNode.choices[index], choice.summary)).join("\u0002")
  ].join("\u0000");

  return {
    nodeId: storyNode.id,
    title: storyNode.title,
    bodyPreview: getBodyPreview(storyNode.body),
    tags: storyNode.tags,
    colorToken: storyNode.colorToken,
    choiceRows,
    layoutSignature,
    renderSignature,
    isSearchMatch,
    selectedChoiceId: null,
    onNodeBodyClick: () => undefined,
    onNodeBodyDoubleClick: () => undefined,
    onChoiceClick: () => undefined,
    onChoiceDoubleClick: () => undefined
  };
}

function buildAdjacentNodeIds(nodes: StoryNode[], selectedNodeId: string | null): Set<string> {
  if (!selectedNodeId) {
    return new Set<string>();
  }

  const adjacentNodeIds = new Set<string>();

  for (const storyNode of nodes) {
    if (storyNode.id === selectedNodeId) {
      for (const choice of storyNode.choices) {
        for (const targetNodeId of collectChoiceTargets(choice)) {
          adjacentNodeIds.add(targetNodeId);
        }
      }
      continue;
    }

    for (const choice of storyNode.choices) {
      if (collectChoiceTargets(choice).includes(selectedNodeId)) {
        adjacentNodeIds.add(storyNode.id);
        break;
      }
    }
  }

  adjacentNodeIds.delete(selectedNodeId);
  return adjacentNodeIds;
}

function applySelectionToNodes(nodes: Node[], selection: EditorSelection): Node[] {
  const selectedNodeId = selection?.type === "node" ? selection.nodeId : null;
  const selectedChoiceNodeId = selection?.type === "choice" ? selection.nodeId : null;
  const selectedChoiceId = selection?.type === "choice" ? selection.choiceId : null;
  let hasChanges = false;

  const nextNodes = nodes.map((node) => {
    const nextSelected = node.id === selectedNodeId;
    const nextSelectedChoiceId = node.id === selectedChoiceNodeId ? selectedChoiceId : null;

    if (node.selected === nextSelected && node.data.selectedChoiceId === nextSelectedChoiceId) {
      return node;
    }

    hasChanges = true;
    return {
      ...node,
      selected: nextSelected,
      data: {
        ...node.data,
        selectedChoiceId: nextSelectedChoiceId
      }
    };
  });

  return hasChanges ? nextNodes : nodes;
}

function applyDragPreviewToNodes(
  nodes: Node[],
  dragPreviewPositions: Record<string, XYPosition>
): Node[] {
  const previewIds = Object.keys(dragPreviewPositions);
  if (previewIds.length === 0) {
    return nodes;
  }

  let hasChanges = false;
  const nextNodes = nodes.map((node) => {
    const previewPosition = dragPreviewPositions[node.id];
    if (
      !previewPosition ||
      (node.position.x === previewPosition.x && node.position.y === previewPosition.y)
    ) {
      return node;
    }

    hasChanges = true;
    return {
      ...node,
      position: previewPosition
    };
  });

  return hasChanges ? nextNodes : nodes;
}

function applySelectionToEdges(edges: Edge[], selection: EditorSelection): Edge[] {
  const selectedNodeId = selection?.type === "choice" ? selection.nodeId : null;
  const selectedChoiceId = selection?.type === "choice" ? selection.choiceId : null;
  let hasChanges = false;

  const nextEdges = edges.map((edge) => {
    const parsed = parseEdgeId(edge.id);
    const nextSelected =
      parsed !== null &&
      parsed.nodeId === selectedNodeId &&
      parsed.choiceId === selectedChoiceId;

    if (edge.selected === nextSelected) {
      return edge;
    }

    hasChanges = true;
    return { ...edge, selected: nextSelected };
  });

  return hasChanges ? nextEdges : edges;
}

function getMiniMapNodeCategory(
  nodeId: string,
  selectedNodeId: string | null,
  highlightedNodeIds: Set<string>,
  adjacentNodeIds: Set<string>
): MiniMapNodeCategory {
  if (nodeId === selectedNodeId) {
    return "selected";
  }

  if (highlightedNodeIds.has(nodeId)) {
    return "search";
  }

  if (adjacentNodeIds.has(nodeId)) {
    return "adjacent";
  }

  return "normal";
}

export default function CanvasGraph({
  fitRequest,
  focusRequest,
  focusNodeId,
  highlightedNodeIds,
  onFitReady,
  onViewportCenterReady,
  onRequestFocusNode,
  onRequestEditChoice
}: CanvasGraphProps) {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const [dragPreviewPositions, setDragPreviewPositions] = useState<Record<string, XYPosition>>({});
  const nodes = useEditorStore((state) => state.project.nodes);
  const globals = useEditorStore((state) => state.project.globals);
  const selection = useEditorStore((state) => state.selection);
  const setSelection = useEditorStore((state) => state.setSelection);
  const moveNode = useEditorStore((state) => state.moveNode);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const selectedNodeId = selection?.type === "choice" ? selection.nodeId : selection?.nodeId ?? null;
  const nodePositionsById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node.position])),
    [nodes]
  );
  const miniMapMode = useMemo(() => getMiniMapMode(nodes.length), [nodes.length]);
  const miniMapClassName = useMemo(
    () =>
      `story-minimap${miniMapMode === "overloaded" ? " story-minimap--overview-only" : ""}${
        miniMapMode === "dense" ? " story-minimap--dense" : ""
      }`,
    [miniMapMode]
  );
  const adjacentNodeIds = useMemo(
    () => buildAdjacentNodeIds(nodes, selectedNodeId),
    [nodes, selectedNodeId]
  );
  const globalsById = useMemo(() => new Map(globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])), [globals]);
  const handleNodeBodyClick = useCallback((nodeId: string) => {
    setSelection({ type: "node", nodeId });
  }, [setSelection]);
  const handleNodeBodyDoubleClick = useCallback((nodeId: string) => {
    onRequestFocusNode(nodeId);
  }, [onRequestFocusNode]);
  const handleChoiceClick = useCallback((nodeId: string, choiceId: string) => {
    setSelection({ type: "choice", nodeId, choiceId });
  }, [setSelection]);
  const handleChoiceDoubleClick = useCallback((
    nodeId: string,
    choiceId: string
  ) => {
    onRequestEditChoice(nodeId, choiceId);
  }, [onRequestEditChoice]);

  const projectNodes = useMemo<Node[]>(
    () =>
      nodes.map((storyNode) => ({
        id: storyNode.id,
        type: "storyNode",
        position: storyNode.position,
        selected: false,
        data: {
          ...buildNodeData(storyNode, globalsById, highlightedNodeIds.has(storyNode.id)),
          onNodeBodyClick: handleNodeBodyClick,
          onNodeBodyDoubleClick: handleNodeBodyDoubleClick,
          onChoiceClick: handleChoiceClick,
          onChoiceDoubleClick: handleChoiceDoubleClick
        } satisfies StoryNodeData
      })),
    [
      handleChoiceClick,
      handleChoiceDoubleClick,
      handleNodeBodyClick,
      handleNodeBodyDoubleClick,
      globalsById,
      highlightedNodeIds,
      nodes
    ]
  );
  const dragPreviewNodes = useMemo(
    () => applyDragPreviewToNodes(projectNodes, dragPreviewPositions),
    [dragPreviewPositions, projectNodes]
  );
  const selectedCanvasNodes = useMemo(
    () => applySelectionToNodes(dragPreviewNodes, selection),
    [dragPreviewNodes, selection]
  );

  const projectEdges = useMemo<Edge[]>(
    () =>
      nodes.flatMap((storyNode) =>
        storyNode.choices.flatMap((choice) => {
          if (choice.route.mode === "direct") {
            return choice.route.targetNodeId
              ? [
                  {
                    id: buildEdgeId(storyNode.id, choice.id, "direct"),
                    source: storyNode.id,
                    sourceHandle: choice.id,
                    target: choice.route.targetNodeId,
                    selected: false,
                    markerEnd: { type: MarkerType.ArrowClosed },
                    label: "",
                    style: { stroke: "#9f7655" },
                    labelStyle: { fill: "#6b5440", fontSize: 11, fontWeight: 600 }
                  }
                ]
              : [];
          }

          const branchEdges = choice.route.branches
            .filter((branch) => branch.targetNodeId)
            .map((branch, index) => ({
              id: buildEdgeId(storyNode.id, choice.id, `branch-${index}`),
              source: storyNode.id,
              sourceHandle: choice.id,
              target: branch.targetNodeId!,
              selected: false,
              markerEnd: { type: MarkerType.ArrowClosed },
              label: `${index === 0 ? "if" : "elif"} ${formatConditionSummary(branch.condition, globalsById)}`,
              style: { strokeDasharray: "6 4", stroke: "#8c7055" },
              labelStyle: { fill: "#6b5440", fontSize: 11, fontWeight: 600 }
            }));

          const fallbackEdge = choice.route.fallbackTargetNodeId
            ? [
                {
                  id: buildEdgeId(storyNode.id, choice.id, "else"),
                  source: storyNode.id,
                  sourceHandle: choice.id,
                  target: choice.route.fallbackTargetNodeId,
                  selected: false,
                  markerEnd: { type: MarkerType.ArrowClosed },
                  label: "else",
                  style: { stroke: "#b2723a" },
                  labelStyle: { fill: "#7a5630", fontSize: 11, fontWeight: 700 }
                }
              ]
            : [];

          return [...branchEdges, ...fallbackEdge];
        })
      ),
    [globalsById, nodes]
  );
  const selectedEdges = useMemo(
    () => applySelectionToEdges(projectEdges, selection),
    [projectEdges, selection]
  );

  const fitGraph = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 200 });
  }, []);
  const getViewportCenter = useCallback((): XYPosition | null => {
    const instance = reactFlowRef.current;
    const wrapper = canvasWrapperRef.current;

    if (!instance || !wrapper || !instance.viewportInitialized) {
      return null;
    }

    const bounds = wrapper.getBoundingClientRect();
    return instance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2
    });
  }, []);

  useEffect(() => {
    if (fitRequest > 0) {
      fitGraph();
    }
  }, [fitGraph, fitRequest]);

  useEffect(() => {
    onViewportCenterReady(getViewportCenter);
  }, [getViewportCenter, onViewportCenterReady]);

  useEffect(() => {
    if (focusRequest <= 0 || !focusNodeId || !reactFlowRef.current) {
      return;
    }

    const targetNode = reactFlowRef.current.getNode(focusNodeId);
    if (!targetNode) {
      return;
    }

    reactFlowRef.current.setCenter(
      targetNode.position.x + (targetNode.width ?? 260) / 2,
      targetNode.position.y + (targetNode.height ?? 180) / 2,
      { zoom: 1.15, duration: 240 }
    );
  }, [focusNodeId, focusRequest]);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance;
    onFitReady(() => instance.fitView({ padding: 0.2, duration: 200 }));
  }, [onFitReady]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.sourceHandle || !connection.target) {
      return;
    }

    connectChoice(
      {
        nodeId: connection.source,
        choiceId: connection.sourceHandle
      },
      connection.target
    );
  }, [connectChoice]);

  const handlePaneClick = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  const handleNodeDrag = useCallback((_: unknown, node: Node) => {
    setDragPreviewPositions((current) => {
      const existing = current[node.id];
      if (existing && existing.x === node.position.x && existing.y === node.position.y) {
        return current;
      }

      return {
        ...current,
        [node.id]: {
          x: node.position.x,
          y: node.position.y
        }
      };
    });
  }, []);

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    setDragPreviewPositions((current) => {
      if (!(node.id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[node.id];
      return next;
    });

    const currentNodePosition = nodePositionsById.get(node.id);
    if (
      !currentNodePosition ||
      (currentNodePosition.x === node.position.x && currentNodePosition.y === node.position.y)
    ) {
      return;
    }
    moveNode(node.id, node.position);
  }, [moveNode, nodePositionsById]);

  useEffect(() => {
    setDragPreviewPositions((current) => {
      const activeNodeIds = new Set(nodes.map((node) => node.id));
      const nextEntries = Object.entries(current).filter(([nodeId]) => activeNodeIds.has(nodeId));

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [nodes]);

  const handleEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const parsed = parseEdgeId(edge.id);
    if (parsed) {
      setSelection({ type: "choice", nodeId: parsed.nodeId, choiceId: parsed.choiceId });
    }
  }, [setSelection]);

  const handleEdgeDoubleClick = useCallback((_: unknown, edge: Edge) => {
    if (edge.target) {
      onRequestFocusNode(edge.target);
    }
  }, [onRequestFocusNode]);

  const miniMapNodeColor = useCallback((node: Node) => {
    const category = getMiniMapNodeCategory(node.id, selectedNodeId, highlightedNodeIds, adjacentNodeIds);

    if (category === "selected") {
      return "#f4d2ad";
    }

    if (category === "search") {
      return "#d68e3f";
    }

    if (category === "adjacent") {
      return "#ead7bd";
    }

    return getNodeMiniMapColor(node.data.colorToken);
  }, [adjacentNodeIds, highlightedNodeIds, selectedNodeId]);

  const miniMapNodeStrokeColor = useCallback((node: Node) => {
    const category = getMiniMapNodeCategory(node.id, selectedNodeId, highlightedNodeIds, adjacentNodeIds);

    if (category === "selected") {
      return "#7b4520";
    }

    if (category === "search") {
      return "#b5641f";
    }

    if (category === "adjacent") {
      return "#8b6d50";
    }

    if (miniMapMode === "normal") {
      return "rgba(106, 77, 51, 0.34)";
    }

    if (miniMapMode === "dense") {
      return "rgba(106, 77, 51, 0.14)";
    }

    return "rgba(106, 77, 51, 0.1)";
  }, [adjacentNodeIds, highlightedNodeIds, miniMapMode, selectedNodeId]);

  const miniMapNodeClassName = useCallback((node: Node) => {
    const category = getMiniMapNodeCategory(node.id, selectedNodeId, highlightedNodeIds, adjacentNodeIds);
    const classNames = [
      "story-minimap__node",
      `story-minimap__node--${miniMapMode}`,
      `story-minimap__node--${category}`
    ];

    if (miniMapMode === "dense" && category === "normal") {
      classNames.push("story-minimap__node--muted");
    }

    if (miniMapMode === "overloaded" && category === "normal") {
      classNames.push("story-minimap__node--dot");
    }

    return classNames.join(" ");
  }, [adjacentNodeIds, highlightedNodeIds, miniMapMode, selectedNodeId]);

  const handleMiniMapClick = useCallback((event: MouseEvent, position: XYPosition) => {
    event.stopPropagation();
    reactFlowRef.current?.setCenter(position.x, position.y, { duration: 220 });
  }, []);

  const handleMiniMapNodeClick = useCallback((event: MouseEvent, node: Node) => {
    event.stopPropagation();
    onRequestFocusNode(node.id);
  }, [onRequestFocusNode]);

  return (
    <div ref={canvasWrapperRef} className="canvas-graph">
      <ReactFlow
        nodes={selectedCanvasNodes}
        edges={selectedEdges}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        multiSelectionKeyCode={["Control", "Meta"]}
        elementsSelectable={false}
        onInit={handleInit}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        minZoom={0.2}
        maxZoom={1.75}
      >
        <Background color="#d7d4cd" gap={24} size={1.2} />
        <MiniMap
          pannable
          zoomable={miniMapMode !== "overloaded"}
          nodeColor={miniMapNodeColor}
          nodeStrokeColor={miniMapNodeStrokeColor}
          nodeClassName={miniMapNodeClassName}
          nodeComponent={MiniMapNode}
          nodeBorderRadius={4}
          nodeStrokeWidth={1.4}
          maskColor="rgba(245, 239, 231, 0.62)"
          maskStrokeColor="rgba(121, 82, 47, 0.72)"
          maskStrokeWidth={2}
          onClick={handleMiniMapClick}
          onNodeClick={handleMiniMapNodeClick}
          ariaLabel="Canvas minimap navigator"
          className={miniMapClassName}
        />
      </ReactFlow>
    </div>
  );
}
