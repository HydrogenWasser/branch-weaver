import { useEditorStore } from "../store/editorStore";

export default function GlobalsPanel() {
  const globals = useEditorStore((state) => state.project.globals);
  const addGlobal = useEditorStore((state) => state.addGlobal);
  const updateGlobalName = useEditorStore((state) => state.updateGlobalName);
  const updateGlobalValueType = useEditorStore((state) => state.updateGlobalValueType);
  const updateGlobalDefaultValue = useEditorStore((state) => state.updateGlobalDefaultValue);
  const removeGlobal = useEditorStore((state) => state.removeGlobal);

  return (
    <div className="panel">
      <div className="panel__header">
        <h2>Globals</h2>
        <span className="panel__meta">{globals.length}</span>
      </div>

      <div className="globals-panel__actions">
        <button type="button" onClick={() => addGlobal("boolean")}>
          Add Flag
        </button>
        <button type="button" onClick={() => addGlobal("number")}>
          Add Number
        </button>
      </div>

      {globals.length === 0 ? (
        <p className="search-panel__empty">Create globals here to drive conditional visibility and routing.</p>
      ) : (
        <div className="globals-panel__list">
          {globals.map((storyGlobal) => (
            <div key={storyGlobal.id} className="global-editor">
              <label className="field">
                <span>Name</span>
                <input
                  value={storyGlobal.name}
                  onChange={(event) => updateGlobalName(storyGlobal.id, event.target.value)}
                  placeholder="Global name"
                />
              </label>

              <div className="globals-panel__row">
                <label className="field">
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

                <label className="field">
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
              </div>

              <div className="choice-editor__actions">
                <button type="button" onClick={() => removeGlobal(storyGlobal.id)}>
                  Delete Global
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
