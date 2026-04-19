import { useEffect, useMemo } from "react";
import ConditionEditor from "./ConditionEditor";
import { createConditionForGlobal } from "../lib/story";
import { useEditorStore } from "../store/editorStore";

type ChoicesEditorProps = {
  nodeId: string;
  selectedChoiceId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function ChoicesEditor({ nodeId, selectedChoiceId, open, onClose }: ChoicesEditorProps) {
  const project = useEditorStore((state) => state.project);
  const addChoice = useEditorStore((state) => state.addChoice);
  const removeChoice = useEditorStore((state) => state.removeChoice);
  const updateChoiceText = useEditorStore((state) => state.updateChoiceText);
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const setChoiceVisibilityCondition = useEditorStore((state) => state.setChoiceVisibilityCondition);
  const setChoiceRouteMode = useEditorStore((state) => state.setChoiceRouteMode);
  const addConditionalBranch = useEditorStore((state) => state.addConditionalBranch);
  const removeConditionalBranch = useEditorStore((state) => state.removeConditionalBranch);
  const moveConditionalBranch = useEditorStore((state) => state.moveConditionalBranch);
  const updateConditionalBranchCondition = useEditorStore((state) => state.updateConditionalBranchCondition);
  const updateConditionalBranchTarget = useEditorStore((state) => state.updateConditionalBranchTarget);
  const updateConditionalFallbackTarget = useEditorStore((state) => state.updateConditionalFallbackTarget);
  const addChoiceEffect = useEditorStore((state) => state.addChoiceEffect);
  const removeChoiceEffect = useEditorStore((state) => state.removeChoiceEffect);
  const updateChoiceEffect = useEditorStore((state) => state.updateChoiceEffect);
  const updateChoiceEffectGlobal = useEditorStore((state) => state.updateChoiceEffectGlobal);
  const updateChoiceEffectOperator = useEditorStore((state) => state.updateChoiceEffectOperator);

  const node = useMemo(() => project.nodes.find((n) => n.id === nodeId), [project.nodes, nodeId]);

  const otherNodes = useMemo(
    () => project.nodes.filter((n) => n.id !== nodeId),
    [project.nodes, nodeId]
  );

  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );

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

  if (!open || !node) {
    return null;
  }

  return (
    <div className="choices-editor-overlay" role="presentation" onClick={onClose}>
      <section
        className="choices-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Choices editor"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="choices-editor__header">
          <h2>Choices</h2>
          <div className="choices-editor__actions">
            <button type="button" onClick={() => addChoice(nodeId)}>
              Add Choice
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {node.choices.length === 0 ? (
          <p className="choices-editor__empty">This node has no outgoing choices yet.</p>
        ) : (
          <div className="choices-editor__list">
            {node.choices.map((choice) => {
              const conditionalRoute = choice.route.mode === "conditional" ? choice.route : null;

              return (
                <div
                  key={choice.id}
                  className={`choice-editor${selectedChoiceId === choice.id ? " is-selected" : ""}`}
                >
                  <label className="field">
                    <span>Choice Text</span>
                    <input
                      value={choice.text}
                      onChange={(event) =>
                        updateChoiceText({ nodeId, choiceId: choice.id }, event.target.value)
                      }
                      placeholder="Choice text"
                    />
                  </label>

                  <div className="choice-editor__section">
                    <div className="panel__header">
                      <h3>Visibility</h3>
                      <button
                        type="button"
                        className={choice.visibilityCondition ? "is-active" : ""}
                        disabled={project.globals.length === 0 && !choice.visibilityCondition}
                        onClick={() => {
                          const choiceSelection = { nodeId, choiceId: choice.id };

                          if (choice.visibilityCondition) {
                            setChoiceVisibilityCondition(choiceSelection, null);
                            return;
                          }

                          const nextCondition = createConditionForGlobal(project.globals[0]);
                          if (nextCondition) {
                            setChoiceVisibilityCondition(choiceSelection, nextCondition);
                          }
                        }}
                      >
                        {choice.visibilityCondition ? "Disable" : "Enable"}
                      </button>
                    </div>

                    {choice.visibilityCondition ? (
                      <ConditionEditor
                        condition={choice.visibilityCondition}
                        globals={project.globals}
                        onChange={(condition) =>
                          setChoiceVisibilityCondition({ nodeId, choiceId: choice.id }, condition)
                        }
                      />
                    ) : (
                      <p className="choice-editor__hint">
                        {project.globals.length === 0
                          ? "Add a global first to enable visibility conditions."
                          : "This choice is always visible."}
                      </p>
                    )}
                  </div>

                  <div className="choice-editor__section">
                    <div className="panel__header">
                      <h3>Effects</h3>
                      <button
                        type="button"
                        disabled={project.globals.length === 0}
                        onClick={() => {
                          const firstGlobal = project.globals[0];
                          if (firstGlobal) {
                            addChoiceEffect({ nodeId, choiceId: choice.id }, firstGlobal.id);
                          }
                        }}
                      >
                        Add Effect
                      </button>
                    </div>

                    {choice.effects.length > 0 ? (
                      <div className="effect-editor__list">
                        {choice.effects.map((effect, index) => {
                          const effectGlobal = globalsById.get(effect.globalId) ?? project.globals[0];
                          const safeValue =
                            effectGlobal?.valueType === "boolean"
                              ? effect.value === true
                              : typeof effect.value === "number" && Number.isFinite(effect.value)
                                ? effect.value
                                : 0;

                          return (
                            <div key={`${choice.id}-effect-${index}`} className="effect-editor">
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
                                      updateChoiceEffectGlobal(
                                        { nodeId, choiceId: choice.id },
                                        index,
                                        nextGlobal.id
                                      );
                                    }}
                                  >
                                    {project.globals.map((storyGlobal) => (
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
                                          { nodeId, choiceId: choice.id },
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
                                        updateChoiceEffect(
                                          { nodeId, choiceId: choice.id },
                                          index,
                                          event.target.value === "true"
                                        )
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
                                        updateChoiceEffect(
                                          { nodeId, choiceId: choice.id },
                                          index,
                                          Number(event.target.value)
                                        )
                                      }
                                    />
                                  )}
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeChoiceEffect({ nodeId, choiceId: choice.id }, index)
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="choice-editor__hint">
                        {project.globals.length === 0
                          ? "Add a global first to create effects."
                          : "This choice has no effects yet."}
                      </p>
                    )}
                  </div>

                  <div className="choice-editor__section">
                    <label className="field">
                      <span>Routing Mode</span>
                      <select
                        value={choice.route.mode}
                        onChange={(event) => {
                          const nextMode = event.target.value as "direct" | "conditional";

                          if (
                            nextMode === "direct" &&
                            choice.route.mode === "conditional" &&
                            choice.route.branches.length > 0 &&
                            !window.confirm(
                              "Switching back to direct routing will remove all conditional branches and keep the else target. Continue?"
                            )
                          ) {
                            return;
                          }

                          setChoiceRouteMode({ nodeId, choiceId: choice.id }, nextMode);
                        }}
                      >
                        <option value="direct">Direct</option>
                        <option value="conditional">Conditional</option>
                      </select>
                    </label>

                    {choice.route.mode === "direct" ? (
                      <label className="field">
                        <span>Target Node</span>
                        <select
                          value={choice.route.targetNodeId ?? ""}
                          onChange={(event) =>
                            connectChoice(
                              { nodeId, choiceId: choice.id },
                              event.target.value || null
                            )
                          }
                        >
                          <option value="">Unlinked</option>
                          {otherNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title || n.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : conditionalRoute ? (
                      <div className="conditional-route-editor">
                        <div className="choice-editor__actions">
                          <button
                            type="button"
                            disabled={project.globals.length === 0}
                            onClick={() => addConditionalBranch({ nodeId, choiceId: choice.id })}
                          >
                            Add Rule
                          </button>
                        </div>

                        {conditionalRoute.branches.length > 0 ? (
                          <div className="conditional-route-editor__list">
                            {conditionalRoute.branches.map((branch, index) => (
                              <div key={`${choice.id}-${index}`} className="conditional-branch">
                                <div className="panel__header">
                                  <h3>{index === 0 ? "If" : "Else If"}</h3>
                                  <div className="choice-editor__actions">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() =>
                                        moveConditionalBranch(
                                          { nodeId, choiceId: choice.id },
                                          index,
                                          -1
                                        )
                                      }
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === conditionalRoute.branches.length - 1}
                                      onClick={() =>
                                        moveConditionalBranch(
                                          { nodeId, choiceId: choice.id },
                                          index,
                                          1
                                        )
                                      }
                                    >
                                      Down
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeConditionalBranch(
                                          { nodeId, choiceId: choice.id },
                                          index
                                        )
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                <ConditionEditor
                                  condition={branch.condition}
                                  globals={project.globals}
                                  onChange={(condition) =>
                                    updateConditionalBranchCondition(
                                      { nodeId, choiceId: choice.id },
                                      index,
                                      condition
                                    )
                                  }
                                />

                                <label className="field">
                                  <span>Target Node</span>
                                  <select
                                    value={branch.targetNodeId ?? ""}
                                    onChange={(event) =>
                                      updateConditionalBranchTarget(
                                        { nodeId, choiceId: choice.id },
                                        index,
                                        event.target.value || null
                                      )
                                    }
                                  >
                                    <option value="">Unlinked</option>
                                    {otherNodes.map((n) => (
                                      <option key={n.id} value={n.id}>
                                        {n.title || n.id}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="choice-editor__hint">
                            {project.globals.length === 0
                              ? "Add a global first to create conditional rules."
                              : "No conditional rules yet. Add one or use the else target below."}
                          </p>
                        )}

                        <div className="conditional-branch conditional-branch--fallback">
                          <div className="panel__header">
                            <h3>Else</h3>
                          </div>
                          <label className="field">
                            <span>Fallback Target</span>
                            <select
                              value={conditionalRoute.fallbackTargetNodeId ?? ""}
                              onChange={(event) =>
                                updateConditionalFallbackTarget(
                                  { nodeId, choiceId: choice.id },
                                  event.target.value || null
                                )
                              }
                            >
                              <option value="">Unlinked</option>
                              {otherNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.title || n.id}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="choice-editor__actions">
                    <button
                      type="button"
                      onClick={() => {
                        const hasConfiguredTarget =
                          choice.route.mode === "direct"
                            ? Boolean(choice.route.targetNodeId)
                            : choice.route.branches.some((branch) => branch.targetNodeId) ||
                              Boolean(choice.route.fallbackTargetNodeId);

                        if (
                          hasConfiguredTarget &&
                          !window.confirm(
                            "This will remove the existing jump target for the choice. Continue?"
                          )
                        ) {
                          return;
                        }
                        removeChoice({ nodeId, choiceId: choice.id });
                      }}
                    >
                      Delete Choice
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
