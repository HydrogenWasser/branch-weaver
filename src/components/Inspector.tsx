import { useMemo, useState } from "react";
import ConditionEditor from "./ConditionEditor";
import { formatChoiceSummary, formatConditionSummary } from "../lib/conditions";
import { NODE_COLOR_THEMES, TAG_SUGGESTIONS } from "../lib/nodeAppearance";
import { createConditionForGlobal } from "../lib/story";
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
  const setChoiceVisibilityCondition = useEditorStore((state) => state.setChoiceVisibilityCondition);
  const setChoiceRouteMode = useEditorStore((state) => state.setChoiceRouteMode);
  const addConditionalBranch = useEditorStore((state) => state.addConditionalBranch);
  const removeConditionalBranch = useEditorStore((state) => state.removeConditionalBranch);
  const moveConditionalBranch = useEditorStore((state) => state.moveConditionalBranch);
  const updateConditionalBranchCondition = useEditorStore((state) => state.updateConditionalBranchCondition);
  const updateConditionalBranchTarget = useEditorStore((state) => state.updateConditionalBranchTarget);
  const updateConditionalFallbackTarget = useEditorStore((state) => state.updateConditionalFallbackTarget);
  const setStartNode = useEditorStore((state) => state.setStartNode);
  const [tagInput, setTagInput] = useState("");
  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );

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
          {selectedNode.choices.map((choice) => {
            const conditionalRoute = choice.route.mode === "conditional" ? choice.route : null;

            return (
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
              <div className="choice-editor__section">
                <div className="panel__header">
                  <h3>Visibility</h3>
                  <button
                    type="button"
                    className={choice.visibilityCondition ? "is-active" : ""}
                    disabled={project.globals.length === 0 && !choice.visibilityCondition}
                    onClick={() => {
                      const choiceSelection = { nodeId: selectedNode.id, choiceId: choice.id };

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
                      setChoiceVisibilityCondition(
                        { nodeId: selectedNode.id, choiceId: choice.id },
                        condition
                      )
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

                      setChoiceRouteMode({ nodeId: selectedNode.id, choiceId: choice.id }, nextMode);
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
                ) : conditionalRoute ? (
                  <div className="conditional-route-editor">
                    <div className="choice-editor__actions">
                      <button
                        type="button"
                        disabled={project.globals.length === 0}
                        onClick={() => addConditionalBranch({ nodeId: selectedNode.id, choiceId: choice.id })}
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
                                      { nodeId: selectedNode.id, choiceId: choice.id },
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
                                      { nodeId: selectedNode.id, choiceId: choice.id },
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
                                      { nodeId: selectedNode.id, choiceId: choice.id },
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
                                  { nodeId: selectedNode.id, choiceId: choice.id },
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
                                    { nodeId: selectedNode.id, choiceId: choice.id },
                                    index,
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
            );
          })}
        </div>
      </div>

      {selectedChoice ? (
        <div className="panel">
          <h3>Selected Connection</h3>
          <p>
            <strong>{selectedChoice.text || "Untitled choice"}</strong>
          </p>
          <p>{formatChoiceSummary(selectedChoice, globalsById) ?? "Direct route with no conditions."}</p>
          {selectedChoice.visibilityCondition ? (
            <p>Visible when: {formatConditionSummary(selectedChoice.visibilityCondition, globalsById)}</p>
          ) : null}
          <p>
            Route:
            {" "}
            {selectedChoice.route.mode === "direct"
              ? selectedChoice.route.targetNodeId ?? "Unlinked"
              : `Conditional (${selectedChoice.route.branches.length} rules + else)`}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
