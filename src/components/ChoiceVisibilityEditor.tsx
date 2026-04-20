import ConditionEditor from "./ConditionEditor";
import { createConditionForGlobal } from "../lib/story";
import { useEditorStore } from "../store/editorStore";
import type { StoryCondition, StoryGlobal } from "../types/story";

type ChoiceVisibilityEditorProps = {
  nodeId: string;
  choiceId: string;
  condition: StoryCondition | null;
  globals: StoryGlobal[];
};

export default function ChoiceVisibilityEditor({
  nodeId,
  choiceId,
  condition,
  globals
}: ChoiceVisibilityEditorProps) {
  const setChoiceVisibilityCondition = useEditorStore(
    (state) => state.setChoiceVisibilityCondition
  );

  const handleToggle = () => {
    if (condition) {
      setChoiceVisibilityCondition({ nodeId, choiceId }, null);
      return;
    }

    const nextCondition = createConditionForGlobal(globals[0]);
    if (nextCondition) {
      setChoiceVisibilityCondition({ nodeId, choiceId }, nextCondition);
    }
  };

  return (
    <div className="choice-editor__section">
      <div className="panel__header">
        <h3>Visibility</h3>
        <button
          type="button"
          className={condition ? "is-active" : ""}
          disabled={globals.length === 0 && !condition}
          onClick={handleToggle}
        >
          {condition ? "Disable" : "Enable"}
        </button>
      </div>

      {condition ? (
        <ConditionEditor
          condition={condition}
          globals={globals}
          onChange={(nextCondition) =>
            setChoiceVisibilityCondition({ nodeId, choiceId }, nextCondition)
          }
        />
      ) : (
        <p className="choice-editor__hint">
          {globals.length === 0
            ? "Add a global first to enable visibility conditions."
            : "This choice is always visible."}
        </p>
      )}
    </div>
  );
}
