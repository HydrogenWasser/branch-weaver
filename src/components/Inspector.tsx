import { useCallback, useEffect, useMemo, useState } from "react";
import DraggablePanel from "./DraggablePanel";
import FileTriggersEditor from "./FileTriggersEditor";
import { formatChoiceSummary, formatConditionSummary } from "../lib/conditions";
import { NODE_COLOR_THEMES, TAG_SUGGESTIONS } from "../lib/nodeAppearance";
import { useEditorStore } from "../store/editorStore";

const DEFAULT_INSPECTOR_ORDER = ["node", "tags", "file-triggers", "node-color", "choices", "selected-connection"];

type InspectorProps = {
  onCollapse?: () => void;
  onOpenChoicesEditor: (nodeId: string, choiceId?: string | null) => void;
};

export default function Inspector({ onCollapse, onOpenChoicesEditor }: InspectorProps) {
  const project = useEditorStore((state) => state.project);
  const selection = useEditorStore((state) => state.selection);
  const updateNode = useEditorStore((state) => state.updateNode);
  const addNodeTag = useEditorStore((state) => state.addNodeTag);
  const removeNodeTag = useEditorStore((state) => state.removeNodeTag);
  const setNodeColor = useEditorStore((state) => state.setNodeColor);
  const setStartNode = useEditorStore((state) => state.setStartNode);
  const addChoice = useEditorStore((state) => state.addChoice);
  const [tagInput, setTagInput] = useState("");
  const [fileTriggersEditorOpen, setFileTriggersEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [inspectorOrder, setInspectorOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("branch-weaver:inspector-panels");
      return stored ? JSON.parse(stored) : DEFAULT_INSPECTOR_ORDER;
    } catch {
      return DEFAULT_INSPECTOR_ORDER;
    }
  });
  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );

  const selectedNode =
    selection?.type === "node"
      ? project.nodes.find((node) => node.id === selection.nodeId)
      : selection?.type === "choice"
        ? project.nodes.find((node) => node.id === selection.nodeId)
        : null;

  const selectedChoice =
    selection?.type === "choice"
      ? selectedNode?.choices.find((choice) => choice.id === selection.choiceId) ?? null
      : null;

  const suggestedTags = useMemo(
    () => TAG_SUGGESTIONS.filter((tag) => !selectedNode?.tags.includes(tag)),
    [selectedNode?.tags]
  );

  useEffect(() => {
    if (selectedNode) {
      setDraftTitle(selectedNode.title);
      setDraftBody(selectedNode.body);
    }
  }, [selectedNode?.id]);

  const handleAddTag = (tag: string) => {
    if (!selectedNode) {
      return;
    }

    if (tag.trim().toLowerCase() === "start") {
      setStartNode(selectedNode.id);
    } else {
      addNodeTag(selectedNode.id, tag);
    }

    setTagInput("");
  };

  const moveInspectorPanel = useCallback((fromIndex: number, toIndex: number) => {
    setInspectorOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      localStorage.setItem("branch-weaver:inspector-panels", JSON.stringify(next));
      return next;
    });
  }, []);

  const renderInspectorPanel = (panelId: string) => {
    if (!selectedNode) {
      return null;
    }

    switch (panelId) {
      case "node":
        return (
          <div className="panel">
            <h3>Node</h3>
            <label className="field">
              <span>Title</span>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => {
                  if (draftTitle !== selectedNode.title) {
                    updateNode(selectedNode.id, { title: draftTitle });
                  }
                }}
                placeholder="Scene title"
              />
            </label>
            <label className="field">
              <span>Body</span>
              <textarea
                rows={5}
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                onBlur={() => {
                  if (draftBody !== selectedNode.body) {
                    updateNode(selectedNode.id, { body: draftBody });
                  }
                }}
                placeholder="Write scene text here"
              />
            </label>
          </div>
        );
      case "tags":
        return (
          <div className="panel">
            <h3>Tags</h3>
            <div className="tag-editor__list">
              {selectedNode.tags.length > 0 ? (
                selectedNode.tags.map((tag) => (
                  <div key={tag} className="tag-chip">
                    <span>{tag}</span>
                    <button type="button" onClick={() => removeNodeTag(selectedNode.id, tag)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p>This node has no tags yet.</p>
              )}
            </div>
            <label className="field">
              <span>Add Custom Tag</span>
              <div className="tag-editor__input-row">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Type a tag name"
                />
                <button type="button" onClick={() => handleAddTag(tagInput)}>
                  Add
                </button>
              </div>
            </label>
            <div className="tag-editor__suggestions">
              {suggestedTags.map((tag) => (
                <button key={tag} type="button" onClick={() => handleAddTag(tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        );
      case "file-triggers":
        return (
          <div className="panel">
            <h3>File Triggers</h3>
            <button
              type="button"
              className="file-triggers-panel__trigger"
              onClick={() => setFileTriggersEditorOpen(true)}
            >
              Manage File Triggers
              <span className="file-triggers-panel__count">{selectedNode.fileTriggers.length}</span>
            </button>
          </div>
        );
      case "node-color":
        return (
          <div className="panel">
            <h3>Node Color</h3>
            <div className="color-palette">
              {Object.entries(NODE_COLOR_THEMES).map(([token, theme]) => (
                <button
                  key={token}
                  type="button"
                  className={`color-swatch${selectedNode.colorToken === token ? " is-selected" : ""}`}
                  onClick={() => setNodeColor(selectedNode.id, token as typeof selectedNode.colorToken)}
                >
                  <span className="color-swatch__preview" style={{ background: theme.miniMap }} />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case "choices":
        return (
          <div className="panel">
            <h3>Choices</h3>
            <button
              type="button"
              className="choices-panel__trigger"
              onClick={() =>
                onOpenChoicesEditor(
                  selectedNode.id,
                  selectedChoice?.id ?? selectedNode.choices[0]?.id ?? null
                )
              }
            >
              Manage Choices
              <span className="choices-panel__count">{selectedNode.choices.length}</span>
            </button>
            <button
              type="button"
              className="choices-panel__trigger"
              onClick={() => addChoice(selectedNode.id)}
            >
              Add Choice
            </button>
          </div>
        );
      case "selected-connection":
        if (!selectedChoice) {
          return null;
        }
        return (
          <div className="panel">
            <h3>Selected Connection</h3>
            <p>
              <strong>{selectedChoice.text || "Untitled choice"}</strong>
            </p>
            <p>{formatChoiceSummary(selectedChoice, globalsById) ?? "Direct route with no conditions."}</p>
            {selectedChoice.visibilityCondition ? (
              <p>Visible when: {formatConditionSummary(selectedChoice.visibilityCondition, globalsById)}</p>
            ) : null}
            <p>
              Route:{" "}
              {selectedChoice.route.mode === "direct"
                ? selectedChoice.route.targetNodeId ?? "Unlinked"
                : `Conditional (${selectedChoice.route.branches.length} rules + else)`}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="workspace__panel-header">
          <h2>Inspector</h2>
          {onCollapse ? (
            <button type="button" className="workspace__collapse-button" onClick={onCollapse}>
              Hide
            </button>
          ) : null}
        </div>
        <div className="panel">
          <p>Select a node or connection to edit its content.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="workspace__panel-header">
        <h2>Inspector</h2>
        {onCollapse ? (
          <button type="button" className="workspace__collapse-button" onClick={onCollapse}>
            Hide
          </button>
        ) : null}
      </div>
      {inspectorOrder.map((panelId, index) => {
        const panelContent = renderInspectorPanel(panelId);
        if (!panelContent) {
          return null;
        }
        return (
          <DraggablePanel
            key={panelId}
            panelId={panelId}
            index={index}
            onReorder={moveInspectorPanel}
          >
            {panelContent}
          </DraggablePanel>
        );
      })}

      <FileTriggersEditor
        nodeId={selectedNode.id}
        open={fileTriggersEditorOpen}
        onClose={() => setFileTriggersEditorOpen(false)}
      />
    </aside>
  );
}
