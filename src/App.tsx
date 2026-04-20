import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import CanvasGraph from "./components/CanvasGraph";
import ChoicesDrawer from "./components/ChoicesDrawer";
import DraggablePanel from "./components/DraggablePanel";
import ExportChecksPanel from "./components/ExportChecksPanel";
import GlobalsEditor from "./components/GlobalsEditor";
import GlobalsPanel from "./components/GlobalsPanel";
import Inspector from "./components/Inspector";
import PreviewPlayer from "./components/PreviewPlayer";
import SearchPanel from "./components/SearchPanel";
import TopBar from "./components/TopBar";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { usePanelOrder } from "./hooks/usePanelOrder";
import { useProjectFileActions } from "./hooks/useProjectFileActions";
import { buildAutoLayout } from "./lib/layout";
import { buildNodeSearchIndex, searchNodeIndex } from "./lib/search";
import { useEditorStore } from "./store/editorStore";
import type { XYPosition } from "./types/story";

const EMPTY_HIGHLIGHT_SET = new Set<string>();
const DEFAULT_NEW_NODE_POSITION = { x: 240, y: 240 };
const DEFAULT_NEW_NODE_SIZE = { width: 260, height: 132 };
const DEFAULT_SIDEBAR_ORDER = ["globals", "canvas", "search", "export-checks"];

export default function App() {
  const [fitRequest, setFitRequest] = useState(0);
  const [fitView, setFitView] = useState<(() => void) | null>(null);
  const [getViewportCenter, setGetViewportCenter] = useState<(() => XYPosition | null) | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [globalsEditorOpen, setGlobalsEditorOpen] = useState(false);
  const [choicesDrawerOpen, setChoicesDrawerOpen] = useState(false);
  const [choicesDrawerNodeId, setChoicesDrawerNodeId] = useState<string | null>(null);
  const [choicesDrawerChoiceId, setChoicesDrawerChoiceId] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const { order: sidebarOrder, movePanel: moveSidebarPanel } = usePanelOrder(
    "branch-weaver:sidebar-panels",
    DEFAULT_SIDEBAR_ORDER
  );

  const project = useEditorStore((state) => state.project);
  const nodes = useEditorStore((state) => state.project.nodes);
  const dirty = useEditorStore((state) => state.dirty);
  const lastError = useEditorStore((state) => state.lastError);
  const selection = useEditorStore((state) => state.selection);
  const updateProjectTitle = useEditorStore((state) => state.updateProjectTitle);
  const clearError = useEditorStore((state) => state.clearError);
  const setSelection = useEditorStore((state) => state.setSelection);
  const addNode = useEditorStore((state) => state.addNode);
  const applyNodeLayout = useEditorStore((state) => state.applyNodeLayout);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo());
  const canRedo = useEditorStore((state) => state.canRedo());

  const projectTitle = project.metadata.title || "Untitled Story";
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchIndex = useMemo(() => buildNodeSearchIndex(nodes), [nodes]);
  const searchResults = useMemo(
    () => searchNodeIndex(searchIndex, deferredSearchQuery),
    [deferredSearchQuery, searchIndex]
  );
  const highlightedNodeIds = useMemo(
    () =>
      deferredSearchQuery.trim()
        ? new Set(searchResults.map((result) => result.nodeId))
        : EMPTY_HIGHLIGHT_SET,
    [deferredSearchQuery, searchResults]
  );

  const handleFitReady = useCallback((fit: () => void) => {
    setFitView(() => fit);
  }, []);

  const handleViewportCenterReady = useCallback((getCenter: () => XYPosition | null) => {
    setGetViewportCenter(() => getCenter);
  }, []);

  const focusNode = useCallback(
    (nodeId: string) => {
      setSelection({ type: "node", nodeId });
      setFocusNodeId(nodeId);
      setFocusRequest((value) => value + 1);
    },
    [setSelection]
  );

  const handleSelectDrawerChoice = useCallback(
    (nodeId: string, choiceId: string) => {
      setChoicesDrawerOpen(true);
      setChoicesDrawerNodeId(nodeId);
      setChoicesDrawerChoiceId(choiceId);
      setSelection({ type: "choice", nodeId, choiceId });
    },
    [setSelection]
  );

  const handleOpenChoicesDrawer = useCallback(
    (nodeId: string, choiceId?: string | null) => {
      setChoicesDrawerOpen(true);
      setChoicesDrawerNodeId(nodeId);
      setChoicesDrawerChoiceId(choiceId ?? null);
      if (choiceId) {
        setSelection({ type: "choice", nodeId, choiceId });
      } else {
        setSelection({ type: "node", nodeId });
      }
    },
    [setSelection]
  );

  const handleCloseChoicesDrawer = useCallback(() => {
    setChoicesDrawerOpen(false);
    setChoicesDrawerChoiceId(null);
    if (choicesDrawerNodeId) {
      setSelection({ type: "node", nodeId: choicesDrawerNodeId });
    }
  }, [choicesDrawerNodeId, setSelection]);

  const handleEditChoice = useCallback(
    (nodeId: string, choiceId: string) => {
      handleOpenChoicesDrawer(nodeId, choiceId);
    },
    [handleOpenChoicesDrawer]
  );

  const handleAddNode = useCallback(() => {
    const viewportCenter = getViewportCenter?.();
    const nextPosition = viewportCenter
      ? {
          x: Math.round(viewportCenter.x - DEFAULT_NEW_NODE_SIZE.width / 2),
          y: Math.round(viewportCenter.y - DEFAULT_NEW_NODE_SIZE.height / 2)
        }
      : DEFAULT_NEW_NODE_POSITION;

    addNode(nextPosition);
  }, [addNode, getViewportCenter]);

  const handleAutoLayout = useCallback(() => {
    const positions = buildAutoLayout(project);
    applyNodeLayout(positions);
    setFitRequest((value) => value + 1);
  }, [project, applyNodeLayout]);

  const handleDeleteSelection = useCallback(() => {
    if (!selection) {
      return;
    }

    const confirmed =
      selection.type === "node"
        ? window.confirm("Delete the selected node? Incoming links will be disconnected.")
        : window.confirm("Delete the selected choice and its outgoing connection?");

    if (!confirmed) {
      return;
    }

    deleteSelection();
  }, [selection, deleteSelection]);

  const handleAfterLoad = useCallback(() => {
    setFitRequest((value) => value + 1);
  }, []);

  const {
    handleCreateProject,
    handleLoadExample,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs
  } = useProjectFileActions({ onAfterLoad: handleAfterLoad });

  useEditorShortcuts(dirty, selection, {
    onNew: handleCreateProject,
    onOpen: handleOpenProject,
    onSave: handleSaveProject,
    onSaveAs: handleSaveProjectAs,
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteSelection
  });

  useEffect(() => {
    if (selection?.type !== "choice") {
      return;
    }

    setChoicesDrawerOpen(true);
    setChoicesDrawerNodeId(selection.nodeId);
    setChoicesDrawerChoiceId(selection.choiceId);
  }, [selection]);

  const renderSidebarPanel = (panelId: string) => {
    switch (panelId) {
      case "globals":
        return <GlobalsPanel onOpen={() => setGlobalsEditorOpen(true)} />;
      case "canvas":
        return (
          <div className="panel">
            <h3>Canvas</h3>
            <button type="button" onClick={handleAddNode}>
              New Node
            </button>
            <button type="button" onClick={handleAutoLayout}>
              Auto Layout
            </button>
            <button type="button" onClick={() => setFitRequest((value) => value + 1)}>
              Fit View
            </button>
            <button type="button" onClick={() => fitView?.()}>
              Center Graph
            </button>
            <button type="button" onClick={() => setPreviewOpen(true)}>
              Play Preview
            </button>
            <button type="button" disabled={!selection} onClick={handleDeleteSelection}>
              Delete Selected
            </button>
          </div>
        );
      case "search":
        return (
          <SearchPanel
            query={searchQuery}
            resultCount={searchResults.length}
            totalCount={project.nodes.length}
            results={searchResults}
            onQueryChange={setSearchQuery}
            onSelectNode={focusNode}
          />
        );
      case "export-checks":
        return <ExportChecksPanel />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return (
    <div className="app-shell">
      <TopBar
        projectTitle={project.metadata.title}
        dirty={dirty}
        onProjectTitleChange={updateProjectTitle}
        onNew={handleCreateProject}
        onOpen={() => void handleOpenProject()}
        onSave={() => void handleSaveProject()}
        onSaveAs={() => void handleSaveProjectAs()}
        onLoadExample={handleLoadExample}
      />

      <div
        className={`workspace${leftSidebarCollapsed ? " is-left-collapsed" : ""}${
          rightSidebarCollapsed ? " is-right-collapsed" : ""
        }`}
      >
        <div className={`workspace__side workspace__side--left${leftSidebarCollapsed ? " is-collapsed" : ""}`}>
          {leftSidebarCollapsed ? (
            <button
              type="button"
              className="sidebar-rail sidebar-rail--left"
              onClick={() => setLeftSidebarCollapsed(false)}
            >
              <span>Project</span>
            </button>
          ) : (
            <aside className="sidebar">
              <div className="workspace__panel-header">
                <h2>Sidebar</h2>
                <button
                  type="button"
                  className="workspace__collapse-button"
                  onClick={() => setLeftSidebarCollapsed(true)}
                >
                  Hide
                </button>
              </div>

              {sidebarOrder.map((panelId, index) => (
                <DraggablePanel
                  key={panelId}
                  panelId={panelId}
                  index={index}
                  onReorder={moveSidebarPanel}
                >
                  {renderSidebarPanel(panelId)}
                </DraggablePanel>
              ))}
            </aside>
          )}
        </div>

        <main className="canvas-area">
          {lastError ? (
            <div className="error-banner">
              <strong>Error</strong>
              <pre>{lastError}</pre>
              <button type="button" onClick={clearError}>
                Dismiss
              </button>
            </div>
          ) : null}
          <CanvasGraph
            fitRequest={fitRequest}
            focusRequest={focusRequest}
            focusNodeId={focusNodeId}
            highlightedNodeIds={highlightedNodeIds}
            onFitReady={handleFitReady}
            onViewportCenterReady={handleViewportCenterReady}
            onRequestFocusNode={focusNode}
            onRequestEditChoice={handleEditChoice}
          />
          <ChoicesDrawer
            open={choicesDrawerOpen}
            nodeId={choicesDrawerNodeId}
            choiceId={choicesDrawerChoiceId}
            onClose={handleCloseChoicesDrawer}
            onSelectChoice={handleSelectDrawerChoice}
          />
          <PreviewPlayer open={previewOpen} project={project} onClose={() => setPreviewOpen(false)} />
          <GlobalsEditor open={globalsEditorOpen} onClose={() => setGlobalsEditorOpen(false)} />
        </main>

        <div className={`workspace__side workspace__side--right${rightSidebarCollapsed ? " is-collapsed" : ""}`}>
          {rightSidebarCollapsed ? (
            <button
              type="button"
              className="sidebar-rail sidebar-rail--right"
              onClick={() => setRightSidebarCollapsed(false)}
            >
              <span>Inspector</span>
            </button>
          ) : (
            <Inspector
              onCollapse={() => setRightSidebarCollapsed(true)}
              onOpenChoicesEditor={handleOpenChoicesDrawer}
            />
          )}
        </div>
      </div>
    </div>
  );
}
