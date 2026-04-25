import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  applyNodeChanges,
  Background,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { formatChoiceSummary, formatConditionSummary } from "../lib/conditions";
import { useEditorStore } from "../store/editorStore";
import type { StoryChoice, StoryGlobal, StoryNode, XYPosition } from "../types/story";
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

function buildEdgeId(nodeId: string, choiceId: string, variant = "direct"): string {
  return `${nodeId}::${choiceId}::${variant}`;
}

function parseEdgeId(edgeId: string): { nodeId: string; choiceId: string } | null {
  const [nodeId, choiceId] = edgeId.split("::");
  return nodeId && choiceId ? { nodeId, choiceId } : null;
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
    onNodeBodyClick: () => undefined,
    onNodeBodyDoubleClick: () => undefined,
    onChoiceClick: () => undefined,
    onChoiceDoubleClick: () => undefined
  };
}

function samePosition(left: XYPosition, right: XYPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function syncFlowNodes(currentNodes: Node[], projectNodes: Node[]): Node[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  let hasChanges = currentNodes.length !== projectNodes.length;

  const nextNodes = projectNodes.map((projectNode) => {
    const currentNode = currentById.get(projectNode.id);
    if (!currentNode) {
      hasChanges = true;
      return projectNode;
    }

    if (
      currentNode.type === projectNode.type &&
      currentNode.data === projectNode.data &&
      samePosition(currentNode.position, projectNode.position)
    ) {
      return currentNode;
    }

    hasChanges = true;
    return {
      ...currentNode,
      ...projectNode,
      position: projectNode.position,
      data: projectNode.data,
      selected: false
    };
  });

  return hasChanges ? nextNodes : currentNodes;
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
  const isDraggingRef = useRef(false);
  const pendingNodeChangesRef = useRef<NodeChange[]>([]);
  const nodeChangeFrameRef = useRef<number | null>(null);
  const nodes = useEditorStore((state) => state.project.nodes);
  const globals = useEditorStore((state) => state.project.globals);
  const setSelection = useEditorStore((state) => state.setSelection);
  const moveNode = useEditorStore((state) => state.moveNode);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const nodePositionsById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node.position])),
    [nodes]
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
  const [flowNodes, setFlowNodes] = useState<Node[]>(() => projectNodes);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    setFlowNodes((currentNodes) => syncFlowNodes(currentNodes, projectNodes));
  }, [projectNodes]);

  useEffect(
    () => () => {
      if (nodeChangeFrameRef.current !== null) {
        window.cancelAnimationFrame(nodeChangeFrameRef.current);
      }
    },
    []
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

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    pendingNodeChangesRef.current.push(...changes);

    if (nodeChangeFrameRef.current !== null) {
      return;
    }

    nodeChangeFrameRef.current = window.requestAnimationFrame(() => {
      const pendingChanges = pendingNodeChangesRef.current;
      pendingNodeChangesRef.current = [];
      nodeChangeFrameRef.current = null;
      setFlowNodes((currentNodes) => applyNodeChanges(pendingChanges, currentNodes));
    });
  }, []);

  const handleNodeDragStart = useCallback((_: unknown, node: Node) => {
    isDraggingRef.current = true;
    setSelection({ type: "node", nodeId: node.id });
  }, [setSelection]);

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    isDraggingRef.current = false;

    const currentNodePosition = nodePositionsById.get(node.id);
    if (
      !currentNodePosition ||
      (currentNodePosition.x === node.position.x && currentNodePosition.y === node.position.y)
    ) {
      return;
    }
    moveNode(node.id, node.position);
  }, [moveNode, nodePositionsById]);

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

  return (
    <div ref={canvasWrapperRef} className="canvas-graph">
      <ReactFlow
        nodes={flowNodes}
        edges={projectEdges}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        multiSelectionKeyCode={["Control", "Meta"]}
        elementsSelectable={false}
        onInit={handleInit}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        minZoom={0.2}
        maxZoom={1.75}
      >
        <Background color="#d7d4cd" gap={24} size={1.2} />
      </ReactFlow>
    </div>
  );
}
