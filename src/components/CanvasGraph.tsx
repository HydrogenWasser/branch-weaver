import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  MarkerType,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { useEditorStore } from "../store/editorStore";
import StoryNodeCard from "./StoryNodeCard";

type CanvasGraphProps = {
  fitRequest: number;
  focusRequest: number;
  focusNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onFitReady: (fit: () => void) => void;
};

const nodeTypes = {
  storyNode: StoryNodeCard
};

function buildEdgeId(nodeId: string, choiceId: string): string {
  return `${nodeId}::${choiceId}`;
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
  onFitReady
}: CanvasGraphProps) {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const project = useEditorStore((state) => state.project);
  const setSelection = useEditorStore((state) => state.setSelection);
  const moveNode = useEditorStore((state) => state.moveNode);
  const connectChoice = useEditorStore((state) => state.connectChoice);

  const nodes = useMemo<Node[]>(
    () =>
      project.nodes.map((storyNode) => ({
        id: storyNode.id,
        type: "storyNode",
        position: storyNode.position,
        data: {
          storyNode,
          isStartNode: project.metadata.startNodeId === storyNode.id,
          isSearchMatch: highlightedNodeIds.has(storyNode.id)
        }
      })),
    [highlightedNodeIds, project]
  );

  const edges = useMemo<Edge[]>(
    () =>
      project.nodes.flatMap((storyNode) =>
        storyNode.choices
          .filter((choice) => choice.targetNodeId)
          .map((choice) => ({
            id: buildEdgeId(storyNode.id, choice.id),
            source: storyNode.id,
            sourceHandle: choice.id,
            target: choice.targetNodeId!,
            markerEnd: { type: MarkerType.ArrowClosed }
          }))
      ),
    [project]
  );

  const fitGraph = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 200 });
  }, []);

  useEffect(() => {
    if (fitRequest > 0) {
      fitGraph();
    }
  }, [fitGraph, fitRequest]);

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

    setSelection(null);
  }, [setSelection]);

  const handlePaneClick = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    moveNode(node.id, node.position);
  }, [moveNode]);

  const handleEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const parsed = parseEdgeId(edge.id);
    if (parsed) {
      setSelection({ type: "choice", nodeId: parsed.nodeId, choiceId: parsed.choiceId });
    }
  }, [setSelection]);

  const miniMapNodeColor = useCallback((node: Node) => {
    if (highlightedNodeIds.has(node.id)) {
      return "#d68e3f";
    }

    if (project.metadata.startNodeId === node.id) {
      return "#e0b34a";
    }

    return "#b9a794";
  }, [highlightedNodeIds, project.metadata.startNodeId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      deleteKeyCode={null}
      multiSelectionKeyCode={["Control", "Meta"]}
      onInit={handleInit}
      onConnect={handleConnect}
      onPaneClick={handlePaneClick}
      onSelectionChange={handleSelectionChange}
      onNodeDragStop={handleNodeDragStop}
      onEdgeClick={handleEdgeClick}
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
  );
}
