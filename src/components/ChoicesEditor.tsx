import { useEffect, useMemo } from "react";
import ChoiceEffectsEditor from "./ChoiceEffectsEditor";
import ChoiceRouteEditor from "./ChoiceRouteEditor";
import ChoiceVisibilityEditor from "./ChoiceVisibilityEditor";
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

  const node = useMemo(() => project.nodes.find((n) => n.id === nodeId), [project.nodes, nodeId]);

  const otherNodes = useMemo(
    () => project.nodes.filter((n) => n.id !== nodeId),
    [project.nodes, nodeId]
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
            {node.choices.map((choice) => (
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

                <ChoiceVisibilityEditor
                  nodeId={nodeId}
                  choiceId={choice.id}
                  condition={choice.visibilityCondition}
                  globals={project.globals}
                />

                <ChoiceEffectsEditor
                  nodeId={nodeId}
                  choiceId={choice.id}
                  effects={choice.effects}
                  globals={project.globals}
                />

                <ChoiceRouteEditor
                  nodeId={nodeId}
                  choiceId={choice.id}
                  route={choice.route}
                  globals={project.globals}
                  otherNodes={otherNodes}
                />

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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
