import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../store/editorStore";

type FileTriggersEditorProps = {
  nodeId: string;
  open: boolean;
  onClose: () => void;
};

export default function FileTriggersEditor({ nodeId, open, onClose }: FileTriggersEditorProps) {
  const project = useEditorStore((state) => state.project);
  const addNodeFileTrigger = useEditorStore((state) => state.addNodeFileTrigger);
  const removeNodeFileTrigger = useEditorStore((state) => state.removeNodeFileTrigger);

  const [fileTriggerInput, setFileTriggerInput] = useState("");

  const node = useMemo(
    () => project.nodes.find((n) => n.id === nodeId),
    [project.nodes, nodeId]
  );

  const fileTriggers = node?.fileTriggers ?? [];

  useEffect(() => {
    if (!open) {
      setFileTriggerInput("");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !node) {
    return null;
  }

  const handleAdd = () => {
    if (!fileTriggerInput.trim()) {
      return;
    }
    addNodeFileTrigger(nodeId, fileTriggerInput.trim());
    setFileTriggerInput("");
  };

  return (
    <div className="file-triggers-editor-overlay" role="presentation" onClick={onClose}>
      <section
        className="file-triggers-editor"
        role="dialog"
        aria-modal="true"
        aria-label="File triggers editor"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="file-triggers-editor__header">
          <h2>File Triggers</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {fileTriggers.length === 0 ? (
          <p className="file-triggers-editor__empty">
            This node has no file triggers yet.
          </p>
        ) : (
          <div className="file-triggers-editor__list">
            {fileTriggers.map((fileName) => (
              <div key={fileName} className="file-trigger-chip">
                <span>{fileName}</span>
                <button type="button" onClick={() => removeNodeFileTrigger(nodeId, fileName)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="field">
          <span>Add File Trigger</span>
          <div className="file-trigger-editor__input-row">
            <input
              value={fileTriggerInput}
              onChange={(event) => setFileTriggerInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="e.g. chapter_01.txt"
            />
            <button type="button" onClick={handleAdd}>
              Add
            </button>
          </div>
        </label>
      </section>
    </div>
  );
}
