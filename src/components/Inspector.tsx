import { useMemo } from "react";
import { useEditorStore } from "../store/editorStore";

export default function Inspector() {
  const project = useEditorStore((state) => state.project);
  const selection = useEditorStore((state) => state.selection);
  const updateNode = useEditorStore((state) => state.updateNode);
  const addChoice = useEditorStore((state) => state.addChoice);
  const removeChoice = useEditorStore((state) => state.removeChoice);
  const updateChoiceText = useEditorStore((state) => state.updateChoiceText);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const setStartNode = useEditorStore((state) => state.setStartNode);

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

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="panel">
          <h2>Inspector</h2>
          <p>Select a node or connection to edit its content.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="panel">
        <h2>Node</h2>
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
          <button
            type="button"
            className={project.metadata.startNodeId === selectedNode.id ? "is-active" : ""}
            onClick={() => setStartNode(selectedNode.id)}
          >
            {project.metadata.startNodeId === selectedNode.id ? "Start Node" : "Set As Start"}
          </button>
          <button type="button" onClick={() => addChoice(selectedNode.id)}>
            Add Choice
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Choices</h2>
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
          <h2>Selected Connection</h2>
          <p>
            <strong>{selectedChoice.text || "Untitled choice"}</strong>
          </p>
          <p>Target: {selectedChoice.targetNodeId ?? "Unlinked"}</p>
        </div>
      ) : null}
    </aside>
  );
}
