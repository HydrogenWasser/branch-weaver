import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import CanvasGraph from "./components/CanvasGraph";
import Inspector from "./components/Inspector";
import PreviewPlayer from "./components/PreviewPlayer";
import SearchPanel from "./components/SearchPanel";
import TopBar from "./components/TopBar";
import { buildAutoLayout } from "./lib/layout";
import { buildNodeSearchIndex, searchNodeIndex } from "./lib/search";
import { openJsonFile, saveJsonFile, saveJsonFileAs } from "./lib/fileIO";
import { exportValidationErrors, fileNameFromTitle, parseProjectJson, serializeProject } from "./lib/story";
import { useEditorStore } from "./store/editorStore";

const EMPTY_HIGHLIGHT_SET = new Set<string>();

export default function App() {
  const [fitRequest, setFitRequest] = useState(0);
  const [fitView, setFitView] = useState<(() => void) | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const project = useEditorStore((state) => state.project);
  const dirty = useEditorStore((state) => state.dirty);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const lastError = useEditorStore((state) => state.lastError);
  const selection = useEditorStore((state) => state.selection);
  const newProject = useEditorStore((state) => state.newProject);
  const loadExample = useEditorStore((state) => state.loadExample);
  const loadProject = useEditorStore((state) => state.loadProject);
  const updateProjectTitle = useEditorStore((state) => state.updateProjectTitle);
  const markSaved = useEditorStore((state) => state.markSaved);
  const clearError = useEditorStore((state) => state.clearError);
  const setError = useEditorStore((state) => state.setError);
  const setSelection = useEditorStore((state) => state.setSelection);
  const addNode = useEditorStore((state) => state.addNode);
  const applyNodeLayout = useEditorStore((state) => state.applyNodeLayout);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo());
  const canRedo = useEditorStore((state) => state.canRedo());

  const projectTitle = project.metadata.title || "Untitled Story";
  const exportIssues = useMemo(() => exportValidationErrors(project), [project]);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchIndex = useMemo(() => buildNodeSearchIndex(project), [project]);
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
  const focusNode = useCallback(
    (nodeId: string) => {
      setSelection({ type: "node", nodeId });
      setFocusNodeId(nodeId);
      setFocusRequest((value) => value + 1);
    },
    [setSelection]
  );

  const handleCreateProject = () => {
    if (dirty && !window.confirm("Discard current unsaved changes and create a new project?")) {
      return;
    }

    clearError();
    newProject();
    setFitRequest((value) => value + 1);
  };

  const handleLoadExample = () => {
    if (dirty && !window.confirm("Discard current unsaved changes and load the example project?")) {
      return;
    }

    clearError();
    loadExample();
    setFitRequest((value) => value + 1);
  };

  const handleOpenProject = async () => {
    try {
      if (dirty && !window.confirm("Discard current unsaved changes and open another project?")) {
        return;
      }

      const opened = await openJsonFile();
      if (!opened) {
        return;
      }

      const nextProject = parseProjectJson(opened.text);
      loadProject(nextProject, opened.path);
      clearError();
      setFitRequest((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open project.";
      setError(message);
    }
  };

  const handleSaveProject = async () => {
    try {
      const issues = exportValidationErrors(project);
      if (issues.length > 0) {
        setError(`Cannot export JSON until all issues are resolved:\n- ${issues.join("\n- ")}`);
        return;
      }

      const contents = serializeProject(project);
      const filePath = await saveJsonFile(contents, fileNameFromTitle(projectTitle), currentFilePath);
      markSaved(filePath);
      clearError();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project.";
      setError(message);
    }
  };

  const handleSaveProjectAs = async () => {
    try {
      const issues = exportValidationErrors(project);
      if (issues.length > 0) {
        setError(`Cannot export JSON until all issues are resolved:\n- ${issues.join("\n- ")}`);
        return;
      }

      const contents = serializeProject(project);
      const filePath = await saveJsonFileAs(contents, fileNameFromTitle(projectTitle));
      if (filePath || !currentFilePath) {
        markSaved(filePath);
      }
      clearError();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project.";
      setError(message);
    }
  };

  const handleDeleteSelection = () => {
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
  };

  const handleAutoLayout = () => {
    const positions = buildAutoLayout(project);
    applyNodeLayout(positions);
    setFitRequest((value) => value + 1);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleCreateProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void handleOpenProject();
        return;
      }

      if (modifier && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveProjectAs();
        return;
      }

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" && selection) {
        event.preventDefault();
        handleDeleteSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, selection, undo, redo, currentFilePath, project]);

  return (
    <div className="app-shell">
      <TopBar
        title={projectTitle}
        dirty={dirty}
        onNew={handleCreateProject}
        onOpen={() => void handleOpenProject()}
        onSave={() => void handleSaveProject()}
        onSaveAs={() => void handleSaveProjectAs()}
        onLoadExample={handleLoadExample}
      />

      <div className="workspace">
        <aside className="sidebar">
          <div className="panel">
            <h2>Project</h2>
            <label className="field">
              <span>Story Title</span>
              <input
                value={project.metadata.title}
                onChange={(event) => updateProjectTitle(event.target.value)}
                placeholder="Project title"
              />
            </label>
            <p>Nodes: {project.nodes.length}</p>
            <p>Save mode: Browser download</p>
          </div>

          <div className="panel">
            <h2>Canvas</h2>
            <button type="button" onClick={() => addNode({ x: 240, y: 240 })}>
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

          <SearchPanel
            query={searchQuery}
            resultCount={searchResults.length}
            totalCount={project.nodes.length}
            results={searchResults}
            onQueryChange={setSearchQuery}
            onSelectNode={focusNode}
          />

          <div className="panel">
            <h2>History</h2>
            <button type="button" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
            <button type="button" disabled={!canRedo} onClick={redo}>
              Redo
            </button>
          </div>

          <div className="panel">
            <h2>Export Checks</h2>
            {exportIssues.length === 0 ? (
              <p>Ready to export.</p>
            ) : (
              <ul className="issue-list">
                {exportIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>

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
          />
          <PreviewPlayer open={previewOpen} project={project} onClose={() => setPreviewOpen(false)} />
        </main>

        <Inspector />
      </div>
    </div>
  );
}
