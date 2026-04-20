import ConditionEditor from "./ConditionEditor";
import { useEditorStore } from "../store/editorStore";
import type { StoryChoiceRoute, StoryGlobal, StoryNode } from "../types/story";

type ChoiceRouteEditorProps = {
  nodeId: string;
  choiceId: string;
  route: StoryChoiceRoute;
  globals: StoryGlobal[];
  otherNodes: StoryNode[];
};

export default function ChoiceRouteEditor({
  nodeId,
  choiceId,
  route,
  globals,
  otherNodes
}: ChoiceRouteEditorProps) {
  const connectChoice = useEditorStore((state) => state.connectChoice);
  const setChoiceRouteMode = useEditorStore((state) => state.setChoiceRouteMode);
  const addConditionalBranch = useEditorStore((state) => state.addConditionalBranch);
  const removeConditionalBranch = useEditorStore((state) => state.removeConditionalBranch);
  const moveConditionalBranch = useEditorStore((state) => state.moveConditionalBranch);
  const updateConditionalBranchCondition = useEditorStore(
    (state) => state.updateConditionalBranchCondition
  );
  const updateConditionalBranchTarget = useEditorStore(
    (state) => state.updateConditionalBranchTarget
  );
  const updateConditionalFallbackTarget = useEditorStore(
    (state) => state.updateConditionalFallbackTarget
  );

  const conditionalRoute = route.mode === "conditional" ? route : null;
  const choiceSelection = { nodeId, choiceId };

  const handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextMode = event.target.value as "direct" | "conditional";

    if (
      nextMode === "direct" &&
      route.mode === "conditional" &&
      route.branches.length > 0 &&
      !window.confirm(
        "Switching back to direct routing will remove all conditional branches and keep the else target. Continue?"
      )
    ) {
      return;
    }

    setChoiceRouteMode(choiceSelection, nextMode);
  };

  return (
    <div className="choice-editor__section">
      <label className="field">
        <span>Routing Mode</span>
        <select value={route.mode} onChange={handleModeChange}>
          <option value="direct">Direct</option>
          <option value="conditional">Conditional</option>
        </select>
      </label>

      {route.mode === "direct" ? (
        <label className="field">
          <span>Target Node</span>
          <select
            value={route.targetNodeId ?? ""}
            onChange={(event) =>
              connectChoice(choiceSelection, event.target.value || null)
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
              disabled={globals.length === 0}
              onClick={() => addConditionalBranch(choiceSelection)}
            >
              Add Rule
            </button>
          </div>

          {conditionalRoute.branches.length > 0 ? (
            <div className="conditional-route-editor__list">
              {conditionalRoute.branches.map((branch, index) => (
                <div key={`${choiceId}-${index}`} className="conditional-branch">
                  <div className="panel__header">
                    <h3>{index === 0 ? "If" : "Else If"}</h3>
                    <div className="choice-editor__actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          moveConditionalBranch(choiceSelection, index, -1)
                        }
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={index === conditionalRoute.branches.length - 1}
                        onClick={() =>
                          moveConditionalBranch(choiceSelection, index, 1)
                        }
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removeConditionalBranch(choiceSelection, index)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <ConditionEditor
                    condition={branch.condition}
                    globals={globals}
                    onChange={(condition) =>
                      updateConditionalBranchCondition(
                        choiceSelection,
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
                          choiceSelection,
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
              {globals.length === 0
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
                    choiceSelection,
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
  );
}
