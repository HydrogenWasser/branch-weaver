import { useEffect, useMemo } from "react";
import { isGlobalReferenced } from "../lib/story";
import { useEditorStore } from "../store/editorStore";

type GlobalsEditorProps = {
  open: boolean;
  onClose: () => void;
};

export default function GlobalsEditor({ open, onClose }: GlobalsEditorProps) {
  const project = useEditorStore((state) => state.project);
  const addGlobal = useEditorStore((state) => state.addGlobal);
  const updateGlobalName = useEditorStore((state) => state.updateGlobalName);
  const updateGlobalValueType = useEditorStore((state) => state.updateGlobalValueType);
  const updateGlobalDefaultValue = useEditorStore((state) => state.updateGlobalDefaultValue);
  const removeGlobal = useEditorStore((state) => state.removeGlobal);

  const globals = project.globals;

  const usageMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const g of globals) {
      map.set(g.id, isGlobalReferenced(project, g.id));
    }
    return map;
  }, [globals, project]);

  useEffect(() => {
    if (!open) {
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

  if (!open) {
    return null;
  }

  return (
    <div className="globals-editor-overlay" role="presentation" onClick={onClose}>
      <section
        className="globals-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Globals editor"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="globals-editor__header">
          <h2>Globals</h2>
          <div className="globals-editor__actions">
            <button type="button" onClick={() => addGlobal("boolean")}>
              Add Flag
            </button>
            <button type="button" onClick={() => addGlobal("number")}>
              Add Number
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {globals.length === 0 ? (
          <p className="globals-editor__empty">
            No globals yet. Add a flag or number to drive conditional visibility and routing.
          </p>
        ) : (
          <div className="globals-editor__list">
            {globals.map((storyGlobal) => {
              const isUsed = usageMap.get(storyGlobal.id) ?? false;

              return (
                <div key={storyGlobal.id} className="globals-editor__row">
                  <label className="field globals-editor__field--name">
                    <span>Name</span>
                    <input
                      value={storyGlobal.name}
                      onChange={(event) => updateGlobalName(storyGlobal.id, event.target.value)}
                      placeholder="Global name"
                    />
                  </label>

                  <label className="field globals-editor__field--type">
                    <span>Type</span>
                    <select
                      value={storyGlobal.valueType}
                      onChange={(event) =>
                        updateGlobalValueType(storyGlobal.id, event.target.value as typeof storyGlobal.valueType)
                      }
                    >
                      <option value="boolean">Boolean</option>
                      <option value="number">Number</option>
                    </select>
                  </label>

                  <label className="field globals-editor__field--default">
                    <span>Default</span>
                    {storyGlobal.valueType === "boolean" ? (
                      <select
                        value={storyGlobal.defaultValue ? "true" : "false"}
                        onChange={(event) =>
                          updateGlobalDefaultValue(storyGlobal.id, event.target.value === "true")
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={storyGlobal.defaultValue}
                        onChange={(event) =>
                          updateGlobalDefaultValue(storyGlobal.id, Number(event.target.value))
                        }
                      />
                    )}
                  </label>

                  <div className="globals-editor__field--status">
                    {isUsed ? (
                      <span className="globals-editor__status--used">In use</span>
                    ) : (
                      <span className="globals-editor__status--unused">Unused</span>
                    )}
                  </div>

                  <div className="globals-editor__field--actions">
                    <button
                      type="button"
                      disabled={isUsed}
                      title={isUsed ? "Remove conditions that reference this global first." : undefined}
                      onClick={() => removeGlobal(storyGlobal.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
