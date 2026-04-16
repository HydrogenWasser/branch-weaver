import { createDefaultCondition, getAllowedOperators } from "../lib/conditions";
import type { StoryCondition, StoryGlobal } from "../types/story";

type ConditionEditorProps = {
  condition: StoryCondition;
  globals: StoryGlobal[];
  onChange: (condition: StoryCondition) => void;
};

function getGlobalById(globals: StoryGlobal[], globalId: string): StoryGlobal | undefined {
  return globals.find((storyGlobal) => storyGlobal.id === globalId);
}

function formatOperatorOption(operator: StoryCondition["operator"]): string {
  switch (operator) {
    case "eq":
      return "=";
    case "neq":
      return "!=";
    case "gt":
      return ">";
    case "gte":
      return ">=";
    case "lt":
      return "<";
    case "lte":
      return "<=";
    default:
      return operator;
  }
}

export default function ConditionEditor({ condition, globals, onChange }: ConditionEditorProps) {
  const selectedGlobal =
    getGlobalById(globals, condition.globalId) ?? globals[0];

  if (!selectedGlobal) {
    return <p className="condition-editor__empty">Add a global first to configure conditions.</p>;
  }

  const allowedOperators = getAllowedOperators(selectedGlobal.valueType);
  const safeOperator = allowedOperators.includes(condition.operator) ? condition.operator : allowedOperators[0];
  const safeValue =
    selectedGlobal.valueType === "boolean"
      ? condition.value === true
      : typeof condition.value === "number" && Number.isFinite(condition.value)
        ? condition.value
        : 0;
  const numericValue = typeof safeValue === "number" ? safeValue : 0;

  return (
    <div className="condition-editor">
      <label className="field">
        <span>Global</span>
        <select
          value={selectedGlobal.id}
          onChange={(event) => {
            const nextGlobal = getGlobalById(globals, event.target.value);
            if (nextGlobal) {
              onChange(createDefaultCondition(nextGlobal));
            }
          }}
        >
          {globals.map((storyGlobal) => (
            <option key={storyGlobal.id} value={storyGlobal.id}>
              {storyGlobal.name || storyGlobal.id}
            </option>
          ))}
        </select>
      </label>

      <div className="condition-editor__row">
        <label className="field">
          <span>Operator</span>
          <select
            value={safeOperator}
            onChange={(event) =>
              onChange({
                ...condition,
                globalId: selectedGlobal.id,
                operator: event.target.value as StoryCondition["operator"],
                value: safeValue
              })
            }
          >
            {allowedOperators.map((operator) => (
              <option key={operator} value={operator}>
                {formatOperatorOption(operator)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Value</span>
          {selectedGlobal.valueType === "boolean" ? (
            <select
              value={safeValue === true ? "true" : "false"}
              onChange={(event) =>
                onChange({
                  globalId: selectedGlobal.id,
                  operator: safeOperator,
                  value: event.target.value === "true"
                })
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type="number"
              value={numericValue}
              onChange={(event) =>
                onChange({
                  globalId: selectedGlobal.id,
                  operator: safeOperator,
                  value: Number(event.target.value)
                })
              }
            />
          )}
        </label>
      </div>
    </div>
  );
}
