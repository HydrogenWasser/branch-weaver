import { createCompositeCondition, createDefaultCondition, getAllowedOperators } from "../lib/conditions";
import type { StoryAtomicCondition, StoryCondition, StoryGlobal } from "../types/story";

type ConditionEditorProps = {
  condition: StoryCondition;
  globals: StoryGlobal[];
  onChange: (condition: StoryCondition) => void;
  onRemove?: () => void;
  depth?: number;
};

function getGlobalById(globals: StoryGlobal[], globalId: string): StoryGlobal | undefined {
  return globals.find((storyGlobal) => storyGlobal.id === globalId);
}

function formatOperatorOption(operator: StoryAtomicCondition["operator"]): string {
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

export default function ConditionEditor({ condition, globals, onChange, onRemove, depth = 0 }: ConditionEditorProps) {
  if (condition.type === "atomic") {
    return (
      <AtomicConditionEditor
        condition={condition}
        globals={globals}
        onChange={onChange}
        onRemove={onRemove}
      />
    );
  }

  return (
    <CompositeConditionEditor
      condition={condition}
      globals={globals}
      onChange={onChange}
      onRemove={onRemove}
      depth={depth}
    />
  );
}

function AtomicConditionEditor({
  condition,
  globals,
  onChange,
  onRemove
}: {
  condition: StoryAtomicCondition;
  globals: StoryGlobal[];
  onChange: (condition: StoryCondition) => void;
  onRemove?: () => void;
}) {
  const selectedGlobal = getGlobalById(globals, condition.globalId) ?? globals[0];

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
    <div className="condition-editor condition-editor--atomic">
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

      <label className="field">
        <span>Operator</span>
        <select
          value={safeOperator}
          onChange={(event) =>
            onChange({
              ...condition,
              globalId: selectedGlobal.id,
              operator: event.target.value as StoryAtomicCondition["operator"],
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
                type: "atomic",
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
                type: "atomic",
                globalId: selectedGlobal.id,
                operator: safeOperator,
                value: Number(event.target.value)
              })
            }
          />
        )}
      </label>

      {onRemove ? (
        <button type="button" className="condition-editor__remove" onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </div>
  );
}

function CompositeConditionEditor({
  condition,
  globals,
  onChange,
  onRemove,
  depth
}: {
  condition: Extract<StoryCondition, { type: "all" | "any" }>;
  globals: StoryGlobal[];
  onChange: (condition: StoryCondition) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const handleToggleType = () => {
    onChange({
      type: condition.type === "all" ? "any" : "all",
      conditions: condition.conditions
    });
  };

  const handleAddAtomic = () => {
    const firstGlobal = globals[0];
    if (!firstGlobal) return;
    onChange({
      ...condition,
      conditions: [...condition.conditions, createDefaultCondition(firstGlobal)]
    });
  };

  const handleAddComposite = () => {
    onChange({
      ...condition,
      conditions: [...condition.conditions, createCompositeCondition("all")]
    });
  };

  const handleUpdateChild = (index: number, nextChild: StoryCondition) => {
    const nextConditions = [...condition.conditions];
    nextConditions[index] = nextChild;
    onChange({ ...condition, conditions: nextConditions });
  };

  const handleRemoveChild = (index: number) => {
    const nextConditions = condition.conditions.filter((_, i) => i !== index);
    onChange({ ...condition, conditions: nextConditions });
  };

  const label = condition.type === "all"
    ? "All of the following are true"
    : "Any of the following are true";

  return (
    <div className="condition-editor condition-editor--composite">
      <div className="condition-editor__header">
        <span className="condition-editor__badge">
          {condition.type === "all" ? "ALL" : "ANY"}
        </span>
        <span className="condition-editor__label">{label}</span>
        <div className="condition-editor__actions">
          <button type="button" onClick={handleToggleType}>
            Switch to {condition.type === "all" ? "Any" : "All"}
          </button>
          {onRemove ? (
            <button type="button" className="condition-editor__remove" onClick={onRemove}>
              Remove Group
            </button>
          ) : null}
        </div>
      </div>

      {condition.conditions.length > 0 ? (
        <div className="condition-editor__children" style={{ paddingLeft: `${Math.min(depth + 1, 4) * 12}px` }}>
          {condition.conditions.map((child, index) => (
            <div key={index} className="condition-editor__child">
              <ConditionEditor
                condition={child}
                globals={globals}
                onChange={(nextChild) => handleUpdateChild(index, nextChild)}
                onRemove={() => handleRemoveChild(index)}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="condition-editor__empty">No conditions in this group yet.</p>
      )}

      <div className="condition-editor__toolbar">
        <button type="button" onClick={handleAddAtomic} disabled={globals.length === 0}>
          + Add Condition
        </button>
        <button type="button" onClick={handleAddComposite}>
          + Add Group
        </button>
      </div>
    </div>
  );
}
