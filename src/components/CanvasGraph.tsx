import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  applyNodeChanges,
  Background,
  MarkerType,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { formatConditionSummary } from "../lib/conditions";
import { getNodeMiniMapColor } from "../lib/nodeAppearance";
import { useEditorStore } from "../store/editorStore";
import type { XYPosition } from "../types/story";
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
  const project = useEditorStore((state) => state.project);
  const selection = useEditorStore((state) => state.selection);
  const setSelection = useEditorStore((state) => state.setSelection);
  const moveNode = useEditorStore((state) => state.moveNode);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );
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
      project.nodes.map((storyNode) => ({
        id: storyNode.id,
        type: "storyNode",
        position: storyNode.position,
        selected: selection?.type === "node" && selection.nodeId === storyNode.id,
        data: {
          storyNode,
          globalsById,
          isSearchMatch: highlightedNodeIds.has(storyNode.id),
          selectedChoiceId:
            selection?.type === "choice" && selection.nodeId === storyNode.id ? selection.choiceId : null,
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
      project,
      selection
    ]
  );
  const [canvasNodes, setCanvasNodes] = useState<Node[]>(projectNodes);

  useEffect(() => {
    setCanvasNodes(projectNodes);
  }, [projectNodes]);

  const edges = useMemo<Edge[]>(
    () =>
      project.nodes.flatMap((storyNode) =>
        storyNode.choices.flatMap((choice) => {
          const selectedChoice =
            selection?.type === "choice" &&
            selection.nodeId === storyNode.id &&
            selection.choiceId === choice.id;

          if (choice.route.mode === "direct") {
            return choice.route.targetNodeId
              ? [
                  {
                    id: buildEdgeId(storyNode.id, choice.id, "direct"),
                    source: storyNode.id,
                    sourceHandle: choice.id,
                    target: choice.route.targetNodeId,
                    selected: selectedChoice,
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
              selected: selectedChoice,
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
                  selected: selectedChoice,
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
    [globalsById, project, selection]
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

  const handleSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    const firstNode = selectedNodes[0];
    const firstEdge = selectedEdges[0];

    if (firstNode) {
      setSelection({ type: "node", nodeId: firstNode.id });
      return;
    }

    if (firstEdge) {
      const parsed = parseEdgeId(firstEdge.id);
      if (parsed) {
        setSelection({ type: "choice", nodeId: parsed.nodeId, choiceId: parsed.choiceId });
        return;
      }
    }
  }, [setSelection]);

  const handlePaneClick = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    moveNode(node.id, node.position);
  }, [moveNode]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setCanvasNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

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
    if (highlightedNodeIds.has(node.id)) {
      return "#d68e3f";
    }

    return getNodeMiniMapColor(node.data.storyNode.colorToken);
  }, [highlightedNodeIds]);

  return (
    <div ref={canvasWrapperRef} className="canvas-graph">
      <ReactFlow
        nodes={canvasNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        multiSelectionKeyCode={["Control", "Meta"]}
        onInit={handleInit}
        onConnect={handleConnect}
        onNodesChange={handleNodesChange}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
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
          zoomable
          nodeColor={miniMapNodeColor}
          maskColor="rgba(245, 239, 231, 0.72)"
          className="story-minimap"
        />
      </ReactFlow>
    </div>
  );
}
