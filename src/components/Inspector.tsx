import { useMemo, useState } from "react";
import { NODE_COLOR_THEMES, TAG_SUGGESTIONS } from "../lib/nodeAppearance";
import { useEditorStore } from "../store/editorStore";

type InspectorProps = {
  onCollapse?: () => void;
};

export default function Inspector({ onCollapse }: InspectorProps) {
  const project = useEditorStore((state) => state.project);
  const selection = useEditorStore((state) => state.selection);
  const updateNode = useEditorStore((state) => state.updateNode);
  const addNodeTag = useEditorStore((state) => state.addNodeTag);
  const removeNodeTag = useEditorStore((state) => state.removeNodeTag);
  const setNodeColor = useEditorStore((state) => state.setNodeColor);
  const addChoice = useEditorStore((state) => state.addChoice);
  const removeChoice = useEditorStore((state) => state.removeChoice);
  const updateChoiceText = useEditorStore((state) => state.updateChoiceText);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const setStartNode = useEditorStore((state) => state.setStartNode);
  const [tagInput, setTagInput] = useState("");

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

  const otherNodes = useMemo(
    () => project.nodes.filter((node) => node.id !== selectedNode?.id),
    [project.nodes, selectedNode?.id]
  );

  const suggestedTags = useMemo(
    () => TAG_SUGGESTIONS.filter((tag) => !selectedNode?.tags.includes(tag)),
    [selectedNode?.tags]
  );

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
      <div className="panel">
        <h3>Node</h3>
        <label className="field">
          <span>Title</span>
          <input
            value={selectedNode.title}
            onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })}
            placeholder="Scene title"
          />
        </label>
        <label className="field">
          <span>Body</span>
          <textarea
            rows={8}
            value={selectedNode.body}
            onChange={(event) => updateNode(selectedNode.id, { body: event.target.value })}
            placeholder="Write scene text here"
          />
        </label>
        <div className="inspector__row">
          <button type="button" onClick={() => addChoice(selectedNode.id)}>
            Add Choice
          </button>
        </div>
      </div>

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

      <div className="panel">
        <h3>Choices</h3>
        {selectedNode.choices.length === 0 ? <p>This node has no outgoing choices yet.</p> : null}
        <div className="choice-list">
          {selectedNode.choices.map((choice) => (
            <div
              key={choice.id}
              className={`choice-editor${selectedChoice?.id === choice.id ? " is-selected" : ""}`}
            >
              <label className="field">
                <span>Choice Text</span>
                <input
                  value={choice.text}
                  onChange={(event) =>
                    updateChoiceText({ nodeId: selectedNode.id, choiceId: choice.id }, event.target.value)
                  }
                  placeholder="Choice text"
                />
              </label>
              <label className="field">
                <span>Target Node</span>
                <select
                  value={choice.targetNodeId ?? ""}
                  onChange={(event) =>
                    connectChoice(
                      { nodeId: selectedNode.id, choiceId: choice.id },
                      event.target.value || null
                    )
                  }
                >
                  <option value="">Unlinked</option>
                  {otherNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title || node.id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="choice-editor__actions">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      choice.targetNodeId &&
                      !window.confirm("This will remove the existing jump target for the choice. Continue?")
                    ) {
                      return;
                    }
                    removeChoice({ nodeId: selectedNode.id, choiceId: choice.id });
                  }}
                >
                  Delete Choice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedChoice ? (
        <div className="panel">
          <h3>Selected Connection</h3>
          <p>
            <strong>{selectedChoice.text || "Untitled choice"}</strong>
          </p>
          <p>Target: {selectedChoice.targetNodeId ?? "Unlinked"}</p>
        </div>
      ) : null}
    </aside>
  );
}
