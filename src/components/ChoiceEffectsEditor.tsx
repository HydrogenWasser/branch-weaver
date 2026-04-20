import { useMemo } from "react";
import { useEditorStore } from "../store/editorStore";
import type { StoryEffect, StoryGlobal } from "../types/story";

type ChoiceEffectsEditorProps = {
  nodeId: string;
  choiceId: string;
  effects: StoryEffect[];
  globals: StoryGlobal[];
};

export default function ChoiceEffectsEditor({
  nodeId,
  choiceId,
  effects,
  globals
}: ChoiceEffectsEditorProps) {
  const addChoiceEffect = useEditorStore((state) => state.addChoiceEffect);
  const removeChoiceEffect = useEditorStore((state) => state.removeChoiceEffect);
  const updateChoiceEffect = useEditorStore((state) => state.updateChoiceEffect);
  const updateChoiceEffectGlobal = useEditorStore((state) => state.updateChoiceEffectGlobal);
  const updateChoiceEffectOperator = useEditorStore((state) => state.updateChoiceEffectOperator);

  const globalsById = useMemo(
    () => new Map(globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [globals]
  );

  const handleAddEffect = () => {
    const firstGlobal = globals[0];
    if (firstGlobal) {
      addChoiceEffect({ nodeId, choiceId }, firstGlobal.id);
    }
  };

  return (
    <div className="choice-editor__section">
      <div className="panel__header">
        <h3>Effects</h3>
        <button type="button" disabled={globals.length === 0} onClick={handleAddEffect}>
          Add Effect
        </button>
      </div>

      {effects.length > 0 ? (
        <div className="effect-editor__list">
          {effects.map((effect, index) => {
            const effectGlobal = globalsById.get(effect.globalId) ?? globals[0];
            const safeValue =
              effectGlobal?.valueType === "boolean"
                ? effect.value === true
                : typeof effect.value === "number" && Number.isFinite(effect.value)
                  ? effect.value
                  : 0;

            return (
              <div key={`${choiceId}-effect-${index}`} className="effect-editor">
                <div className="effect-editor__row">
                  <label className="field">
                    <span>Global</span>
                    <select
                      value={effect.globalId}
                      onChange={(event) => {
                        const nextGlobal = globalsById.get(event.target.value);
                        if (!nextGlobal) {
                          return;
                        }
                        updateChoiceEffectGlobal({ nodeId, choiceId }, index, nextGlobal.id);
                      }}
                    >
                      {globals.map((storyGlobal) => (
                        <option key={storyGlobal.id} value={storyGlobal.id}>
                          {storyGlobal.name || storyGlobal.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  {effectGlobal?.valueType === "number" ? (
                    <label className="field">
                      <span>Operator</span>
                      <select
                        value={effect.operator === "change" ? "change" : "set"}
                        onChange={(event) =>
                          updateChoiceEffectOperator(
                            { nodeId, choiceId },
                            index,
                            event.target.value as "set" | "change"
                          )
                        }
                      >
                        <option value="set">Set</option>
                        <option value="change">Change</option>
                      </select>
                    </label>
                  ) : null}

                  <label className="field">
                    <span>Value</span>
                    {effectGlobal?.valueType === "boolean" ? (
                      <select
                        value={safeValue === true ? "true" : "false"}
                        onChange={(event) =>
                          updateChoiceEffect({ nodeId, choiceId }, index, event.target.value === "true")
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={typeof safeValue === "number" ? safeValue : 0}
                        onChange={(event) =>
                          updateChoiceEffect({ nodeId, choiceId }, index, Number(event.target.value))
                        }
                      />
                    )}
                  </label>

                  <button type="button" onClick={() => removeChoiceEffect({ nodeId, choiceId }, index)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="choice-editor__hint">
          {globals.length === 0
            ? "Add a global first to create effects."
            : "This choice has no effects yet."}
        </p>
      )}
    </div>
  );
}
